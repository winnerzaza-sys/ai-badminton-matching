# Badminton AI Matchmaker — IMPLEMENTATION_PLAN

## 1. Product Goal

Build a mobile-first badminton match scheduling web app that uses a **local LLM (Qwen via WebLLM)** to generate the **complete multi-round schedule**, then uses deterministic JavaScript validation to verify correctness and request automatic repair when needed.

The product is designed for real use beside a badminton court. The main workflow must be fast:

```text
Add players
→ Select gender
→ Select court count
→ Choose rules
→ Optional AI instruction
→ AI generates full schedule
→ Validator checks it
→ Auto-repair if needed
→ Show all rounds in advance
```

The application must support both even and odd player counts such as:

- 8, 10, 12, 14 players
- 9, 11, 13, 15 players
- multiple courts where enough players are available

The system must NOT require the user to define a session duration such as 1 hour.

---

# 2. Core Architecture

Use an **AI-first generation architecture**.

```text
Players
+
Court Count
+
Rule Toggles
+
Fairness Configuration
+
Optional Natural-Language Instruction
             ↓
          Qwen LLM
             ↓
      Full Schedule JSON
             ↓
     JavaScript Validator
             ↓
        ┌────┴────┐
        │         │
      Valid     Invalid
        │         │
        ▼         ▼
      Result   Repair Prompt
                  │
                  ▼
                Qwen
                  │
                  └──→ Validator
```

Important:

- Qwen is responsible for generating the full schedule.
- JavaScript is responsible for validating correctness.
- Validation is mandatory.
- Do not display an unvalidated AI schedule.
- Do not use LLM output directly as trusted business logic.

The UI must remain independent from the schedule generation engine.

Define an abstraction:

```ts
export interface ScheduleGenerator {
  generate(input: ScheduleInput): Promise<Schedule>;
}
```

Initial implementation:

```ts
class QwenScheduleGenerator implements ScheduleGenerator
```

Future fallback implementation may be:

```ts
class AlgorithmScheduleGenerator implements ScheduleGenerator
```

The UI must not need to change if the schedule engine changes later.

---

# 3. Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Responsive mobile-first layout

## Local AI

- `@mlc-ai/web-llm`
- WebGPU
- Web Worker
- Start POC with Qwen3 1.7B quantized model

Keep model configuration isolated:

```ts
export const AI_MODEL = "Qwen3-1.7B-q4f16_1-MLC";
```

Do not hard-code model names throughout the application.

The architecture must allow replacing the model later.

Possible evaluation path:

```text
Qwen3 1.7B
↓
If mobile memory/performance is unacceptable:
test smaller compatible Qwen model
↓
If schedule reliability is insufficient:
test larger model or deterministic fallback
```

## Storage

MVP:

- localStorage for current session
- Browser model cache for local AI
- No backend required
- No database server required
- No API key required

---

# 4. Design Source of Truth

The UI implementation MUST follow these provided design references:

```text
/docs/design/mobile-reference.png
/docs/design/ipad-reference.png
```

These images are the visual source of truth.

Do not redesign the application from scratch unless explicitly requested.

If the written plan and images differ:

1. Functional behavior in this document has priority for business logic.
2. Reference images have priority for visual hierarchy, layout, spacing, component placement, and design direction.
3. If a UI state is not shown in the references, extend the existing design language instead of creating a different visual style.

## Design Direction

The application should feel:

- clean
- modern
- lightweight
- friendly
- easy to understand beside a badminton court
- AI-assisted without looking overly technical
- calm and readable rather than futuristic/neon-heavy

Avoid:

- dense enterprise dashboards on mobile
- unnecessary settings on the main screen
- excessive glassmorphism
- heavy neon visual effects
- long AI explanations
- technical LLM terminology in normal user-facing UI
- stretching a mobile layout directly across iPad

Use:

- white / light neutral background
- badminton-inspired green as primary action color
- rounded cards
- subtle borders
- minimal shadows
- clear typography
- large tap targets
- simple icons

Suggested visual tokens:

