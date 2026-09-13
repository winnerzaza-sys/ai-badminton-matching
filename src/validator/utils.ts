import type { CourtMatch, Player, Schedule } from '../types';

export function matchPlayerIds(match: CourtMatch): string[] {
  return [...match.teamA, ...match.teamB];
}

export function countGames(
  schedule: Schedule,
  players: Player[],
): Record<string, number> {
  const counts = Object.fromEntries(players.map((player) => [player.id, 0]));

  for (const round of schedule.rounds) {
    for (const court of round.courts) {
      for (const id of matchPlayerIds(court)) {
        if (id in counts) counts[id] += 1;
      }
    }
  }

  return counts;
}

export function pairKey(a: string, b: string): string {
  return [a, b].sort().join('::');
}
