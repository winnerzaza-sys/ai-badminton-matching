import type { FairnessConfig } from './fairness';
import type { Player } from './player';
import type { RuleConfig, ScheduleConstraints } from './rules';

export interface CourtMatch {
  court: number;
  teamA: [string, string];
  teamB: [string, string];
}

export interface Round {
  round: number;
  courts: CourtMatch[];
  restingPlayerIds: string[];
}

export interface Schedule {
  id: string;
  generatedAt: string;
  rounds: Round[];
}

export interface ScheduleInput {
  players: Player[];
  courts: number;
  rules: RuleConfig;
  fairness: FairnessConfig;
  instruction: string;
  constraints?: ScheduleConstraints;
  variant?: number;
}

export interface ScheduleGenerator {
  generate(input: ScheduleInput): Promise<Schedule>;
}
