import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clearBlobs, putBlob } from './mediaStore';
import {
  AppState,
  AppliedSetting,
  BOOKSTORE_SCRIPT,
  CAPTION_STYLES,
  COFFEE_BRIEF,
  COFFEE_SCRIPT,
  CREDIT_COSTS,
  CaptionStyle,
  CategoryId,
  EMPTY_SPOTS,
  ExtractedPref,
  KEY_CATEGORY,
  KEY_LABEL,
  MUSIC,
  MediaAsset,
  MediaVersion,
  MemoryItem,
  MusicId,
  ReelProject,
  ReelVersion,
  SAMPLE_MEDIA,
  SAMPLE_SPOTS,
  Signal,
  Spot,
  YAKINIKU_BRIEF,
  autoSlots,
  blankProject,
  buildScenario,
  clearState,
  deriveSuggestions,
  loadState,
  mediaVersionFrom,
  newId,
  originalVersion,
  packFor,
  resolveSettings,
  resolvedMap,
  saveState,
  seedState,
  sensitiveReason,
  seriesOf,
} from './state';

/* ------------------------------------------------------------------ routing */

export type Route =
  // existing YouCam AI Pro surfaces (recreated)
  | 'explore'
  | 'agent'
  | 'tools'
  | 'library'
  | 'video'
  | 'settings'
  // proposed feature
  | 'reel-agent'
  | 'mode'
  | 'setup'
  | 'memory'
  | 'new'
  | 'plan'
  | 'create'
  | 'preview'
  | 'refine'
  | 'finish'
  | 'error';

export const ROUTES: Route[] = ['explore', 'agent', 'tools', 'library', 'video', 'settings', 'reel-agent', 'mode', 'setup', 'memory', 'new', 'plan', 'create', 'preview', 'refine', 'finish', 'error'];
export const TAB_ROUTES: Route[] = ['explore', 'agent', 'tools', 'library'];

function readRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  if (h === 'signature') return 'memory'; // v2 links
  return ROUTES.includes(h as Route) ? (h as Route) : 'explore';
}

