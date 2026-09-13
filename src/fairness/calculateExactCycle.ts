import type { ExactFairnessConfig } from '../types';
import { gcd } from './gcd';

export function calculateExactCycle(
  playerCount: number,
  courts: number,
): ExactFairnessConfig {
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

  const divisor = gcd(playerCount, slotsPerRound);
  const totalRounds = playerCount / divisor;
  const gamesPerPlayer = slotsPerRound / divisor;

  return {
    mode: 'exact',
    totalRounds,
    gamesPerPlayer,
    allowedGameDifference: 0,
    minGames: gamesPerPlayer,
    maxGames: gamesPerPlayer,
  };
}
