import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './components/Icon';
import { AppBar, BottomNav } from './components/ui';
import { CreateScreen, PreviewScreen } from './screens/Create';
import { ErrorScreen, FinishScreen, LibraryScreen } from './screens/Finish';
import { MemoryHubScreen, ReelAgentScreen, SetupScreen } from './screens/Memory';
import { NewReelScreen } from './screens/NewReel';
import { PlanScreen } from './screens/Plan';
import { RefineScreen } from './screens/Refine';
import { AgentScreen, ExploreScreen, SettingsScreen, ToolsScreen, VideoGenScreen } from './screens/Shell';
import { COFFEE_BRIEF } from './state';
import { Route, TAB_ROUTES, useRoute, useStore } from './store';
import { theme } from './theme';

/** Pushed (non-tab) screens that use the shared app bar. Existing-app screens draw their own headers. */
const BAR: Partial<Record<Route, { title: string; proposed?: boolean; back: Route }>> = {
  'reel-agent': { title: 'Reel Agent', proposed: true, back: 'explore' },
  setup: { title: 'Creator Memory', proposed: true, back: 'reel-agent' },
  memory: { title: 'Creator Memory', proposed: true, back: 'reel-agent' },
  new: { title: 'New Reel', back: 'reel-agent' },
  plan: { title: 'Agent Plan', back: 'new' },
  create: { title: 'Creating Reel', back: 'reel-agent' },
  preview: { title: 'Your Reel', back: 'library' },
  refine: { title: 'Refine Your Reel', back: 'preview' },
  finish: { title: 'Finish Your Reel', back: 'preview' },
  error: { title: 'Revision', back: 'refine' },
};

const JUMPS: { r: Route; label: string; group: string; needsReel?: boolean }[] = [
  { group: 'Existing app (recreated)', r: 'explore', label: 'Explore' },
  { group: 'Existing app (recreated)', r: 'video', label: 'AI Video → Create Reel' },
  { group: 'Existing app (recreated)', r: 'agent', label: 'AI Agent → Reel prompt' },
  { group: 'Existing app (recreated)', r: 'tools', label: 'All Tools' },
  { group: 'Existing app (recreated)', r: 'settings', label: 'Settings → Preferences' },
  { group: 'Proposed: Reel Agent', r: 'reel-agent', label: 'Reel Agent home' },
  { group: 'Proposed: Reel Agent', r: 'setup', label: 'First-use setup' },
  { group: 'Proposed: Reel Agent', r: 'memory', label: 'Creator Memory Hub' },
  { group: 'Proposed: Reel Agent', r: 'new', label: 'New Reel' },
  { group: 'Proposed: Reel Agent', r: 'plan', label: 'Agent Plan' },
  { group: 'Proposed: Reel Agent', r: 'preview', label: 'Complete Reel', needsReel: true },
  { group: 'Proposed: Reel Agent', r: 'refine', label: 'Refine', needsReel: true },
  { group: 'Proposed: Reel Agent', r: 'finish', label: 'Finish', needsReel: true },
  { group: 'Proposed: Reel Agent', r: 'library', label: 'History' },
  { group: 'Proposed: Reel Agent', r: 'error', label: 'Exception state', needsReel: true },
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

export function App() {
  const store = useStore();
  const { route, go, back } = useRoute();
  const zoom = useFrameZoom();
  const scroller = useRef<HTMLDivElement>(null);
  const { state, actions } = store;

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [route]);

  /** Both entry points (task-first & conversation-first) land in the SAME workflow and Memory. */
  const startReel = (brief?: string) => {
    const isFirst = !state.projects.some((p) => p.original);
    actions.startReel(brief ?? (isFirst ? COFFEE_BRIEF : ''));
    go('new');
  };
  const openReelAgent = () => go('reel-agent');

  const bar = BAR[route];
  const onBack = () => {
    if (!bar) return;
    // leaving the plan returns to the same brief (never starts a new project)
    if (route === 'plan' && store.current) actions.patchProject(store.current.id, { stage: 'brief' });
    back(bar.back);
  };

  let screen;
  switch (route) {
    case 'explore':
      screen = <ExploreScreen store={store} go={go} />;
      break;
    case 'agent':
      screen = <AgentScreen store={store} go={go} startReel={() => go('reel-agent')} />;
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
      screen = <ReelAgentScreen store={store} go={go} startReel={startReel} />;
      break;
    case 'setup':
      screen = <SetupScreen store={store} startReel={startReel} />;
      break;
    case 'memory':
      screen = <MemoryHubScreen store={store} />;
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
      screen = <PreviewScreen store={store} go={go} />;
      break;
    case 'refine':
      screen = <RefineScreen key={state.currentId ?? 'none'} store={store} go={go} />;
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

  const jump = (j: (typeof JUMPS)[number]) => {
    if (j.needsReel) actions.ensureFirstReel();
    if (j.r === 'error') actions.setCredits(Math.min(state.credits, 5));
    if (j.r === 'new') return startReel();
    go(j.r);
  };

  let lastGroup = '';
  return (
    <div className={`stage ${capture ? 'stage--capture' : ''}`}>
      {!capture && (
        <aside className="presenter" aria-label="Presenter controls (demo utility, not part of the app)">
          <p className="presenter__brand">
            <Icon name="sparkle" size={14} /> Creator-Aware Reel Agent
          </p>
          <p className="presenter__sub">Concept demo v3 · presenter rail (not part of the app)</p>
          <nav className="presenter__jumps">
            {JUMPS.map((j) => {
              const head = j.group !== lastGroup ? <p className="presenter__group">{j.group}</p> : null;
              lastGroup = j.group;
              return (
                <div key={j.label}>
                  {head}
                  <button className={route === j.r ? 'is-on' : ''} onClick={() => jump(j)}>
                    {j.label}
                    {j.r === 'error' && <em>sets 5 coins</em>}
                  </button>
                </div>
              );
            })}
          </nav>
          <button
            className="presenter__reset"
            onClick={() => {
              if (window.confirm('Reset the demo to its seeded starting state?')) {
                actions.resetDemo();
                go('explore');
              }
            }}
          >
            <Icon name="refresh" size={14} /> Reset Demo
          </button>
          <div className="presenter__coins">
            <span>Demo coins: {state.credits}</span>
            <button onClick={() => actions.setCredits(5)}>Set low (5)</button>
            <button onClick={() => actions.setCredits(120)}>Restore</button>
          </div>
          <a className="presenter__link" href={`?capture#/${route}`} target="_blank" rel="noreferrer">
            Open capture view ({theme.frame.width}×{theme.frame.height})
          </a>
          <p className="presenter__note">All data is synthetic and stored only in this browser. AI planning, learning, generation and coins are simulated.</p>
        </aside>
      )}
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
