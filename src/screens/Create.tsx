import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { ReelPlayer } from '../components/ReelPlayer';
import { Card, Disclosure, Empty, SectionTitle, Steps } from '../components/ui';
import { MUSIC, SCENES } from '../state';
import type { Route, Store } from '../store';

const STAGES = [
  { key: 'script', label: 'Script', detail: 'Hook and 4 narration lines' },
  { key: 'scenes', label: 'Scenes', detail: '4 vertical scenes · Warm Cinematic' },
  { key: 'voice', label: 'Voiceover', detail: 'Mandarin narration' },
  { key: 'music', label: 'Music', detail: 'Mellow Lo-fi bed' },
  { key: 'captions', label: 'Captions', detail: 'Traditional Chinese, timed to voice' },
  { key: 'assembly', label: 'Assembly', detail: 'Transitions + final 9:16 Reel' },
];
/** Presentation pacing only — not a measurement or estimate of real generation time. */
const STEP_MS = 750;

export function CreateScreen({ store, go }: { store: Store; go: (r: Route) => void }) {
  const { current: p, actions } = store;
  const generating = p?.stage === 'generating';
  const [done, setDone] = useState(generating ? 0 : STAGES.length);

  useEffect(() => {
    if (!generating) return;
    setDone(0);
    let i = 0;
    const t = window.setInterval(() => {
      i += 1;
      setDone(i);
      if (i >= STAGES.length) {
        window.clearInterval(t);
        window.setTimeout(() => {
          actions.finishGenerating(p!.id);
          go('preview');
        }, 500);
      }
    }, STEP_MS);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generating, p?.id]);

  if (!p || !p.original) {
    return (
      <div className="screen">
        <Empty
          title="Nothing is being created"
          body="Approve a plan first, then your agent produces the Reel here."
          action={
            <button className="btn btn--primary" onClick={() => go('new')}>
              Start a Reel
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="screen">
      <Steps step={2} />
      <div className="hero hero--tight">
        <p className="eyebrow">
          <Icon name="sparkle" size={13} /> Agent at work
        </p>
        <h2 className="hero__title">Making your complete Reel</h2>
        <p className="hero__sub">{p.brief}</p>
      </div>
      <Card className="jobs">
        <ol className="jobs__list">
          {STAGES.map((s, i) => {
            const state = i < done ? 'done' : i === done ? 'now' : 'queued';
            return (
              <li key={s.key} className={`job job--${state}`}>
                <span className="job__dot">{state === 'done' ? <Icon name="check" size={14} stroke={2.6} /> : i + 1}</span>
                <div>
                  <strong>{s.label}</strong>
                  <span className="muted">{s.detail}</span>
                </div>
                <em>{state === 'done' ? 'Done' : state === 'now' ? 'Working…' : 'Queued'}</em>
              </li>
            );
          })}
        </ol>
      </Card>
      <Disclosure>Concept demo — AI generation simulated with prepared media.</Disclosure>
      {!generating && (
        <button className="btn btn--primary btn--block btn--lg" onClick={() => go('preview')}>
          <Icon name="play" size={16} /> View your Reel
        </button>
      )}
    </div>
  );
}

export function PreviewScreen({ store, go }: { store: Store; go: (r: Route) => void }) {
  const { current: p } = store;
  if (!p || !p.original || p.stage === 'generating') {
    return (
      <div className="screen">
        <Empty
          title="No finished Reel yet"
          body="Approve a plan and generate it to preview the complete Reel."
          action={
            <button className="btn btn--primary" onClick={() => go('new')}>
              Start a Reel
            </button>
          }
        />
      </div>
    );
  }
  const v = p.chosen === 'revision' && p.revision ? p.revision : p.original;
  return (
    <div className="screen screen--player">
      <Steps step={2} />
      <div className="previewhead">
        <div>
          <h2 className="previewhead__title">Your Reel is ready to review</h2>
          <p className="muted">
            20s · 4 scenes · Mandarin voice · {MUSIC[v.music].name}
          </p>
        </div>
        <span className="chip chip--sig">{p.chosen === 'revision' ? 'Revised' : 'Original'}</span>
      </div>
      <Disclosure>Concept demo — AI generation simulated with prepared media.</Disclosure>
      <ReelPlayer version={v} />
      <SectionTitle>What’s in this Reel</SectionTitle>
      <div className="scenestrip">
        {SCENES.coffee.map((s) => (
          <div key={s.n} className="scenestrip__item">
            <img src={s.n === 2 && v.scene2 === 'alt' ? 'media/scene2-alt.jpg' : s.img} alt={`Scene ${s.n}`} />
            <span>
              {String(s.n).padStart(2, '0')} · {s.tag}
            </span>
          </div>
        ))}
      </div>
      <div className="stickycta stickycta--split">
        <button className="btn btn--outline btn--lg" onClick={() => go('refine')}>
          <Icon name="edit" size={15} /> Refine
        </button>
        <button className="btn btn--primary btn--lg" onClick={() => go('finish')}>
          Looks good — Finish
        </button>
      </div>
    </div>
  );
}
