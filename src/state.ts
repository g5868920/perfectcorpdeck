import captionsJson from './captions.json';

/* ------------------------------------------------------------------ Creator Memory model */

export type CategoryId = 'visual' | 'tone' | 'hook' | 'pacing' | 'voice' | 'captions' | 'music' | 'format' | 'avoid';

export const CATEGORIES: { id: CategoryId; label: string; icon: string }[] = [
  { id: 'visual', label: 'Visual Style', icon: 'film' },
  { id: 'tone', label: 'Storytelling Tone', icon: 'hook' },
  { id: 'hook', label: 'Hook Style and Length', icon: 'bolt' },
  { id: 'pacing', label: 'Scene Pacing and Transitions', icon: 'layers' },
  { id: 'voice', label: 'Narration Voice and Language', icon: 'mic' },
  { id: 'captions', label: 'Captions and Typography', icon: 'cc' },
  { id: 'music', label: 'Music Mood', icon: 'music' },
  { id: 'format', label: 'Output Format', icon: 'frame' },
  { id: 'avoid', label: 'Exclusions / Things to Avoid', icon: 'shield' },
];
export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])) as Record<CategoryId, string>;

/** One saved preference. `id` is the preference key used by plans and This-Reel overrides. */
export interface MemoryItem {
  id: string;
  category: CategoryId;
  label: string;
  value: string;
  enabled: boolean;
  source: 'seed' | 'creator' | 'setup' | 'suggestion';
}
/** kept for older imports */
export type SignatureItem = MemoryItem;

export interface Suggestion {
  id: string;
  key: string; // preference key it would set
  category: CategoryId;
  label: string;
  value: string;
  /** one-line explanation of the behavior that prompted it */
  reason: string;
  origin: 'seeded-history' | 'repeated-choice';
  status: 'pending' | 'snoozed' | 'saved' | 'rejected';
  createdAt: number;
}

/** A non-sensitive record of a creative choice the creator made for one Reel. */
export interface Signal {
  projectId: string;
  key: string;
  category: CategoryId;
  label: string;
  value: string;
  source: 'brief-override' | 'plan-adjust' | 'refine';
  at: number;
}

export interface MemoryLogEntry {
  at: number;
  text: string;
}

/* ------------------------------------------------------------------ Reel model */

export interface Cue {
  start: number;
  end: number;
  text: string;
  scene: number;
}

export type SceneVariant = 'original' | 'alt';
export type MusicId = 'lofi' | 'acoustic';
export type CaptionStyle = 'bold-white' | 'clean-minimal' | 'soft-cream';
export const CAPTION_STYLES: Record<CaptionStyle, string> = { 'bold-white': 'Bold White', 'clean-minimal': 'Clean Minimal', 'soft-cream': 'Soft Cream' };

export interface ReelVersion {
  scene2: SceneVariant;
  music: MusicId;
  /** caption texts, same order/timing as the prepared cues */
  captions: string[];
  /** caption appearance (preview overlay); the exported files use Bold White */
  captionStyle: CaptionStyle;
}

export interface AppliedSetting {
  id: string;
  category: CategoryId;
  label: string;
  value: string;
  /** true when this Reel uses an explicit This-Reel-only choice instead of the saved default */
  override: boolean;
}

export interface ReelProject {
  id: string;
  brief: string;
  createdAt: number;
  uploads: string[];
  /** This-Reel-only overrides keyed by preference key. Never written back to Creator Memory. */
  overrides: Record<string, string>;
  /** settings snapshot used when the plan was made (memory + overrides) */
  applied: AppliedSetting[];
  pack: 'coffee' | 'bookstore';
  script: string[];
  scriptEdited: boolean;
  sceneOrder: number[];
  stage: 'brief' | 'plan' | 'generating' | 'preview' | 'draft-plan';
  original: ReelVersion | null;
  revision: ReelVersion | null;
  chosen: 'original' | 'revision';
  readyToUse: boolean;
  saved: boolean;
  creditsSpent: number;
}

export interface AppState {
  version: 2;
  memory: MemoryItem[];
  suggestions: Suggestion[];
  signals: Signal[];
  memoryLog: MemoryLogEntry[];
  memorySetup: 'unseen' | 'done' | 'skipped';
  settings: { removeWatermark: boolean };
  projects: ReelProject[];
  currentId: string | null;
  /** illustrative, simulated coin balance */
  credits: number;
}