```text
Background:      #F8FAF9
Surface:         #FFFFFF
Primary:         #159A66
Primary Light:   #EAF7F0
Text Primary:    #111827
Text Secondary:  #6B7280
Border:          #E5E7EB
```

These are starting values only. Match the supplied design references visually.

Suggested radii:

```text
Cards:           14–18px
Primary buttons: 14–18px
```

Minimum interactive touch target:

```text
44px × 44px
```

---

# 5. Responsive Design

## Mobile

Primary breakpoint:

```text
< 768px
```

Use a single-column layout.

Core flow:

```text
Players
↓
Court / Rules
↓
AI Instruction
↓
Fairness Preview
↓
Generate
↓
Schedule
↓
Summary
```

Primary actions should be easy to reach with one hand.

Do not show all advanced settings at once.

## iPad Portrait

Suggested breakpoint:

```text
768px – 1023px
```

Use available width to show related information together.

Prefer 2-column layouts where practical.

Example:

```text
┌────────────────────┬──────────────────────────┐
│ Setup / Rules      │ Schedule / Preview       │
│                    │                          │
│ Players            │ Round 1                  │
│ Courts             │ Round 2                  │
│ Rules              │ Round 3                  │
│ AI Instruction     │ ...                      │
└────────────────────┴──────────────────────────┘
```

## iPad Landscape / Desktop

Suggested breakpoint:

```text
>= 1024px
```

Prefer a 3-column layout:

```text
┌────────────────────────────────────────────────────────┐
│ Header                                                 │
├────────────────┬─────────────────────────┬─────────────┤
│ Setup          │ Schedule                │ Summary     │
│                │                         │             │
│ Players        │ Round 1                 │ Players     │
│ Courts         │ Round 2                 │ Games       │
│ Rules          │ Round 3                 │ Quality     │
│ AI Prompt      │ ...                     │ Validation  │
└────────────────┴─────────────────────────┴─────────────┘
```

Approximate emphasis:

```text
Setup:    28%
Schedule: 46%
Summary:  26%
```

Do not treat these as fixed pixel percentages.

---

# 6. Main Screens

## 6.1 Player Setup

Must support:

- Add player
- Edit player name
- Select gender
- Remove player
- Display player count
- Display male/female count

Player type:

```ts
export interface Player {
  id: string;
  name: string;
  gender: "male" | "female";
}
```

Use a stable generated ID.

Do not use the visible player name as the primary identifier.

Example UI:

```text
ผู้เล่น 14 คน

พี่เขียน     ชาย
โรส          หญิง
โบว์         หญิง
เอ็ม         ชาย

[ + เพิ่มผู้เล่น ]

ชาย 5 • หญิง 9
```

---

# 7. Court Configuration

Allow court count selection.

Example:

```text
จำนวนคอร์ท

[-]  1  [+]
```

Display derived information:

```text
1 คอร์ท = 4 คน / รอบ
```

Validate:

```ts
players.length >= courts * 4
```

Do not allow a configuration that cannot fill all selected courts.

---

# 8. Rule Toggles

Keep frequently used rules visible.

## Variety

```text
☑ เลี่ยงคู่ซ้ำ
☑ เลี่ยงคู่แข่งซ้ำ
```

## Gender

```text
☑ เลี่ยง 3 ชาย 1 หญิง
```

Gender behavior:

- male-male pair is allowed
- all-female match is allowed
- all-male match is allowed when at least 4 male players exist
- mixed doubles is preferred when it improves schedule quality
- all-male or all-female matches are not inherently invalid
- 3 male + 1 female is a soft preference to avoid, not a hard failure by default

Derived gender context:

```ts
const maleCount = players.filter(p => p.gender === "male").length;
const femaleCount = players.filter(p => p.gender === "female").length;

const genderContext = {
  maleCount,
  femaleCount,
  allowAllMaleMatch: maleCount >= 4,
  allowAllFemaleMatch: femaleCount >= 4,
};
```

## Rest / Fairness Preferences

```text
☑ กระจายรอบพัก
☑ เลี่ยงเล่นติดกันหลายรอบ
☑ คนที่พักนานควรได้เล่นก่อน
```

