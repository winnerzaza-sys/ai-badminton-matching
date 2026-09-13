import { useEffect, useMemo, useState } from 'react';
import type { AIProgress } from '../ai';
import type { Player, Round, Schedule, ValidationResult } from '../types';
import { CheckIcon } from '../lib/icons';

interface ScheduleViewProps {
  schedule: Schedule | null;
  players: Player[];
  validation: ValidationResult | null;
  aiProgress: AIProgress;
}

function PlayerChip({ id, playerMap }: { id: string; playerMap: Map<string, Player> }) {
  const player = playerMap.get(id);
  return <span className={player?.gender === 'female' ? 'female' : 'male'}>{player?.name ?? id}</span>;
}

function RoundContent({ round, playerMap }: { round: Round; playerMap: Map<string, Player> }) {
  return (
    <div className="round-content">
      {round.courts.map((court) => (
        <article className="court-match" key={court.court}>
          <div className="court-label"><strong>คอร์ท {court.court}</strong><span>เกมที่ {round.round}</span></div>
          <div className="matchup">
            <div className="team">
              <PlayerChip id={court.teamA[0]} playerMap={playerMap} />
              <span className="plus">＋</span>
              <PlayerChip id={court.teamA[1]} playerMap={playerMap} />
            </div>
            <strong className="versus">VS</strong>
            <div className="team">
              <PlayerChip id={court.teamB[0]} playerMap={playerMap} />
              <span className="plus">＋</span>
              <PlayerChip id={court.teamB[1]} playerMap={playerMap} />
            </div>
          </div>
        </article>
      ))}
      <div className="resting">
        <span className="bench">▰</span>
        <strong>พัก</strong>
        {round.restingPlayerIds.length ? (
          <div className="resting-names">
            {round.restingPlayerIds.map((id) => (
              <PlayerChip id={id} playerMap={playerMap} key={id} />
            ))}
          </div>
        ) : <span className="no-rest">ไม่มีผู้เล่นพัก</span>}
      </div>
    </div>
  );
}

export function ScheduleView({ schedule, players, validation, aiProgress }: ScheduleViewProps) {
  const [openRounds, setOpenRounds] = useState<Set<number>>(new Set());
  const playerMap = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);

  useEffect(() => {
    setOpenRounds(new Set(schedule?.rounds.map((round) => round.round) ?? []));
  }, [schedule]);

  const toggleRound = (roundNumber: number) => {
    setOpenRounds((current) => {
      const next = new Set(current);
      if (next.has(roundNumber)) next.delete(roundNumber);
      else next.add(roundNumber);
      return next;
    });
  };

  const isBusy = ['connecting', 'generating', 'validating', 'repairing'].includes(aiProgress.status);

  if (isBusy) {
    const connecting = aiProgress.status === 'connecting';
    const heading = connecting
      ? 'กำลังเตรียม AI'
      : aiProgress.status === 'repairing'
        ? 'กำลังปรับตารางให้ลงตัว…'
        : aiProgress.status === 'validating'
          ? 'กำลังตรวจความสมดุล…'
          : 'AI กำลังวางตาราง…';
    const detail = connecting
      ? 'กำลังเชื่อมต่อบริการ AI อย่างปลอดภัย'
      : aiProgress.status === 'repairing'
        ? 'กำลังซ่อมหรือสร้างตารางสำรองด้วยอัลกอริทึมในเครื่อง'
        : 'จัดทุกรอบและตรวจเงื่อนไขก่อนแสดงผล';
    return (
      <section className="panel schedule-panel generation-state" id="schedule" aria-live="polite">
        <div className="shuttle-loader"><span>◢</span></div>
        <h2>{heading}</h2>
        <p>{detail}</p>
        <div className={`progress-track ${connecting ? 'determinate' : ''}`}>
          <span style={connecting ? { width: `${Math.round(aiProgress.connectionProgress * 100)}%` } : undefined} />
        </div>
        {connecting && <strong className="connection-percent">{Math.round(aiProgress.connectionProgress * 100)}%</strong>}
        <div className="progress-steps">
          <span className="done">✓ เตรียมข้อมูลผู้เล่น</span>
          <span className={connecting ? 'active' : 'done'}>{connecting ? '○' : '✓'} เชื่อมต่อบริการ AI</span>
          <span className={['validating', 'repairing'].includes(aiProgress.status) ? 'done' : ''}>{aiProgress.status === 'generating' ? '○' : '✓'} จัดตารางครบทุกรอบ</span>
          <span className={aiProgress.status === 'validating' ? 'active' : ''}>○ ตรวจความสมดุลและเงื่อนไข</span>
          {aiProgress.repairAttempt > 0 && (
            <span className={aiProgress.status === 'repairing' ? 'active' : ''}>○ ปรับตารางอัตโนมัติ</span>
          )}
        </div>
      </section>
    );
  }

  if (!schedule) {
    return (
      <section className="panel schedule-panel empty-schedule" id="schedule">
        <div className="empty-mark">◈</div>
        <h2>ตารางล่วงหน้าจะอยู่ตรงนี้</h2>
        <p>ตั้งค่าผู้เล่นและกติกา แล้วกด “จัดตาราง” เพื่อดูทุกเกมก่อนเริ่มเล่น</p>
      </section>
    );
  }

  return (
    <section className="panel schedule-panel" id="schedule" aria-labelledby="schedule-title">
      <div className="schedule-heading">
        <div>
          <h2 id="schedule-title">ตารางล่วงหน้า</h2>
          <p>แตะรอบเพื่อดูคู่แข่งขันและคนพัก</p>
        </div>
        {validation?.valid && <span className="verified"><CheckIcon /> ตรวจแล้ว</span>}
      </div>

      <div className="round-list">
        {schedule.rounds.map((round) => {
          const isOpen = openRounds.has(round.round);
          return (
            <article className={`round-card ${isOpen ? 'open' : ''}`} key={round.round}>
              <button
                type="button"
                className="round-trigger"
                aria-expanded={isOpen}
                onClick={() => toggleRound(round.round)}
              >
                <strong>รอบที่ {round.round}</strong>
                <span>{round.courts.length} คอร์ท</span>
                <span className="rest-count">{round.restingPlayerIds.length} พัก</span>
                <span className="chevron">⌄</span>
              </button>
              {isOpen && <RoundContent round={round} playerMap={playerMap} />}
            </article>
          );
        })}
      </div>
    </section>
  );
}