/* ------------------------------------------------------------------ seed content */

export const BASE_CUES: Cue[] = (captionsJson as { cues: Cue[] }).cues;

export const COFFEE_BRIEF = 'A cozy weekend coffee ritual.';
export const BOOKSTORE_BRIEF = 'An evening bookstore visit';

export const COFFEE_SCRIPT = [
  '週末想慢一點？',
  '讓咖啡香提醒你，今天不用急。',
  '找個靠窗的位置，和自己待一會兒。',
  '這個週末，記得留一點時間給自己。',
];

export const BOOKSTORE_SCRIPT = [
  '下班後，想去哪裡走走？',
  '推開書店的門，讓夜晚慢下來。',
  '挑一本書，聽聽紙頁翻動的聲音。',
  '今晚，把時間留給喜歡的故事。',
];

export const SCENES = {
  coffee: [
    { n: 1, time: '0–4s', title: 'Coffee close-up', tag: 'HOOK', img: 'media/scene1.jpg', start: 0, end: 4 },
    { n: 2, time: '4–9s', title: 'Pour-over coffee', tag: 'SET THE MOOD', img: 'media/scene2.jpg', start: 4, end: 9 },
    { n: 3, time: '9–15s', title: 'Window seat & journal', tag: 'MOMENT', img: 'media/scene3.jpg', start: 9, end: 15 },
    { n: 4, time: '15–20s', title: 'Cup + book closing', tag: 'OUTRO', img: 'media/scene4.jpg', start: 15, end: 20 },
  ],
  bookstore: [
    { n: 1, time: '0–4s', title: 'Storefront glow', tag: 'HOOK', img: 'media/bookstore1-LOOK.jpg', start: 0, end: 4 },
    { n: 2, time: '4–9s', title: 'Shelf aisle', tag: 'SET THE MOOD', img: 'media/bookstore2-LOOK.jpg', start: 4, end: 9 },
    { n: 3, time: '9–15s', title: 'Picking a book', tag: 'MOMENT', img: 'media/bookstore3-LOOK.jpg', start: 9, end: 15 },
    { n: 4, time: '15–20s', title: 'Reading corner', tag: 'OUTRO', img: 'media/bookstore4-LOOK.jpg', start: 15, end: 20 },
  ],
} as const;

export const SCENE2_ALT = { title: 'French press, slow plunge', img: 'media/scene2-alt.jpg' };

export const MUSIC: Record<MusicId, { name: string; desc: string; src: string }> = {
  lofi: { name: 'Mellow Lo-fi', desc: 'Warm keys, soft vinyl texture · 76 BPM', src: 'media/music-lofi.m4a' },
  acoustic: { name: 'Bright Acoustic', desc: 'Plucked guitar, light shaker · 98 BPM', src: 'media/music-acoustic.m4a' },
};

/** Value options per preference key (free text is allowed for keys without options). */
export const OPTIONS: Record<string, string[]> = {
  visual: ['Warm Cinematic', 'Cool Night Look', 'Soft Pastel', 'High-Contrast Mono'],
  tone: ['Calm & reflective', 'Upbeat & playful', 'Informative & clear'],
  hook: ['Conversational, Question-first', 'Bold Statement', 'Countdown Teaser'],
  'hook-length': ['Short, under 3s', 'Standard, about 4s'],
  pacing: ['Minimal transitions', 'Standard cuts', 'Fast, dynamic cuts'],
  voice: ['Mandarin, Neutral', 'Mandarin, Warm', 'No voiceover'],
  captions: ['Traditional Chinese, Bold White', 'Traditional Chinese, Clean Minimal', 'Traditional Chinese, Soft Cream', 'Off'],
  music: ['Mellow Lo-fi', 'Bright Acoustic', 'No music'],
  format: ['9:16', '4:5', '1:1'],
};

/** Display labels for preference keys. */
export const KEY_LABEL: Record<string, string> = {
  visual: 'Visual style',
  tone: 'Storytelling tone',
  hook: 'Hook style',
  'hook-length': 'Hook length',
  pacing: 'Pacing & transitions',
  voice: 'Narration',
  captions: 'Captions',
  music: 'Music mood',
  format: 'Output format',
};
export const KEY_CATEGORY: Record<string, CategoryId> = {
  visual: 'visual',
  tone: 'tone',
  hook: 'hook',
  'hook-length': 'hook',
  pacing: 'pacing',
  voice: 'voice',
  captions: 'captions',
  music: 'music',
  format: 'format',
};

