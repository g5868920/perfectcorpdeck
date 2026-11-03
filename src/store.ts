import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  BOOKSTORE_SCRIPT,
  CAPTION_STYLES,
  COFFEE_BRIEF,
  COFFEE_SCRIPT,
  CREDIT_COSTS,
  CaptionStyle,
  CategoryId,
  ExtractedPref,
  KEY_CATEGORY,
  KEY_LABEL,
  MUSIC,
  MemoryItem,
  MusicId,
  ReelProject,
  ReelVersion,
  Signal,
  appliedSettings,
  buildScenario,
  clearState,
  deriveSuggestions,
  loadState,
  newId,
  originalVersion,
  packFor,
  saveState,
  seedState,
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
  | 'setup'
  | 'memory'
  | 'new'
  | 'plan'
  | 'create'
  | 'preview'
  | 'refine'
  | 'finish'
  | 'error';

export const ROUTES: Route[] = ['explore', 'agent', 'tools', 'library', 'video', 'settings', 'reel-agent', 'setup', 'memory', 'new', 'plan', 'create', 'preview', 'refine', 'finish', 'error'];
export const TAB_ROUTES: Route[] = ['explore', 'agent', 'tools', 'library'];

function readRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  if (h === 'signature') return 'memory'; // v2 links
  return ROUTES.includes(h as Route) ? (h as Route) : 'explore';
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(readRoute);
  const stack = useRef<Route[]>([]);
  useEffect(() => {
    const on = () => setRoute(readRoute());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((r: Route, opts: { replace?: boolean } = {}) => {
    const cur = readRoute();
    if (TAB_ROUTES.includes(r)) stack.current = [];
    else if (!opts.replace && cur !== r) stack.current.push(cur);
    if (cur === r) setRoute(r);
    window.location.hash = `/${r}`;
  }, []);
  /** In-app back: previous screen, or a sensible parent when opened directly. */
  const back = useCallback(
    (fallback: Route) => {
      const prev = stack.current.pop();
      const target = prev ?? fallback;
      window.location.hash = `/${target}`;
    },
    [],
  );
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

  const patchProject = useCallback((id: string, patch: Partial<ReelProject> | ((p: ReelProject) => Partial<ReelProject>)) => {
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...(typeof patch === 'function' ? patch(p) : patch) } : p)),
    }));
  }, []);

  const actions = useMemo(() => {
    const log = (s: AppState, text: string): AppState => ({ ...s, memoryLog: [{ at: Date.now(), text }, ...s.memoryLog].slice(0, 30) });
    const upsert = (s: AppState, key: string, value: string, source: MemoryItem['source'], category?: CategoryId, label?: string): AppState => {
      const exists = s.memory.find((m) => m.id === key);
      const memory = exists
        ? s.memory.map((m) => (m.id === key ? { ...m, value, enabled: true, source } : m))
        : [...s.memory, { id: key, category: category ?? KEY_CATEGORY[key] ?? 'avoid', label: label ?? KEY_LABEL[key] ?? key, value, enabled: true, source }];
      // a pending suggestion for exactly this value is now fulfilled
      const suggestions = s.suggestions.map((x) => (x.key === key && x.value === value && (x.status === 'pending' || x.status === 'snoozed') ? { ...x, status: 'saved' as const } : x));
      return { ...s, memory, suggestions };
    };
    /** records one creative choice for one Reel (latest per key), then re-evaluates suggestions */
    const withSignal = (s: AppState, projectId: string, key: string, value: string, source: Signal['source']): AppState => {
      if (!KEY_LABEL[key]) return s; // only supported, non-sensitive preference keys
      const signals = [
        ...s.signals.filter((x) => !(x.projectId === projectId && x.key === key)),
        { projectId, key, category: KEY_CATEGORY[key], label: KEY_LABEL[key], value, source, at: Date.now() },
      ];
      const next = { ...s, signals };
      return { ...next, suggestions: deriveSuggestions(next) };
    };

    return {
      /* ---------- Creator Memory (global, persistent, user-controlled) */
      toggleMemory: (id: string) =>
        setState((s) => {
          const it = s.memory.find((m) => m.id === id);
          return log({ ...s, memory: s.memory.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)) }, `${it?.enabled ? 'Disabled' : 'Enabled'}: ${it?.label}`);
        }),
      updateMemory: (id: string, value: string) =>
        setState((s) => {
          const it = s.memory.find((m) => m.id === id);
          return log({ ...s, memory: s.memory.map((m) => (m.id === id ? { ...m, value, source: 'creator' } : m)) }, `Edited: ${it?.label} → ${value}`);
        }),
      removeMemory: (id: string) =>
        setState((s) => {
          const it = s.memory.find((m) => m.id === id);
          return log({ ...s, memory: s.memory.filter((m) => m.id !== id) }, `Deleted: ${it?.label}`);
        }),
      addMemory: (category: CategoryId, label: string, value: string) =>
        setState((s) => {
          const key = KEY_CATEGORY[category] === category && !s.memory.some((m) => m.id === category) && category !== 'avoid' ? category : `${category}-${newId()}`;
          return log(upsert(s, key, value, 'creator', category, label), `Added: ${label} → ${value}`);
        }),
      /** explicit "make this my default" from the creation flow */
      saveOverrideAsDefault: (key: string, value: string) =>
        setState((s) => log(upsert(s, key, value, 'creator'), `Saved from New Reel: ${KEY_LABEL[key] ?? key} → ${value}`)),

      /* ---------- suggestions: nothing becomes Memory without explicit approval */
      acceptSuggestion: (id: string) =>
        setState((s) => {
          const sg = s.suggestions.find((x) => x.id === id);
          if (!sg || sg.status === 'saved') return s;
          const next = upsert(s, sg.key, sg.value, 'suggestion', sg.category, sg.label);
          return log({ ...next, suggestions: next.suggestions.map((x) => (x.id === id ? { ...x, status: 'saved' } : x)) }, `Saved suggestion: ${sg.label} → ${sg.value}`);
        }),
      snoozeSuggestion: (id: string) =>
        setState((s) => ({ ...s, suggestions: s.suggestions.map((x) => (x.id === id ? { ...x, status: 'snoozed', createdAt: Date.now() } : x)) })),
      rejectSuggestion: (id: string) =>
        setState((s) => {
          const sg = s.suggestions.find((x) => x.id === id);
          return log({ ...s, suggestions: s.suggestions.map((x) => (x.id === id ? { ...x, status: 'rejected' } : x)) }, `Dismissed suggestion: ${sg?.label} → ${sg?.value}`);
        }),
      reconsiderSuggestion: (id: string) => setState((s) => ({ ...s, suggestions: s.suggestions.map((x) => (x.id === id ? { ...x, status: 'pending' } : x)) })),

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
      startReel: (brief = '') => {
        const id = newId();
        const p: ReelProject = {
          id,
          brief,
          createdAt: Date.now(),
          uploads: [],
          overrides: {},
          applied: [],
          pack: packFor(brief),
          script: [],
          scriptEdited: false,
          sceneOrder: [1, 2, 3, 4],
          stage: 'brief',
          original: null,
          revision: null,
          chosen: 'original',
          readyToUse: false,
          saved: false,
          creditsSpent: 0,
        };
        setState((s) => ({ ...s, projects: [p, ...s.projects], currentId: id }));
        return id;
      },
      openProject: (id: string) => setState((s) => ({ ...s, currentId: id })),
      patchProject,
      planReel: (id: string) =>
        setState((s) => {
          const p0 = s.projects.find((p) => p.id === id);
          if (!p0) return s;
          let next: AppState = {
            ...s,
            projects: s.projects.map((p) => {
              if (p.id !== id) return p;
              const pack = packFor(p.brief);
              return {
                ...p,
                pack,
                applied: appliedSettings(s.memory, p.overrides),
                script: p.scriptEdited && p.script.length ? p.script : [...(pack === 'coffee' ? COFFEE_SCRIPT : BOOKSTORE_SCRIPT)],
                stage: 'plan',
              };
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
          const saved = s.memory.find((m) => m.id === key && m.enabled)?.value;
          if (value === null || value === saved) delete overrides[key];
          else overrides[key] = value;
          let next: AppState = {
            ...s,
            projects: s.projects.map((p) => (p.id === id ? { ...p, overrides, applied: appliedSettings(s.memory, overrides) } : p)),
          };
          if (value && value !== saved) next = withSignal(next, id, key, value, 'plan-adjust');
          else next = { ...next, signals: next.signals.filter((x) => !(x.projectId === id && x.key === key)) };
          return next;
        }),
      approveGenerate: (id: string) =>
        setState((s) => ({
          ...s,
          credits: s.credits - CREDIT_COSTS.generate,
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, stage: 'generating', original: originalVersion(p.applied), creditsSpent: p.creditsSpent + CREDIT_COSTS.generate } : p,
          ),
        })),
      saveDraftPlan: (id: string) => patchProject(id, { stage: 'draft-plan', saved: true }),
      finishGenerating: (id: string) => patchProject(id, { stage: 'preview' }),

      /* ---------- Revision (never touches the original) */
      ensureRevision: (id: string) =>
        patchProject(id, (p) => (p.revision || !p.original ? {} : { revision: { ...p.original, captions: [...p.original.captions] } })),
      setRevision: (id: string, rev: ReelVersion) => patchProject(id, { revision: rev }),
      /** returns false when the simulated balance is too low (caller shows the exception state) */
      replaceScene2: (id: string): boolean => {
        if (state.credits < CREDIT_COSTS.replaceScene) return false;
        setState((s) => {
          const p = s.projects.find((x) => x.id === id);
          if (!p || !p.revision) return s;
          return {
            ...s,
            credits: s.credits - CREDIT_COSTS.replaceScene,
            projects: s.projects.map((x) =>
              x.id === id && x.revision ? { ...x, revision: { ...x.revision, scene2: 'alt' }, creditsSpent: x.creditsSpent + CREDIT_COSTS.replaceScene } : x,
            ),
          };
        });
        return true;
      },
      setCaption: (id: string, idx: number, text: string) =>
        patchProject(id, (p) => {
          if (!p.revision) return {};
          const captions = [...p.revision.captions];
          captions[idx] = text;
          return { revision: { ...p.revision, captions } };
        }),
      setCaptionStyle: (id: string, captionStyle: CaptionStyle) =>
        setState((s) => {
          const next = { ...s, projects: s.projects.map((p) => (p.id === id && p.revision ? { ...p, revision: { ...p.revision, captionStyle } } : p)) };
          return withSignal(next, id, 'captions', `Traditional Chinese, ${CAPTION_STYLES[captionStyle]}`, 'refine');
        }),
      resetCaptions: (id: string) =>
        patchProject(id, (p) =>
          p.revision && p.original ? { revision: { ...p.revision, captions: [...p.original.captions], captionStyle: p.original.captionStyle } } : {},
        ),
      /** Going back to the prepared original Scene 02 is free (nothing is regenerated). */
      restoreScene2: (id: string) => patchProject(id, (p) => (p.revision ? { revision: { ...p.revision, scene2: 'original' } } : {})),
      setMusic: (id: string, music: MusicId) =>
        setState((s) => {
          const next = { ...s, projects: s.projects.map((p) => (p.id === id && p.revision ? { ...p, revision: { ...p.revision, music } } : p)) };
          return withSignal(next, id, 'music', MUSIC[music].name, 'refine');
        }),
      chooseVersion: (id: string, chosen: 'original' | 'revision') => patchProject(id, { chosen, readyToUse: false }),
      discardRevision: (id: string) => patchProject(id, { revision: null, chosen: 'original' }),

      /* ---------- Finish */
      setReady: (id: string, readyToUse: boolean) =>
        setState((s) => {
          const next = { ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, readyToUse } : p)) };
          return readyToUse ? { ...next, suggestions: deriveSuggestions(next) } : next;
        }),
      saveProject: (id: string) => patchProject(id, { saved: true }),

      /* ---------- Demo controls */
      setCredits: (credits: number) => setState((s) => ({ ...s, credits })),
      resetDemo: () => {
        clearState();
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
          const applied = appliedSettings(s.memory, {});
          const p: ReelProject = {
            id,
            brief: COFFEE_BRIEF,
            createdAt: Date.now(),
            uploads: [],
            overrides: {},
            applied,
            pack: 'coffee',
            script: [...COFFEE_SCRIPT],
            scriptEdited: false,
            sceneOrder: [1, 2, 3, 4],
            stage: 'preview',
            original: originalVersion(applied),
            revision: null,
            chosen: 'original',
            readyToUse: false,
            saved: false,
            creditsSpent: CREDIT_COSTS.generate,
          };
          return { ...s, memorySetup: s.memorySetup === 'unseen' ? 'skipped' : s.memorySetup, credits: s.credits - CREDIT_COSTS.generate, projects: [p, ...s.projects], currentId: id };
        });
        return id;
      },
    };
  }, [patchProject, state.credits, state.projects]);

  const pending = useMemo(() => state.suggestions.filter((x) => x.status === 'pending'), [state.suggestions]);

  return { state, current, actions, toast, notify, pending };
}

export type Store = ReturnType<typeof useStore>;
