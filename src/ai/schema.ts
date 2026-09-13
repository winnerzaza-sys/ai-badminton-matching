import type { CourtMatch, Round, Schedule } from '../types';

export const AI_SCHEDULE_JSON_SCHEMA = JSON.stringify({
  type: 'object',
  additionalProperties: false,
  required: ['rounds'],
  properties: {
    rounds: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['round', 'courts', 'restingPlayerIds'],
        properties: {
          round: { type: 'integer', minimum: 1 },
          courts: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['court', 'teamA', 'teamB'],
              properties: {
                court: { type: 'integer', minimum: 1 },
                teamA: {
                  type: 'array',
                  minItems: 2,
                  maxItems: 2,
                  items: { type: 'string' },
                },
                teamB: {
                  type: 'array',
                  minItems: 2,
                  maxItems: 2,
                  items: { type: 'string' },
                },
              },
            },
          },
          restingPlayerIds: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPair(value: unknown, path: string): [string, string] {
  if (!Array.isArray(value) || value.length !== 2 || value.some((id) => typeof id !== 'string')) {
    throw new Error(`${path} must contain exactly two player IDs`);
  }
  return [value[0] as string, value[1] as string];
}

function readCourt(value: unknown, path: string): CourtMatch {
  if (!isRecord(value) || !Number.isInteger(value.court)) {
    throw new Error(`${path} is not a valid court`);
  }
  return {
    court: value.court as number,
    teamA: readPair(value.teamA, `${path}.teamA`),
    teamB: readPair(value.teamB, `${path}.teamB`),
  };
}

function readRound(value: unknown, index: number): Round {
  const path = `rounds[${index}]`;
  if (!isRecord(value) || !Number.isInteger(value.round) || !Array.isArray(value.courts)) {
    throw new Error(`${path} is not a valid round`);
  }
  if (!Array.isArray(value.restingPlayerIds) || value.restingPlayerIds.some((id) => typeof id !== 'string')) {
    throw new Error(`${path}.restingPlayerIds must be an array of player IDs`);
  }
  return {
    round: value.round as number,
    courts: value.courts.map((court, courtIndex) => readCourt(court, `${path}.courts[${courtIndex}]`)),
    restingPlayerIds: value.restingPlayerIds as string[],
  };
}

function extractJSONObject(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  throw new Error('AI did not return a JSON schedule');
}

export function parseAISchedule(content: string): Schedule {
  let value: unknown;
  try {
    value = JSON.parse(extractJSONObject(content));
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message === 'AI did not return a JSON schedule'
        ? error.message
        : 'AI returned malformed schedule JSON',
    );
  }

  if (!isRecord(value) || !Array.isArray(value.rounds)) {
    throw new Error('AI schedule must contain a rounds array');
  }

  return {
    id: `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    generatedAt: new Date().toISOString(),
    rounds: value.rounds.map(readRound),
  };
}
