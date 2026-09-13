import { describe, expect, it } from 'vitest';
import { calculateBalancedPlan, calculateExactCycle } from '../fairness';
import { MockScheduleGenerator } from '../generator';
import { defaultRules } from '../store/sessionStore';
import type { CourtMatch, Player, ScheduleInput } from '../types';
import { validateSchedule } from './validateSchedule';

const players = (count: number): Player[] => Array.from({ length: count }, (_, index) => ({
  id: `p${index + 1}`,
  name: `Player ${index + 1}`,
  gender: index % 2 ? 'female' : 'male',
}));

const inputFor = (count = 8, courts = 1, mode: 'balanced' | 'exact' = 'balanced'): ScheduleInput => {
  const roster = players(count);
  return {
    players: roster,
    courts,
    fairness: mode === 'balanced'
      ? calculateBalancedPlan(count, courts)
      : calculateExactCycle(count, courts),
    rules: defaultRules,
    instruction: '',
  };
};

describe('validateSchedule structural checks', () => {
  it('passes a valid balanced mock schedule', async () => {
    const input = inputFor(9);
    const schedule = await new MockScheduleGenerator().generate(input);
    const result = validateSchedule(schedule, input);
    expect(result.valid).toBe(true);
    expect(Math.min(...Object.values(result.playCounts))).toBe(2);
    expect(Math.max(...Object.values(result.playCounts))).toBe(3);
  });

  it('detects a duplicate player in a round', async () => {
    const input = inputFor(8, 2);
    const schedule = await new MockScheduleGenerator().generate(input);
    schedule.rounds[0].courts[1].teamA[0] = schedule.rounds[0].courts[0].teamA[0];
    const result = validateSchedule(schedule, input);
    expect(result.errors.some((issue) => issue.code === 'PLAYER_DUPLICATED_IN_ROUND')).toBe(true);
  });

  it('detects an invalid player ID', async () => {
    const input = inputFor();
    const schedule = await new MockScheduleGenerator().generate(input);
    schedule.rounds[0].courts[0].teamA[0] = 'missing-player';
    const result = validateSchedule(schedule, input);
    expect(result.errors.some((issue) => issue.code === 'INVALID_PLAYER_ID')).toBe(true);
  });

  it('detects an incorrect court size', async () => {
    const input = inputFor();
    const schedule = await new MockScheduleGenerator().generate(input);
    schedule.rounds[0].courts[0] = {
      court: 1,
      teamA: ['p1'] as unknown as CourtMatch['teamA'],
      teamB: ['p2', 'p3'],
    };
    const result = validateSchedule(schedule, input);
    expect(result.errors.some((issue) => issue.code === 'INCORRECT_COURT_SIZE')).toBe(true);
  });

  it('detects an incorrect round count', async () => {
    const input = inputFor();
    const schedule = await new MockScheduleGenerator().generate(input);
    schedule.rounds.pop();
    const result = validateSchedule(schedule, input);
    expect(result.errors.some((issue) => issue.code === 'INCORRECT_ROUND_COUNT')).toBe(true);
  });
});

describe('validateSchedule fairness checks', () => {
  it('passes balanced fairness and fails an unfair distribution', async () => {
    const input = inputFor(9);
    const schedule = await new MockScheduleGenerator().generate(input);
    expect(validateSchedule(schedule, input).valid).toBe(true);

    schedule.rounds.forEach((round) => {
      round.courts.forEach((court) => {
        const positions = [court.teamA, court.teamB];
        positions.forEach((team) => {
          const targetIndex = team.indexOf('p1');
          if (targetIndex >= 0) team[targetIndex] = round.restingPlayerIds[0];
        });
      });
    });
    const result = validateSchedule(schedule, input);
    expect(result.valid).toBe(false);
    expect(result.errors.some((issue) =>
      issue.code === 'GAME_COUNT_MINIMUM_NOT_MET' || issue.code === 'FAIRNESS_DIFFERENCE_EXCEEDED',
    )).toBe(true);
  });

  it('passes exact fairness and fails unequal game counts', async () => {
    const input = inputFor(10, 1, 'exact');
    const schedule = await new MockScheduleGenerator().generate(input);
    expect(validateSchedule(schedule, input).valid).toBe(true);

    schedule.rounds[0].courts[0].teamA[0] = schedule.rounds[0].restingPlayerIds[0];
    const result = validateSchedule(schedule, input);
    expect(result.valid).toBe(false);
    expect(result.errors.some((issue) => issue.code === 'EXACT_GAME_COUNT_MISMATCH')).toBe(true);
  });
});
