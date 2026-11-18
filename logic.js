// Pure logic — no DOM, no storage. Tested in tests/logic.test.js.

export const EMOTIONS = [
  { id: 'roomus', label: 'Rõõmus', emoji: '😊', color: '#ffd166', hard: false },
  { id: 'rahulik', label: 'Rahulik', emoji: '😌', color: '#90e0c0', hard: false },
  { id: 'poneville', label: 'Põnevil', emoji: '🤩', color: '#ffb4d6', hard: false },
  { id: 'vasinud', label: 'Väsinud', emoji: '😴', color: '#c8c8e8', hard: false },
  { id: 'mures', label: 'Mures', emoji: '😟', color: '#a0c4ff', hard: true },
  { id: 'kurb', label: 'Kurb', emoji: '😢', color: '#8ab6f9', hard: true },
  { id: 'vihane', label: 'Vihane', emoji: '😠', color: '#ff8a80', hard: true },
];

export const INTENSITY = [
  { value: 1, label: 'Pisike' },
  { value: 2, label: 'Väike' },
  { value: 3, label: 'Keskmine' },
  { value: 4, label: 'Suur' },
  { value: 5, label: 'Hiiglaslik' },
];

// Strengths-based / savoring questions.
export const POSITIVE_QUESTIONS = [
  { id: 'p1', text: 'Mis oli täna kõige toredam hetk?' },
  { id: 'p2', text: 'Mis sul täna eriti hästi välja tuli?' },
  { id: 'p3', text: 'Kellele sa täna head tegid? Või kes tegi sulle head?' },
  { id: 'p4', text: 'Mille üle sa täna uhke oled?' },
  { id: 'p5', text: 'Mis sind täna naerma ajas?' },
  { id: 'p6', text: 'Millal sa täna suutsid ennast tagasi hoida, kuigi oli raske?' },
];

// Emotion labeling + problem solving questions.
export const COPING_QUESTIONS = [
  { id: 'c1', text: 'Millal sa täna vihaseks või pahaseks said? Mis juhtus?' },
  { id: 'c2', text: 'Mis oli täna kõige raskem? Mis sind aitas?' },
  { id: 'c3', text: 'Kas tuli hetk, kus sa tahtsid karjuda? Mida sa siis tegid?' },
  { id: 'c4', text: 'Millal oli tunnis kõige raskem paigal olla?' },
  { id: 'c5', text: 'Kui sama asi juhtuks homme uuesti, mida sa siis teeksid?' },
  { id: 'c6', text: 'Kas keegi oli täna kurb või pahane? Kuidas sa seda märkasid?' },
];

export const ALL_QUESTIONS = [...POSITIVE_QUESTIONS, ...COPING_QUESTIONS];

export const GOAL_RESULTS = [
  { id: 'yes', label: 'Õnnestus!', emoji: '🌟', score: 1 },
  { id: 'partly', label: 'Natuke', emoji: '👍', score: 0.5 },
  { id: 'no', label: 'Seekord mitte', emoji: '🌱', score: 0 },
];

export const SLEEP = [
  { id: 'good', label: 'Hästi', emoji: '😊' },
  { id: 'ok', label: 'Nii ja naa', emoji: '😐' },
  { id: 'bad', label: 'Halvasti', emoji: '🥱' },
];

export const CONTEXTS = [
  { id: 'tund', label: 'Tunnis', emoji: '📚' },
  { id: 'vahetund', label: 'Vahetunnis', emoji: '🏃' },
  { id: 'trenn', label: 'Trennis', emoji: '⚽' },
  { id: 'muusika', label: 'Muusikakoolis', emoji: '🎺' },
  { id: 'kodu', label: 'Kodus', emoji: '🏠' },
  { id: 'mujal', label: 'Mujal', emoji: '📍' },
];

