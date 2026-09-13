import type {
  FairnessConfig,
  Player,
  Schedule,
  ValidationResult,
} from '../types';
import { ChartIcon, CheckIcon, RefreshIcon } from '../lib/icons';

interface ScheduleSummaryProps {
  players: Player[];
  courts: number;
  fairness: FairnessConfig | null;
  schedule: Schedule | null;
  validation: ValidationResult | null;
  canGenerate: boolean;
  onGenerate: () => void;
  onEdit: () => void;
}

export function ScheduleSummary(props: ScheduleSummaryProps) {
  const gameLabel = props.fairness
    ? props.fairness.minGames === props.fairness.maxGames
      ? `${props.fairness.minGames} เกม`
      : `${props.fairness.minGames}–${props.fairness.maxGames} เกม`
    : '—';

  return (
    <aside className="panel summary-panel" id="summary" aria-labelledby="summary-title">
      <div className="panel-heading summary-heading">
        <span className="section-icon blue"><ChartIcon /></span>
        <div><h2 id="summary-title">สรุป</h2><p>ภาพรวมและความยุติธรรม</p></div>
      </div>

      <div className="summary-stats">
        <div className="mint"><strong>{props.players.length}</strong><span>ผู้เล่น</span></div>
        <div className="blue"><strong>{props.courts}</strong><span>คอร์ท</span></div>
        <div className="violet"><strong>{props.fairness?.totalRounds ?? '—'}</strong><span>รอบ</span></div>
        <div className="amber"><strong>{gameLabel}</strong><span>ต่อคน</span></div>
      </div>

      {props.validation ? (
        <div className={props.validation.valid ? 'validation-card valid' : 'validation-card invalid'}>
          <span>{props.validation.valid ? <CheckIcon /> : '!'}</span>
          <div>
            <strong>{props.validation.valid ? 'ตารางผ่านการตรวจสอบ' : 'ตารางยังไม่สมบูรณ์'}</strong>
            <small>{props.validation.valid ? 'จำนวนเกมสมดุลและโครงสร้างถูกต้อง' : `${props.validation.errors.length} จุดที่ต้องแก้ไข`}</small>
          </div>
        </div>
      ) : (
        <div className="validation-card pending">
          <span>○</span><div><strong>พร้อมจัดตาราง</strong><small>ระบบจะตรวจทุกเกมก่อนแสดงผล</small></div>
        </div>
      )}

      {props.validation && (
        <>
          <div className="quality-block">
            <h3>สถิติคุณภาพตาราง</h3>
            <dl>
              <div><dt><span>⌘</span> คู่ซ้ำ</dt><dd>{props.validation.quality.repeatedPartners} ครั้ง</dd></div>
              <div><dt><span>⌁</span> คู่แข่งเดิมซ้ำ</dt><dd>{props.validation.quality.repeatedOpponents} ครั้ง</dd></div>
              <div><dt><span>◴</span> เล่นติดกันสูงสุด</dt><dd>{props.validation.quality.maxConsecutiveGames} รอบ</dd></div>
              <div><dt><span>♙</span> การกระจายพัก</dt><dd>{props.validation.quality.restSpread <= 1 ? 'ดี' : 'ควรปรับ'}</dd></div>
            </dl>
          </div>

          <div className="player-counts">
            <h3>จำนวนเกมต่อคน</h3>
            {props.players.map((player) => (
              <div key={player.id}>
                <span className={player.gender}>{player.gender === 'male' ? '♂' : '♀'}</span>
                <span>{player.name}</span>
                <strong>{props.validation?.playCounts[player.id] ?? 0}</strong>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="summary-actions">
        <button
          type="button"
          className="primary-action"
          disabled={!props.canGenerate}
          onClick={props.onGenerate}
        ><span>✦</span>{props.schedule ? 'จัดตารางใหม่' : 'AI จัดตาราง'}<small>ปรับตามผู้เล่นและกติกา</small></button>
        {props.schedule && (
          <div className="secondary-actions">
            <button type="button" onClick={props.onGenerate}><RefreshIcon /> สุ่มใหม่</button>
            <button type="button" onClick={props.onEdit}>✎ แก้กติกา</button>
          </div>
        )}
      </div>
    </aside>
  );
}
