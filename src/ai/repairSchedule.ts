import type { Schedule, ScheduleInput, ValidationResult } from '../types';
import { validateSchedule } from '../validator';

const FAIRNESS_ERROR_CODES = new Set([
  'GAME_COUNT_MINIMUM_NOT_MET',
  'FAIRNESS_DIFFERENCE_EXCEEDED',
  'EXACT_GAME_COUNT_MISMATCH',
]);

function cloneSchedule(schedule: Schedule): Schedule {
  return {
    ...schedule,
    rounds: schedule.rounds.map((round) => ({
      ...round,
      courts: round.courts.map((court) => ({
        ...court,
        teamA: [...court.teamA],
        teamB: [...court.teamB],
      })),
      restingPlayerIds: [...round.restingPlayerIds],
    })),
  };
}

function refreshRestingPlayers(schedule: Schedule, input: ScheduleInput): void {
  schedule.rounds.forEach((round) => {
    const activeIds = new Set(
      round.courts.flatMap((court) => [...court.teamA, ...court.teamB]),
    );
    round.restingPlayerIds = input.players
      .map((player) => player.id)
      .filter((id) => !activeIds.has(id));
  });
}

function hasOnlyFairnessErrors(validation: ValidationResult): boolean {
  return validation.errors.length > 0 &&
    validation.errors.every((error) => FAIRNESS_ERROR_CODES.has(error.code));
}

function findTransferCandidates(
  validation: ValidationResult,
  input: ScheduleInput,
): { underplayed: string[]; overplayed: string[] } {
  const counts = validation.playCounts;
  const byCountAscending = [...input.players]
    .sort((a, b) => (counts[a.id] ?? 0) - (counts[b.id] ?? 0));
  const byCountDescending = [...byCountAscending].reverse();

  if (input.fairness.mode === 'exact') {
    const target = input.fairness.gamesPerPlayer;
    return {
      underplayed: byCountAscending
        .filter((player) => (counts[player.id] ?? 0) < target)
        .map((player) => player.id),
      overplayed: byCountDescending
        .filter((player) => (counts[player.id] ?? 0) > target)
        .map((player) => player.id),
    };
  }

  const minimum = Math.min(...Object.values(counts));
  const maximum = Math.max(...Object.values(counts));
  const requiredMinimum = input.fairness.minimumGamesPerPlayer;
  const belowRequired = minimum < requiredMinimum;

  return {
    underplayed: byCountAscending
      .filter((player) => belowRequired
        ? (counts[player.id] ?? 0) < requiredMinimum
        : (counts[player.id] ?? 0) === minimum)
      .map((player) => player.id),
    overplayed: byCountDescending
      .filter((player) => belowRequired
        ? (counts[player.id] ?? 0) > requiredMinimum
        : (counts[player.id] ?? 0) === maximum)
      .map((player) => player.id),
  };
}

function replacePlayerInRound(
  schedule: Schedule,
  roundIndex: number,
  outgoingId: string,
  incomingId: string,
): boolean {
  const round = schedule.rounds[roundIndex];
  for (const court of round.courts) {
    for (const team of [court.teamA, court.teamB]) {
      const playerIndex = team.indexOf(outgoingId);
      if (playerIndex >= 0) {
        team[playerIndex] = incomingId;
        return true;
      }
    }
  }
  return false;
}

/**
 * Repairs fairness-only failures without asking the language model to count again.
 * Every accepted swap is revalidated so structural and explicit hard constraints
 * can never be traded for a fairer play count.
 */
export function repairScheduleDeterministically(
  schedule: Schedule,
  input: ScheduleInput,
): Schedule | null {
  // Free-form instructions are not machine-validated until MVP 8. Avoid a
  // silent swap that could contradict an instruction we cannot yet prove.
  if (input.instruction.trim()) return null;

  let working = cloneSchedule(schedule);
  let validation = validateSchedule(working, input);
  if (validation.valid) return working;
  if (!hasOnlyFairnessErrors(validation)) return null;

  const maxSwaps = input.players.length * input.fairness.totalRounds;
  for (let swapCount = 0; swapCount < maxSwaps; swapCount += 1) {
    const { underplayed, overplayed } = findTransferCandidates(validation, input);
    let accepted: { schedule: Schedule; validation: ValidationResult } | null = null;

    for (const incomingId of underplayed) {
      for (const outgoingId of overplayed) {
        for (let roundIndex = 0; roundIndex < working.rounds.length; roundIndex += 1) {
          const round = working.rounds[roundIndex];
          const activeIds = new Set(
            round.courts.flatMap((court) => [...court.teamA, ...court.teamB]),
          );
          if (!activeIds.has(outgoingId) || activeIds.has(incomingId)) continue;

          const candidate = cloneSchedule(working);
          if (!replacePlayerInRound(candidate, roundIndex, outgoingId, incomingId)) continue;
          refreshRestingPlayers(candidate, input);
          const candidateValidation = validateSchedule(candidate, input);
          const introducesHardError = candidateValidation.errors
            .some((error) => !FAIRNESS_ERROR_CODES.has(error.code));
          if (!introducesHardError) {
            accepted = { schedule: candidate, validation: candidateValidation };
            break;
          }
        }
        if (accepted) break;
      }
      if (accepted) break;
    }

    if (!accepted) return null;
    working = accepted.schedule;
    validation = accepted.validation;
    if (validation.valid) {
      return {
        ...working,
        id: `${schedule.id}-auto-repaired`,
        generatedAt: new Date().toISOString(),
      };
    }
  }

  return null;
}