/** DEMO coin quotes — illustrative only, not real YouCam prices. */
export const CREDIT_COSTS = { generate: 30, replaceScene: 8, changeMusic: 0, captionFix: 0 };
export const GENERATE_BREAKDOWN = [
  { label: 'Script & storyboard', coins: 0 },
  { label: '4 scenes · 9:16', coins: 24 },
  { label: 'Mandarin voiceover', coins: 3 },
  { label: 'Music, captions & assembly', coins: 3 },
];

export function seedMemory(): MemoryItem[] {
  return [
    { id: 'visual', category: 'visual', label: 'Visual style', value: 'Warm Cinematic', enabled: true, source: 'seed' },
    { id: 'hook', category: 'hook', label: 'Hook style', value: 'Conversational, Question-first', enabled: true, source: 'seed' },
    { id: 'voice', category: 'voice', label: 'Narration', value: 'Mandarin, Neutral', enabled: true, source: 'seed' },
    { id: 'captions', category: 'captions', label: 'Captions', value: 'Traditional Chinese, Bold White', enabled: true, source: 'seed' },
    { id: 'music', category: 'music', label: 'Music mood', value: 'Mellow Lo-fi', enabled: true, source: 'seed' },
    { id: 'format', category: 'format', label: 'Output format', value: '9:16', enabled: true, source: 'seed' },
  ];
}

export const SEED_SUGGESTION_ID = 'sg-hook-length';

export function seedState(): AppState {
  return {
    version: 2,
    memory: seedMemory(),
    suggestions: [
      {
        id: SEED_SUGGESTION_ID,
        key: 'hook-length',
        category: 'hook',
        label: 'Hook length',
        value: 'Short, under 3s',
        reason: 'You shortened the opening hook in 3 of your last 4 Reels (seeded demo history).',
        origin: 'seeded-history',
        status: 'pending',
        createdAt: Date.UTC(2026, 10, 1),
      },
    ],
    signals: [],
    memoryLog: [],
    memorySetup: 'unseen',
    settings: { removeWatermark: false },
    projects: [],
    currentId: null,
    credits: 120,
  };
}

/* ------------------------------------------------------------------ persistence (+ v1 migration) */

const KEY = 'reel-agent-demo.v1';

interface V1State {
  version: 1;
  signature: { id: string; label: string; value: string; enabled: boolean; source?: string }[];
  suggestion: { status: 'pending' | 'saved' | 'dismissed' };
  projects: ReelProject[];
  currentId: string | null;
  credits: number;
}

function migrate(v1: V1State): AppState {
  const s = seedState();
  const memory: MemoryItem[] = v1.signature.map((i) => ({
    id: i.id,
    category: KEY_CATEGORY[i.id] ?? 'avoid',
    label: KEY_LABEL[i.id] ?? i.label,
    value: i.value,
    enabled: i.enabled,
    source: i.source === 'agent-suggestion' ? 'suggestion' : i.source === 'creator' ? 'creator' : 'seed',
  }));
  const st = v1.suggestion?.status === 'saved' ? 'saved' : v1.suggestion?.status === 'dismissed' ? 'rejected' : 'pending';
  return {
    ...s,
    memory,
    suggestions: s.suggestions.map((x) => ({ ...x, status: st })),
    memorySetup: v1.projects.length ? 'done' : 'unseen',
    projects: v1.projects.map((p) => ({
      ...p,
      applied: (p.applied ?? []).map((a) => ({ ...a, category: KEY_CATEGORY[a.id] ?? 'avoid' })),
      original: p.original && { ...p.original, captionStyle: p.original.captionStyle ?? 'bold-white' },
      revision: p.revision && { ...p.revision, captionStyle: p.revision.captionStyle ?? 'bold-white' },
    })),
    currentId: v1.currentId,
    credits: v1.credits,
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s?.version === 2 && Array.isArray(s.memory)) return s as AppState;
      if (s?.version === 1 && Array.isArray(s.signature)) return migrate(s as V1State);
    }
  } catch {
    /* storage unavailable or corrupt – fall back to seed */
  }
  return seedState();
}

