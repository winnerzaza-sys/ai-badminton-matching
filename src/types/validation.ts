export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  code: string;
  message: string;
  severity: ValidationSeverity;
  round?: number;
  court?: number;
  playerIds?: string[];
}

export interface ScheduleQuality {
  repeatedPartners: number;
  repeatedOpponents: number;
  maxConsecutiveGames: number;
  threeMaleOneFemaleMatches: number;
  maleMaleTeams: number;
  restSpread: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  playCounts: Record<string, number>;
  quality: ScheduleQuality;
}
