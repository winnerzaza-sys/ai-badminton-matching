import { describe, expect, it, vi } from 'vitest';
import { calculateBalancedPlan } from '../fairness';
import { AlgorithmScheduleGenerator, MockScheduleGenerator } from '../generator';
import { defaultPlayers, defaultRules } from '../store/sessionStore';
import { validateSchedule } from '../validator';
import type { Schedule, ScheduleGenerator, ScheduleInput } from '../types';
import { AI_MODEL, MAX_GENERATION_TOKENS } from './config';
import { GeminiScheduleGenerator } from './GeminiScheduleGenerator';
import { generateValidatedSchedule } from './generateSchedule';
import { buildGenerationPrompt } from './prompts';
import { repairScheduleDeterministically } from './repairSchedule';
import { parseAISchedule } from './schema';
import { ScheduleGenerationError, type AIScheduleGenerator } from './types';

const input: ScheduleInput = {
  players: Array.from({ length: 8 }, (_, index) => ({
    id: `p${index + 1}`,
    name: `Player ${index + 1}`,
    gender: index % 2 === 0 ? 'male' : 'female',
  })),
  courts: 1,
  fairness: calculateBalancedPlan(8, 1),
  rules: defaultRules,
  instruction: '',
};

const twelvePlayerInput: ScheduleInput = {
  ...input,
  players: Array.from({ length: 12 }, (_, index) => ({
    id: `p${index + 1}`,
    name: `Player ${index + 1}`,
    gender: index % 2 === 0 ? 'male' : 'female',
  })),
  fairness: calculateBalancedPlan(12, 1),
};

async function unfairTwelvePlayerSchedule(): Promise<{ invalid: Schedule; valid: Schedule }> {
  const valid = await new MockScheduleGenerator().generate(twelvePlayerInput);
  const invalid = structuredClone(valid);
  const targetRound = invalid.rounds[1];
  const replacements = new Map([['p5', 'p1'], ['p6', 'p2']]);
  for (const team of [targetRound.courts[0].teamA, targetRound.courts[0].teamB]) {
    team.forEach((id, index) => {
      team[index] = replacements.get(id) ?? id;
    });
  }
  targetRound.restingPlayerIds = targetRound.restingPlayerIds
    .filter((id) => id !== 'p1' && id !== 'p2')
    .concat('p5', 'p6');
  return { invalid, valid };
}

class FakeAIGenerator implements AIScheduleGenerator {
  generateCalls = 0;
  progressCallback: (progress: number) => void = () => undefined;

  constructor(private readonly generated: Schedule | Error) {}

  setConnectionProgressCallback(callback: (progress: number) => void) {
    this.progressCallback = callback;
  }

  async load() {
    this.progressCallback(0.5);
    this.progressCallback(1);
  }

  async generate() {
    this.generateCalls += 1;
    if (this.generated instanceof Error) throw this.generated;
    return structuredClone(this.generated);
  }
}

describe('AI schedule schema', () => {
  it('parses a complete JSON schedule and adds application metadata', async () => {
    const schedule = await new MockScheduleGenerator().generate(input);
    const parsed = parseAISchedule(JSON.stringify({ rounds: schedule.rounds }));

    expect(parsed.id).toMatch(/^gemini-/);
    expect(parsed.rounds).toEqual(schedule.rounds);
  });

  it('rejects malformed teams before validation', () => {
    expect(() => parseAISchedule(JSON.stringify({
      rounds: [{ round: 1, courts: [{ court: 1, teamA: ['p1'], teamB: ['p2', 'p3'] }], restingPlayerIds: [] }],
    }))).toThrow(/exactly two player IDs/);
  });
});

describe('AI prompt builders', () => {
  it('includes the pre-calculated fairness target and complete schedule requirement', async () => {
    expect(buildGenerationPrompt(input)).toContain(`"totalRounds":${input.fairness.totalRounds}`);
  });
});

