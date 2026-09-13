import type {
  CourtMatch,
  Round,
  Schedule,
  ScheduleGenerator,
  ScheduleInput,
} from '../types';

/**
 * Deterministic stand-in for the future Qwen generator. It fills a rotating
 * window of player slots, which guarantees the pre-calculated fairness target.
 */
export class MockScheduleGenerator implements ScheduleGenerator {
  async generate(input: ScheduleInput): Promise<Schedule> {
    const { players, courts, fairness, variant = 0 } = input;
    const slotsPerRound = courts * 4;
    if (players.length < slotsPerRound) {
      throw new Error('มีผู้เล่นไม่พอสำหรับจำนวนคอร์ทที่เลือก');
    }

    const ids = players.map((player) => player.id);
    const offset = ((variant % ids.length) + ids.length) % ids.length;
    const rotated = [...ids.slice(offset), ...ids.slice(0, offset)];
    const rounds: Round[] = [];

    for (let roundIndex = 0; roundIndex < fairness.totalRounds; roundIndex += 1) {
      const selected = Array.from({ length: slotsPerRound }, (_, slotIndex) => {
        const index = (roundIndex * slotsPerRound + slotIndex) % rotated.length;
        return rotated[index];
      });
      const courtsForRound: CourtMatch[] = Array.from(
        { length: courts },
        (_, courtIndex) => {
          const start = courtIndex * 4;
          const courtPlayers = selected.slice(start, start + 4);
          const swapTeams = (roundIndex + courtIndex + variant) % 2 === 1;
          return {
            court: courtIndex + 1,
            teamA: swapTeams
              ? [courtPlayers[0], courtPlayers[2]]
              : [courtPlayers[0], courtPlayers[1]],
            teamB: swapTeams
              ? [courtPlayers[1], courtPlayers[3]]
              : [courtPlayers[2], courtPlayers[3]],
          };
        },
      );
      const selectedSet = new Set(selected);
      rounds.push({
        round: roundIndex + 1,
        courts: courtsForRound,
        restingPlayerIds: ids.filter((id) => !selectedSet.has(id)),
      });
    }

    return {
      id: `mock-${Date.now()}-${variant}`,
      generatedAt: new Date().toISOString(),
      rounds,
    };
  }
}
