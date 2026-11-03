import { ReactNode } from 'react';
import { Route } from '../store';
import { Icon } from './Icon';

/** YouCam-style header: back chevron · centered title · coin pill. */
export function AppBar({ title, onBack, coins }: { title: string; onBack?: () => void; coins: number }) {
  return (
    <header className="appbar">
      <div className="appbar__side">
        {onBack ? (
          <button className="iconbtn iconbtn--ghost" onClick={onBack} aria-label="Back">
            <Icon name="arrowLeft" size={22} />
          </button>
        ) : (
          <span className="conceptpill" title="Proposed feature — not a shipped YouCam feature">
            Concept Demo
          </span>
        )}
      </div>
      <h1 className="appbar__title">{title}</h1>
      <div className="appbar__side appbar__side--end">
        <span className="coinpill" title="Demo coins — illustrative only, not real YouCam prices">
          <span className="coinpill__coin" aria-hidden="true" />
          <b>{coins}</b>
          <em>DEMO</em>
        </span>
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

/** Floating light nav with lavender active pill (YouCam pattern). Only functional tabs are shown. */
export function BottomNav({ route, go }: { route: Route; go: (r: Route) => void }) {
  const items: { r: Route; label: string; icon: string; match: Route[] }[] = [
    { r: 'new', label: 'Create', icon: 'sparkle', match: ['new', 'plan', 'create', 'preview', 'refine', 'finish', 'error'] },
    { r: 'signature', label: 'Signature', icon: 'user', match: ['signature'] },
    { r: 'library', label: 'History', icon: 'library', match: ['library'] },
  ];
  return (
    <nav className="bottomnav" aria-label="Main">
      {items.map((i) => (
        <button key={i.r} className={i.match.includes(route) ? 'is-on' : ''} onClick={() => go(i.r)} aria-current={i.match.includes(route) ? 'page' : undefined}>
          <Icon name={i.icon} size={20} />
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
