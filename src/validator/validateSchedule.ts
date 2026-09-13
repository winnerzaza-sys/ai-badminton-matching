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

  schedule.rounds.forEach((round, roundIndex) => {
    if (round.round !== roundIndex + 1) {
      errors.push({
        code: 'INCORRECT_ROUND_NUMBER',
        message: `ลำดับรอบที่ ${roundIndex + 1} ต้องใช้หมายเลข ${roundIndex + 1}`,
        severity: 'error' as const,
        round: round.round,
      });
    }
    round.courts.forEach((court, courtIndex) => {
      if (court.court !== courtIndex + 1) {
        errors.push({
          code: 'INCORRECT_COURT_NUMBER',
          message: `รอบ ${round.round} ต้องเรียงหมายเลขคอร์ทตั้งแต่ 1`,
          severity: 'error' as const,
          round: round.round,
          court: court.court,
        });
      }
    });
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