These are soft preferences.

---

# 9. Fairness Model

The application must support both even and odd player counts.

Do NOT assume every player must always play exactly the same number of games.

Support two fairness modes:

```ts
export type FairnessMode = "balanced" | "exact";
```

## Default: Balanced

`balanced` MUST be the default mode.

Goal:

```text
maxGamesPlayed - minGamesPlayed <= 1
```

Default:

```ts
minimumGamesPerPlayer = 2;
```

Calculate:

```ts
const slotsPerRound = courts * 4;

const rounds = Math.ceil(
  (playerCount * minimumGamesPerPlayer) /
  slotsPerRound
);
```

The generated schedule must satisfy:

1. Every player plays at least `minimumGamesPerPlayer`.
2. The difference between highest and lowest play count is no more than 1.
3. All player slots should be filled.
4. Additional games must be distributed as fairly as possible.

Examples:

```text
9 players / 1 court
5 rounds × 4 = 20 slots
→ 2–3 games/player

11 players / 1 court
6 rounds × 4 = 24 slots
→ 2–3 games/player

13 players / 1 court
7 rounds × 4 = 28 slots
→ 2–3 games/player

14 players / 1 court
7 rounds × 4 = 28 slots
→ exactly 2 games/player

15 players / 1 court
8 rounds × 4 = 32 slots
→ 2–3 games/player
```

Example UI:

```text
✨ ตารางที่แนะนำ

9 ผู้เล่น
1 คอร์ท
5 รอบ

คนละ 2–3 เกม
```

For a divisible case:

```text
14 ผู้เล่น
1 คอร์ท
7 รอบ

ทุกคนเล่น 2 เกม
```

## Exact Mode

`exact` is optional and should be placed under advanced settings.

Every player must play exactly the same number of games.

Calculate:

```ts
rounds =
  playerCount /
  gcd(playerCount, courts * 4);
```

Example:

```text
9 players / 1 court
→ 9 rounds
→ 4 games/player
```

Communicate that exact fairness may create a much longer schedule.

Example UI:

```text
ความเท่าเทียม

● สมดุลที่สุด
  จำนวนเกมต่างกันไม่เกิน 1 เกม

○ เท่ากันเป๊ะ
  อาจต้องใช้จำนวนรอบมากขึ้น
```

---

# 10. Important Fairness Rule

Qwen MUST NOT decide how many rounds should exist.

JavaScript calculates the fairness target first.

Send Qwen:

```json
{
  "fairness": {
    "mode": "balanced",
    "totalRounds": 5,
    "minimumGamesPerPlayer": 2,
    "allowedGameDifference": 1
  }
}
```

Or:

```json
{
  "fairness": {
    "mode": "exact",
    "totalRounds": 7,
    "gamesPerPlayer": 2,
    "allowedGameDifference": 0
  }
}
```

Qwen's responsibility is to distribute players across the required rounds.

---

# 11. Natural-Language AI Instruction

Provide an optional textarea.

Example:

```text
✨ บอก AI เพิ่มเติม

พี่เขียนคู่โรสตลอด
เอ็มกับเต้อย่าคู่กัน
รอบ 3 โบว์พัก
```

Supported initial instruction types:

- `X คู่ Y ตลอด`
- `X ห้ามคู่ Y`
- `X กับ Y อย่าคู่กัน`
- `X พักรอบ N`
- `รอบ N ขอ X ลง`
- `X เล่นไม่เกิน N รอบ`
- equivalent natural Thai/English variations

The user should not need to learn special command syntax.

---

# 12. Schedule Generation Input

Build a structured object before invoking Qwen.

Example:

