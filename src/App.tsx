import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './components/Icon';
import { AppBar, BottomNav } from './components/ui';
import { CreateScreen, PreviewScreen } from './screens/Create';
import { ErrorScreen, FinishScreen, LibraryScreen } from './screens/Finish';
import { MediaPreviewScreen, MediaRefineScreen, ModeScreen } from './screens/Media';
import { MemoryHubScreen, ReelAgentScreen, SetupScreen } from './screens/Memory';
import { NewReelScreen } from './screens/NewReel';
import { PlanScreen } from './screens/Plan';
import { RefineScreen } from './screens/Refine';
import { AgentScreen, ExploreScreen, SettingsScreen, ToolsScreen, VideoGenScreen } from './screens/Shell';
import { COFFEE_BRIEF } from './state';
import { Route, Store, TAB_ROUTES, useRoute, useStore } from './store';
import { theme } from './theme';

/** Pushed (non-tab) screens that use the shared app bar. Existing-app screens draw their own headers. */
const BAR: Partial<Record<Route, { title: string; proposed?: boolean; back: Route }>> = {
  'reel-agent': { title: 'Reel Agent', proposed: true, back: 'explore' },
  mode: { title: 'New Reel', proposed: true, back: 'reel-agent' },
  setup: { title: 'Creator Memory', proposed: true, back: 'reel-agent' },
  memory: { title: 'Creator Memory', proposed: true, back: 'reel-agent' },
  new: { title: 'New Reel', back: 'mode' },
  plan: { title: 'Agent Plan', back: 'new' },
  create: { title: 'Creating Reel', back: 'reel-agent' },
  preview: { title: 'Your Reel', back: 'library' },
  refine: { title: 'Refine Your Reel', back: 'preview' },
  finish: { title: 'Ready to Use', back: 'preview' },
  error: { title: 'Revision', back: 'refine' },
};

/* ------------------------------------------------------------------ presenter rail model */

type Prep = 'none' | 'coffee' | 'media-brief' | 'media-plan' | 'media-reel' | 'low-coins';
interface Jump {
  label: string;
  r: Route;
  query?: string;
  prep?: Prep;
  note?: string;
}
const GROUPS: { id: string; title: string; kind: 'existing' | 'proposed' | 'qa'; items: Jump[] }[] = [
  {
    id: 'g1',
    title: '01 Existing YouCam App',
    kind: 'existing',
    items: [
      { label: 'Explore', r: 'explore' },
      { label: 'Video Generator', r: 'video', note: '+ proposed entry' },
      { label: 'AI Agent', r: 'agent', note: '+ proposed prompt' },
      { label: 'All Tools', r: 'tools' },
    ],
  },
  {
    id: 'g2',
    title: '02 Reel Agent Experience',
    kind: 'proposed',
    items: [
      { label: 'Reel Agent Home', r: 'reel-agent' },
      { label: 'Choose Creation Mode', r: 'mode' },
      { label: 'New Reel / Import Media', r: 'new', prep: 'media-brief' },
      { label: 'Agent Plan (from media)', r: 'plan', prep: 'media-plan' },
      { label: 'Generate / Complete Reel', r: 'preview', prep: 'media-reel' },
      { label: 'Refine', r: 'refine', prep: 'media-reel' },
      { label: 'Ready to Use', r: 'finish', prep: 'media-reel' },
      { label: 'Idea path: Coffee Reel', r: 'preview', prep: 'coffee', note: 'prepared media' },
      { label: 'Idea path: Refine', r: 'refine', prep: 'coffee' },
    ],
  },
  {
    id: 'g3',
    title: '03 Creator Memory',
    kind: 'proposed',
    items: [
      { label: 'Settings → Creator Memory', r: 'settings' },
      { label: 'Saved Preferences', r: 'memory', query: 'tab=identity' },
      { label: 'Content / Series Preferences', r: 'memory', query: 'tab=series' },
      { label: 'Pending Suggestions', r: 'memory', query: 'tab=suggestions' },
      { label: 'First-use setup', r: 'setup' },
    ],
  },
  {
    id: 'g4',
    title: '04 Demo / QA Utilities',
    kind: 'qa',
    items: [
      { label: 'History', r: 'library' },
      { label: 'Exception Simulation', r: 'error', prep: 'low-coins', note: 'sets 5 coins' },
    ],
  },
];

