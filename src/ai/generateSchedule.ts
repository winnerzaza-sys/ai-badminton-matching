import { AlgorithmScheduleGenerator } from '../generator';
import type { Schedule, ScheduleGenerator, ScheduleInput, ValidationResult } from '../types';
import { validateSchedule } from '../validator';
import { repairScheduleDeterministically } from './repairSchedule';
import type { AIProgress, AIScheduleGenerator, ValidatedScheduleResult } from './types';
import { ScheduleGenerationError } from './types';

interface LocalRecovery {
  schedule: Schedule;
  validation: ValidationResult;
}

interface GenerationOptions {
  localGenerator?: ScheduleGenerator;
  preferLocal?: boolean;
}

async function recoverLocally(
  schedule: Schedule | null,
  input: ScheduleInput,
  localGenerator: ScheduleGenerator,
): Promise<LocalRecovery | null> {
  if (schedule) {
    const repaired = repairScheduleDeterministically(schedule, input);
    if (repaired) {
      const validation = validateSchedule(repaired, input);
      if (validation.valid) return { schedule: repaired, validation };
    }
  }

  const generated = await localGenerator.generate(input);
  const validation = validateSchedule(generated, input);
  if (!validation.valid) return null;

  if (input.instruction.trim()) {
    validation.warnings.push({
      code: 'FREE_FORM_INSTRUCTION_NOT_APPLIED_BY_LOCAL_FALLBACK',
      message: 'ตารางสำรองสร้างด้วยอัลกอริทึมในเครื่อง จึงอาจไม่ครอบคลุมคำสั่งเพิ่มเติม',
      severity: 'warning',
    });
  }

  return { schedule: generated, validation };
}

export async function generateValidatedSchedule(
  generator: AIScheduleGenerator,
  input: ScheduleInput,
  onProgress: (progress: AIProgress) => void = () => undefined,
  options: GenerationOptions = {},
): Promise<ValidatedScheduleResult> {
  const localGenerator = options.localGenerator ?? new AlgorithmScheduleGenerator();
  let connectionProgress = 0;
  const report = (status: AIProgress['status'], repairAttempt = 0) => {
    onProgress({ status, connectionProgress, repairAttempt });
  };

  if (options.preferLocal) {
    connectionProgress = 1;
    report('generating');
    const recovered = await recoverLocally(null, input, localGenerator);
    if (recovered) {
      report('complete');
      return { ...recovered, repairAttempts: 0 };
    }
    report('failed');
    throw new ScheduleGenerationError(
      'ไม่สามารถสร้างตารางที่ผ่านทุกเงื่อนไขด้วยอัลกอริทึมในเครื่องได้',
    );
  }

  generator.setConnectionProgressCallback((progress) => {
    connectionProgress = progress;
    report('connecting');
  });

  report('connecting');
  await generator.load();
  connectionProgress = 1;
  report('generating');

  let schedule: Schedule;
  try {
    schedule = await generator.generate(input);
  } catch (error) {
    report('repairing', 1);
    const recovered = await recoverLocally(null, input, localGenerator);
    if (recovered) {
      report('complete', 1);
      return { ...recovered, repairAttempts: 1 };
    }
    report('failed', 1);
    throw error;
  }

  report('validating');
  const validation = validateSchedule(schedule, input);

  if (!validation.valid) {
    report('repairing', 1);
    const recovered = await recoverLocally(schedule, input, localGenerator);
    if (recovered) {
      report('complete', 1);
      return { ...recovered, repairAttempts: 1 };
    }
    report('failed', 1);
    throw new ScheduleGenerationError(
      'ไม่สามารถสร้างตารางที่ผ่านทุกเงื่อนไขได้ กรุณาปรับกติกาหรือคำสั่งเพิ่มเติมแล้วลองอีกครั้ง',
      validation,
      1,
    );
  }

  report('complete');
  return { schedule, validation, repairAttempts: 0 };
}