```json
{
  "players": [
    {
      "id": "p1",
      "name": "พี่เขียน",
      "gender": "male"
    },
    {
      "id": "p2",
      "name": "โรส",
      "gender": "female"
    }
  ],
  "courts": 1,
  "fairness": {
    "mode": "balanced",
    "totalRounds": 7,
    "minimumGamesPerPlayer": 2,
    "allowedGameDifference": 1
  },
  "rules": {
    "avoidRepeatedPartners": true,
    "avoidRepeatedOpponents": true,
    "spreadRest": true,
    "avoidConsecutiveGames": true,
    "prioritizeLongestRest": true,
    "avoidThreeMaleOneFemale": true,
    "allowAllMaleMatch": true,
    "allowAllFemaleMatch": true
  },
  "instruction": "พี่เขียนคู่โรสตลอด"
}
```

---

# 13. Qwen Responsibilities

Qwen must:

1. Read all supplied players.
2. Use only supplied player IDs.
3. Read gender information.
4. Respect the required court count.
5. Respect the pre-calculated number of rounds.
6. Follow fairness configuration.
7. Follow hard user instructions.
8. Optimize rest distribution.
9. Avoid repeated partners when possible.
10. Avoid repeated opponents when possible.
11. Follow gender preferences.
12. Return the COMPLETE schedule.
13. Return JSON only.

Qwen must NOT:

- invent players
- change total round count
- change court count
- silently omit players
- return prose instead of structured output
- decide that validation can be skipped

---

# 14. Schedule JSON Schema

Use player IDs.

```ts
export interface AISchedule {
  rounds: AIRound[];
}

export interface AIRound {
  round: number;
  courts: AICourtMatch[];
  restingPlayerIds: string[];
}

export interface AICourtMatch {
  court: number;
  teamA: [string, string];
  teamB: [string, string];
}
```

Example:

```json
{
  "rounds": [
    {
      "round": 1,
      "courts": [
        {
          "court": 1,
          "teamA": ["p1", "p2"],
          "teamB": ["p3", "p4"]
        }
      ],
      "restingPlayerIds": ["p5", "p6"]
    }
  ]
}
```

---

# 15. System Prompt

Use a strict system prompt similar to:

```text
You are an expert badminton schedule generator.

Generate the COMPLETE badminton schedule.

You will receive:
- player IDs
- player names
- genders
- number of courts
- required number of rounds
- fairness configuration
- scheduling rules
- optional Thai or English user instructions

IMPORTANT:

1. Return valid JSON only.
2. Never invent player IDs.
3. Every court must contain exactly 4 unique players.
4. A player can appear only once per round.
5. Follow the supplied fairness configuration.
6. If fairness.mode is "exact":
   - every player must play exactly gamesPerPlayer.
7. If fairness.mode is "balanced":
   - every player must play at least minimumGamesPerPlayer.
   - highest and lowest play count may differ by no more than allowedGameDifference.
   - distribute extra games as fairly as possible.
8. Explicit fixed-pair instructions must always be followed.
9. Explicit rest instructions must always be followed.
10. Fixed pairs override repeated-partner avoidance.
11. Avoid repeated partners when possible.
12. Avoid repeated opponents when possible.
13. Spread rest rounds as evenly as possible.
14. Avoid excessive consecutive games.
15. Avoid 3-male-1-female matches when possible.
16. All-female matches are allowed.
17. All-male matches are allowed when at least 4 male players are available.
18. Hard constraints are more important than preferences.
19. Generate every required round.
```

---

# 16. Rule Priority

## Priority 1 — Structural / Explicit Hard Rules

Must never be violated:

```text
- valid player IDs
- exactly 4 unique players per court
- a player cannot appear twice in the same round
- correct number of courts
- correct number of rounds
- fixed pair
- forced rest
- required player
- explicit max-games instruction where applicable
```

## Priority 2 — Fairness

Follow selected fairness mode.

Balanced:

```text
minimum target reached
max-min <= 1
```

Exact:

```text
every player has equal count
```

Fairness is more important than repeated partner avoidance.

## Priority 3 — Rest Quality

```text
- distribute rest
- avoid excessive consecutive games
- prioritize players who have rested longer
```

## Priority 4 — Variety

```text
- avoid repeated partners
- avoid repeated opponents
- avoid 3 male + 1 female
```

If AI must choose between:

```text
Repeated partner
vs
Unfair play count
```

prefer the repeated partner.

---

