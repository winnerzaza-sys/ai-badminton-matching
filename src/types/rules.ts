export interface RuleConfig {
  avoidRepeatedPartners: boolean;
  avoidRepeatedOpponents: boolean;
  avoidThreeMaleOneFemale: boolean;
  avoidTwoMaleSameTeam: boolean;
  spreadRest: boolean;
  avoidConsecutiveGames: boolean;
  prioritizeLongestRest: boolean;
  allowAllMaleMatch: boolean;
  allowAllFemaleMatch: boolean;
}

export interface PairConstraint {
  playerAId: string;
  playerBId: string;
}

export interface RoundPlayerConstraint {
  round: number;
  playerId: string;
}

export interface MaxGamesConstraint {
  playerId: string;
  maxGames: number;
}

export interface ScheduleConstraints {
  fixedPairs?: PairConstraint[];
  avoidPairs?: PairConstraint[];
  forcedRests?: RoundPlayerConstraint[];
  requiredPlayers?: RoundPlayerConstraint[];
  maxGames?: MaxGamesConstraint[];
}
