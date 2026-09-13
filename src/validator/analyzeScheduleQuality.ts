import type {
  Player,
  RuleConfig,
  Schedule,
  ScheduleConstraints,
  ScheduleQuality,
  ValidationIssue,
} from '../types';
import { matchPlayerIds, pairKey } from './utils';

interface QualityAnalysis {
  quality: ScheduleQuality;
  warnings: ValidationIssue[];
}

export function analyzeScheduleQuality(
  schedule: Schedule,
  players: Player[],
  rules: RuleConfig,
  constraints?: ScheduleConstraints,
): QualityAnalysis {
  const partnerCounts = new Map<string, number>();
  const opponentCounts = new Map<string, number>();
  const playerById = new Map(players.map((player) => [player.id, player]));
  const fixedPairKeys = new Set(
    constraints?.fixedPairs?.map((pair) => pairKey(pair.playerAId, pair.playerBId)) ?? [],
  );
  let threeMaleOneFemaleMatches = 0;

  schedule.rounds.forEach((round) => {
    round.courts.forEach((court) => {
      [court.teamA, court.teamB].forEach(([a, b]) => {
        const key = pairKey(a, b);
        partnerCounts.set(key, (partnerCounts.get(key) ?? 0) + 1);
      });
      court.teamA.forEach((a) => {
        court.teamB.forEach((b) => {
          const key = pairKey(a, b);
          opponentCounts.set(key, (opponentCounts.get(key) ?? 0) + 1);
        });
      });

      const maleCount = matchPlayerIds(court).filter(
        (id) => playerById.get(id)?.gender === 'male',
      ).length;
      if (maleCount === 3) threeMaleOneFemaleMatches += 1;
    });
  });

  const repeatedPartners = [...partnerCounts.entries()].reduce(
    (total, [key, count]) =>
      total + (fixedPairKeys.has(key) ? 0 : Math.max(0, count - 1)),
    0,
  );
  const repeatedOpponents = [...opponentCounts.values()].reduce(
    (total, count) => total + Math.max(0, count - 1),
    0,
  );

  let maxConsecutiveGames = 0;
  const restCounts: number[] = [];
  players.forEach((player) => {
    let current = 0;
    let max = 0;
    let rests = 0;
    schedule.rounds.forEach((round) => {
      const plays = round.courts.some((court) =>
        matchPlayerIds(court).includes(player.id),
      );
      current = plays ? current + 1 : 0;
      if (!plays) rests += 1;
      max = Math.max(max, current);
    });
    maxConsecutiveGames = Math.max(maxConsecutiveGames, max);
    restCounts.push(rests);
  });

  const restSpread = restCounts.length
    ? Math.max(...restCounts) - Math.min(...restCounts)
    : 0;
  const warnings: ValidationIssue[] = [];
  if (rules.avoidRepeatedPartners && repeatedPartners > 0) {
    warnings.push({
      code: 'REPEATED_PARTNER',
      message: `มีคู่ซ้ำ ${repeatedPartners} ครั้ง`,
      severity: 'warning',
    });
  }
  if (rules.avoidRepeatedOpponents && repeatedOpponents > 0) {
    warnings.push({
      code: 'REPEATED_OPPONENT',
      message: `พบคู่แข่งเดิมซ้ำ ${repeatedOpponents} ครั้ง`,
      severity: 'warning',
    });
  }
  if (rules.avoidConsecutiveGames && maxConsecutiveGames > 2) {
    warnings.push({
      code: 'TOO_MANY_CONSECUTIVE_GAMES',
      message: `เล่นติดกันสูงสุด ${maxConsecutiveGames} รอบ`,
      severity: 'warning',
    });
  }
  if (rules.avoidThreeMaleOneFemale && threeMaleOneFemaleMatches > 0) {
    warnings.push({
      code: 'THREE_MALE_ONE_FEMALE',
      message: `มีแมตช์ 3 ชาย 1 หญิง ${threeMaleOneFemaleMatches} ครั้ง`,
      severity: 'warning',
    });
  }

  return {
    quality: {
      repeatedPartners,
      repeatedOpponents,
      maxConsecutiveGames,
      threeMaleOneFemaleMatches,
      restSpread,
    },
    warnings,
  };
}
