import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  CaptionStyle,
  BOOKSTORE_SCRIPT,
  COFFEE_BRIEF,
  COFFEE_SCRIPT,
  CREDIT_COSTS,
  MusicId,
  ReelProject,
  ReelVersion,
  appliedSettings,
  clearState,
  loadState,
  newId,
  originalVersion,
  packFor,
  buildScenario,
  saveState,
  seedState,
} from './state';

export type Route =
  | 'signature'
  | 'new'
  | 'plan'
  | 'create'
  | 'preview'
  | 'refine'
  | 'finish'
  | 'library'
  | 'error';

export const ROUTES: Route[] = ['signature', 'new', 'plan', 'create', 'preview', 'refine', 'finish', 'library', 'error'];

function readRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, '').split('?')[0] as Route;
  return ROUTES.includes(h) ? h : 'signature';
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(readRoute);
  useEffect(() => {
    const on = () => setRoute(readRoute());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((r: Route) => {
    if (readRoute() === r) setRoute(r);
    window.location.hash = `/${r}`;
  }, []);
  return [route, go] as const;
}

export interface Toast {
  id: number;
  text: string;
}

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

  const current = useMemo(
    () => state.projects.find((p) => p.id === state.currentId) ?? null,
    [state.projects, state.currentId],
  );

  const patchProject = useCallback((id: string, patch: Partial<ReelProject> | ((p: ReelProject) => Partial<ReelProject>)) => {
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...(typeof patch === 'function' ? patch(p) : patch) } : p)),
    }));
  }, []);

  const actions = useMemo(
    () => ({
      /* ---------- Creator Signature (global, persistent) */
      toggleSig: (id: string) =>
        setState((s) => ({ ...s, signature: s.signature.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i)) })),
      updateSig: (id: string, value: string) =>
        setState((s) => ({ ...s, signature: s.signature.map((i) => (i.id === id ? { ...i, value } : i)) })),
      removeSig: (id: string) => setState((s) => ({ ...s, signature: s.signature.filter((i) => i.id !== id) })),
      addSig: (label: string, value: string) =>
        setState((s) => ({
          ...s,
          signature: [...s.signature, { id: `c-${newId()}`, label, value, enabled: true, custom: true, source: 'creator' }],
        })),
      saveSuggestion: () =>
        setState((s) => {
          if (s.suggestion.status !== 'pending') return s;
          const it = s.suggestion.item;
          return {
            ...s,
            suggestion: { ...s.suggestion, status: 'saved' },
            signature: s.signature.some((x) => x.id === it.id)
              ? s.signature
              : [...s.signature, { ...it, enabled: true, custom: true, source: 'agent-suggestion' }],
          };
        }),
      dismissSuggestion: () => setState((s) => ({ ...s, suggestion: { ...s.suggestion, status: 'dismissed' } })),

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
        setState((s) => ({
          ...s,
          projects: s.projects.map((p) => {
            if (p.id !== id) return p;
            const pack = packFor(p.brief);
            return {
              ...p,
              pack,
              applied: appliedSettings(s.signature, p.overrides),
              script: p.scriptEdited && p.script.length ? p.script : [...(pack === 'coffee' ? COFFEE_SCRIPT : BOOKSTORE_SCRIPT)],
              stage: 'plan',
            };
          }),
        })),
      approveGenerate: (id: string) =>
        setState((s) => ({
          ...s,
          credits: s.credits - CREDIT_COSTS.generate,
          projects: s.projects.map((p) =>
            p.id === id
              ? { ...p, stage: 'generating', original: originalVersion(), creditsSpent: p.creditsSpent + CREDIT_COSTS.generate }
              : p,
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
              x.id === id && x.revision
                ? { ...x, revision: { ...x.revision, scene2: 'alt' }, creditsSpent: x.creditsSpent + CREDIT_COSTS.replaceScene }
                : x,
            ),
          };
        });
        return true;
      },
      canAfford: (n: number) => state.credits >= n,
      setCaption: (id: string, idx: number, text: string) =>
        patchProject(id, (p) => {
          if (!p.revision) return {};
          const captions = [...p.revision.captions];
          captions[idx] = text;
          return { revision: { ...p.revision, captions } };
        }),
      setCaptionStyle: (id: string, captionStyle: CaptionStyle) =>
        patchProject(id, (p) => (p.revision ? { revision: { ...p.revision, captionStyle } } : {})),
      resetCaptions: (id: string) =>
        patchProject(id, (p) => (p.revision && p.original ? { revision: { ...p.revision, captions: [...p.original.captions], captionStyle: p.original.captionStyle } } : {})),
      /** Going back to the prepared original Scene 02 is free (nothing is regenerated). */
      restoreScene2: (id: string) => patchProject(id, (p) => (p.revision ? { revision: { ...p.revision, scene2: 'original' } } : {})),
      setMusic: (id: string, music: MusicId) =>
        patchProject(id, (p) => (p.revision ? { revision: { ...p.revision, music } } : {})),
      chooseVersion: (id: string, chosen: 'original' | 'revision') => patchProject(id, { chosen, readyToUse: false }),
      discardRevision: (id: string) => patchProject(id, { revision: null, chosen: 'original' }),

      /* ---------- Finish */
      setReady: (id: string, readyToUse: boolean) => patchProject(id, { readyToUse }),
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
          const p: ReelProject = {
            id,
            brief: COFFEE_BRIEF,
            createdAt: Date.now(),
            uploads: [],
            overrides: {},
            applied: appliedSettings(s.signature, {}),
            pack: 'coffee',
            script: [...COFFEE_SCRIPT],
            scriptEdited: false,
            sceneOrder: [1, 2, 3, 4],
            stage: 'preview',
            original: originalVersion(),
            revision: null,
            chosen: 'original',
            readyToUse: false,
            saved: false,
            creditsSpent: CREDIT_COSTS.generate,
          };
          return { ...s, credits: s.credits - CREDIT_COSTS.generate, projects: [p, ...s.projects], currentId: id };
        });
        return id;
      },
    }),
    [patchProject, state.credits, state.projects],
  );

  return { state, current, actions, toast, notify };
}

export type Store = ReturnType<typeof useStore>;
