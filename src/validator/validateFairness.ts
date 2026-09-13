import type {
  FairnessConfig,
  Player,
  ValidationIssue,
} from '../types';

export function validateFairness(
  playCounts: Record<string, number>,
  players: Player[],
  fairness: FairnessConfig,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const counts = players.map((player) => playCounts[player.id] ?? 0);

  if (fairness.mode === 'exact') {
    players.forEach((player) => {
      if ((playCounts[player.id] ?? 0) !== fairness.gamesPerPlayer) {
        issues.push({
          code: 'EXACT_GAME_COUNT_MISMATCH',
          message: `${player.name} เล่น ${playCounts[player.id] ?? 0} เกม แต่ต้องเล่น ${fairness.gamesPerPlayer} เกม`,
          severity: 'error',
          playerIds: [player.id],
        });
      }
    });
    return issues;
  }

  players.forEach((player) => {
    if ((playCounts[player.id] ?? 0) < fairness.minimumGamesPerPlayer) {
      issues.push({
        code: 'GAME_COUNT_MINIMUM_NOT_MET',
        message: `${player.name} เล่นไม่ถึงขั้นต่ำ ${fairness.minimumGamesPerPlayer} เกม`,
        severity: 'error',
        playerIds: [player.id],
      });
    }
  });

  const min = Math.min(...counts);
  const max = Math.max(...counts);
  if (max - min > fairness.allowedGameDifference) {
    issues.push({
      code: 'FAIRNESS_DIFFERENCE_EXCEEDED',
      message: `จำนวนเกมสูงสุด ${max} และต่ำสุด ${min} ต่างกันเกิน ${fairness.allowedGameDifference} เกม`,
      severity: 'error',
    });
  }

  return issues;
}
