import type { ScheduleInput } from '../types';

export const SCHEDULE_SYSTEM_PROMPT = `You are an expert badminton schedule generator.
Return the COMPLETE schedule as JSON only, with no markdown or commentary.

Hard requirements, in priority order:
1. Use only supplied player IDs. Never invent or omit an ID from the roster.
2. Generate exactly the supplied totalRounds and courts per round.
3. Each court has exactly four unique players in two teams of two.
4. A player appears at most once in a round.
5. restingPlayerIds contains every and only roster player not playing in that round.
6. Follow explicit constraints and user instructions.
7. Follow the supplied exact or balanced fairness target.

After hard requirements, optimize rest distribution, consecutive games, partner variety,
opponent variety, and gender preferences in that order. Fairness is more important than
avoiding repeated partners. Fixed pairs override repeated-partner avoidance.

Output shape:
{"rounds":[{"round":1,"courts":[{"court":1,"teamA":["id","id"],"teamB":["id","id"]}],"restingPlayerIds":["id"]}]}`;

function generationPayload(input: ScheduleInput) {
  const maleCount = input.players.filter((player) => player.gender === 'male').length;
  const femaleCount = input.players.length - maleCount;
  return {
    players: input.players,
    courts: input.courts,
    fairness: input.fairness,
    rules: {
      ...input.rules,
      allowAllMaleMatch: input.rules.allowAllMaleMatch && maleCount >= 4,
      allowAllFemaleMatch: input.rules.allowAllFemaleMatch && femaleCount >= 4,
    },
    constraints: input.constraints ?? {},
    instruction: input.instruction.trim() || null,
  };
}

export function buildGenerationPrompt(input: ScheduleInput): string {
  const variantHint = input.variant
    ? `This is variation ${input.variant}. Produce a different valid arrangement when possible.`
    : '';
  return `Generate every round of the schedule from this input. ${variantHint}\n${JSON.stringify(generationPayload(input))}`;
}