# 17. Fixed Pair Behavior

A fixed pair is intentional.

Example:

```text
พี่เขียนคู่โรสตลอด
```

This overrides:

```text
เลี่ยงคู่ซ้ำ
```

The validator and quality metrics must NOT penalize the fixed pair as an unwanted repeated partner.

---

# 18. JavaScript Validator

Build the validator BEFORE connecting Qwen.

Suggested structure:

```text
src/
  validator/
    validateSchedule.ts
    validateRound.ts
    validateFairness.ts
    validateConstraints.ts
    analyzeScheduleQuality.ts
```

## Structural Validation

Check:

```text
✓ round count is correct
✓ court count is correct
✓ every court has exactly 4 players
✓ every player ID exists
✓ no duplicate player inside a court
✓ no player appears on multiple courts in the same round
```

## Fairness Validation

### Exact

```ts
if (fairness.mode === "exact") {
  valid = players.every(
    player =>
      playCount[player.id] === fairness.gamesPerPlayer
  );
}
```

### Balanced

```ts
if (fairness.mode === "balanced") {
  const counts = players.map(
    player => playCount[player.id]
  );

  const min = Math.min(...counts);
  const max = Math.max(...counts);

  valid =
    min >= fairness.minimumGamesPerPlayer &&
    max - min <= fairness.allowedGameDifference;
}
```

## Constraint Validation

Check:

```text
✓ fixed pair
✓ avoid-pair hard instruction if explicitly stated as "must not"
✓ forced rest
✓ required round player
✓ max games
```

---

# 19. Validator Result

```ts
export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}
```

Errors must be repaired.

Warnings may be accepted.

Example errors:

```text
GAME_COUNT_MINIMUM_NOT_MET

p3 plays 1 game.
Minimum required: 2.
```

```text
FAIRNESS_DIFFERENCE_EXCEEDED

Highest: 4
Lowest: 2
Allowed difference: 1
```

```text
PLAYER_DUPLICATED_IN_ROUND
```

Warnings:

```text
REPEATED_PARTNER
REPEATED_OPPONENT
TOO_MANY_CONSECUTIVE_GAMES
THREE_MALE_ONE_FEMALE
```

---

# 20. Auto Repair

If validation fails:

```text
Qwen
↓
Schedule
↓
Validator
↓
Invalid
↓
Repair Prompt
↓
Qwen
↓
Corrected Full Schedule
↓
Validator
```

Example repair prompt:

```text
Your schedule is invalid.

Fix the existing schedule.

Return the COMPLETE corrected schedule as JSON only.

Keep as much of the existing schedule unchanged as possible.

Validation errors:

- p3 plays only 1 game; minimum is 2.
- p4 plays 4 games while p8 plays 2; allowed difference is 1.
- p1 appears twice in round 4.
```

Maximum attempts:

```ts
const MAX_REPAIR_ATTEMPTS = 3;
```

Never allow infinite repair loops.

If repair still fails:

```text
ไม่สามารถสร้างตารางที่ผ่านทุกเงื่อนไขได้
```

Show a clear, non-technical explanation of the conflicting conditions when possible.

---

# 21. AI Loading UX

Do not load the AI model immediately on app startup.

Load it when the user first requests AI schedule generation.

Example:

```text
✨ เปิดใช้งาน Badminton AI

AI จะทำงานบนอุปกรณ์นี้
ต้องดาวน์โหลดโมเดลในครั้งแรก

แนะนำให้ใช้ Wi-Fi

[ ดาวน์โหลดและเริ่มใช้งาน ]
```

During loading:

```text
กำลังเตรียม AI

████████░░ 72%
```

Avoid technical terminology such as:

- model weights
- VRAM
- tokens
- quantization

in the normal user interface.

---

# 22. Generation UX

Use a lightweight progress experience.

Example:

```text
AI กำลังวางตาราง...

✓ เตรียมข้อมูลผู้เล่น
✓ กำลังจัดรอบ
○ กำลังตรวจความสมดุล
○ กำลังปรับตารางให้ลงตัว
```

If repair is happening, show:

