import { useEffect, useMemo, useRef, useState } from 'react';
import {
  GeminiScheduleGenerator,
  generateValidatedSchedule,
  ScheduleGenerationError,
  type AIProgress,
} from './ai';
import { ConfigPanel } from './components/ConfigPanel';
import { FairnessPreview } from './components/FairnessPreview';
import { PlayerPanel } from './components/PlayerPanel';
import { ScheduleSummary } from './components/ScheduleSummary';
import { ScheduleView } from './components/ScheduleView';
import { calculateBalancedPlan, calculateExactCycle } from './fairness';
import { BrandMark, ChartIcon, CourtIcon, UsersIcon } from './lib/icons';
import { useSessionStore } from './store/sessionStore';
import type { FairnessConfig, Schedule, ValidationResult } from './types';

const generator = new GeminiScheduleGenerator();
const initialAIProgress: AIProgress = {
  status: 'idle',
  connectionProgress: 0,
  repairAttempt: 0,
};

function App() {
  const [session, setSession] = useSessionStore();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [aiProgress, setAIProgress] = useState<AIProgress>(initialAIProgress);
  const [generationError, setGenerationError] = useState('');
  const variantRef = useRef(0);
  const generationInFlightRef = useRef(false);
  const isGenerating = ['connecting', 'generating', 'validating', 'repairing'].includes(aiProgress.status);

  useEffect(() => {
    const maxCourts = Math.max(1, Math.floor(session.players.length / 4));
    if (session.courts > maxCourts) {
      setSession((current) => ({ ...current, courts: maxCourts }));
    }
  }, [session.players.length, session.courts, setSession]);

  const { fairness, fairnessError } = useMemo((): {
    fairness: FairnessConfig | null;
    fairnessError?: string;
  } => {
    if (session.players.length < session.courts * 4) {
      return {
        fairness: null,
        fairnessError: `ต้องมีอย่างน้อย ${session.courts * 4} คนสำหรับ ${session.courts} คอร์ท`,
      };
    }
    try {
      return {
        fairness: session.fairnessMode === 'balanced'
          ? calculateBalancedPlan(session.players.length, session.courts)
          : calculateExactCycle(session.players.length, session.courts),
      };
    } catch (error) {
      return { fairness: null, fairnessError: error instanceof Error ? error.message : 'ตั้งค่าไม่ถูกต้อง' };
    }
  }, [session.courts, session.fairnessMode, session.players.length]);

  const generateSchedule = async (preferLocal: boolean) => {
    if (!fairness || generationInFlightRef.current) return;
    generationInFlightRef.current = true;
    setGenerationError('');
    setSchedule(null);
    setValidation(null);
    setAIProgress({ status: 'connecting', connectionProgress: 0, repairAttempt: 0 });
    variantRef.current += 1;
    const input = {
      players: session.players,
      courts: session.courts,
      rules: session.rules,
      fairness,
      instruction: session.instruction,
      variant: variantRef.current,
    };

    try {
      const result = await generateValidatedSchedule(
        generator,
        input,
        setAIProgress,
        { preferLocal },
      );
      setSchedule(result.schedule);
      setValidation(result.validation);
      window.setTimeout(() => {
        document.getElementById('schedule')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } catch (error) {
      setAIProgress((current) => ({ ...current, status: 'failed' }));
      if (error instanceof ScheduleGenerationError) {
        setValidation(error.validation);
        const details = error.validation?.errors
          .slice(0, 2)
          .map((issue) => issue.message)
          .join(' • ');
        setGenerationError(details ? `${error.message} (${details})` : error.message);
      } else {
        setGenerationError(error instanceof Error ? error.message : 'ไม่สามารถจัดตารางได้');
      }
    } finally {
      generationInFlightRef.current = false;
    }
  };

  const generate = () => generateSchedule(false);
  const regenerate = () => generateSchedule(true);

  const editRules = () => {
    document.getElementById('rules')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="#players" aria-label="Badminton AI หน้าแรก">
          <BrandMark />
          <span><strong>Badminton AI</strong><small>จัดคู่ให้สนุก เล่นกันได้ทุกคน</small></span>
        </a>
        <div className="header-badge">♙ AI ช่วยจัดตารางแบดมินตัน</div>
        <div className="session-card"><span>●</span><div><strong>เซสชันวันนี้</strong><small>พร้อมจัดตาราง</small></div></div>
        <button className="settings-button" type="button" onClick={editRules} aria-label="ไปที่ตั้งค่า">⚙</button>
      </header>

      <main className="workspace">
        <div className="setup-column">
          <PlayerPanel
            players={session.players}
            onChange={(players) => setSession((current) => ({ ...current, players }))}
          />
          <ConfigPanel
            playerCount={session.players.length}
            courts={session.courts}
            rules={session.rules}
            fairnessMode={session.fairnessMode}
            instruction={session.instruction}
            onCourtsChange={(courts) => setSession((current) => ({ ...current, courts }))}
            onRulesChange={(rules) => setSession((current) => ({ ...current, rules }))}
            onFairnessModeChange={(fairnessMode) => setSession((current) => ({ ...current, fairnessMode }))}
            onInstructionChange={(instruction) => setSession((current) => ({ ...current, instruction }))}
          />
        </div>

        <div className="schedule-column">
          <FairnessPreview
            playerCount={session.players.length}
            courts={session.courts}
            fairness={fairness}
            error={fairnessError}
          />
          <button
            className="mobile-generate"
            type="button"
            disabled={!fairness || isGenerating}
            onClick={schedule ? regenerate : generate}
          ><span>✦</span>{schedule ? 'จัดตารางใหม่' : 'AI จัดตาราง'}</button>
          {generationError && <div className="inline-error" role="alert">{generationError}</div>}
          <ScheduleView
            schedule={schedule}
            players={session.players}
            validation={validation}
            aiProgress={aiProgress}
          />
        </div>

        <ScheduleSummary
          players={session.players}
          courts={session.courts}
          fairness={fairness}
          schedule={schedule}
          validation={validation}
          canGenerate={Boolean(fairness) && !isGenerating}
          onGenerate={generate}
          onRegenerate={regenerate}
          onEdit={editRules}
        />
      </main>

      <nav className="mobile-nav" aria-label="เมนูหลัก">
        <a href="#players"><UsersIcon /><span>ผู้เล่น</span></a>
        <a href="#rules"><CourtIcon /><span>กติกา</span></a>
        <a href="#schedule"><span className="nav-calendar">▦</span><span>ตาราง</span></a>
        <a href="#summary"><ChartIcon /><span>สรุป</span></a>
      </nav>
    </div>
  );
}

export default App;