export const DEFAULT_SETTINGS = {
  goals: [
    'Tõstan käe, enne kui räägin',
    'Kui õpetaja palub, teen kohe',
    'Kasutan tunnis vaikset häält',
  ],
  plans: [
    { if: 'tahan tunnis karjuda või häälitseda', then: 'pigistan rusikad kokku ja loen mõttes viieni' },
    { if: 'mul on raske paigal istuda', then: 'surun jalad vastu põrandat ja hingan sügavalt' },
    { if: 'õpetaja ütleb midagi, mis mulle ei meeldi', then: 'ütlen "olgu" ja räägin sellest hiljem emaga' },
  ],
  rewards: [
    { text: 'Vali õhtune lauamäng', cost: 5 },
    { text: 'Jalgpall emme või issiga', cost: 15 },
    { text: 'Väljasõit omal valikul', cost: 30 },
  ],
};

export const WEEKDAYS = ['E', 'T', 'K', 'N', 'R', 'L', 'P'];

// ---------- spoken texts ----------
// Every fixed sentence the app reads aloud. scripts/generate-audio.mjs turns these into bundled audio files.
export const TTS_SPEAKER = 'mari';

export const SAY = {
  morningHello: 'Tere hommikust! Kuidas sa end praegu tunned?',
  sleep: 'Kuidas sa öösel magasid?',
  planHint: 'Ütle see valjult ja kujuta ette, kuidas sa seda koolis teed.',
  goalToday: 'Mis on sinu tänane eesmärk?',
  morningDone: 'Said tähe! Sa saad sellega hakkama.',
  eveningHello: 'Milline tunne oli täna kõige suurem?',
  goalWhich: 'Millist eesmärki sa täna proovisid?',
  goalHow: 'Kuidas läks sinu eesmärk? Ausalt vastata on kõige tublim.',
  hardPlace: 'Kus oli täna kõige raskem?',
  goodPlace: 'Kus läks täna kõige paremini?',
  recordHint: 'Vajuta punast nuppu ja räägi.',
  eveningDoneHard: 'Said tähe! Sul oli täna raske tunne ja sa rääkisid sellest. See on julge! Nüüd mine ja kallista emmet või issit.',
  eveningDoneOk: 'Said tähe! Sa oskad oma tundeid ära tunda. Väga hea! Nüüd mine ja kallista emmet või issit.',
  calmMenu: 'Mis sind praegu aitaks?',
  breatheIn: 'Hinga sisse ja puhu õhupall suureks.',
  breatheOut: 'Hinga välja, aeglaselt.',
  breatheDone: 'Tubli!',
};

export const TURTLE_STEPS = [
  { emoji: '✋', text: 'Peatu! Ütle endale mõttes: STOPP.' },
  { emoji: '🐢', text: 'Mine kilpkonnaks: tõmba pea õlgade vahele ja kallista ennast.', seconds: 5 },
  { emoji: '🌬️', text: 'Hinga kolm korda aeglaselt sisse ja välja.', breathe: 3 },
  { emoji: '💡', text: 'Nüüd mõtle: mis oleks hea lahendus? Võid ka täiskasvanult abi küsida.' },
];

export const SQUEEZE_STEPS = [
  { emoji: '✊', text: 'Pigista rusikad kõvasti kokku!', seconds: 5 },
  { emoji: '🖐️', text: 'Lase lahti. Tunne, kuidas käed on pehmed.', seconds: 5 },
  { emoji: '🙆', text: 'Tõmba õlad kõrvadeni üles!', seconds: 5 },
  { emoji: '😌', text: 'Lase õlad alla. Aaah.', seconds: 5 },
  { emoji: '🦶', text: 'Suru varbad kõvasti vastu põrandat!', seconds: 5 },
  { emoji: '🌟', text: 'Lase lahti. Sa oled nüüd rahulikum.' },
];

export const intensityQuestion = (emotion) => `Kui suur see ${emotion.label.toLowerCase()} tunne oli?`;
export const planSentence = (p) => `Kui ${p.if}, siis ${p.then}.`;

export function speakableTexts() {
  return [...new Set([
    ...Object.values(SAY),
    ...ALL_QUESTIONS.map((q) => q.text),
    ...EMOTIONS.map(intensityQuestion),
    ...DEFAULT_SETTINGS.plans.map(planSentence),
    ...TURTLE_STEPS.map((s) => s.text),
    ...SQUEEZE_STEPS.map((s) => s.text),
  ])];
}