```text
กำลังปรับตารางให้ลงตัว...
```

Do not show "AI error" unless all automatic repair attempts fail.

Suggested status type:

```ts
type AIStatus =
  | "idle"
  | "loading-model"
  | "generating"
  | "validating"
  | "repairing"
  | "complete"
  | "failed";
```

---

# 23. Schedule Result UI

The result MUST show the complete schedule in advance.

Header example:

```text
✨ ตารางพร้อมแล้ว

14 ผู้เล่น
1 คอร์ท
7 รอบ
ทุกคนเล่น 2 เกม

✓ ตรวจสอบแล้ว
```

Balanced odd-player example:

```text
✨ ตารางพร้อมแล้ว

9 ผู้เล่น
1 คอร์ท
5 รอบ
คนละ 2–3 เกม

✓ ตรวจสอบแล้ว
```

Use accordion cards on mobile.

Example:

```text
Round 1

Court 1

พี่เขียน + โรส
      VS
เอ็ม + โบว์

พัก
เต้ • เก่ง • แนน • ฝน
```

The user must be able to quickly scan:

- round number
- court number
- Team A
- Team B
- resting players

without opening a separate detail page.

---

# 24. Schedule Summary

Display:

```text
จำนวนเกมต่อคน
คู่ซ้ำ
คู่แข่งซ้ำ
เล่นติดกันสูงสุด
การกระจายพัก
```

Exact result:

```text
✓ ทุกคนเล่น 2 เกมเท่ากัน
```

Balanced result:

```text
✓ จำนวนเกมสมดุล
ทุกคนเล่น 2–3 เกม
```

Example player summary:

```text
พี่เขียน     2
โรส          2
โบว์          3
เอ็ม          2
เต้           3
```

Do not show a fake "100% fairness" score unless it is derived from a defined metric.

---

# 25. Regenerate

Provide:

```text
🔄 จัดใหม่
```

Regeneration uses the same configuration but requests a different valid schedule.

Prompt hint:

```text
Generate a different valid schedule from the previous schedule while following all constraints.
```

---

# 26. Edit Rules / Instruction

From the result screen allow:

```text
แก้กติกา
แก้คำสั่ง
```

Then regenerate the full schedule.

Do not mutate the already generated schedule silently.

---

# 27. Mobile UI Requirements

Use:

```text
/docs/design/mobile-reference.png
```

Primary screen sequence:

```text
1. Player setup
2. Court / rules
3. AI instruction + fairness preview
4. AI generation
5. Full schedule
6. Summary / regenerate
```

Keep the primary CTA visually dominant:

```text
✨ AI จัดตาราง
```

Avoid large technical dashboards.

---

# 28. iPad UI Requirements

Use:

```text
/docs/design/ipad-reference.png
```

Do not scale mobile cards to fill the screen.

## iPad Landscape

Left column:

```text
Players
Court count
Rule toggles
AI instruction
```

Center:

```text
Full advance schedule
Expandable rounds
Current selected round
```

Right:

```text
Player count
Court count
Round count
Games/player range
Fairness result
Quality warnings
Generate / Regenerate actions
```

The center schedule column is the main content area.

---

# 29. Shared Component System

Suggested components:

```text
PlayerList
PlayerRow
PlayerForm
CourtSelector
RuleToggles
FairnessModeSelector
FairnessPreview
AIInstructionInput
AIModelLoader
GenerationProgress
ScheduleView
RoundAccordion
CourtMatchCard
RestingPlayers
ScheduleSummary
ValidationBadge
```

Do not duplicate separate mobile and iPad component logic unless necessary.

Use responsive composition around shared components.

---

# 30. Suggested Folder Structure

