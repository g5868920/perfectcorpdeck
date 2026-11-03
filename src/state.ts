import captionsJson from './captions.json';

/* ------------------------------------------------------------------ types */

export type PrefKey = 'visual' | 'hook' | 'voice' | 'captions' | 'music' | 'format' | string;

export interface SignatureItem {
  id: PrefKey;
  label: string;
  value: string;
  enabled: boolean;
  /** true for items the creator (or an accepted suggestion) added */
  custom?: boolean;
  source?: 'seed' | 'creator' | 'agent-suggestion';
}

export interface Suggestion {
  id: string;
  text: string;
  item: { id: string; label: string; value: string };
  status: 'pending' | 'saved' | 'dismissed';
}

export interface Cue {
  start: number;
  end: number;
  text: string;
  scene: number;
}

export type SceneVariant = 'original' | 'alt';
export type MusicId = 'lofi' | 'acoustic';

export interface ReelVersion {
  scene2: SceneVariant;
  music: MusicId;
  /** caption texts, same order/timing as the prepared cues */
  captions: string[];
  /** caption appearance (preview overlay); the exported files use Bold White */
  captionStyle: CaptionStyle;
}

export type CaptionStyle = 'bold-white' | 'soft-cream';
export const CAPTION_STYLES: Record<CaptionStyle, string> = { 'bold-white': 'Bold White', 'soft-cream': 'Soft Cream' };

export interface ReelProject {
  id: string;
  brief: string;
  createdAt: number;
  /** names of optional user media (placeholder only – not used by the prepared media) */
  uploads: string[];
  /** This-Reel-only overrides. Never written back to the Creator Signature. */
  overrides: Record<string, string>;
  /** settings snapshot used when the plan was made (signature + overrides) */
  applied: { id: string; label: string; value: string; override: boolean }[];
  /** demo content pack: only "coffee" has prepared, playable media */
  pack: 'coffee' | 'bookstore';
  script: string[];
  scriptEdited: boolean;
  /** storyboard order as scene numbers, e.g. [1,2,3,4] */
  sceneOrder: number[];
  stage: 'brief' | 'plan' | 'generating' | 'preview' | 'draft-plan';
  original: ReelVersion | null;
  revision: ReelVersion | null;
  /** which version the creator has chosen to keep */
  chosen: 'original' | 'revision';
  readyToUse: boolean;
  saved: boolean;
  creditsSpent: number;
}

export interface AppState {
  version: 1;
  signature: SignatureItem[];
  suggestion: Suggestion;
  projects: ReelProject[];
  currentId: string | null;
  /** illustrative, simulated credit balance */
  credits: number;
  lowCreditsDemo: boolean;
}

/* ------------------------------------------------------------------ seed */

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

/** Options the creator can pick from when editing a preference. */
export const OPTIONS: Record<string, string[]> = {
  visual: ['Warm Cinematic', 'Cool Night Look', 'Soft Pastel', 'High-Contrast Mono'],
  hook: ['Conversational, Question-first', 'Bold Statement', 'Countdown Teaser'],
  voice: ['Mandarin, Neutral', 'Mandarin, Warm', 'No voiceover'],
  captions: ['Traditional Chinese, Bold White', 'Traditional Chinese, Soft Cream', 'Off'],
  music: ['Mellow Lo-fi', 'Bright Acoustic', 'No music'],
  format: ['9:16', '4:5', '1:1'],
};

/** DEMO coin quotes — illustrative only, not real YouCam prices. */
export const CREDIT_COSTS = { generate: 30, replaceScene: 8, changeMusic: 0, captionFix: 0 };
export const GENERATE_BREAKDOWN = [
  { label: 'Script & storyboard', coins: 0 },
  { label: '4 scenes · 9:16', coins: 24 },
  { label: 'Mandarin voiceover', coins: 3 },
  { label: 'Music, captions & assembly', coins: 3 },
];

