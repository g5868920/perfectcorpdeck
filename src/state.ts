import captionsJson from './captions.json';

/* ================================================================== Creator Memory model */

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

/** Optional content-specific preferences that only apply to Reels in that series. */
export interface SeriesProfile {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  items: MemoryItem[];
}

export interface Suggestion {
  id: string;
  key: string; // preference key it would set
  category: CategoryId;
  label: string;
  value: string;
  /** 'global' = Creator Identity; otherwise a series id */
  scope: string;
  /** one-line explanation of the behavior that prompted it */
  reason: string;
  /** which Reels / actions it came from */
  provenance: string[];
  origin: 'seeded-history' | 'repeated-choice';
  status: 'pending' | 'snoozed' | 'saved' | 'rejected';
  createdAt: number;
}

/** A non-sensitive record of a creative (style) choice the creator made for one Reel. */
export interface Signal {
  projectId: string;
  projectTitle?: string;
  series?: string | null;
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

/* ================================================================== preference keys, options, defaults */

/** Every style preference the Agent can apply. Only these can be learned or saved. */
export const SUPPORTED_KEYS = ['visual', 'tone', 'hook', 'hook-length', 'pacing', 'voice', 'captions', 'overlay', 'music', 'format'] as const;

/** Value options per preference key (free text is allowed for keys without options). */
export const OPTIONS: Record<string, string[]> = {
  visual: ['Warm Cinematic', 'Cool Night Look', 'Soft Pastel', 'High-Contrast Mono'],
  tone: ['Calm & reflective', 'Upbeat & playful', 'Informative & clear'],
  hook: ['Conversational, Question-first', 'Bold Statement', 'Countdown Teaser'],
  'hook-length': ['Short, under 3s', 'Standard, about 4s'],
  pacing: ['Minimal transitions', 'Standard cuts', 'Fast, dynamic cuts'],
  voice: ['Mandarin, Neutral', 'Mandarin, Warm', 'No voiceover'],
  captions: ['Traditional Chinese, Bold White', 'Traditional Chinese, Clean Minimal', 'Traditional Chinese, Soft Cream', 'Off'],
  overlay: ['Name + area label', 'Name only', 'Off'],
  music: ['Mellow Lo-fi', 'Bright Acoustic', 'No music'],
  format: ['9:16', '4:5', '1:1'],
};

/** What the Agent uses when neither the Reel, a series, nor Creator Identity sets a value. */
export const APP_DEFAULTS: Record<string, string> = {
  visual: 'Natural color',
  tone: 'Neutral',
  hook: 'Statement opener',
  'hook-length': 'Standard, about 4s',
  pacing: 'Standard cuts',
  voice: 'Mandarin, Neutral',
  captions: 'Traditional Chinese, Bold White',
  overlay: 'Off',
  music: 'Mellow Lo-fi',
  format: '9:16',
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
  overlay: 'On-screen info',
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
  overlay: 'captions',
  music: 'music',
  format: 'format',
};

/* ================================================================== guardrail: what must never become Memory */

/**
 * Brand campaign instructions, product claims and customer information belong to one Reel's brief,
 * never to Creator Memory. Returns a reason when a value looks like that, so the UI can refuse it.
 */
export function sensitiveReason(value: string): string | null {
  const v = value.toLowerCase();
  if (/[\w.+-]+@[\w-]+\.\w+/.test(value)) return 'looks like contact details';
  if (/(\+?\d[\d\s-]{7,}\d)/.test(value)) return 'looks like a phone number';
  if (/(clinically|guarantee|proven|cures?|whiten|anti-?aging|\d+\s?%|保證|療效|美白|抗老|臨床)/i.test(v)) return 'looks like a product claim';
  if (/(campaign|brief from|client|sponsor(ed)? by|®|™|discount code|promo code|代言|業配|合作品牌)/i.test(v)) return 'looks like brand or campaign instructions';
  if (/(customer|order #|訂單|客戶)/i.test(v)) return 'looks like customer information';
  return null;
}

/* ================================================================== Reel model */

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

/** Prepared-media (idea mode) version. */
export interface ReelVersion {
  scene2: SceneVariant;
  music: MusicId;
  captions: string[];
  captionStyle: CaptionStyle;
}

/** One imported or sample media item. Uploaded bytes live in IndexedDB on this device only. */
export interface MediaAsset {
  id: string;
  name: string;
  kind: 'image' | 'video';
  source: 'upload' | 'sample';
  /** sample: static URL. upload: resolved from IndexedDB at runtime */
  url?: string;
  duration?: number;
  attribution: string;
}

export interface Spot {
  name: string;
  area: string;
  note: string;
}

/** Media-mode version: which asset fills each segment, the caption lines, music and caption style. */
export interface MediaVersion {
  slots: string[]; // asset id per segment: [hook, spot1..spot5, outro]
  captions: string[]; // one line per segment
  music: MusicId;
  captionStyle: CaptionStyle;
}

export type SettingSource = 'reel' | 'series' | 'identity' | 'default';

export interface AppliedSetting {
  id: string;
  category: CategoryId;
  label: string;
  value: string;
  source: SettingSource;
  sourceLabel: string;
  /** true when this Reel uses an explicit This-Reel-only choice */
  override: boolean;
}

export interface ReelProject {
  id: string;
  mode: 'idea' | 'media';
  brief: string;
  createdAt: number;
  uploads: string[];
  /** content/series profile applied to this Reel (null = Creator Identity only) */
  series: string | null;
  /** This-Reel-only overrides keyed by preference key. Never written back to Creator Memory. */
  overrides: Record<string, string>;
  /** Snapshot of what was used when the Reel was generated (for History). Plans resolve live. */
  applied: AppliedSetting[];
  pack: 'coffee' | 'bookstore' | 'yakiniku';
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
  // media mode
  media: MediaAsset[];
  spots: Spot[];
  slots: string[];
  /** per-Reel brand/campaign notes (Sponsored series). Never saved to Memory. */
  campaignNotes: string;
  mOriginal: MediaVersion | null;
  mRevision: MediaVersion | null;
}

export interface AppState {
  version: 3;
  memory: MemoryItem[];
  series: SeriesProfile[];
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

/* ================================================================== seed content */

export const BASE_CUES: Cue[] = (captionsJson as { cues: Cue[] }).cues;

export const COFFEE_BRIEF = 'A cozy weekend coffee ritual.';
export const BOOKSTORE_BRIEF = 'An evening bookstore visit';
export const YAKINIKU_BRIEF = 'Tokyo Yakiniku — 5 Restaurants';

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

/** Sample footage for the media-first demo: original illustrations, clearly labelled. */
const SAMPLE_ATTR = 'Sample media · demo illustration made for this prototype (not a real restaurant)';
export const SAMPLE_MEDIA: MediaAsset[] = [
  { id: 'sample-grill-clip', name: 'Charcoal grill (clip)', kind: 'video', source: 'sample', url: 'media/yakiniku/grill-clip.mp4', duration: 4, attribution: SAMPLE_ATTR },
  { id: 'sample-platter', name: 'Marbled platter', kind: 'image', source: 'sample', url: 'media/yakiniku/platter.jpg', attribution: SAMPLE_ATTR },
  { id: 'sample-interior', name: 'Lantern counter', kind: 'image', source: 'sample', url: 'media/yakiniku/interior.jpg', attribution: SAMPLE_ATTR },
  { id: 'sample-sizzle', name: 'Sizzle close-up', kind: 'image', source: 'sample', url: 'media/yakiniku/sizzle.jpg', attribution: SAMPLE_ATTR },
  { id: 'sample-table', name: 'Table spread', kind: 'image', source: 'sample', url: 'media/yakiniku/table.jpg', attribution: SAMPLE_ATTR },
  { id: 'sample-street-clip', name: 'Night street (clip)', kind: 'video', source: 'sample', url: 'media/yakiniku/street-clip.mp4', duration: 4, attribution: SAMPLE_ATTR },
  { id: 'sample-grill', name: 'Grill top-down', kind: 'image', source: 'sample', url: 'media/yakiniku/grill.jpg', attribution: SAMPLE_ATTR },
];

/** Clearly fictional placeholders — the creator types their real picks. */
export const SAMPLE_SPOTS: Spot[] = [
  { name: '示範燒肉 A', area: '新宿', note: '厚切牛舌' },
  { name: '示範燒肉 B', area: '澀谷', note: '炭火和牛' },
  { name: '示範燒肉 C', area: '上野', note: '平價一人燒肉' },
  { name: '示範燒肉 D', area: '銀座', note: '午間套餐' },
  { name: '示範燒肉 E', area: '惠比壽', note: '深夜營業' },
];
export const EMPTY_SPOTS: Spot[] = Array.from({ length: 5 }, () => ({ name: '', area: '', note: '' }));

export const SERIES_LABEL: Record<string, string> = { 'travel-food': 'Travel & Food', 'sponsored-beauty': 'Sponsored Beauty' };

/** DEMO coin quotes — illustrative only, not real YouCam prices. */
export const CREDIT_COSTS = { generate: 30, replaceScene: 8, changeMusic: 0, captionFix: 0 };
export const GENERATE_BREAKDOWN = [
  { label: 'Script & storyboard', coins: 0 },
  { label: '4 scenes · 9:16', coins: 24 },
  { label: 'Mandarin voiceover', coins: 3 },
  { label: 'Music, captions & assembly', coins: 3 },
];
export const MEDIA_BREAKDOWN = [
  { label: 'Footage review & scene plan', coins: 0 },
  { label: '7 segments from your media · 9:16', coins: 18 },
  { label: 'Narration (browser voice, preview)', coins: 0 },
  { label: 'Music, captions & assembly', coins: 12 },
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

export function seedSeries(): SeriesProfile[] {
  return [
    {
      id: 'travel-food',
      name: 'Travel & Food',
      description: 'Restaurant round-ups, trips and food spots',
      enabled: true,
      items: [
        { id: 'pacing', category: 'pacing', label: 'Pacing & transitions', value: 'Fast, dynamic cuts', enabled: true, source: 'creator' },
        { id: 'music', category: 'music', label: 'Music mood', value: 'Bright Acoustic', enabled: true, source: 'creator' },
        { id: 'overlay', category: 'captions', label: 'On-screen info', value: 'Name + area label', enabled: true, source: 'creator' },
      ],
    },
    {
      id: 'sponsored-beauty',
      name: 'Sponsored Beauty',
      description: 'Paid partnerships. Campaign details stay in each Reel, never here',
      enabled: true,
      items: [
        { id: 'tone', category: 'tone', label: 'Storytelling tone', value: 'Informative & clear', enabled: true, source: 'creator' },
        { id: 'captions', category: 'captions', label: 'Captions', value: 'Traditional Chinese, Clean Minimal', enabled: true, source: 'creator' },
        { id: 'avoid-sp1', category: 'avoid', label: 'Avoid', value: 'No before/after comparisons', enabled: true, source: 'creator' },
      ],
    },
  ];
}

export const SEED_SUGGESTION_ID = 'sg-hook-length';

export function seedState(): AppState {
  return {
    version: 3,
    memory: seedMemory(),
    series: seedSeries(),
    suggestions: [
      {
        id: SEED_SUGGESTION_ID,
        key: 'hook-length',
        category: 'hook',
        label: 'Hook length',
        value: 'Short, under 3s',
        scope: 'global',
        reason: 'You shortened the opening hook in 3 of your last 4 Reels (seeded demo history).',
        provenance: ['Seeded demo history — 3 of 4 past Reels'],
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

/* ================================================================== persistence (+ migrations) */

const KEY = 'reel-agent-demo.v1';

function upgradeProject(p: Partial<ReelProject> & { id: string }): ReelProject {
  return {
    mode: 'idea',
    uploads: [],
    series: null,
    overrides: {},
    applied: [],
    script: [],
    scriptEdited: false,
    sceneOrder: [1, 2, 3, 4],
    original: null,
    revision: null,
    chosen: 'original',
    readyToUse: false,
    saved: false,
    creditsSpent: 0,
    media: [],
    spots: [],
    slots: [],
    campaignNotes: '',
    mOriginal: null,
    mRevision: null,
    brief: '',
    createdAt: Date.now(),
    pack: 'coffee',
    stage: 'brief',
    ...p,
  } as ReelProject;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrate(raw: any): AppState {
  const s = seedState();
  if (raw.version === 1) {
    raw = {
      ...raw,
      version: 2,
      memory: raw.signature.map((i: { id: string; label: string; value: string; enabled: boolean; source?: string }) => ({
        id: i.id,
        category: KEY_CATEGORY[i.id] ?? 'avoid',
        label: KEY_LABEL[i.id] ?? i.label,
        value: i.value,
        enabled: i.enabled,
        source: i.source === 'agent-suggestion' ? 'suggestion' : i.source === 'creator' ? 'creator' : 'seed',
      })),
      suggestions: s.suggestions.map((x) => ({ ...x, status: raw.suggestion?.status === 'saved' ? 'saved' : raw.suggestion?.status === 'dismissed' ? 'rejected' : 'pending' })),
      signals: [],
      memoryLog: [],
      memorySetup: raw.projects?.length ? 'done' : 'unseen',
      settings: { removeWatermark: false },
    };
  }
  return {
    ...s,
    ...raw,
    version: 3,
    series: raw.series ?? s.series,
    suggestions: (raw.suggestions ?? s.suggestions).map((x: Suggestion) => ({ ...x, scope: x.scope ?? 'global', provenance: x.provenance ?? [] })),
    projects: (raw.projects ?? []).map((p: ReelProject) => upgradeProject(p)),
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s?.version === 3 && Array.isArray(s.memory)) return { ...s, projects: s.projects.map(upgradeProject) } as AppState;
      if ((s?.version === 2 && Array.isArray(s.memory)) || (s?.version === 1 && Array.isArray(s.signature))) return migrate(s);
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

/* ================================================================== resolution: one source of truth for what a Reel uses */

export function packFor(brief: string, mode: 'idea' | 'media' = 'idea'): ReelProject['pack'] {
  if (mode === 'media') return 'yakiniku';
  return /book|書/i.test(brief) ? 'bookstore' : 'coffee';
}

export function seriesOf(state: { series: SeriesProfile[] }, id: string | null | undefined) {
  return id ? state.series.find((x) => x.id === id && x.enabled) ?? null : null;
}

/**
 * Precedence (highest first): This-Reel-only override → enabled Content/Series preference →
 * enabled Creator Identity preference → app default. Every supported key resolves to exactly one
 * value with an explicit source, so the plan can never silently show a stale or mismatched value.
 */
export function resolveSettings(memory: MemoryItem[], series: SeriesProfile | null, overrides: Record<string, string>): AppliedSetting[] {
  return SUPPORTED_KEYS.map((key) => {
    const base = { id: key, category: KEY_CATEGORY[key], label: KEY_LABEL[key] };
    if (overrides[key] !== undefined) return { ...base, value: overrides[key], source: 'reel' as const, sourceLabel: 'This Reel only', override: true };
    const fromSeries = series?.items.find((i) => i.id === key && i.enabled);
    if (fromSeries) return { ...base, value: fromSeries.value, source: 'series' as const, sourceLabel: `Series: ${series!.name}`, override: false };
    const fromIdentity = memory.find((m) => m.id === key && m.enabled);
    if (fromIdentity) return { ...base, value: fromIdentity.value, source: 'identity' as const, sourceLabel: 'Creator Identity', override: false };
    return { ...base, value: APP_DEFAULTS[key], source: 'default' as const, sourceLabel: 'App default', override: false };
  });
}

/** Backward-compatible helper (Creator Identity + overrides, no series). */
export function appliedSettings(memory: MemoryItem[], overrides: Record<string, string>, series: SeriesProfile | null = null): AppliedSetting[] {
  return resolveSettings(memory, series, overrides);
}

export function resolvedMap(list: AppliedSetting[]): Record<string, AppliedSetting> {
  return Object.fromEntries(list.map((a) => [a.id, a]));
}

export function exclusions(memory: MemoryItem[], series: SeriesProfile | null = null) {
  return [...memory.filter((m) => m.enabled && m.category === 'avoid'), ...(series?.items.filter((m) => m.enabled && m.category === 'avoid') ?? [])];
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
  if (a.captions.some((t, i) => t !== b.captions[i])) out.push('Captions edited');
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

/* ================================================================== media mode: deterministic planning (simulated analysis) */

export const MEDIA_SEGMENTS = ['HOOK', 'SPOT 1', 'SPOT 2', 'SPOT 3', 'SPOT 4', 'SPOT 5', 'OUTRO'];

/** Segment durations follow Memory: hook length and pacing. */
export function mediaTimeline(settings: Record<string, AppliedSetting>) {
  const hook = settings['hook-length']?.value.startsWith('Short') ? 2.6 : 4;
  const pacing = settings.pacing?.value ?? 'Standard cuts';
  const spot = pacing.startsWith('Fast') ? 3.2 : pacing.startsWith('Minimal') ? 4.2 : 3.6;
  const outro = 3;
  const durs = [hook, spot, spot, spot, spot, spot, outro];
  let t = 0;
  const segs = durs.map((d, i) => {
    const s = { i, start: t, end: t + d, dur: d, tag: MEDIA_SEGMENTS[i] };
    t += d;
    return s;
  });
  const transition = pacing.startsWith('Minimal') ? 'crossfade' : pacing.startsWith('Fast') ? 'cut' : 'dip';
  return { segs, total: t, transition: transition as 'crossfade' | 'cut' | 'dip' };
}

/**
 * Rule-based footage assignment (simulated "analysis"): a video clip opens the Reel if available,
 * then media fill the five spots in the creator's chosen order, and the last item closes.
 */
export function autoSlots(media: MediaAsset[]): string[] {
  if (!media.length) return [];
  const clip = media.find((m) => m.kind === 'video');
  const pool = media.filter((m) => m !== clip);
  const pick = (i: number) => (pool.length ? pool[i % pool.length] : media[i % media.length]).id;
  const hook = (clip ?? media[0]).id;
  const spots = [0, 1, 2, 3, 4].map(pick);
  const outro = media[media.length - 1].id;
  return [hook, ...spots, outro];
}

/** Caption/narration lines built from the brief, hook style and the creator's own spot names. */
export function mediaScript(spots: Spot[], settings: Record<string, AppliedSetting>): string[] {
  const q = settings.hook?.value.includes('Question');
  const hook = q ? '東京燒肉，這5間你吃過幾間？' : settings.hook?.value.startsWith('Countdown') ? '東京燒肉倒數，第5名開始！' : '東京燒肉，5間一次收藏。';
  const lines = spots.map((s, i) => {
    const name = s.name.trim() || `第${i + 1}間`;
    return s.note.trim() ? `${i + 1}. ${name}｜${s.note.trim()}` : `${i + 1}. ${name}`;
  });
  return [hook, ...lines, '收藏起來，下次去東京照著吃！'];
}

export function mediaVersionFrom(p: ReelProject, settings: Record<string, AppliedSetting>): MediaVersion {
  return {
    slots: p.slots.length ? p.slots : autoSlots(p.media),
    captions: mediaScript(p.spots, settings),
    music: musicFor(settings.music?.value),
    captionStyle: captionStyleFor(settings.captions?.value),
  };
}

export function mediaDiff(a: MediaVersion, b: MediaVersion) {
  const out: string[] = [];
  const swapped = a.slots.filter((s, i) => s !== b.slots[i]).length;
  if (swapped) out.push(`${swapped} scene${swapped === 1 ? '' : 's'} re-cut with different footage`);
  if (a.music !== b.music) out.push(`Music: ${MUSIC[b.music].name}`);
  if (a.captions.some((t, i) => t !== b.captions[i])) out.push('Captions edited');
  if (a.captionStyle !== b.captionStyle) out.push(`Caption style: ${CAPTION_STYLES[b.captionStyle]}`);
  return out;
}

/* ================================================================== deterministic learning rule (simulated) */

/** A choice must appear in at least this many different Reels before the Agent suggests it. */
export const REPEAT_THRESHOLD = 2;

/**
 * Transparent prototype rule — not a real learning engine:
 *  1. style signals are recorded per Reel (latest choice per preference key; brief/campaign text is never a signal);
 *  2. if the same key+value was chosen in ≥ REPEAT_THRESHOLD different Reels,
 *  3. scope = that series when every one of those Reels used the same series, else Creator Identity;
 *  4. skip if the target already holds that value, or the creator saved/rejected that exact suggestion;
 *  → create a pending suggestion with provenance. Nothing is saved without explicit approval.
 */
export function deriveSuggestions(state: AppState, now = Date.now()): Suggestion[] {
  const groups = new Map<string, Signal[]>();
  for (const sg of state.signals) {
    if (!(SUPPORTED_KEYS as readonly string[]).includes(sg.key)) continue;
    const k = `${sg.key}=${sg.value}`;
    groups.set(k, [...(groups.get(k) ?? []), sg]);
  }
  const next = [...state.suggestions];
  for (const [, list] of groups) {
    const reels = new Set(list.map((x) => x.projectId));
    if (reels.size < REPEAT_THRESHOLD) continue;
    const { key, value, label, category } = list[0];
    const seriesIds = new Set(list.map((x) => x.series ?? 'global'));
    const scope = seriesIds.size === 1 && !seriesIds.has('global') ? [...seriesIds][0] : 'global';
    const target = scope === 'global' ? state.memory : state.series.find((x) => x.id === scope)?.items ?? [];
    const saved = target.find((m) => m.id === key && m.enabled);
    if (saved && saved.value === value) continue;
    const existing = next.find((x) => x.key === key && x.value === value && x.scope === scope);
    if (existing) {
      if (existing.status === 'snoozed' && list.some((x) => x.at > existing.createdAt)) next.splice(next.indexOf(existing), 1, { ...existing, status: 'pending', createdAt: now });
      continue;
    }
    const where = scope === 'global' ? '' : ` ${SERIES_LABEL[scope] ?? scope}`;
    next.push({
      id: `sg-${scope}-${key}-${value}`.replace(/[^a-z0-9-]+/gi, '-').toLowerCase(),
      key,
      category,
      label,
      value,
      scope,
      reason: `You chose “${value}” for ${label.toLowerCase()} in ${reels.size} different${where} Reels.`,
      provenance: [...reels].map((id) => {
        const s = list.find((x) => x.projectId === id)!;
        const how = s.source === 'brief-override' ? 'This-Reel choice on New Reel' : s.source === 'plan-adjust' ? 'adjusted on Agent Plan' : 'changed while refining';
        return `${s.projectTitle || 'A Reel'} — ${how}`;
      }),
      origin: 'repeated-choice',
      status: 'pending',
      createdAt: now,
    });
  }
  return next;
}

/* ================================================================== first-use setup: deterministic extraction */

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

/* ================================================================== capture scenarios */

export function blankProject(id: string, over: Partial<ReelProject> = {}): ReelProject {
  return upgradeProject({ id, createdAt: Date.UTC(2026, 10, 4, 9, 0), ...over });
}

function coffeeProject(stage: ReelProject['stage'], memory: MemoryItem[]): ReelProject {
  return blankProject('demo-coffee', {
    brief: COFFEE_BRIEF,
    applied: stage === 'brief' ? [] : resolveSettings(memory, null, {}),
    pack: 'coffee',
    script: stage === 'brief' ? [] : [...COFFEE_SCRIPT],
    stage,
  });
}

function yakinikuProject(stage: ReelProject['stage'], withMedia: boolean): ReelProject {
  const media = withMedia ? SAMPLE_MEDIA.slice(0, 6) : [];
  return blankProject('demo-yakiniku', {
    mode: 'media',
    brief: YAKINIKU_BRIEF,
    series: 'travel-food',
    pack: 'yakiniku',
    media,
    spots: withMedia ? SAMPLE_SPOTS.map((s) => ({ ...s })) : EMPTY_SPOTS.map((s) => ({ ...s })),
    slots: withMedia ? autoSlots(media) : [],
    stage,
  });
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
  const learned = (): AppState => {
    const st: AppState = {
      ...s,
      memory: setupMemory(),
      memorySetup: 'done',
      suggestions: [{ ...s.suggestions[0], status: 'saved' }],
      signals: [
        { projectId: 'past-1', projectTitle: 'Night market snacks', series: 'travel-food', key: 'captions', category: 'captions', label: 'Captions', value: 'Traditional Chinese, Soft Cream', source: 'refine', at: Date.UTC(2026, 10, 2) },
        { projectId: 'past-2', projectTitle: 'Osaka street food', series: 'travel-food', key: 'captions', category: 'captions', label: 'Captions', value: 'Traditional Chinese, Soft Cream', source: 'brief-override', at: Date.UTC(2026, 10, 3) },
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
    case 'fresh':
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
    // v3.1 media-first states
    case 'mode':
      return learned();
    case 'import-empty': {
      const st = learned();
      return { ...st, projects: [yakinikuProject('brief', false)], currentId: 'demo-yakiniku' };
    }
    case 'import': {
      const st = learned();
      return { ...st, projects: [yakinikuProject('brief', true)], currentId: 'demo-yakiniku' };
    }
    case 'media-plan': {
      const st = learned();
      return { ...st, projects: [yakinikuProject('plan', true)], currentId: 'demo-yakiniku' };
    }
    case 'media-preview': {
      const st = learned();
      const p = yakinikuProject('preview', true);
      const settings = resolvedMap(resolveSettings(st.memory, seriesOf(st, p.series), p.overrides));
      const v = mediaVersionFrom(p, settings);
      return { ...st, credits: spent(CREDIT_COSTS.generate), projects: [{ ...p, slots: v.slots, mOriginal: v, applied: Object.values(settings), creditsSpent: CREDIT_COSTS.generate }], currentId: 'demo-yakiniku' };
    }
    default:
      return null;
  }
}