export function saveState(s: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore – demo still works in memory */
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ helpers */

export function packFor(brief: string): ReelProject['pack'] {
  return /book|書/i.test(brief) ? 'bookstore' : 'coffee';
}

/** Memory defaults + This-Reel overrides. Explicit overrides win over saved defaults. */
export function appliedSettings(memory: MemoryItem[], overrides: Record<string, string>): AppliedSetting[] {
  const out: AppliedSetting[] = memory
    .filter((m) => m.enabled && m.category !== 'avoid')
    .map((m) => ({
      id: m.id,
      category: m.category,
      label: m.label,
      value: overrides[m.id] ?? m.value,
      override: overrides[m.id] !== undefined && overrides[m.id] !== m.value,
    }));
  // overrides for keys the creator hasn't saved in Memory (e.g. pacing set only for this Reel)
  for (const [k, v] of Object.entries(overrides)) {
    if (!out.some((o) => o.id === k)) out.push({ id: k, category: KEY_CATEGORY[k] ?? 'avoid', label: KEY_LABEL[k] ?? k, value: v, override: true });
  }
  return out;
}

export function exclusions(memory: MemoryItem[]) {
  return memory.filter((m) => m.enabled && m.category === 'avoid');
}

export function captionStyleFor(value?: string): CaptionStyle {
  if (!value) return 'bold-white';
  if (/clean/i.test(value)) return 'clean-minimal';
  if (/cream/i.test(value)) return 'soft-cream';
  return 'bold-white';
}

export function musicFor(value?: string): MusicId {
  return value && /acoustic/i.test(value) ? 'acoustic' : 'lofi';
}

/** The prepared first version reflects the applied caption style and music mood. */
export function originalVersion(applied: AppliedSetting[] = []): ReelVersion {
  const get = (id: string) => applied.find((a) => a.id === id)?.value;
  return { scene2: 'original', music: musicFor(get('music')), captions: BASE_CUES.map((c) => c.text), captionStyle: captionStyleFor(get('captions')) };
}

export function versionDiff(a: ReelVersion, b: ReelVersion) {
  const out: string[] = [];
  if (a.scene2 !== b.scene2) out.push('Scene 02 replaced');
  if (a.music !== b.music) out.push(`Music: ${MUSIC[b.music].name}`);
  const capChanged = a.captions.some((t, i) => t !== b.captions[i]);
  if (capChanged) out.push('Captions edited');
  if (a.captionStyle !== b.captionStyle) out.push(`Caption style: ${CAPTION_STYLES[b.captionStyle]}`);
  return out;
}

/** true when the preview has caption changes the prepared export files can't include */
export function captionsEdited(v: ReelVersion) {
  return v.captions.some((t, i) => t !== BASE_CUES[i].text) || v.captionStyle !== 'bold-white';
}

export function exportFile(v: ReelVersion) {
  return `media/reel-${v.scene2}-${v.music}.mp4`;
}

export function newId() {
  return Math.random().toString(36).slice(2, 9);
}

/* ------------------------------------------------------------------ deterministic learning rule (simulated) */

/** A choice must appear in at least this many different Reels before the Agent suggests it. */
export const REPEAT_THRESHOLD = 2;

/**
 * Transparent prototype rule — not a real learning engine:
 *  1. signals are recorded per Reel (latest choice per preference key);
 *  2. if the same key+value was chosen in ≥ REPEAT_THRESHOLD different Reels,
 *  3. and it differs from what Memory already holds,
 *  4. and the creator hasn't already saved or rejected that exact suggestion,
 *  → create a pending suggestion. Nothing reaches Memory without explicit approval.
 */
export function deriveSuggestions(state: AppState, now = Date.now()): Suggestion[] {
  const groups = new Map<string, Signal[]>();
  for (const sg of state.signals) {
    const k = `${sg.key}=${sg.value}`;
    groups.set(k, [...(groups.get(k) ?? []), sg]);
  }
  const next = [...state.suggestions];
  for (const [, list] of groups) {
    const reels = new Set(list.map((x) => x.projectId));
    if (reels.size < REPEAT_THRESHOLD) continue;
    const { key, value, label, category } = list[0];
    const saved = state.memory.find((m) => m.id === key && m.enabled);
    if (saved && saved.value === value) continue;
    const existing = next.find((x) => x.key === key && x.value === value);
    if (existing) {
      // a snoozed suggestion comes back once there's new evidence
      if (existing.status === 'snoozed' && list.some((x) => x.at > existing.createdAt)) {
        next.splice(next.indexOf(existing), 1, { ...existing, status: 'pending', createdAt: now });
      }
      continue;
    }
    next.push({
      id: `sg-${key}-${value}`.replace(/[^a-z0-9-]+/gi, '-').toLowerCase(),
      key,
      category,
      label,
      value,
      reason: `You chose “${value}” for ${label.toLowerCase()} in ${reels.size} different Reels.`,
      origin: 'repeated-choice',
      status: 'pending',
      createdAt: now,
    });
  }
  return next;
}

/* ------------------------------------------------------------------ first-use setup: deterministic extraction */

export interface ExtractedPref {
  key: string;
  category: CategoryId;
  label: string;
  value: string;
  /** the words in the description that triggered it */
  because: string;
}

/** Keyword rules only (simulated "understanding"). Returns suggestions for the creator to review. */
export function extractPreferences(text: string): ExtractedPref[] {
  const t = text.toLowerCase();
  const out: ExtractedPref[] = [];
  const add = (key: string, value: string, because: string) => {
    if (out.some((o) => o.key === key)) return;
    out.push({ key, category: KEY_CATEGORY[key] ?? 'avoid', label: KEY_LABEL[key] ?? key, value, because });
  };
  const has = (...w: string[]) => w.find((x) => t.includes(x));
  let m: string | undefined;
  if ((m = has('warm cinematic', 'warm', '溫暖'))) add('visual', 'Warm Cinematic', m);
  else if ((m = has('night', 'cool', '夜'))) add('visual', 'Cool Night Look', m);
  else if ((m = has('pastel'))) add('visual', 'Soft Pastel', m);
  if ((m = has('calm', 'relax', 'slow', '慢'))) add('tone', 'Calm & reflective', m);
  else if ((m = has('upbeat', 'playful', 'fun'))) add('tone', 'Upbeat & playful', m);
  if ((m = has('conversational', 'question'))) add('hook', 'Conversational, Question-first', m);
  if ((m = has('short hook', 'short conversational hook', 'short opening', 'short hooks', 'short'))) add('hook-length', 'Short, under 3s', m);
  if ((m = has('minimal transition', 'subtle transition', 'minimal cut', 'subtle'))) add('pacing', 'Minimal transitions', m);
  else if ((m = has('fast', 'dynamic'))) add('pacing', 'Fast, dynamic cuts', m);
  if ((m = has('mandarin', '國語', '中文配音'))) add('voice', has('natural', 'warm voice', 'warm narration') ? 'Mandarin, Warm' : 'Mandarin, Neutral', m);
  if ((m = has('traditional chinese', '繁體', '繁中'))) add('captions', has('clean', 'minimal caption') ? 'Traditional Chinese, Clean Minimal' : 'Traditional Chinese, Bold White', m);
  if ((m = has('lo-fi', 'lofi'))) add('music', 'Mellow Lo-fi', m);
  else if ((m = has('acoustic', 'guitar'))) add('music', 'Bright Acoustic', m);
  if ((m = has('9:16', 'vertical'))) add('format', '9:16', m);
  const avoid = t.match(/\b(?:no|avoid|without)\s+([a-z][a-z\s-]{2,30}?)(?=[,.;]|$| and )/);
  if (avoid) out.push({ key: 'avoid-custom', category: 'avoid', label: 'Avoid', value: `No ${avoid[1].trim()}`, because: avoid[0] });
  return out;
}

export const SETUP_EXAMPLE =
  'I prefer warm cinematic videos, short conversational hooks, natural Mandarin voiceovers, clean Traditional Chinese captions, and minimal transitions.';

/* ------------------------------------------------------------------ capture scenarios */

function coffeeProject(stage: ReelProject['stage'], memory: MemoryItem[]): ReelProject {
  const applied = stage === 'brief' ? [] : appliedSettings(memory, {});
  return {
    id: 'demo-coffee',
    brief: COFFEE_BRIEF,
    createdAt: Date.UTC(2026, 10, 4, 9, 0),
    uploads: [],
    overrides: {},
    applied,
    pack: 'coffee',
    script: stage === 'brief' ? [] : [...COFFEE_SCRIPT],
    scriptEdited: false,
    sceneOrder: [1, 2, 3, 4],
    stage,
    original: null,
    revision: null,
    chosen: 'original',
    readyToUse: false,
    saved: false,
    creditsSpent: 0,
  };
}

/** Memory after the creator completed first-use setup with the example description (used by review captures). */
function setupMemory(): MemoryItem[] {
  const m = seedMemory();
  const set = (id: string, value: string) => {
    const i = m.find((x) => x.id === id);
    if (i) Object.assign(i, { value, source: 'setup' as const });
  };
  set('voice', 'Mandarin, Warm');
  set('captions', 'Traditional Chinese, Clean Minimal');
  m.push(
    { id: 'hook-length', category: 'hook', label: 'Hook length', value: 'Short, under 3s', enabled: true, source: 'setup' },
    { id: 'pacing', category: 'pacing', label: 'Pacing & transitions', value: 'Minimal transitions', enabled: true, source: 'setup' },
    { id: 'tone', category: 'tone', label: 'Storytelling tone', value: 'Calm & reflective', enabled: true, source: 'creator' },
    { id: 'avoid-1', category: 'avoid', label: 'Avoid', value: 'No flashing text', enabled: true, source: 'creator' },
  );
  return m;
}

/**
 * Deterministic states for screenshot capture: `?capture&scenario=…`.
 * Each starts from the seed, so captures are identical on every machine.
 */
export function buildScenario(name: string): AppState | null {
  const s = seedState();
  const generated = (): ReelProject => ({ ...coffeeProject('preview', s.memory), original: originalVersion(), creditsSpent: CREDIT_COSTS.generate });
  const revised = (): ReelProject => {
    const p = generated();
    const caps = originalVersion().captions;
    caps[1] = '讓咖啡香提醒你慢下來';
    return { ...p, revision: { scene2: 'alt', music: 'acoustic', captions: caps, captionStyle: 'bold-white' }, creditsSpent: p.creditsSpent + CREDIT_COSTS.replaceScene };
  };
  const spent = (n: number) => s.credits - n;
  const done = { ...s, memorySetup: 'done' as const };
  // review states with Memory set up and one learned (pending) suggestion
  const learned = (): AppState => {
    const memory = setupMemory();
    const st: AppState = {
      ...s,
      memory,
      memorySetup: 'done',
      suggestions: [{ ...s.suggestions[0], status: 'saved' }],
      signals: [
        { projectId: 'past-1', key: 'music', category: 'music', label: 'Music mood', value: 'Bright Acoustic', source: 'refine', at: Date.UTC(2026, 10, 2) },
        { projectId: 'past-2', key: 'music', category: 'music', label: 'Music mood', value: 'Bright Acoustic', source: 'refine', at: Date.UTC(2026, 10, 3) },
      ],
      memoryLog: [
        { at: Date.UTC(2026, 10, 3, 10), text: 'Saved 5 preferences from first-use setup' },
        { at: Date.UTC(2026, 10, 3, 10, 5), text: 'Saved suggestion: Hook length → Short, under 3s' },
      ],
    };
    return { ...st, suggestions: deriveSuggestions(st, Date.UTC(2026, 10, 3, 12)) };
  };
  switch (name) {
    case 's1':
      return s;
    case 's2':
      return { ...done, projects: [coffeeProject('brief', s.memory)], currentId: 'demo-coffee' };
    case 's3':
      return { ...done, projects: [coffeeProject('plan', s.memory)], currentId: 'demo-coffee' };
    case 's4':
      return { ...done, credits: spent(CREDIT_COSTS.generate), projects: [generated()], currentId: 'demo-coffee' };
    case 's5': {
      const p = revised();
      return { ...done, credits: spent(p.creditsSpent), projects: [p], currentId: 'demo-coffee' };
    }
    case 's6': {
      const p = { ...revised(), chosen: 'revision' as const, readyToUse: true, saved: true };
      return { ...done, credits: spent(p.creditsSpent), projects: [p], currentId: 'demo-coffee' };
    }
    case 'err': {
      const p = { ...generated(), revision: originalVersion() };
      return { ...done, credits: 5, projects: [p], currentId: 'demo-coffee' };
    }
    // v3 review states
    case 'fresh':
      return s;
    case 'memory':
      return learned();
    case 'brief-mem': {
      const st = learned();
      return { ...st, projects: [coffeeProject('brief', st.memory)], currentId: 'demo-coffee' };
    }
    case 'plan-mem': {
      const st = learned();
      return { ...st, projects: [coffeeProject('plan', st.memory)], currentId: 'demo-coffee' };
    }
    default:
      return null;
  }
}
