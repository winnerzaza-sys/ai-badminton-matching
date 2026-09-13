import type { BalancedFairnessConfig } from '../types';

export function calculateBalancedPlan(
  playerCount: number,
  courts: number,
  minimumGamesPerPlayer = 2,
): BalancedFairnessConfig {
  if (!Number.isInteger(playerCount) || playerCount < 1) {
    throw new Error('playerCount must be a positive integer');
  }
  if (!Number.isInteger(courts) || courts < 1) {
    throw new Error('courts must be a positive integer');
  }

  const slotsPerRound = courts * 4;
  if (playerCount < slotsPerRound) {
    throw new Error('Not enough players to fill every court');
  }

  const totalRounds = Math.ceil(
    (playerCount * minimumGamesPerPlayer) / slotsPerRound,
  );
  const totalSlots = totalRounds * slotsPerRound;

  return {
    mode: 'balanced',
    totalRounds,
    minimumGamesPerPlayer,
    allowedGameDifference: 1,
    minGames: Math.floor(totalSlots / playerCount),
    maxGames: Math.ceil(totalSlots / playerCount),
  };
}
