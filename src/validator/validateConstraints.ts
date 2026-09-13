import type {
  Schedule,
  ScheduleConstraints,
  ValidationIssue,
} from '../types';
import { countGames, matchPlayerIds, pairKey } from './utils';

export function validateConstraints(
  schedule: Schedule,
  constraints: ScheduleConstraints | undefined,
  playCounts: Record<string, number>,
): ValidationIssue[] {
  if (!constraints) return [];
  const issues: ValidationIssue[] = [];

  constraints.fixedPairs?.forEach(({ playerAId, playerBId }) => {
    schedule.rounds.forEach((round) => {
      round.courts.forEach((court) => {
        const ids = matchPlayerIds(court);
        const eitherPlays = ids.includes(playerAId) || ids.includes(playerBId);
        const paired =
          pairKey(...court.teamA) === pairKey(playerAId, playerBId) ||
          pairKey(...court.teamB) === pairKey(playerAId, playerBId);
        if (eitherPlays && !paired) {
          issues.push({
            code: 'FIXED_PAIR_VIOLATED',
            message: `คู่ที่กำหนดไม่ได้เล่นด้วยกันในรอบ ${round.round}`,
            severity: 'error',
            round: round.round,
            playerIds: [playerAId, playerBId],
          });
        }
      });
    });
  });

  constraints.avoidPairs?.forEach(({ playerAId, playerBId }) => {
    schedule.rounds.forEach((round) => {
      round.courts.forEach((court) => {
        const paired =
          pairKey(...court.teamA) === pairKey(playerAId, playerBId) ||
          pairKey(...court.teamB) === pairKey(playerAId, playerBId);
        if (paired) {
          issues.push({
            code: 'AVOID_PAIR_VIOLATED',
            message: `คู่ที่ห้ามถูกจัดให้อยู่ทีมเดียวกันในรอบ ${round.round}`,
            severity: 'error',
            round: round.round,
            playerIds: [playerAId, playerBId],
          });
        }
      });
    });
  });

  constraints.forcedRests?.forEach(({ playerId, round }) => {
    const targetRound = schedule.rounds.find((item) => item.round === round);
    const plays = targetRound?.courts.some((court) =>
      matchPlayerIds(court).includes(playerId),
    );
    if (plays) {
      issues.push({
        code: 'FORCED_REST_VIOLATED',
        message: `ผู้เล่น ${playerId} ต้องพักในรอบ ${round}`,
        severity: 'error',
        round,
        playerIds: [playerId],
      });
    }
  });

  constraints.requiredPlayers?.forEach(({ playerId, round }) => {
    const targetRound = schedule.rounds.find((item) => item.round === round);
    const plays = targetRound?.courts.some((court) =>
      matchPlayerIds(court).includes(playerId),
    );
    if (!plays) {
      issues.push({
        code: 'REQUIRED_PLAYER_MISSING',
        message: `ผู้เล่น ${playerId} ต้องลงในรอบ ${round}`,
        severity: 'error',
        round,
        playerIds: [playerId],
      });
    }
  });

  constraints.maxGames?.forEach(({ playerId, maxGames }) => {
    if ((playCounts[playerId] ?? 0) > maxGames) {
      issues.push({
        code: 'MAX_GAMES_EXCEEDED',
        message: `ผู้เล่น ${playerId} เล่นเกิน ${maxGames} เกม`,
        severity: 'error',
        playerIds: [playerId],
      });
    }
  });

  return issues;
}
