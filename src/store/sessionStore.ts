import { useEffect, useState } from 'react';
import type { FairnessMode, Player, RuleConfig } from '../types';

export interface SessionState {
  players: Player[];
  courts: number;
  rules: RuleConfig;
  fairnessMode: FairnessMode;
  instruction: string;
}

const STORAGE_KEY = 'badminton-ai-session-v1';

export const defaultRules: RuleConfig = {
  avoidRepeatedPartners: true,
  avoidRepeatedOpponents: true,
  avoidThreeMaleOneFemale: true,
  spreadRest: true,
  avoidConsecutiveGames: true,
  prioritizeLongestRest: true,
  allowAllMaleMatch: true,
  allowAllFemaleMatch: true,
};

export const defaultPlayers: Player[] = [
  { id: 'seed-1', name: 'พี่เขียน', gender: 'male' },
  { id: 'seed-2', name: 'โรส', gender: 'female' },
  { id: 'seed-3', name: 'โบว์', gender: 'female' },
  { id: 'seed-4', name: 'เอ็ม', gender: 'male' },
  { id: 'seed-5', name: 'เต้', gender: 'male' },
  { id: 'seed-6', name: 'แนน', gender: 'female' },
  { id: 'seed-7', name: 'ฝน', gender: 'female' },
  { id: 'seed-8', name: 'เก่ง', gender: 'male' },
];

export const defaultSession: SessionState = {
  players: defaultPlayers,
  courts: 1,
  rules: defaultRules,
  fairnessMode: 'balanced',
  instruction: '',
};

function loadSession(): SessionState {
  if (typeof window === 'undefined') return defaultSession;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSession;
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    return {
      players: Array.isArray(parsed.players) ? parsed.players : defaultPlayers,
      courts: typeof parsed.courts === 'number' ? parsed.courts : 1,
      rules: { ...defaultRules, ...parsed.rules },
      fairnessMode: parsed.fairnessMode === 'exact' ? 'exact' : 'balanced',
      instruction: typeof parsed.instruction === 'string' ? parsed.instruction : '',
    };
  } catch {
    return defaultSession;
  }
}

export function useSessionStore() {
  const [session, setSession] = useState<SessionState>(loadSession);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  return [session, setSession] as const;
}

export function createPlayer(name = 'ผู้เล่นใหม่'): Player {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `player-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { id, name, gender: 'male' };
}
