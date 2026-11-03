import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './components/Icon';
import { AppBar, BottomNav } from './components/ui';
import { CreateScreen, PreviewScreen } from './screens/Create';
import { ErrorScreen, FinishScreen, LibraryScreen } from './screens/Finish';
import { NewReelScreen } from './screens/NewReel';
import { RefineScreen } from './screens/Refine';
import { PlanScreen } from './screens/Plan';
import { SignatureScreen } from './screens/Signature';
import { theme } from './theme';
import { Route, useRoute, useStore } from './store';

const TITLES: Record<Route, string> = {
  signature: 'Signature',
  new: 'New Reel',
  plan: 'Agent Plan',
  create: 'Creating Reel',
  preview: 'Your Reel',
  refine: 'Refine Your Reel',
  finish: 'Finish Your Reel',
  library: 'History',
  error: 'Revision',
};

const BACK: Partial<Record<Route, Route>> = { plan: 'new', preview: 'library', refine: 'preview', finish: 'preview', error: 'refine' };

const JUMPS: { r: Route; label: string; needsReel?: boolean }[] = [
  { r: 'signature', label: 'S1 · Creator Signature' },
  { r: 'new', label: 'S2 · New Reel' },
  { r: 'plan', label: 'S3 · Agent Plan' },
  { r: 'preview', label: 'S4 · Complete Reel', needsReel: true },
  { r: 'refine', label: 'S5 · Refine', needsReel: true },
  { r: 'finish', label: 'S6 · Finish', needsReel: true },
  { r: 'library', label: 'S6 · History' },
  { r: 'error', label: 'Exception state', needsReel: true },
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
  const [route, go] = useRoute();
  const zoom = useFrameZoom();
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [route]);

  const back = BACK[route];
  const showNav = ['signature', 'new', 'library'].includes(route);

  let screen;
  switch (route) {
    case 'signature':
      screen = <SignatureScreen store={store} />;
      break;
    case 'new':
      screen = <NewReelScreen key={store.state.currentId ?? 'none'} store={store} go={go} />;
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
      screen = <RefineScreen key={store.state.currentId ?? 'none'} store={store} go={go} />;
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

  const onBack = () => {
    if (!back) return;
    // leaving the plan returns to the same brief (never starts a new project)
    if (route === 'plan' && store.current) store.actions.patchProject(store.current.id, { stage: 'brief' });
    go(back);
  };
  const jump = (j: (typeof JUMPS)[number]) => {
    if (j.needsReel) store.actions.ensureFirstReel();
    if (j.r === 'error') store.actions.setCredits(Math.min(store.state.credits, 5));
    go(j.r);
  };

  return (
    <div className={`stage ${capture ? 'stage--capture' : ''}`}>
      {!capture && (
        <aside className="presenter" aria-label="Presenter controls">
          <p className="presenter__brand">
            <Icon name="sparkle" size={14} /> Creator-Aware Reel Agent
          </p>
          <p className="presenter__sub">Concept demo · v2.1 · presenter controls</p>
          <nav className="presenter__jumps">
            {JUMPS.map((j) => (
              <button key={j.label} className={route === j.r ? 'is-on' : ''} onClick={() => jump(j)}>
                {j.label}
                {j.r === 'error' && <em>sets 5 coins</em>}
              </button>
            ))}
          </nav>
          <button
            className="presenter__reset"
            onClick={() => {
              if (window.confirm('Reset the demo to its seeded starting state?')) {
                store.actions.resetDemo();
                go('signature');
              }
            }}
          >
            <Icon name="refresh" size={14} /> Reset Demo
          </button>
          <div className="presenter__coins">
            <span>Demo coins: {store.state.credits}</span>
            <button onClick={() => store.actions.setCredits(5)}>Set low (5)</button>
            <button onClick={() => store.actions.setCredits(120)}>Restore</button>
          </div>
          <a className="presenter__link" href={`?capture#/${route}`} target="_blank" rel="noreferrer">
            Open capture view ({theme.frame.width}×{theme.frame.height})
          </a>
          <p className="presenter__note">All data is synthetic and stored only in this browser. AI planning, generation and coins are simulated.</p>
        </aside>
      )}
      <div className="frame" style={{ zoom }} data-route={route}>
        <AppBar title={TITLES[route]} coins={store.state.credits} onBack={back ? onBack : undefined} />
        <div className="frame__scroll" ref={scroller}>
          {screen}
        </div>
        {showNav && <BottomNav route={route} go={go} />}
        {store.toast && (
          <div className="toast" role="status" key={store.toast.id}>
            <Icon name="check" size={15} /> {store.toast.text}
          </div>
        )}
      </div>
    </div>
  );
}
