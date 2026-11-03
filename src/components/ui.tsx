import { ReactNode } from 'react';
import type { Route } from '../store';
import { Icon } from './Icon';

/** Gray coin pill with gold "C" coin — as in the YouCam headers. Demo coins only. */
export function CoinPill({ coins, onClick }: { coins: number; onClick?: () => void }) {
  return (
    <button className="coinpill" onClick={onClick} title="Demo coins — illustrative only, not real YouCam prices" aria-label={`${coins} demo coins`}>
      <span className="coinpill__coin" aria-hidden="true">
        C
      </span>
      <b>{coins}</b>
    </button>
  );
}

/** Marks UI that is a proposed extension (not part of the shipped YouCam AI Pro app). */
export function ProposedTag({ children = 'Proposed', inline }: { children?: ReactNode; inline?: boolean }) {
  return <span className={`proposed ${inline ? 'proposed--inline' : ''}`}>{children}</span>;
}

/** YouCam-style pushed-screen header: back chevron · centered title · right slot (coin pill by default). */
export function AppBar({
  title,
  onBack,
  coins,
  left,
  right,
  proposed,
}: {
  title: string;
  onBack?: () => void;
  coins?: number;
  left?: ReactNode;
  right?: ReactNode;
  proposed?: boolean;
}) {
  return (
    <header className="appbar">
      <div className="appbar__side">
        {onBack && (
          <button className="iconbtn iconbtn--ghost iconbtn--back" onClick={onBack} aria-label="Back">
            <Icon name="arrowLeft" size={24} stroke={1.7} />
          </button>
        )}
        {left}
      </div>
      <h1 className="appbar__title">
        {title}
        {proposed && <ProposedTag inline />}
      </h1>
      <div className="appbar__side appbar__side--end">{right ?? (coins !== undefined ? <CoinPill coins={coins} /> : null)}</div>
    </header>
  );
}

/** Text recreation of the app wordmark for the Explore / History headers (no logo files used). */
export function Wordmark() {
  return (
    <span className="wordmark" aria-label="YouCam AI Pro">
      YouCam<span className="wordmark__ai">AI</span>
      <span className="wordmark__pro">Pro</span>
    </span>
  );
}

export function HomeHeader({ coins, onSettings }: { coins: number; onSettings: () => void }) {
  return (
    <header className="homeheader">
      <Wordmark />
      <span className="conceptpill" title="Interview concept demo — not the shipped app">
        Concept demo
      </span>
      <div className="homeheader__end">
        <CoinPill coins={coins} />
        <button className="iconbtn iconbtn--ghost" onClick={onSettings} aria-label="Settings">
          <Icon name="gear" size={26} stroke={1.6} />
        </button>
      </div>
    </header>
  );
}

const STEP_LABELS = ['Brief', 'Plan', 'Create', 'Refine', 'Finish'];
export function Steps({ step }: { step: number }) {
  return (
    <ol className="steps" aria-label={`Step ${step + 1} of ${STEP_LABELS.length}: ${STEP_LABELS[step]}`}>
      {STEP_LABELS.map((l, i) => (
        <li key={l} className={i < step ? 'is-done' : i === step ? 'is-now' : ''}>
          <span>{l}</span>
        </li>
      ))}
    </ol>
  );
}

export function Disclosure({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'agent' | 'warn' }) {
  return (
    <p className={`disclosure disclosure--${tone}`}>
      <Icon name="info" size={14} />
      <span>{children}</span>
    </p>
  );
}

export function Card({ children, className = '', tone }: { children: ReactNode; className?: string; tone?: 'agent' }) {
  return <section className={`card ${tone ? `card--${tone}` : ''} ${className}`}>{children}</section>;
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="sectiontitle">
      <h2>{children}</h2>
      {aside}
    </div>
  );
}

/** The existing four-tab YouCam navigation: Explore · AI Agent · All Tools · History. */
export function BottomNav({ route, go }: { route: Route; go: (r: Route) => void }) {
  const items: { r: Route; label: string; icon: string }[] = [
    { r: 'explore', label: 'Explore', icon: 'compass' },
    { r: 'agent', label: 'AI Agent', icon: 'agentChat' },
    { r: 'tools', label: 'All Tools', icon: 'grid' },
    { r: 'library', label: 'History', icon: 'clock' },
  ];
  return (
    <nav className="bottomnav" aria-label="Main">
      {items.map((i) => (
        <button key={i.r} className={route === i.r ? 'is-on' : ''} onClick={() => go(i.r)} aria-current={route === i.r ? 'page' : undefined}>
          <span className="bottomnav__icon">
            <Icon name={i.icon} size={26} stroke={1.7} />
          </span>
          <span>{i.label}</span>
        </button>
      ))}
    </nav>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty__icon">
        <Icon name="film" size={26} />
      </div>
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
      <button className="sheet__scrim" aria-label="Close" onClick={onClose} />
      <div className="sheet__panel">
        <div className="sheet__grip" aria-hidden="true" />
        <div className="sheet__head">
          <h2>{title}</h2>
          <button className="iconbtn iconbtn--ghost" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Pending Memory suggestion card with the three explicit choices. */
export function SuggestionCard({
  label,
  value,
  reason,
  onSave,
  onNotNow,
  onDismiss,
  compact,
}: {
  label: string;
  value: string;
  reason: string;
  onSave: () => void;
  onNotNow: () => void;
  onDismiss: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`suggest ${compact ? 'suggest--compact' : ''}`}>
      <div className="suggest__head">
        <span className="agentdot">
          <Icon name="sparkle" size={13} />
        </span>
        <strong>Suggested for Your Memory</strong>
        <span className="chip chip--agent">Needs your OK</span>
      </div>
      <p className="suggest__text">
        Use <b>{value}</b> for {label.toLowerCase()} by default in future Reels?
      </p>
      <p className="suggest__why">
        <Icon name="info" size={12} /> Why: {reason}
      </p>
      <div className="btnrow">
        <button className="btn btn--primary btn--sm" onClick={onSave}>
          <Icon name="check" size={14} /> Save to Creator Memory
        </button>
        <button className="btn btn--ghost btn--sm" onClick={onNotNow}>
          Not Now
        </button>
        <button className="btn btn--ghost btn--sm" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