```text
src/
├── ai/
│   ├── config.ts
│   ├── engine.ts
│   ├── worker.ts
│   ├── prompts.ts
│   ├── schema.ts
│   ├── generateSchedule.ts
│   └── repairSchedule.ts
│
├── fairness/
│   ├── calculateBalancedPlan.ts
│   ├── calculateExactCycle.ts
│   └── gcd.ts
│
├── validator/
│   ├── validateSchedule.ts
│   ├── validateRound.ts
│   ├── validateFairness.ts
│   ├── validateConstraints.ts
│   └── analyzeScheduleQuality.ts
│
├── components/
│   ├── players/
│   ├── rules/
│   ├── fairness/
│   ├── ai/
│   └── schedule/
│
├── types/
│   ├── player.ts
│   ├── rules.ts
│   ├── fairness.ts
│   ├── schedule.ts
│   └── validation.ts
│
├── store/
│   └── sessionStore.ts
│
└── pages/
    └── Home.tsx
```

---

# 31. Implementation Phases

## MVP 1 — UI + Session State

Implement:

- mobile-first UI
- iPad responsive layout
- Player CRUD
- gender selection
- court count
- rule toggles
- fairness mode selector
- AI instruction textarea
- localStorage
- design references

Do not connect Qwen yet.

Acceptance:

- Mobile visually matches reference.
- iPad visually matches reference.
- Session survives page reload.

---

## MVP 2 — Fairness Calculator

Implement:

```ts
calculateBalancedPlan()
calculateExactCycle()
```

Tests:

```text
8 players / 1 court
9 players / 1 court
10 players / 1 court
11 players / 1 court
12 players / 1 court
13 players / 1 court
14 players / 1 court
15 players / 1 court
```

Expected Balanced:

```text
9  → 5 rounds → 2–3 games
11 → 6 rounds → 2–3 games
13 → 7 rounds → 2–3 games
14 → 7 rounds → 2 games
15 → 8 rounds → 2–3 games
```

---

## MVP 3 — Validator

Build before AI.

Implement:

- structural validation
- balanced fairness validation
- exact fairness validation
- fixed pair validation
- forced rest validation
- required player validation
- warning analysis

Use mocked schedules.

---

## MVP 4 — Schedule Result UI

Use mocked validated schedules.

Implement:

- full advance schedule
- round accordions
- court cards
- resting player list
- summary
- regenerate UI
- responsive iPad schedule layout

---

## MVP 5 — Qwen / WebLLM Integration

Install:

```bash
npm install @mlc-ai/web-llm
```

Implement:

- local model loader
- Web Worker
- load progress
- structured JSON output
- prompt builder
- Qwen3 1.7B configuration

---

## MVP 6 — Full AI Schedule Generation

Connect:

```text
Session State
↓
Fairness Plan
↓
Prompt Builder
↓
Qwen
↓
Schedule JSON
↓
Validator
```

Only display valid schedules.

---

## MVP 7 — Auto Repair

Implement:

```text
Validation Errors
↓
Repair Prompt
↓
Qwen
↓
Validator
```

Maximum 3 repair attempts.

---

## MVP 8 — Natural-Language Instructions

Test:

```text
พี่เขียนคู่โรสตลอด
เอ็มกับเต้อย่าคู่กัน
รอบ 3 โบว์พัก
รอบแรกขอโบว์ลง
เต้เล่นไม่เกิน 2 รอบ
```

Test Thai variations rather than only exact phrases.

---

## MVP 9 — Quality Analysis

Calculate:

- repeated partners
- repeated opponents
- max consecutive games
- rest distribution
- gender preference warnings

Fixed pairs must be excluded from unwanted repeated-pair penalties.

---

## MVP 10 — Polish / PWA

Add:

- smooth generation animation
- empty states
- repair state
- error recovery
- PWA support
- responsive improvements
- accessibility
- offline-friendly app shell where practical

---

# 32. Automated Test Matrix

## Player Count

```text
8
9
10
11
12
13
14
15
16
```

## Courts

```text
1 court
2 courts where player count allows
```

## Gender

```text
all male
all female
4 male / 4 female
5 male / 9 female
3 male / 9 female
odd gender distributions
```

## Instructions

```text
fixed pair
multiple fixed pairs
avoid pair
fixed pair + avoid repeated partners enabled
forced rest
required player
max games
conflicting instructions
```

## Fairness

```text
balanced
exact
odd player count
even player count
multiple courts
```

