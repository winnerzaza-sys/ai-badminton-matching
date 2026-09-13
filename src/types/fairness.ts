export type FairnessMode = 'balanced' | 'exact';

export interface BalancedFairnessConfig {
  mode: 'balanced';
  totalRounds: number;
  minimumGamesPerPlayer: number;
  allowedGameDifference: 1;
  minGames: number;
  maxGames: number;
}

export interface ExactFairnessConfig {
  mode: 'exact';
  totalRounds: number;
  gamesPerPlayer: number;
  allowedGameDifference: 0;
  minGames: number;
  maxGames: number;
}

export type FairnessConfig = BalancedFairnessConfig | ExactFairnessConfig;
