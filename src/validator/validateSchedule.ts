import type { Schedule, ScheduleInput, ValidationResult } from '../types';
import { analyzeScheduleQuality } from './analyzeScheduleQuality';
import { countGames } from './utils';
import { validateConstraints } from './validateConstraints';
import { validateFairness } from './validateFairness';
import { validateRound } from './validateRound';

export function validateSchedule(
  schedule: Schedule,
  input: ScheduleInput,
): ValidationResult {
  const errors = [];

  if (schedule.rounds.length !== input.fairness.totalRounds) {
    errors.push({
      code: 'INCORRECT_ROUND_COUNT',
      message: `ตารางมี ${schedule.rounds.length} รอบ แต่ต้องมี ${input.fairness.totalRounds} รอบ`,
      severity: 'error' as const,
    });
  }

  schedule.rounds.forEach((round) => {
    errors.push(...validateRound(round, input.players, input.courts));
  });

  const playCounts = countGames(schedule, input.players);
  errors.push(...validateFairness(playCounts, input.players, input.fairness));
  errors.push(...validateConstraints(schedule, input.constraints, playCounts));
  const { quality, warnings } = analyzeScheduleQuality(
    schedule,
    input.players,
    input.rules,
    input.constraints,
  );

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    playCounts,
    quality,
  };
}
