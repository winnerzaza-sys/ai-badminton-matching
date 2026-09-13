import type { FairnessMode, RuleConfig } from '../types';
import { CourtIcon, SparkleIcon } from '../lib/icons';

interface ConfigPanelProps {
  playerCount: number;
  courts: number;
  rules: RuleConfig;
  fairnessMode: FairnessMode;
  instruction: string;
  onCourtsChange: (courts: number) => void;
  onRulesChange: (rules: RuleConfig) => void;
  onFairnessModeChange: (mode: FairnessMode) => void;
  onInstructionChange: (instruction: string) => void;
}

const ruleGroups: Array<{ title: string; items: Array<[keyof RuleConfig, string]> }> = [
  {
    title: 'กติกาความหลากหลาย',
    items: [
      ['avoidRepeatedPartners', 'เลี่ยงคู่ซ้ำ'],
      ['avoidRepeatedOpponents', 'เลี่ยงคู่แข่งซ้ำ'],
    ],
  },
  {
    title: 'กติกาเรื่องเพศ',
    items: [
      ['avoidThreeMaleOneFemale', 'เลี่ยง 3 ชาย 1 หญิง'],
      ['avoidTwoMaleSameTeam', 'เลี่ยงชาย 2 คนอยู่ฝั่งเดียวกัน'],
    ],
  },
  {
    title: 'การพักและความต่อเนื่อง',
    items: [
      ['spreadRest', 'กระจายรอบพัก'],
      ['avoidConsecutiveGames', 'เลี่ยงเล่นติดกันหลายรอบ'],
      ['prioritizeLongestRest', 'คนที่พักนานควรได้เล่นก่อน'],
    ],
  },
];

export function ConfigPanel(props: ConfigPanelProps) {
  const maxCourts = Math.max(1, Math.floor(props.playerCount / 4));
  const setRule = (key: keyof RuleConfig, value: boolean) => {
    props.onRulesChange({ ...props.rules, [key]: value });
  };

  return (
    <section className="panel config-panel" id="rules" aria-labelledby="rules-title">
      <div className="panel-heading">
        <span className="section-icon green"><CourtIcon /></span>
        <div>
          <h2 id="rules-title">ตั้งค่าและกติกา</h2>
          <p className="desktop-only">เลือกจำนวนคอร์ทและรูปแบบที่ต้องการ</p>
        </div>
      </div>

      <div className="config-block">
        <div className="label-row"><h3>จำนวนคอร์ท</h3><span>{props.courts * 4} คน / รอบ</span></div>
        <div className="court-stepper">
          <button
            type="button"
            aria-label="ลดจำนวนคอร์ท"
            disabled={props.courts <= 1}
            onClick={() => props.onCourtsChange(Math.max(1, props.courts - 1))}
          >−</button>
          <strong>{props.courts}</strong>
          <button
            type="button"
            aria-label="เพิ่มจำนวนคอร์ท"
            disabled={props.courts >= maxCourts}
            onClick={() => props.onCourtsChange(Math.min(maxCourts, props.courts + 1))}
          >＋</button>
        </div>
        <div className="court-pills" aria-label="เลือกจำนวนคอร์ท">
          {Array.from({ length: Math.min(4, maxCourts) }, (_, index) => index + 1).map((court) => (
            <button
              type="button"
              key={court}
              className={court === props.courts ? 'active' : ''}
              onClick={() => props.onCourtsChange(court)}
            >{court}</button>
          ))}
        </div>
      </div>

      {ruleGroups.map((group) => (
        <div className="rule-group" key={group.title}>
          <h3>{group.title}</h3>
          <div className="rule-card">
            {group.items.map(([key, label]) => (
              <label className="toggle-row" key={key}>
                <span className="round-check">✓</span>
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={props.rules[key]}
                  onChange={(event) => setRule(key, event.target.checked)}
                />
                <span className="switch" aria-hidden="true" />
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="config-block fairness-mode">
        <h3>ความเท่าเทียม</h3>
        <div className="mode-selector">
          <label className={props.fairnessMode === 'balanced' ? 'active' : ''}>
            <input
              type="radio"
              name="fairness"
              value="balanced"
              checked={props.fairnessMode === 'balanced'}
              onChange={() => props.onFairnessModeChange('balanced')}
            />
            <span><strong>สมดุลที่สุด</strong><small>ต่างกันไม่เกิน 1 เกม</small></span>
          </label>
          <label className={props.fairnessMode === 'exact' ? 'active' : ''}>
            <input
              type="radio"
              name="fairness"
              value="exact"
              checked={props.fairnessMode === 'exact'}
              onChange={() => props.onFairnessModeChange('exact')}
            />
            <span><strong>เท่ากันเป๊ะ</strong><small>อาจใช้จำนวนรอบมากขึ้น</small></span>
          </label>
        </div>
      </div>

      <div className="config-block instruction-block" id="instruction">
        <div className="instruction-title"><SparkleIcon /><div><h3>บอก AI เพิ่มเติม</h3><small>ไม่บังคับ</small></div></div>
        <textarea
          value={props.instruction}
          maxLength={240}
          onChange={(event) => props.onInstructionChange(event.target.value)}
          placeholder={'เช่น พี่เขียนคู่โรสตลอด\nรอบ 3 โบว์พัก'}
        />
        <span className="char-count">{props.instruction.length}/240</span>
      </div>
    </section>
  );
}
