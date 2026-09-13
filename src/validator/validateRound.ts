import type { Player, Round, ValidationIssue } from '../types';
import { matchPlayerIds } from './utils';

export function validateRound(
  round: Round,
  players: Player[],
  requiredCourtCount: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const validIds = new Set(players.map((player) => player.id));
  const seenInRound = new Set<string>();

  if (round.courts.length !== requiredCourtCount) {
    issues.push({
      code: 'INCORRECT_COURT_COUNT',
      message: `รอบ ${round.round} มี ${round.courts.length} คอร์ท แต่ต้องมี ${requiredCourtCount} คอร์ท`,
      severity: 'error',
      round: round.round,
    });
  }

  round.courts.forEach((court) => {
    const ids = matchPlayerIds(court);

    if (ids.length !== 4) {
      issues.push({
        code: 'INCORRECT_COURT_SIZE',
        message: `รอบ ${round.round} คอร์ท ${court.court} ต้องมีผู้เล่น 4 คน`,
        severity: 'error',
        round: round.round,
        court: court.court,
      });
    }

    const duplicateInCourt = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateInCourt.length > 0) {
      issues.push({
        code: 'PLAYER_DUPLICATED_IN_COURT',
        message: `มีผู้เล่นซ้ำในรอบ ${round.round} คอร์ท ${court.court}`,
        severity: 'error',
        round: round.round,
        court: court.court,
        playerIds: [...new Set(duplicateInCourt)],
      });
    }

    for (const id of ids) {
      if (!validIds.has(id)) {
        issues.push({
          code: 'INVALID_PLAYER_ID',
          message: `ไม่พบผู้เล่นรหัส ${id}`,
          severity: 'error',
          round: round.round,
          court: court.court,
          playerIds: [id],
        });
      }

      if (seenInRound.has(id)) {
        issues.push({
          code: 'PLAYER_DUPLICATED_IN_ROUND',
          message: `ผู้เล่น ${id} ลงมากกว่าหนึ่งครั้งในรอบ ${round.round}`,
          severity: 'error',
          round: round.round,
          playerIds: [id],
        });
      }
      seenInRound.add(id);
    }
  });

  return issues;
}
