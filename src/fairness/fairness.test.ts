import { describe, expect, it } from 'vitest';
import { calculateBalancedPlan, calculateExactCycle } from './index';

describe('calculateBalancedPlan', () => {
  const cases = [
    [8, 4, 2, 2],
    [9, 5, 2, 3],
    [10, 5, 2, 2],
    [11, 6, 2, 3],
    [12, 6, 2, 2],
    [13, 7, 2, 3],
    [14, 7, 2, 2],
    [15, 8, 2, 3],
    [16, 8, 2, 2],
  ] as const;

  it.each(cases)(
    '%i players / 1 court → %i rounds and %i–%i games',
    (players, rounds, minGames, maxGames) => {
      expect(calculateBalancedPlan(players, 1)).toMatchObject({
        mode: 'balanced',
        totalRounds: rounds,
        minimumGamesPerPlayer: 2,
        allowedGameDifference: 1,
        minGames,
        maxGames,
      });
    },
  );

  it('supports multiple courts when enough players are available', () => {
    expect(calculateBalancedPlan(16, 2)).toMatchObject({
      totalRounds: 4,
      minGames: 2,
      maxGames: 2,
    });
  });

  it('rejects a court count that cannot be filled', () => {
    expect(() => calculateBalancedPlan(7, 2)).toThrow(/enough players/i);
  });
});

describe('calculateExactCycle', () => {
  const cases = [
    [8, 2, 1],
    [9, 9, 4],
    [10, 5, 2],
    [11, 11, 4],
    [12, 3, 1],
    [13, 13, 4],
    [14, 7, 2],
    [15, 15, 4],
    [16, 4, 1],
  ] as const;

  it.each(cases)(
    '%i players / 1 court → %i rounds and %i games each',
    (players, rounds, gamesPerPlayer) => {
      expect(calculateExactCycle(players, 1)).toMatchObject({
        mode: 'exact',
        totalRounds: rounds,
        gamesPerPlayer,
        allowedGameDifference: 0,
        minGames: gamesPerPlayer,
        maxGames: gamesPerPlayer,
      });
    },
  );
});
