import type { Player } from '../types';
import { createPlayer } from '../store/sessionStore';
import { TrashIcon, UsersIcon } from '../lib/icons';

interface PlayerPanelProps {
  players: Player[];
  onChange: (players: Player[]) => void;
}

export function PlayerPanel({ players, onChange }: PlayerPanelProps) {
  const maleCount = players.filter((player) => player.gender === 'male').length;
  const femaleCount = players.length - maleCount;
  const updatePlayer = (id: string, patch: Partial<Player>) => {
    onChange(players.map((player) => (player.id === id ? { ...player, ...patch } : player)));
  };

  return (
    <section className="panel" id="players" aria-labelledby="players-title">
      <div className="panel-heading">
        <span className="section-icon blue"><UsersIcon /></span>
        <div>
          <h2 id="players-title">ผู้เล่น <span className="muted-count">({players.length} คน)</span></h2>
          <p className="desktop-only">เพิ่มชื่อและเลือกเพศของผู้เล่น</p>
        </div>
      </div>

      <div className="player-list">
        {players.map((player, index) => (
          <div className="player-row" key={player.id}>
            <span className="drag-handle" aria-hidden="true">⠿</span>
            <span className={`player-avatar ${player.gender}`} aria-hidden="true">
              {player.gender === 'male' ? '●' : '●'}
            </span>
            <span className="player-index">{index + 1}</span>
            <input
              className="player-name"
              value={player.name}
              aria-label={`ชื่อผู้เล่นคนที่ ${index + 1}`}
              onChange={(event) => updatePlayer(player.id, { name: event.target.value })}
              onBlur={() => {
                if (!player.name.trim()) updatePlayer(player.id, { name: `ผู้เล่น ${index + 1}` });
              }}
            />
            <div className="gender-picker" aria-label={`เพศของ ${player.name}`}>
              <button
                type="button"
                className={player.gender === 'male' ? 'active male' : ''}
                aria-pressed={player.gender === 'male'}
                onClick={() => updatePlayer(player.id, { gender: 'male' })}
              >
                <span>♂</span><em>ชาย</em>
              </button>
              <button
                type="button"
                className={player.gender === 'female' ? 'active female' : ''}
                aria-pressed={player.gender === 'female'}
                onClick={() => updatePlayer(player.id, { gender: 'female' })}
              >
                <span>♀</span><em>หญิง</em>
              </button>
            </div>
            <button
              type="button"
              className="icon-button danger"
              aria-label={`ลบ ${player.name}`}
              onClick={() => onChange(players.filter((item) => item.id !== player.id))}
            >
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="add-player"
        onClick={() => onChange([...players, createPlayer(`ผู้เล่น ${players.length + 1}`)])}
      >
        <span>＋</span> เพิ่มผู้เล่น
      </button>

      <div className="gender-summary">
        <div className="male"><span>♂</span><small>ชาย</small><strong>{maleCount}</strong></div>
        <div className="female"><span>♀</span><small>หญิง</small><strong>{femaleCount}</strong></div>
      </div>
    </section>
  );
}