describe('Gemini API client', () => {
  it('binds the browser fetch implementation to globalThis', async () => {
    const schedule = await new MockScheduleGenerator().generate(input);
    const originalFetch = globalThis.fetch;
    const browserFetch = vi.fn(function (this: typeof globalThis) {
      if (this !== globalThis) throw new TypeError('Illegal invocation');
      return Promise.resolve(Response.json({
        content: JSON.stringify({ rounds: schedule.rounds }),
      }));
    });
    globalThis.fetch = browserFetch as typeof fetch;

    try {
      const generator = new GeminiScheduleGenerator();
      await expect(generator.generate(input)).resolves.toMatchObject({ rounds: schedule.rounds });
      expect(browserFetch.mock.instances[0]).toBe(globalThis);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('sends the generation prompt to the server endpoint and parses the response', async () => {
    const schedule = await new MockScheduleGenerator().generate(input);
    const request = vi.fn().mockResolvedValue(Response.json({
      content: JSON.stringify({ rounds: schedule.rounds }),
    }));
    const generator = new GeminiScheduleGenerator(request);

    const generated = await generator.generate(input);

    expect(generated.rounds).toEqual(schedule.rounds);
    expect(request).toHaveBeenCalledWith('/api/generate-schedule', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));
    const requestBody = JSON.parse(request.mock.calls[0][1].body as string) as { prompt: string };
    expect(requestBody.prompt).toContain(`"totalRounds":${input.fairness.totalRounds}`);
    expect(AI_MODEL).toBe('gemini-3.5-flash');
    expect(MAX_GENERATION_TOKENS).toBe(8192);
  });

  it('marks the remote service ready without downloading a browser model', async () => {
    const request = vi.fn();
    const progress = vi.fn();
    const generator = new GeminiScheduleGenerator(request);
    generator.setConnectionProgressCallback(progress);

    await generator.load();

    expect(progress).toHaveBeenCalledWith(1);
    expect(request).not.toHaveBeenCalled();
  });

  it('shows the safe server error when Gemini cannot generate a schedule', async () => {
    const request = vi.fn().mockResolvedValue(Response.json(
      { error: 'บริการ AI ไม่พร้อมใช้งาน' },
      { status: 502 },
    ));
    const generator = new GeminiScheduleGenerator(request);

    await expect(generator.generate(input)).rejects.toThrow('บริการ AI ไม่พร้อมใช้งาน');
  });
});

describe('validated generation and automatic repair', () => {
  it('repairs underplayed players locally without asking Gemini again', async () => {
    const { invalid } = await unfairTwelvePlayerSchedule();
    const generator = new FakeAIGenerator(invalid);

    const result = await generateValidatedSchedule(generator, twelvePlayerInput);

    expect(result.validation.valid).toBe(true);
    expect(result.validation.playCounts.p5).toBe(2);
    expect(result.validation.playCounts.p6).toBe(2);
    expect(generator.generateCalls).toBe(1);
  });

  it('replaces a structurally invalid AI result with a validated local schedule', async () => {
    const invalid = await new MockScheduleGenerator().generate(input);
    invalid.rounds.pop();
    const generator = new FakeAIGenerator(invalid);
    const progress = vi.fn();

    const result = await generateValidatedSchedule(generator, input, progress);

    expect(result.validation.valid).toBe(true);
    expect(result.repairAttempts).toBe(1);
    expect(result.schedule.id).toMatch(/^algorithm-/);
    expect(generator.generateCalls).toBe(1);
    expect(progress).toHaveBeenCalledWith(expect.objectContaining({ status: 'repairing', repairAttempt: 1 }));
  });

  it('falls back locally after an invalid AI result even with an instruction', async () => {
    const invalid = await new MockScheduleGenerator().generate(twelvePlayerInput);
    invalid.rounds[0].courts[0].teamA[0] = invalid.rounds[1].courts[0].teamA[0];
    const generator = new FakeAIGenerator(invalid);

    const result = await generateValidatedSchedule(generator, {
      ...twelvePlayerInput,
      players: defaultPlayers,
      instruction: 'กระจายผู้เล่นหญิง',
    });

    expect(result.validation.valid).toBe(true);
    expect(result.schedule.id).toMatch(/^algorithm-/);
    expect(generator.generateCalls).toBe(1);
  });

  it('falls back locally when the single Gemini request fails', async () => {
    const generator = new FakeAIGenerator(new Error('Gemini rate limited'));

    const result = await generateValidatedSchedule(generator, input);

    expect(result.validation.valid).toBe(true);
    expect(result.schedule.id).toMatch(/^algorithm-/);
    expect(generator.generateCalls).toBe(1);
  });

  it('fails after one local recovery attempt and never calls Gemini again', async () => {
    const invalid = await new MockScheduleGenerator().generate(input);
    invalid.rounds.pop();
    const generator = new FakeAIGenerator(invalid);
    const invalidLocalGenerator: ScheduleGenerator = {
      generate: async () => structuredClone(invalid),
    };

    await expect(generateValidatedSchedule(
      generator,
      input,
      undefined,
      { localGenerator: invalidLocalGenerator },
    )).rejects.toBeInstanceOf(ScheduleGenerationError);
    expect(generator.generateCalls).toBe(1);
  });

  it('regenerates locally without making another Gemini request', async () => {
    const remoteSchedule = await new MockScheduleGenerator().generate(input);
    const generator = new FakeAIGenerator(remoteSchedule);

    const result = await generateValidatedSchedule(
      generator,
      { ...input, variant: 2 },
      undefined,
      { preferLocal: true },
    );

    expect(result.validation.valid).toBe(true);
    expect(result.schedule.id).toMatch(/^algorithm-/);
    expect(generator.generateCalls).toBe(0);
  });

  it('regenerates locally even when a free-form instruction is present', async () => {
    const remoteSchedule = await new MockScheduleGenerator().generate(input);
    const generator = new FakeAIGenerator(remoteSchedule);

    const result = await generateValidatedSchedule(
      generator,
      { ...input, instruction: 'กระจายผู้เล่นหญิง', variant: 3 },
      undefined,
      { preferLocal: true },
    );

    expect(result.validation.valid).toBe(true);
    expect(result.validation.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'FREE_FORM_INSTRUCTION_NOT_APPLIED_BY_LOCAL_FALLBACK' }),
    ]));
    expect(generator.generateCalls).toBe(0);
  });

  it('keeps all 5 male and 7 female players above the minimum for every rotation', async () => {
    const genderSplitInput: ScheduleInput = {
      ...twelvePlayerInput,
      players: defaultPlayers,
    };
    const localGenerator = new AlgorithmScheduleGenerator();

    for (let variant = 0; variant < defaultPlayers.length * 2; variant += 1) {
      const schedule = await localGenerator.generate({ ...genderSplitInput, variant });
      const validation = validateSchedule(schedule, genderSplitInput);

      expect(validation.valid, `variant ${variant}: ${validation.errors.map((issue) => issue.message).join(' | ')}`).toBe(true);
      expect(Object.values(validation.playCounts)).toEqual(
        expect.arrayContaining(Array.from({ length: 12 }, () => 2)),
      );
    }
  });
});

describe('deterministic fairness repair', () => {
  it('swaps overplayed players for resting underplayed players', async () => {
    const { invalid } = await unfairTwelvePlayerSchedule();
    const repaired = repairScheduleDeterministically(invalid, twelvePlayerInput);

    expect(repaired).not.toBeNull();
    expect(repaired?.id).toContain('auto-repaired');
  });
});