/** Optional sub-view in the hash, e.g. #/memory?tab=series */
export function routeParam(name: string) {
  const q = window.location.hash.split('?')[1];
  return q ? new URLSearchParams(q).get(name) : null;
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [, force] = useState(0);
  const stack = useRef<Route[]>([]);
  useEffect(() => {
    const on = () => {
      setRoute(readRoute());
      force((n) => n + 1);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((r: Route, opts: { replace?: boolean; query?: string } = {}) => {
    const cur = readRoute();
    if (TAB_ROUTES.includes(r)) stack.current = [];
    else if (!opts.replace && cur !== r) stack.current.push(cur);
    const target = `/${r}${opts.query ? `?${opts.query}` : ''}`;
    if (window.location.hash === `#${target}`) setRoute(r);
    window.location.hash = target;
  }, []);
  /** In-app back: previous screen, or a sensible parent when opened directly. */
  const back = useCallback((fallback: Route) => {
    const prev = stack.current.pop();
    window.location.hash = `/${prev ?? fallback}`;
  }, []);
  return { route, go, back };
}

export interface Toast {
  id: number;
  text: string;
}

/* ------------------------------------------------------------------ store */

export function useStore() {
  const [state, setState] = useState<AppState>(() => {
    const scenario = new URLSearchParams(window.location.search).get('scenario');
    return (scenario && buildScenario(scenario)) || loadState();
  });
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => saveState(state), [state]);

  const notify = useCallback((text: string) => {
    const id = Date.now();
    setToast({ id, text });
    window.setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 2600);
  }, []);

  const current = useMemo(() => state.projects.find((p) => p.id === state.currentId) ?? null, [state.projects, state.currentId]);

  /** Live settings for a Reel — always derived from current Memory, series and overrides. */
  const resolveFor = useCallback(
    (p: ReelProject | null): Record<string, AppliedSetting> => resolvedMap(resolveSettings(state.memory, p ? seriesOf(state, p.series) : null, p?.overrides ?? {})),
    [state],
  );

  const patchProject = useCallback((id: string, patch: Partial<ReelProject> | ((p: ReelProject) => Partial<ReelProject>)) => {
    setState((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, ...(typeof patch === 'function' ? patch(p) : patch) } : p)) }));
  }, []);

  const actions = useMemo(() => {
    const log = (s: AppState, text: string): AppState => ({ ...s, memoryLog: [{ at: Date.now(), text }, ...s.memoryLog].slice(0, 30) });
    const settle = (s: AppState, key: string, value: string, scope: string): AppState => ({
      ...s,
      suggestions: s.suggestions.map((x) => (x.key === key && x.value === value && x.scope === scope && (x.status === 'pending' || x.status === 'snoozed') ? { ...x, status: 'saved' as const } : x)),
    });
    const upsert = (s: AppState, key: string, value: string, source: MemoryItem['source'], category?: CategoryId, label?: string): AppState => {
      const exists = s.memory.find((m) => m.id === key);
      const memory = exists
        ? s.memory.map((m) => (m.id === key ? { ...m, value, enabled: true, source } : m))
        : [...s.memory, { id: key, category: category ?? KEY_CATEGORY[key] ?? 'avoid', label: label ?? KEY_LABEL[key] ?? key, value, enabled: true, source }];
      return settle({ ...s, memory }, key, value, 'global');
    };
    const upsertSeries = (s: AppState, seriesId: string, key: string, value: string, source: MemoryItem['source'], category?: CategoryId, label?: string): AppState => {
      const next = {
        ...s,
        series: s.series.map((sr) => {
          if (sr.id !== seriesId) return sr;
          const exists = sr.items.find((i) => i.id === key);
          const items = exists
            ? sr.items.map((i) => (i.id === key ? { ...i, value, enabled: true, source } : i))
            : [...sr.items, { id: key, category: category ?? KEY_CATEGORY[key] ?? 'avoid', label: label ?? KEY_LABEL[key] ?? key, value, enabled: true, source }];
          return { ...sr, items };
        }),
      };
      return settle(next, key, value, seriesId);
    };
    /** records one STYLE choice for one Reel (latest per key), then re-evaluates suggestions. Brief text is never a signal. */
    const withSignal = (s: AppState, projectId: string, key: string, value: string, source: Signal['source']): AppState => {
      if (!KEY_LABEL[key]) return s;
      const p = s.projects.find((x) => x.id === projectId);
      const signals = [
        ...s.signals.filter((x) => !(x.projectId === projectId && x.key === key)),
        { projectId, projectTitle: p?.brief, series: p?.series ?? null, key, category: KEY_CATEGORY[key], label: KEY_LABEL[key], value, source, at: Date.now() },
      ];
      const next = { ...s, signals };
      return { ...next, suggestions: deriveSuggestions(next) };
    };
    const resolveIn = (s: AppState, p: ReelProject) => resolvedMap(resolveSettings(s.memory, seriesOf(s, p.series), p.overrides));

    return {
      /* ---------- Creator Identity (global, persistent, user-controlled) */
      toggleMemory: (id: string) =>
        setState((s) => {
          const it = s.memory.find((m) => m.id === id);
          return log({ ...s, memory: s.memory.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)) }, `${it?.enabled ? 'Disabled' : 'Enabled'}: ${it?.label}`);
        }),
      updateMemory: (id: string, value: string): string | null => {
        const why = sensitiveReason(value);
        if (why) return why;
        setState((s) => {
          const it = s.memory.find((m) => m.id === id);
          return log(settle({ ...s, memory: s.memory.map((m) => (m.id === id ? { ...m, value, source: 'creator' } : m)) }, id, value, 'global'), `Edited: ${it?.label} → ${value}`);
        });
        return null;
      },
      removeMemory: (id: string) =>
        setState((s) => {
          const it = s.memory.find((m) => m.id === id);
          return log({ ...s, memory: s.memory.filter((m) => m.id !== id) }, `Deleted: ${it?.label}`);
        }),
      /** returns a reason string when the value was refused (campaign/claims/customer info) */
      addMemory: (category: CategoryId, label: string, value: string): string | null => {
        const why = sensitiveReason(value) ?? sensitiveReason(label);
        if (why) return why;
        setState((s) => {
          const key = KEY_CATEGORY[category] === category && !s.memory.some((m) => m.id === category) && category !== 'avoid' ? category : `${category}-${newId()}`;
          return log(upsert(s, key, value, 'creator', category, label), `Added: ${label} → ${value}`);
        });
        return null;
      },
      /** explicit "make this my default" from the creation flow */
      saveOverrideAsDefault: (key: string, value: string) =>
        setState((s) => log(upsert(s, key, value, 'creator'), `Saved from New Reel: ${KEY_LABEL[key] ?? key} → ${value}`)),

      /* ---------- Content / Series preferences */
      toggleSeries: (seriesId: string) => setState((s) => ({ ...s, series: s.series.map((x) => (x.id === seriesId ? { ...x, enabled: !x.enabled } : x)) })),
      toggleSeriesItem: (seriesId: string, id: string) =>
        setState((s) => ({ ...s, series: s.series.map((x) => (x.id === seriesId ? { ...x, items: x.items.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i)) } : x)) })),
      updateSeriesItem: (seriesId: string, id: string, value: string): string | null => {
        const why = sensitiveReason(value);
        if (why) return why;
        setState((s) => {
          const sr = s.series.find((x) => x.id === seriesId);
          const it = sr?.items.find((i) => i.id === id);
          return log(upsertSeries(s, seriesId, id, value, 'creator', it?.category, it?.label), `Edited ${sr?.name}: ${it?.label} → ${value}`);
        });
        return null;
      },
      removeSeriesItem: (seriesId: string, id: string) =>
        setState((s) => ({ ...s, series: s.series.map((x) => (x.id === seriesId ? { ...x, items: x.items.filter((i) => i.id !== id) } : x)) })),
      addSeriesItem: (seriesId: string, key: string, value: string): string | null => {
        const why = sensitiveReason(value);
        if (why) return why;
        setState((s) => {
          const k = key === 'avoid' ? `avoid-${newId()}` : key;
          const sr = s.series.find((x) => x.id === seriesId);
          return log(upsertSeries(s, seriesId, k, value, 'creator', KEY_CATEGORY[key] ?? 'avoid', KEY_LABEL[key] ?? 'Avoid'), `Added to ${sr?.name}: ${KEY_LABEL[key] ?? 'Avoid'} → ${value}`);
        });
        return null;
      },

      /* ---------- suggestions: nothing becomes Memory without explicit approval */
      acceptSuggestion: (id: string) =>
        setState((s) => {
          const sg = s.suggestions.find((x) => x.id === id);
          if (!sg || sg.status === 'saved') return s;
          const next = sg.scope === 'global' ? upsert(s, sg.key, sg.value, 'suggestion', sg.category, sg.label) : upsertSeries(s, sg.scope, sg.key, sg.value, 'suggestion', sg.category, sg.label);
          const where = sg.scope === 'global' ? 'Creator Identity' : s.series.find((x) => x.id === sg.scope)?.name;
          return log({ ...next, suggestions: next.suggestions.map((x) => (x.id === id ? { ...x, status: 'saved' } : x)) }, `Accepted suggestion (${where}): ${sg.label} → ${sg.value}`);
        }),
      snoozeSuggestion: (id: string) => setState((s) => ({ ...s, suggestions: s.suggestions.map((x) => (x.id === id ? { ...x, status: 'snoozed', createdAt: Date.now() } : x)) })),
      rejectSuggestion: (id: string) =>
        setState((s) => {
          const sg = s.suggestions.find((x) => x.id === id);
          return log({ ...s, suggestions: s.suggestions.map((x) => (x.id === id ? { ...x, status: 'rejected' } : x)) }, `Rejected suggestion: ${sg?.label} → ${sg?.value}`);
        }),
      reconsiderSuggestion: (id: string) => setState((s) => ({ ...s, suggestions: s.suggestions.map((x) => (x.id === id ? { ...x, status: 'pending' } : x)) })),
      forgetSignals: () => setState((s) => log({ ...s, signals: [] }, 'Cleared noticed choices')),

      /* ---------- first-use setup */
      saveSetup: (prefs: ExtractedPref[]) =>
        setState((s) => {
          let next = s;
          for (const p of prefs) next = upsert(next, p.key === 'avoid-custom' ? `avoid-${newId()}` : p.key, p.value, 'setup', p.category, p.label);
          return log({ ...next, memorySetup: 'done' }, `Saved ${prefs.length} preference${prefs.length === 1 ? '' : 's'} from first-use setup`);
        }),
      skipSetup: () => setState((s) => ({ ...s, memorySetup: 'skipped' })),

      /* ---------- settings (existing app) */
      toggleWatermark: () => setState((s) => ({ ...s, settings: { ...s.settings, removeWatermark: !s.settings.removeWatermark } })),

      /* ---------- Reel projects */
      startReel: (brief = '', mode: 'idea' | 'media' = 'idea') => {
        const id = newId();
        const p = blankProject(id, {
          mode,
          brief: mode === 'media' ? brief || YAKINIKU_BRIEF : brief,
          createdAt: Date.now(),
          pack: packFor(brief, mode),
          series: mode === 'media' ? 'travel-food' : null,
          spots: mode === 'media' ? EMPTY_SPOTS.map((x) => ({ ...x })) : [],
        });
        setState((s) => ({ ...s, projects: [p, ...s.projects], currentId: id }));
        return id;
      },
      openProject: (id: string) => setState((s) => ({ ...s, currentId: id })),
      patchProject,
      setSeries: (id: string, series: string | null) => patchProject(id, { series }),

      /* ---------- media import & brief (media mode) */
      addUploads: async (id: string, files: { file: File; kind: 'image' | 'video'; duration?: number }[]) => {
        const assets: MediaAsset[] = [];
        for (const f of files) {
          const aid = `up-${newId()}`;
          await putBlob(aid, f.file);
          assets.push({ id: aid, name: f.file.name, kind: f.kind, source: 'upload', duration: f.duration, attribution: 'Your upload · stays on this device' });
        }
        patchProject(id, (p) => ({ media: [...p.media, ...assets], slots: [] }));
      },
      addSampleMedia: (id: string) =>
        patchProject(id, (p) => ({ media: [...p.media, ...SAMPLE_MEDIA.filter((m) => !p.media.some((x) => x.id === m.id)).slice(0, 6)], slots: [] })),
      removeMedia: (id: string, assetId: string) =>
        patchProject(id, (p) => ({ media: p.media.filter((m) => m.id !== assetId), slots: p.slots.length ? autoSlots(p.media.filter((m) => m.id !== assetId)) : [] })),
      moveMedia: (id: string, idx: number, dir: -1 | 1) =>
        patchProject(id, (p) => {
          const j = idx + dir;
          if (j < 0 || j >= p.media.length) return {};
          const media = [...p.media];
          [media[idx], media[j]] = [media[j], media[idx]];
          return { media, slots: [] };
        }),
      setSpot: (id: string, idx: number, patch: Partial<Spot>) =>
        patchProject(id, (p) => ({ spots: p.spots.map((s, i) => (i === idx ? { ...s, ...patch } : s)) })),
      fillSampleSpots: (id: string) => patchProject(id, { spots: SAMPLE_SPOTS.map((x) => ({ ...x })) }),
      /** creator re-assigns footage for one segment of the plan */
      setSlot: (id: string, seg: number, assetId: string) =>
        patchProject(id, (p) => {
          const slots = p.slots.length ? [...p.slots] : autoSlots(p.media);
          slots[seg] = assetId;
          return { slots };
        }),

      planReel: (id: string) =>
        setState((s) => {
          const p0 = s.projects.find((p) => p.id === id);
          if (!p0) return s;
          let next: AppState = {
            ...s,
            projects: s.projects.map((p) => {
              if (p.id !== id) return p;
              if (p.mode === 'media') return { ...p, pack: 'yakiniku', slots: p.slots.length ? p.slots : autoSlots(p.media), stage: 'plan' };
              const pack = packFor(p.brief);
              return { ...p, pack, script: p.scriptEdited && p.script.length ? p.script : [...(pack === 'coffee' ? COFFEE_SCRIPT : BOOKSTORE_SCRIPT)], stage: 'plan' };
            }),
          };
          for (const [k, v] of Object.entries(p0.overrides)) next = withSignal(next, id, k, v, 'brief-override');
          return next;
        }),
      /** a This-Reel-only adjustment made on the plan (e.g. pacing or hook length) */
      setPlanOverride: (id: string, key: string, value: string | null) =>
        setState((s) => {
          const p0 = s.projects.find((p) => p.id === id);
          if (!p0) return s;
          const overrides = { ...p0.overrides };
          const inherited = resolvedMap(resolveSettings(s.memory, seriesOf(s, p0.series), {}))[key]?.value;
          if (value === null || value === inherited) delete overrides[key];
          else overrides[key] = value;
          let next: AppState = { ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, overrides } : p)) };
          if (value && value !== inherited) next = withSignal(next, id, key, value, 'plan-adjust');
          else next = { ...next, signals: next.signals.filter((x) => !(x.projectId === id && x.key === key)) };
          return next;
        }),
      /** charges once and only when the balance covers it; returns false (nothing changes) otherwise */
      approveGenerate: (id: string): boolean => {
        const cost = CREDIT_COSTS.generate;
        const can = (s: AppState, p?: ReelProject) => !!p && (p.stage === 'plan' || p.stage === 'brief' || p.stage === 'draft-plan') && s.credits >= cost;
        if (!can(state, state.projects.find((p) => p.id === id))) return false;
        setState((s) => {
          // re-checked against the latest state: blocks double taps and never goes negative
          if (!can(s, s.projects.find((p) => p.id === id))) return s;
          return {
            ...s,
            credits: s.credits - cost,
            projects: s.projects.map((p) => {
              if (p.id !== id) return p;
              const settings = resolveIn(s, p);
              const applied = Object.values(settings);
              const base = { ...p, stage: 'generating' as const, applied, creditsSpent: p.creditsSpent + cost };
              if (p.mode === 'media') {
                const v = mediaVersionFrom(p, settings);
                return { ...base, slots: v.slots, mOriginal: v, mRevision: null, chosen: 'original' as const };
              }
              return { ...base, original: originalVersion(applied) };
            }),
          };
        });
        return true;
      },
      saveDraftPlan: (id: string) => patchProject(id, { stage: 'draft-plan', saved: true }),
      finishGenerating: (id: string) => patchProject(id, { stage: 'preview' }),

      /* ---------- Revision, prepared media (never touches the original) */
      ensureRevision: (id: string) =>
        patchProject(id, (p) => {
          if (p.mode === 'media') return p.mRevision || !p.mOriginal ? {} : { mRevision: { ...p.mOriginal, slots: [...p.mOriginal.slots], captions: [...p.mOriginal.captions] } };
          return p.revision || !p.original ? {} : { revision: { ...p.original, captions: [...p.original.captions] } };
        }),
      setRevision: (id: string, rev: ReelVersion) => patchProject(id, { revision: rev }),
      /** returns false when the simulated balance is too low (caller shows the exception state) */
      replaceScene2: (id: string): boolean => {
        const cost = CREDIT_COSTS.replaceScene;
        const can = (s: AppState) => {
          const p = s.projects.find((x) => x.id === id);
          return !!p?.revision && p.revision.scene2 !== 'alt' && s.credits >= cost;
        };
        if (!can(state)) return false;
        setState((s) => {
          // re-checked against the latest state: no duplicate charge, no negative balance, Reel untouched on failure
          if (!can(s)) return s;
          return {
            ...s,
            credits: s.credits - cost,
            projects: s.projects.map((x) => (x.id === id && x.revision ? { ...x, revision: { ...x.revision, scene2: 'alt' }, creditsSpent: x.creditsSpent + cost } : x)),
          };
        });
        return true;
      },
      setCaption: (id: string, idx: number, text: string) =>
        patchProject(id, (p) => {
          if (p.mode === 'media') {
            if (!p.mRevision) return {};
            const captions = [...p.mRevision.captions];
            captions[idx] = text;
            return { mRevision: { ...p.mRevision, captions } };
          }
          if (!p.revision) return {};
          const captions = [...p.revision.captions];
          captions[idx] = text;
          return { revision: { ...p.revision, captions } };
        }),
      setCaptionStyle: (id: string, captionStyle: CaptionStyle) =>
        setState((s) => {
          const next = {
            ...s,
            projects: s.projects.map((p) =>
              p.id !== id ? p : p.mode === 'media' ? (p.mRevision ? { ...p, mRevision: { ...p.mRevision, captionStyle } } : p) : p.revision ? { ...p, revision: { ...p.revision, captionStyle } } : p,
            ),
          };
          return withSignal(next, id, 'captions', `Traditional Chinese, ${CAPTION_STYLES[captionStyle]}`, 'refine');
        }),
      resetCaptions: (id: string) =>
        patchProject(id, (p) => {
          if (p.mode === 'media') return p.mRevision && p.mOriginal ? { mRevision: { ...p.mRevision, captions: [...p.mOriginal.captions], captionStyle: p.mOriginal.captionStyle } } : {};
          return p.revision && p.original ? { revision: { ...p.revision, captions: [...p.original.captions], captionStyle: p.original.captionStyle } } : {};
        }),
      restoreScene2: (id: string) => patchProject(id, (p) => (p.revision ? { revision: { ...p.revision, scene2: 'original' } } : {})),
      setMusic: (id: string, music: MusicId) =>
        setState((s) => {
          const next = {
            ...s,
            projects: s.projects.map((p) =>
              p.id !== id ? p : p.mode === 'media' ? (p.mRevision ? { ...p, mRevision: { ...p.mRevision, music } } : p) : p.revision ? { ...p, revision: { ...p.revision, music } } : p,
            ),
          };
          return withSignal(next, id, 'music', MUSIC[music].name, 'refine');
        }),
      /** media revision: re-cut one segment with different footage the creator already has (no generation) */
      setRevisionSlot: (id: string, seg: number, assetId: string) =>
        patchProject(id, (p) => {
          if (!p.mRevision) return {};
          const slots = [...p.mRevision.slots];
          slots[seg] = assetId;
          return { mRevision: { ...p.mRevision, slots } as MediaVersion };
        }),
      chooseVersion: (id: string, chosen: 'original' | 'revision') => patchProject(id, { chosen, readyToUse: false }),
      discardRevision: (id: string) => patchProject(id, { revision: null, mRevision: null, chosen: 'original' }),

      /* ---------- Finish */
      setReady: (id: string, readyToUse: boolean) =>
        setState((s) => {
          const next = { ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, readyToUse } : p)) };
          return readyToUse ? { ...next, suggestions: deriveSuggestions(next) } : next;
        }),
      saveProject: (id: string) => patchProject(id, { saved: true }),

      /* ---------- Demo controls */
      setCredits: (credits: number) => setState((s) => ({ ...s, credits: Math.max(0, Math.floor(credits)) })),
      resetDemo: () => {
        clearState();
        void clearBlobs();
        setState(seedState());
      },
      /** Build the finished first Reel so any screen can be captured directly. */
      ensureFirstReel: (): string => {
        const existing = state.projects.find((p) => p.pack === 'coffee' && p.original);
        if (existing) {
          setState((s) => ({ ...s, currentId: existing.id }));
          return existing.id;
        }
        const id = newId();
        setState((s) => {
          const applied = resolveSettings(s.memory, null, {});
          const p = blankProject(id, {
            brief: COFFEE_BRIEF,
            createdAt: Date.now(),
            applied,
            pack: 'coffee',
            script: [...COFFEE_SCRIPT],
            stage: 'preview',
            original: originalVersion(applied),
            creditsSpent: CREDIT_COSTS.generate,
          });
          return { ...s, memorySetup: s.memorySetup === 'unseen' ? 'skipped' : s.memorySetup, credits: Math.max(0, s.credits - CREDIT_COSTS.generate), projects: [p, ...s.projects], currentId: id };
        });
        return id;
      },
      /** Guided demo helper: a media project with sample footage and fictional names, at the given stage. */
      ensureMediaReel: (stage: 'brief' | 'plan' | 'preview'): string => {
        const ex = state.projects.find((p) => p.mode === 'media' && p.media.length);
        if (ex && (stage === 'preview' ? !!ex.mOriginal : !ex.mOriginal)) {
          setState((s) => ({ ...s, currentId: ex.id, projects: s.projects.map((p) => (p.id === ex.id && stage !== 'preview' ? { ...p, stage, slots: p.slots.length ? p.slots : autoSlots(p.media) } : p)) }));
          return ex.id;
        }
        const id = newId();
        setState((s) => {
          const media = SAMPLE_MEDIA.slice(0, 6);
          let p = blankProject(id, { mode: 'media', brief: YAKINIKU_BRIEF, createdAt: Date.now(), series: 'travel-food', pack: 'yakiniku', media, spots: SAMPLE_SPOTS.map((x) => ({ ...x })), slots: autoSlots(media), stage: stage === 'brief' ? 'brief' : 'plan' });
          let credits = s.credits;
          if (stage === 'preview') {
            const settings = resolvedMap(resolveSettings(s.memory, seriesOf(s, p.series), {}));
            const v = mediaVersionFrom(p, settings);
            p = { ...p, stage: 'preview', mOriginal: v, applied: Object.values(settings), creditsSpent: CREDIT_COSTS.generate };
            credits = Math.max(0, credits - CREDIT_COSTS.generate);
          }
          return { ...s, memorySetup: s.memorySetup === 'unseen' ? 'skipped' : s.memorySetup, credits, projects: [p, ...s.projects], currentId: id };
        });
        return id;
      },
    };
  }, [patchProject, state.credits, state.projects]);

  const pending = useMemo(() => state.suggestions.filter((x) => x.status === 'pending'), [state.suggestions]);

  return { state, current, actions, toast, notify, pending, resolveFor };
}

export type Store = ReturnType<typeof useStore>;