---

# 33. AI Reliability Evaluation

Before considering AI-first architecture production-ready:

Run each representative scenario multiple times.

Example:

```text
14 players
1 court
7 rounds
balanced/exact = 2 games each
avoid repeated partners
fixed pair P1 + P2
```

Run:

```text
20 generations
```

Track:

```text
First-pass valid %
Valid after repair %
Average repair attempts
Generation time
Repeated partner warnings
Repeated opponent warnings
```

Initial POC target:

```text
Valid after repair >= 95%
```

If reliability is below target:

1. improve prompt/schema
2. evaluate model size
3. evaluate deterministic fallback

Do not hide persistent reliability problems behind repeated retries.

---

# 34. Fallback Strategy

If local Qwen:

- is too slow on target mobile devices
- uses too much memory
- fails frequently
- cannot repair reliably

Do NOT redesign the application.

Keep:

- UI
- Fairness Calculator
- Validator
- Schedule Result
- Design System

Replace only:

```text
ScheduleGenerator
```

with a deterministic scheduler.

This is why the ScheduleGenerator interface is mandatory.

---

# 35. Design Completion Checklist

Before marking UI work complete:

1. Compare mobile implementation with `/docs/design/mobile-reference.png`.
2. Compare iPad implementation with `/docs/design/ipad-reference.png`.
3. Verify main visual hierarchy matches.
4. Verify primary CTA is immediately obvious.
5. Verify mobile does not feel crowded.
6. Verify iPad uses extra width instead of stretching mobile.
7. Verify the complete future schedule is easy to scan.
8. Verify player names and matchups are readable from a short distance.
9. Verify touch targets are large enough for courtside use.
10. Verify normal users do not see technical LLM internals.

The implementation does not need to be pixel-perfect, but it must clearly look like the same product shown in the reference designs.

---

# 36. Definition of Done for MVP

The MVP is complete when:

1. Players can be added, edited, gendered, and removed.
2. Court count can be selected.
3. Balanced fairness works for odd and even player counts.
4. Exact fairness mode works.
5. Fairness rounds are calculated before invoking Qwen.
6. Qwen generates the complete multi-round schedule.
7. Validator checks every result.
8. Invalid schedules are automatically repaired.
9. Fixed pair works.
10. Avoid pair works.
11. Forced rest works.
12. Rule toggles affect schedule generation.
13. Odd counts such as 9, 11, and 13 work.
14. Male-only matches are allowed when enough male players exist.
15. Female-only matches are allowed.
16. Full schedule is visible in advance.
17. Mobile layout follows the provided mobile design.
18. iPad layout follows the provided iPad design.
19. No API key is required.
20. No backend is required for MVP.
21. Local AI runs in the browser.
22. UI remains usable if a future scheduler engine replaces Qwen.

---

# 37. Recommended First Codex Task

Start with UI, fairness, and validation.

Do NOT integrate WebLLM first.

Use this instruction:

```text
Read IMPLEMENTATION_PLAN.md completely before writing code.

Also inspect:
- /docs/design/mobile-reference.png
- /docs/design/ipad-reference.png

These reference images are the visual source of truth.
Do not replace the design with a generic dashboard.

Implement MVP 1 through MVP 4 only:

1. Mobile-first and iPad responsive UI
2. Session state and localStorage
3. Player management
4. Court selection
5. Rule toggles
6. Balanced and Exact fairness calculation
7. TypeScript schedule models
8. Deterministic schedule validator
9. Schedule result UI using mocked valid schedules

Do NOT integrate WebLLM or Qwen yet.

Add automated tests for the fairness calculations and validator.
```

After MVP 1–4 are stable, use a second Codex task:

```text
Read IMPLEMENTATION_PLAN.md.

Implement MVP 5 through MVP 7:

1. WebLLM integration
2. Qwen3 local model loader
3. Web Worker inference
4. Full schedule JSON generation
5. Validator integration
6. Automatic repair loop with maximum 3 attempts
7. User-friendly generate / validate / repair UI states

Do not change the existing visual design unless required for functionality.
```
