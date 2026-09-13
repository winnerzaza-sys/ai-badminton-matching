import type { FairnessConfig } from '../types';
import { CheckIcon, CourtIcon, RefreshIcon, UsersIcon } from '../lib/icons';

interface FairnessPreviewProps {
  playerCount: number;
  courts: number;
  fairness: FairnessConfig | null;
  error?: string;
}

export function FairnessPreview({ playerCount, courts, fairness, error }: FairnessPreviewProps) {
  if (!fairness) {
    return (
      <section className="fairness-preview invalid" aria-live="polite">
        <strong>ยังจัดตารางไม่ได้</strong>
        <p>{error ?? 'เพิ่มผู้เล่นให้ครบตามจำนวนคอร์ท'}</p>
      </section>
    );
  }
  const gameLabel = fairness.minGames === fairness.maxGames
    ? `${fairness.minGames} เกม`
    : `${fairness.minGames}–${fairness.maxGames} เกม`;

  return (
    <section className="fairness-preview" aria-labelledby="preview-title">
      <div className="preview-heading">
        <div><span className="sparkle-dot">✦</span><h2 id="preview-title">ตารางที่แนะนำ</h2></div>
        <span className="fair-badge"><CheckIcon /> สมดุล ยุติธรรม</span>
      </div>
      <div className="preview-grid">
        <div><UsersIcon /><span><small>ผู้เล่น</small><strong>{playerCount} คน</strong></span></div>
        <div><CourtIcon /><span><small>คอร์ท</small><strong>{courts}</strong></span></div>
        <div><RefreshIcon /><span><small>รอบทั้งหมด</small><strong>{fairness.totalRounds} รอบ</strong></span></div>
        <div><span className="games-icon">◉</span><span><small>แต่ละคนเล่น</small><strong>{gameLabel}</strong></span></div>
      </div>
      <p className="preview-note">
        {fairness.mode === 'exact'
          ? `ทุกคนเล่น ${fairness.gamesPerPlayer} เกมเท่ากัน`
          : `จำนวนเกมต่างกันไม่เกิน ${fairness.allowedGameDifference} เกม`}
      </p>
    </section>
  );
}
