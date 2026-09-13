import type {
  CourtMatch,
  Round,
  Schedule,
  ScheduleGenerator,
  ScheduleInput,
} from '../types';

function interleaveByGender(players: ScheduleInput['players']) {
  const male = players.filter((player) => player.gender === 'male');
  const female = players.filter((player) => player.gender === 'female');
  const interleaved: ScheduleInput['players'] = [];
  const length = Math.max(male.length, female.length);

  for (let index = 0; index < length; index += 1) {
    if (male[index]) interleaved.push(male[index]);
    if (female[index]) interleaved.push(female[index]);
  }

  return interleaved;
}

function createTeams(
  courtPlayers: string[],
  playerById: Map<string, ScheduleInput['players'][number]>,
  avoidTwoMaleSameTeam: boolean,
  alternate: boolean,
): Pick<CourtMatch, 'teamA' | 'teamB'> {
  if (avoidTwoMaleSameTeam) {
    const male = courtPlayers.filter((id) => playerById.get(id)?.gender === 'male');
    const female = courtPlayers.filter((id) => playerById.get(id)?.gender === 'female');

    if (male.length === 2 && female.length === 2) {
      return alternate
        ? { teamA: [male[0], female[1]], teamB: [male[1], female[0]] }
        : { teamA: [male[0], female[0]], teamB: [male[1], female[1]] };
    }
    if (male.length === 1 && female.length === 3) {
      const partnerIndex = alternate ? 1 : 0;
      const remainingFemale = female.filter((_, index) => index !== partnerIndex);
      return {
        teamA: [male[0], female[partnerIndex]],
        teamB: [remainingFemale[0], remainingFemale[1]],
      };
    }
    if (male.length === 3 && female.length === 1) {
      const partnerIndex = alternate ? 1 : 0;
      const remainingMale = male.filter((_, index) => index !== partnerIndex);
      return {
        teamA: [male[partnerIndex], female[0]],
        teamB: [remainingMale[0], remainingMale[1]],
      };
    }
  }

  return alternate
    ? { teamA: [courtPlayers[0], courtPlayers[2]], teamB: [courtPlayers[1], courtPlayers[3]] }
    : { teamA: [courtPlayers[0], courtPlayers[1]], teamB: [courtPlayers[2], courtPlayers[3]] };
}

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
    const playerById = new Map(players.map((player) => [player.id, player]));
    const orderedPlayers = input.rules.avoidTwoMaleSameTeam
      ? interleaveByGender(players)
      : players;
    const orderedIds = orderedPlayers.map((player) => player.id);
    const offset = ((variant % ids.length) + ids.length) % ids.length;
    const rotated = [...orderedIds.slice(offset), ...orderedIds.slice(0, offset)];
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
            ...createTeams(
              courtPlayers,
              playerById,
              input.rules.avoidTwoMaleSameTeam,
              swapTeams,
            ),
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