/** Sequential journey for the live interview. Each step prepares only what it needs. */
const GUIDE: (Jump & { title: string; tip: string })[] = [
  { title: 'Existing app: Explore', tip: 'The real YouCam AI Pro home. Video Generator is the task-first entry.', label: '', r: 'explore' },
  { title: 'Proposed entry on AI Video', tip: '“Create a Complete Reel with AI Agent” sits inside the existing generator.', label: '', r: 'video' },
  { title: 'Reel Agent home', tip: 'First-use: personalize Memory or skip — never mandatory.', label: '', r: 'reel-agent' },
  { title: 'Choose creation mode', tip: 'Use My Photos & Videos (primary) or Start from an Idea.', label: '', r: 'mode' },
  { title: 'Import media + 5 restaurants', tip: 'Real imports or labelled samples; the creator types the names.', label: '', r: 'new', prep: 'media-brief' },
  { title: 'Agent Plan from the footage', tip: 'Storyboard shows the actual media; Memory + Travel & Food series applied with sources.', label: '', r: 'plan', prep: 'media-plan' },
  { title: 'Complete Reel preview', tip: 'Assembled in the browser from the chosen footage, captions, music and browser voice.', label: '', r: 'preview', prep: 'media-reel' },
  { title: 'Targeted refinement', tip: 'Swap footage for one segment, edit a caption, change music — compare Original/Revised.', label: '', r: 'refine', prep: 'media-reel' },
  { title: 'Ready to Use ≠ Published', tip: 'Mark Ready to Use, save, export the recorded video. Posting is a later, separate step.', label: '', r: 'finish', prep: 'media-reel' },
  { title: 'Settings → Creator Memory', tip: 'Existing Settings, proposed PREFERENCES row — same store as everywhere else.', label: '', r: 'settings' },
  { title: 'Creator Identity', tip: 'Long-term defaults; edit, disable, delete.', label: '', r: 'memory', query: 'tab=identity' },
  { title: 'Content / Series preferences', tip: 'Travel & Food and Sponsored Beauty apply only to those Reels. Campaign details never stored.', label: '', r: 'memory', query: 'tab=series' },
  { title: 'Pending suggestions', tip: 'Repeated choices become suggestions with provenance — Accept, Not Now or Reject.', label: '', r: 'memory', query: 'tab=suggestions' },
  { title: 'Start another Reel', tip: 'Approved preferences apply automatically; a one-off override never changes Memory.', label: '', r: 'mode' },
];

const capture = new URLSearchParams(window.location.search).has('capture');

