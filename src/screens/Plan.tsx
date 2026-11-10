import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Card, Disclosure, Empty, SectionTitle, Sheet, Steps } from '../components/ui';
import { CREDIT_COSTS, GENERATE_BREAKDOWN, SCENES, exclusions, seriesOf } from '../state';
import { MemoryInfluence } from '../components/MemoryInfluence';
import { MediaPlanScreen } from './Media';
import type { Route, Store } from '../store';

export function PlanScreen({ store, go }: { store: Store; go: (r: Route) => void }) {
  const { state, current: p, actions, notify } = store;
  const [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  if (p && p.mode === 'media' && p.stage !== 'brief') return <MediaPlanScreen store={store} go={go} />;
  if (!p || p.stage === 'brief' || !p.script.length) {
    return (
      <div className="screen">
        <Empty
          title="No plan yet"
          body="Write a brief and tap Plan My Reel — your agent drafts the plan here."
          action={
            <button className="btn btn--primary" onClick={() => go('new')}>
              Go to New Reel
            </button>
          }
        />
      </div>
    );
  }

  // live: always the current Memory + series + This-Reel overrides (never a stale snapshot)
  const applied = store.resolveFor(p);
  const avoid = exclusions(state.memory, seriesOf(state, p.series));
  const kind = p.pack === 'bookstore' ? 'bookstore' : 'coffee';
  const look = applied.visual?.value === 'Cool Night Look' ? 'cool' : 'warm';
  const scenes = SCENES[p.pack === 'bookstore' ? 'bookstore' : 'coffee'].map((s) => ({ ...s, img: s.img.replace('LOOK', look) }));
  const ordered = p.sceneOrder.map((n) => scenes.find((s) => s.n === n)!);
  const prepared = p.pack === 'coffee';
  const reordered = p.sceneOrder.join() !== '1,2,3,4';
  const hookStyle = applied.hook?.value ?? 'Hook';
  const balanceAfter = state.credits - CREDIT_COSTS.generate;

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= p.sceneOrder.length) return;
    const next = [...p.sceneOrder];
    [next[idx], next[j]] = [next[j], next[idx]];
    actions.patchProject(p.id, { sceneOrder: next });
  };
  const setLine = (sceneN: number, text: string) => {
    const next = [...p.script];
    next[sceneN - 1] = text;
    actions.patchProject(p.id, { script: next, scriptEdited: true });
  };
  const backToBrief = () => {
    actions.patchProject(p.id, { stage: 'brief' });
    go('new');
  };

  return (
    <div className="screen">
      <Steps step={1} />
      <Card tone="agent" className="planhead">
        <div className="planhead__row">
          <span className="agentdot agentdot--lg">
            <Icon name="sparkle" size={16} />
          </span>
          <div>
            <p className="eyebrow">Your Agent’s Plan</p>
            <h2 className="planhead__title">{p.brief}</h2>
          </div>
        </div>
        <p className="planhead__meta">
          20s · 4 scenes · {applied.format?.value ?? '9:16'} · Traditional Chinese
        </p>
      </Card>


      <MemoryInfluence settings={applied} avoid={avoid} kind={kind} onAdjust={(k, v) => actions.setPlanOverride(p.id, k, v)} />

      <SectionTitle aside={<span className="chip chip--sig">{hookStyle}</span>}>Hook · {applied['hook-length'].value.startsWith('Short') ? '0–3s' : '0–4s'}</SectionTitle>
      <Card className="hook">
        <p className="hook__line">「{p.script[0]}」</p>
        <p className="muted">
          {applied.hook.value} · {applied['hook-length'].value} — {applied.hook.sourceLabel}
          {applied['hook-length'].source !== applied.hook.source ? ` / ${applied['hook-length'].sourceLabel}` : ''}
        </p>
      </Card>

      <SectionTitle aside={<span className="muted">Tap a line to edit</span>}>Storyboard & script</SectionTitle>
      <ol className="storyboard">
        {ordered.map((s, idx) => (
          <li key={s.n} className="scene">
            <div className="scene__thumb">
              <img src={s.img} alt={`Scene ${s.n}: ${s.title}`} />
              <span className="scene__num">{String(idx + 1).padStart(2, '0')}</span>
            </div>
            <div className="scene__body">
              <div className="scene__meta">
                <span className="scene__tag">{s.tag}</span>
                <span className="muted">{s.time}</span>
              </div>
              <strong className="scene__title">{s.title}</strong>
              {editing === s.n ? (
                <textarea
                  className="scene__edit"
                  autoFocus
                  rows={2}
                  value={p.script[s.n - 1]}
                  onChange={(e) => setLine(s.n, e.target.value)}
                  onBlur={() => setEditing(null)}
                  aria-label={`Script for scene ${s.n}`}
                />
              ) : (
                <button className="scene__line" onClick={() => setEditing(s.n)} aria-label={`Edit script for scene ${s.n}`}>
                  {p.script[s.n - 1]}
                  <Icon name="edit" size={13} />
                </button>
              )}
            </div>
            <div className="scene__order">
              <button className="iconbtn iconbtn--ghost iconbtn--sm" disabled={idx === 0} onClick={() => move(idx, -1)} aria-label={`Move scene ${s.n} up`}>
                <Icon name="arrowLeft" size={14} className="rot90" />
              </button>
              <button
                className="iconbtn iconbtn--ghost iconbtn--sm"
                disabled={idx === ordered.length - 1}
                onClick={() => move(idx, 1)}
                aria-label={`Move scene ${s.n} down`}
              >
                <Icon name="arrowRight" size={14} className="rot90" />
              </button>
            </div>
          </li>
        ))}
      </ol>
      {(p.scriptEdited || reordered) && prepared && (
        <Disclosure tone="warn">
          Your edits are saved in this plan. The prepared demo video keeps the original script and scene order. Re-voicing new text isn’t simulated.
        </Disclosure>
      )}


      <SectionTitle>Source plan</SectionTitle>
      <Card className="sources">
        <p>
          <b>Visuals</b> {prepared ? 'Prepared demo scenes (original illustrations made for this demo)' : 'Storyboard stills only (no prepared video for this brief)'}
        </p>
        <p>
          <b>Your media</b> {p.uploads.length ? `${p.uploads.length} item(s) attached — not used by the prepared video` : 'None attached'}
        </p>
        <p>
          <b>Narration</b> Mandarin system voice, pre-recorded for this demo
        </p>
        <p>
          <b>Music</b> Original demo track matching “{applied.music?.value ?? 'Mellow Lo-fi'}”
        </p>
      </Card>

      <Card className="quote">
        <div className="quote__head">
          <span className="coinpill coinpill--lg">
            <span className="coinpill__coin" aria-hidden="true" />
            <b>{CREDIT_COSTS.generate}</b>
            <em>DEMO</em>
          </span>
          <div>
            <strong>Estimated cost to generate</strong>
            <span className="muted">Illustrative demo coins — not real YouCam pricing. Nothing is charged.</span>
          </div>
        </div>
      </Card>

      <div className="stickycta stickycta--split">
        <button className="btn btn--outline btn--lg" onClick={backToBrief}>
          Edit Plan
        </button>
        <button className="btn btn--primary btn--lg" onClick={() => setConfirm(true)}>
          Approve & Generate Reel
        </button>
      </div>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Confirm generation">
        {prepared ? (
          <>
            <ul className="breakdown">
              {GENERATE_BREAKDOWN.map((b) => (
                <li key={b.label}>
                  <span>{b.label}</span>
                  <b>{b.coins}</b>
                </li>
              ))}
              <li className="breakdown__total">
                <span>Total</span>
                <b>{CREDIT_COSTS.generate} demo coins</b>
              </li>
              <li>
                <span>Your balance</span>
                <b>{state.credits}</b>
              </li>
              <li>
                <span>Balance after</span>
                <b>{balanceAfter < 0 ? 'Not enough' : balanceAfter}</b>
              </li>
            </ul>
            <Disclosure>DEMO quote. Generation is simulated with prepared media, and no real coins or money are used.</Disclosure>
            {balanceAfter < 0 && (
              <Disclosure tone="warn">
                Generating needs <b>{CREDIT_COSTS.generate} demo coins</b> and you have <b>{state.credits}</b>. Nothing was charged and your plan is unchanged.
              </Disclosure>
            )}
            <button
              className="btn btn--primary btn--block btn--lg"
              disabled={balanceAfter < 0}
              onClick={() => {
                if (!actions.approveGenerate(p.id)) return; // insufficient or already charged: nothing changes
                setConfirm(false);
                go('create');
              }}
            >
              {balanceAfter < 0 ? 'Not enough demo coins' : `Confirm · ${CREDIT_COSTS.generate} demo coins`}
            </button>
            <button className="btn btn--ghost btn--block" onClick={() => setConfirm(false)}>
              Not yet
            </button>
          </>
        ) : (
          <>
            <p className="sheet__text">
              This concept demo only has prepared media for the coffee brief, so this plan can’t be generated. Save it as a draft to keep the plan and its This-Reel-only settings.
            </p>
            <button
              className="btn btn--primary btn--block btn--lg"
              onClick={() => {
                actions.saveDraftPlan(p.id);
                setConfirm(false);
                notify('Plan saved to History as a draft');
                go('library');
              }}
            >
              Save Plan as Draft
            </button>
            <button className="btn btn--ghost btn--block" onClick={() => setConfirm(false)}>
              Back to plan
            </button>
          </>
        )}
      </Sheet>
    </div>
  );
}