export function seedSignature(): SignatureItem[] {
  return [
    { id: 'visual', label: 'Visual Style', value: 'Warm Cinematic', enabled: true, source: 'seed' },
    { id: 'hook', label: 'Hook', value: 'Conversational, Question-first', enabled: true, source: 'seed' },
    { id: 'voice', label: 'Voice', value: 'Mandarin, Neutral', enabled: true, source: 'seed' },
    { id: 'captions', label: 'Captions', value: 'Traditional Chinese, Bold White', enabled: true, source: 'seed' },
    { id: 'music', label: 'Music Mood', value: 'Mellow Lo-fi', enabled: true, source: 'seed' },
    { id: 'format', label: 'Format', value: '9:16', enabled: true, source: 'seed' },
  ];
}

export function seedState(): AppState {
  return {
    version: 1,
    signature: seedSignature(),
    suggestion: {
      id: 'short-hook',
      text: 'You often choose short opening hooks. Save this as a default?',
      item: { id: 'hook-length', label: 'Hook Length', value: 'Short, under 3s' },
      status: 'pending',
    },
    projects: [],
    currentId: null,
    credits: 120,
    lowCreditsDemo: false,
  };
}

/* ------------------------------------------------------------------ persistence */

const KEY = 'reel-agent-demo.v1';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as AppState;
      if (s && s.version === 1 && Array.isArray(s.signature)) return s;
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

export function appliedSettings(sig: SignatureItem[], overrides: Record<string, string>) {
  return sig
    .filter((s) => s.enabled)
    .map((s) => ({
      id: s.id,
      label: s.label,
      value: overrides[s.id] ?? s.value,
      override: overrides[s.id] !== undefined && overrides[s.id] !== s.value,
    }));
}

export function originalVersion(): ReelVersion {
  return { scene2: 'original', music: 'lofi', captions: BASE_CUES.map((c) => c.text), captionStyle: 'bold-white' };
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

/* ------------------------------------------------------------------ capture scenarios */

function coffeeProject(stage: ReelProject['stage'], sig: SignatureItem[]): ReelProject {
  return {
    id: 'demo-coffee',
    brief: COFFEE_BRIEF,
    createdAt: Date.UTC(2026, 10, 4, 9, 0),
    uploads: [],
    overrides: {},
    applied: stage === 'brief' ? [] : appliedSettings(sig, {}),
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

/**
 * Deterministic states for screenshot capture: `?capture&scenario=s1|s2|s3`.
 * Each starts from the seed, so captures are identical on every machine.
 */
export function buildScenario(name: string): AppState | null {
  const s = seedState();
  const generated = (): ReelProject => ({ ...coffeeProject('preview', s.signature), original: originalVersion(), creditsSpent: CREDIT_COSTS.generate });
  const revised = (): ReelProject => {
    const p = generated();
    const caps = originalVersion().captions;
    caps[1] = '讓咖啡香提醒你慢下來';
    return {
      ...p,
      revision: { scene2: 'alt', music: 'acoustic', captions: caps, captionStyle: 'bold-white' },
      creditsSpent: p.creditsSpent + CREDIT_COSTS.replaceScene,
    };
  };
  const spent = (n: number) => s.credits - n;
  switch (name) {
    case 's1':
      return s;
    case 's2':
      return { ...s, projects: [coffeeProject('brief', s.signature)], currentId: 'demo-coffee' };
    case 's3':
      return { ...s, projects: [coffeeProject('plan', s.signature)], currentId: 'demo-coffee' };
    case 's4':
      return { ...s, credits: spent(CREDIT_COSTS.generate), projects: [generated()], currentId: 'demo-coffee' };
    case 's5': {
      const p = revised();
      return { ...s, credits: spent(p.creditsSpent), projects: [p], currentId: 'demo-coffee' };
    }
    case 's6': {
      const p = { ...revised(), chosen: 'revision' as const, readyToUse: true, saved: true };
      return { ...s, credits: spent(p.creditsSpent), projects: [p], currentId: 'demo-coffee' };
    }
    case 'err': {
      const p = { ...generated(), revision: originalVersion() };
      return { ...s, credits: 5, projects: [p], currentId: 'demo-coffee' };
    }
    default:
      return null;
  }
}