/** Scale the phone-sized app frame to fit the projector / laptop height. */
function useFrameZoom() {
  const [zoom, setZoom] = useState(1);
  useLayoutEffect(() => {
    const on = () => {
      if (capture || window.innerWidth < 600) return setZoom(1);
      const z = Math.min((window.innerHeight - 40) / theme.frame.height, 1.6);
      setZoom(Math.max(0.6, Math.round(z * 100) / 100));
    };
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return zoom;
}

function useRailState() {
  const read = () => {
    try {
      return JSON.parse(localStorage.getItem('reel-agent-rail') ?? '') as { open: string[]; guide: number | null };
    } catch {
      return { open: ['g1', 'g2'], guide: null };
    }
  };
  const [rail, setRail] = useState(read);
  useEffect(() => {
    try {
      localStorage.setItem('reel-agent-rail', JSON.stringify(rail));
    } catch {
      /* ignore */
    }
  }, [rail]);
  return [rail, setRail] as const;
}

function PresenterRail({ store, route, go }: { store: Store; route: Route; go: (r: Route, o?: { query?: string }) => void }) {
  const { state, actions } = store;
  const [rail, setRail] = useRailState();
  const prep = (p?: Prep) => {
    if (p === 'coffee') actions.ensureFirstReel();
    if (p === 'media-brief') actions.ensureMediaReel('brief');
    if (p === 'media-plan') actions.ensureMediaReel('plan');
    if (p === 'media-reel') actions.ensureMediaReel('preview');
    if (p === 'low-coins') {
      actions.ensureFirstReel();
      actions.setCredits(Math.min(state.credits, 5));
    }
  };
  const jump = (j: Jump) => {
    prep(j.prep);
    go(j.r, { query: j.query });
  };
  const toGuide = (i: number) => {
    setRail((r) => ({ ...r, guide: i }));
    jump(GUIDE[i]);
  };
  const g = rail.guide;
  return (
    <aside className="presenter" aria-label="Presenter controls (demo utility, not part of the app)">
      <p className="presenter__brand">
        <Icon name="sparkle" size={14} /> Creator-Aware Reel Agent
      </p>
      <p className="presenter__sub">Presenter rail · demo utility (hidden on phones & captures)</p>

      <div className="guide">
        {g === null ? (
          <button className="guide__start" onClick={() => toGuide(0)}>
            <Icon name="play" size={13} /> Start Guided Demo
          </button>
        ) : (
          <>
            <div className="guide__head">
              <span>
                Step {g + 1} / {GUIDE.length}
              </span>
              <button className="linkbtn" onClick={() => setRail((r) => ({ ...r, guide: null }))}>
                Exit
              </button>
            </div>
            <b className="guide__title">{GUIDE[g].title}</b>
            <p className="guide__tip">{GUIDE[g].tip}</p>
            <div className="guide__nav">
              <button disabled={g === 0} onClick={() => toGuide(g - 1)}>
                ← Back
              </button>
              <button className="is-primary" disabled={g === GUIDE.length - 1} onClick={() => toGuide(g + 1)}>
                Next →
              </button>
            </div>
          </>
        )}
      </div>

      <nav className="railgroups">
        {GROUPS.map((grp) => {
          const open = rail.open.includes(grp.id);
          return (
            <section key={grp.id} className={`railgroup railgroup--${grp.kind}`}>
              <button
                className="railgroup__head"
                aria-expanded={open}
                onClick={() => setRail((r) => ({ ...r, open: open ? r.open.filter((x) => x !== grp.id) : [...r.open, grp.id] }))}
              >
                <Icon name={open ? 'chevronDown' : 'arrowRight'} size={13} />
                <span>{grp.title}</span>
                <em>{grp.kind === 'existing' ? 'Existing' : grp.kind === 'proposed' ? 'Proposed' : 'QA'}</em>
              </button>
              {open && (
                <div className="railgroup__items">
                  {grp.items.map((j) => (
                    <button key={j.label} className={route === j.r ? 'is-on' : ''} onClick={() => jump(j)}>
                      {j.label}
                      {j.note && <em>{j.note}</em>}
                    </button>
                  ))}
                  {grp.id === 'g4' && (
                    <>
                      <button
                        onClick={() => {
                          if (window.confirm('Reset the demo to its seeded starting state?')) {
                            actions.resetDemo();
                            setRail((r) => ({ ...r, guide: null }));
                            go('explore');
                          }
                        }}
                      >
                        Reset Demo <em>clears this browser</em>
                      </button>
                      <div className="presenter__coins">
                        <span>Credit controls · {state.credits} demo coins</span>
                        <button onClick={() => actions.setCredits(5)}>Set low (5)</button>
                        <button onClick={() => actions.setCredits(120)}>Restore 120</button>
                      </div>
                      <a className="presenter__link" href={`?capture#/${route}`} target="_blank" rel="noreferrer">
                        Open capture view ({theme.frame.width}×{theme.frame.height})
                      </a>
                    </>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </nav>
      <p className="presenter__note">All data is synthetic and stored only in this browser. AI analysis, learning, generation and coins are simulated.</p>
    </aside>
  );
}

/* ------------------------------------------------------------------ app */

export function App() {
  const store = useStore();
  const { route, go, back } = useRoute();
  const zoom = useFrameZoom();
  const scroller = useRef<HTMLDivElement>(null);
  const { state, actions, current } = store;

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [route]);

  /** Every entry point lands in the SAME workflow and Memory. Without a mode, the creator chooses first. */
  const startReel = (brief?: string, mode?: 'idea' | 'media') => {
    if (!mode) return go('mode');
    const isFirst = !state.projects.some((p) => p.original);
    actions.startReel(mode === 'idea' ? (brief ?? (isFirst ? COFFEE_BRIEF : '')) : brief ?? '', mode);
    go('new');
  };
  const openReelAgent = () => go('reel-agent');

  const bar = BAR[route];
  const onBack = () => {
    if (!bar) return;
    if (route === 'plan' && current) actions.patchProject(current.id, { stage: 'brief' });
    back(bar.back);
  };
  const media = current?.mode === 'media';

  let screen;
  switch (route) {
    case 'explore':
      screen = <ExploreScreen store={store} go={go} />;
      break;
    case 'agent':
      screen = <AgentScreen store={store} go={go} startReel={openReelAgent} />;
      break;
    case 'tools':
      screen = <ToolsScreen store={store} go={go} openReelAgent={openReelAgent} />;
      break;
    case 'video':
      screen = <VideoGenScreen store={store} back={() => back('explore')} openReelAgent={openReelAgent} />;
      break;
    case 'settings':
      screen = <SettingsScreen store={store} back={() => back('explore')} go={go} />;
      break;
    case 'reel-agent':
      screen = <ReelAgentScreen store={store} go={go} />;
      break;
    case 'mode':
      screen = <ModeScreen store={store} startReel={startReel} />;
      break;
    case 'setup':
      screen = <SetupScreen store={store} startReel={() => go('mode')} />;
      break;
    case 'memory':
      screen = <MemoryHubScreen key={window.location.hash} store={store} />;
      break;
    case 'new':
      screen = <NewReelScreen key={state.currentId ?? 'none'} store={store} go={go} />;
      break;
    case 'plan':
      screen = <PlanScreen store={store} go={go} />;
      break;
    case 'create':
      screen = <CreateScreen store={store} go={go} />;
      break;
    case 'preview':
      screen = media ? <MediaPreviewScreen store={store} go={go} /> : <PreviewScreen store={store} go={go} />;
      break;
    case 'refine':
      screen = media ? <MediaRefineScreen key={state.currentId ?? 'none'} store={store} go={go} /> : <RefineScreen key={state.currentId ?? 'none'} store={store} go={go} />;
      break;
    case 'finish':
      screen = <FinishScreen store={store} go={go} />;
      break;
    case 'library':
      screen = <LibraryScreen store={store} go={go} />;
      break;
    case 'error':
      screen = <ErrorScreen store={store} go={go} />;
      break;
  }

  return (
    <div className={`stage ${capture ? 'stage--capture' : ''}`}>
      {!capture && <PresenterRail store={store} route={route} go={go} />}
      <div className="frame" style={{ zoom }} data-route={route}>
        {bar && <AppBar title={bar.title} proposed={bar.proposed} coins={state.credits} onBack={onBack} />}
        <div className="frame__scroll" ref={scroller}>
          {screen}
        </div>
        {/* AI Agent opens full-screen with its chat bar (as in the real app), so no tab bar there */}
        {TAB_ROUTES.includes(route) && route !== 'agent' && <BottomNav route={route} go={go} />}
        {store.toast && (
          <div className="toast" role="status" key={store.toast.id}>
            <Icon name="check" size={15} /> {store.toast.text}
          </div>
        )}
      </div>
    </div>
  );
}