// FNV-1a 32-bit over normalized text; names the audio file for a sentence.
export function textHash(text) {
  const s = String(text).trim().replace(/\s+/g, ' ');
  let h = 0x811c9dc5;
  for (const ch of s) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dayIndex(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

// Monday = 0 … Sunday = 6
export function weekdayOf(key) {
  return (dayIndex(key) + 3) % 7; // 1970-01-01 was a Thursday
}

export function questionsForDay(key) {
  const i = dayIndex(key);
  return [
    POSITIVE_QUESTIONS[i % POSITIVE_QUESTIONS.length],
    COPING_QUESTIONS[i % COPING_QUESTIONS.length],
  ];
}

export function emotionById(id) {
  return EMOTIONS.find((e) => e.id === id) || null;
}

export function isHardDay(entry) {
  const e = emotionById(entry.emotion);
  return (e && e.hard && (entry.intensity || 0) >= 3) || entry.goalResult === 'no';
}

// entries: evening entries. Returns patterns over the last `days` days up to `today`.
export function computeStats(entries, { today, days = 28 }) {
  const end = dayIndex(today);
  const recent = entries.filter((e) => {
    const i = dayIndex(e.date);
    return i <= end && i > end - days;
  });

  const weekday = WEEKDAYS.map((label) => ({ label, total: 0, hard: 0 }));
  const emotionCounts = Object.fromEntries(EMOTIONS.map((e) => [e.id, 0]));
  let goalSum = 0;
  let goalN = 0;

  for (const e of recent) {
    const w = weekday[weekdayOf(e.date)];
    w.total += 1;
    if (isHardDay(e)) w.hard += 1;
    if (e.emotion in emotionCounts) emotionCounts[e.emotion] += 1;
    const r = GOAL_RESULTS.find((g) => g.id === e.goalResult);
    if (r) { goalSum += r.score; goalN += 1; }
  }

  return {
    count: recent.length,
    weekday,
    emotionCounts,
    goalRate: goalN ? goalSum / goalN : null,
    hardDays: recent.filter(isHardDay).length,
  };
}

function inWindow(key, today, days) {
  const i = dayIndex(key); const end = dayIndex(today);
  return i <= end && i > end - days;
}

// Where was it hardest / best? Counts per context over the window (evening entries).
export function computeContextStats(entries, { today, days = 28 }) {
  const hard = Object.fromEntries(CONTEXTS.map((c) => [c.id, 0]));
  const good = Object.fromEntries(CONTEXTS.map((c) => [c.id, 0]));
  for (const e of entries) {
    if (e.type !== 'evening' || !inWindow(e.date, today, days)) continue;
    if (e.hardPlace in hard) hard[e.hardPlace] += 1;
    if (e.goodPlace in good) good[e.goodPlace] += 1;
  }
  return { hard, good };
}

// Does a bad night predict a hard day? Joins morning sleep with the same day's evening.
export function computeSleepStats(entries, { today, days = 28 }) {
  const byDate = {};
  for (const e of entries) if (inWindow(e.date, today, days)) (byDate[e.date] ??= {})[e.type] = e;
  const out = Object.fromEntries(SLEEP.map((s) => [s.id, { days: 0, hard: 0 }]));
  for (const { morning, evening } of Object.values(byDate)) {
    if (!morning?.sleep || !evening || !(morning.sleep in out)) continue;
    out[morning.sleep].days += 1;
    if (isHardDay(evening)) out[morning.sleep].hard += 1;
  }
  return out;
}

export function starBalance(ledger) {
  return ledger.reduce((sum, s) => sum + s.delta, 0);
}

export function nextReward(balance, rewards) {
  const sorted = [...rewards].filter((r) => r.text && r.cost > 0).sort((a, b) => a.cost - b.cost);
  const next = sorted.find((r) => r.cost > balance);
  const reachable = sorted.filter((r) => r.cost <= balance);
  return { next: next || null, remaining: next ? next.cost - balance : 0, reachable };
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
