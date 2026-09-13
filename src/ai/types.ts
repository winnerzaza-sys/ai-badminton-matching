import type {
  Schedule,
  ScheduleGenerator,
  ValidationResult,
} from '../types';

export type AIStatus =
  | 'idle'
  | 'connecting'
  | 'generating'
  | 'validating'
  | 'repairing'
  | 'complete'
  | 'failed';

export interface AIProgress {
  status: AIStatus;
  connectionProgress: number;
  repairAttempt: number;
}

export interface AIScheduleGenerator extends ScheduleGenerator {
  load(): Promise<void>;
  setConnectionProgressCallback(callback: (progress: number) => void): void;
}

export interface ValidatedScheduleResult {
  schedule: Schedule;
  validation: ValidationResult;
  repairAttempts: number;
}

export class ScheduleGenerationError extends Error {
  constructor(
    message: string,
    public readonly validation: ValidationResult | null = null,
    public readonly repairAttempts = 0,
  ) {
    super(message);
    this.name = 'ScheduleGenerationError';
  }
}
