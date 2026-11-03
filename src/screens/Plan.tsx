import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Card, Disclosure, Empty, ProposedTag, SectionTitle, Sheet, Steps } from '../components/ui';
import { AppliedSetting, CREDIT_COSTS, GENERATE_BREAKDOWN, OPTIONS, SCENES, exclusions } from '../state';
import type { Route, Store } from '../store';

type Applied = Record<string, AppliedSetting | undefined>;

/** How each saved preference shaped the plan. `planOnly` marks choices the prepared demo media can't render. */
function influences(a: Applied, pack: 'coffee' | 'bookstore') {
  const hookLen = a['hook-length']?.value;
  const pacing = a.pacing?.value;
  const coffee = pack === 'coffee';
  return [
    {
      area: 'Hook & script',
      icon: 'bolt',
      src: [a.hook, a['hook-length']],
      value: [a.hook?.value, hookLen].filter(Boolean).join(' · ') || 'Neutral default',
      effect: `${a.hook?.value?.includes('Question') ? 'Opens with a question' : 'Opens with a statement'}${hookLen?.startsWith('Short') ? ' in under 3s' : ' in about 4s'}`,
      planOnly: false,
    },
    { area: 'Visual treatment', icon: 'film', src: [a.visual], value: a.visual?.value ?? 'Neutral default', effect: 'Color grade and lighting on all 4 scenes', planOnly: coffee && a.visual?.value !== 'Warm Cinematic' },
    { area: 'Narration', icon: 'mic', src: [a.voice], value: a.voice?.value ?? 'Neutral default', effect: 'Voice for the 4 script lines', planOnly: coffee && !!a.voice && a.voice.value !== 'Mandarin, Neutral' },
    { area: 'Music', icon: 'music', src: [a.music], value: a.music?.value ?? 'Neutral default', effect: 'Background bed under the narration', planOnly: false },
    { area: 'Captions', icon: 'cc', src: [a.captions], value: a.captions?.value ?? 'Neutral default', effect: 'Timed to narration · style shown in preview', planOnly: false },
    {
      area: 'Pacing',
      icon: 'layers',
      src: [a.pacing],
      value: pacing ?? 'Standard cuts (default)',
      effect: pacing === 'Fast, dynamic cuts' ? 'Quick cuts on the beat' : pacing === 'Minimal transitions' ? 'Soft cross-fades, no flashy effects' : 'Simple cuts between scenes',
      planOnly: coffee && pacing === 'Fast, dynamic cuts',
    },
  ];
}

function sourceOf(list: (AppliedSetting | undefined)[]) {
  const set = list.filter(Boolean) as AppliedSetting[];
  if (!set.length) return { label: 'Default', cls: '' };
  if (set.some((x) => x.override)) return { label: 'This Reel only', cls: 'chip--override' };
  return { label: 'Memory', cls: 'chip--sig' };
}

export function PlanScreen({ store, go }: { store: Store; go: (r: Route) => void }) {
  const { state, current: p, actions, notify } = store;
  const [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [adjust, setAdjust] = useState(false);

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

  const applied: Applied = Object.fromEntries(p.applied.map((a) => [a.id, a]));
  const rows = influences(applied, p.pack);
  const avoid = exclusions(state.memory);
  const look = applied.visual?.value === 'Cool Night Look' ? 'cool' : 'warm';
  const scenes = SCENES[p.pack].map((s) => ({ ...s, img: s.img.replace('LOOK', look) }));
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


      <Card className="influence">
        <div className="influence__head">
          <Icon name="memory" size={16} />
          <h3>How your Creator Memory shaped this plan</h3>
          <ProposedTag inline />
        </div>
        <ul className="influence__list">
          {rows.map((r) => {
            const src = sourceOf(r.src);
            return (
              <li key={r.area}>
                <span className="influence__icon">
                  <Icon name={r.icon} size={15} />
                </span>
                <div className="influence__body">
                  <span className="influence__area">{r.area}</span>
                  <b>{r.value}</b>
                  <span className="muted">
                    {r.effect}
                    {r.planOnly && ' · plan only (prepared demo media unchanged)'}
                  </span>
                </div>
                <em className={`chip ${src.cls}`}>{src.label}</em>
              </li>
            );
          })}
          {avoid.length > 0 && (
            <li>
              <span className="influence__icon">
                <Icon name="shield" size={15} />
              </span>
              <div className="influence__body">
                <span className="influence__area">Avoiding</span>
                <b>{avoid.map((m) => m.value).join(' · ')}</b>
              </div>
              <em className="chip chip--sig">Memory</em>
            </li>
          )}
        </ul>
        <button className="btn btn--ghost btn--sm" onClick={() => setAdjust((v) => !v)} aria-expanded={adjust}>
          <Icon name="edit" size={14} /> {adjust ? 'Done adjusting' : 'Adjust hook & pacing for This Reel'}
        </button>
        {adjust && (
          <div className="adjust">
            {(['hook-length', 'pacing'] as const).map((key) => (
              <div key={key} className="adjust__row">
                <span>{key === 'pacing' ? 'Pacing' : 'Hook length'}</span>
                <div className="segmented" role="radiogroup" aria-label={key === 'pacing' ? 'Pacing' : 'Hook length'}>
                  {OPTIONS[key].map((o) => {
                    const on = (applied[key]?.value ?? (key === 'pacing' ? 'Standard cuts' : 'Standard, about 4s')) === o;
                    return (
                      <button key={o} role="radio" aria-checked={on} className={on ? 'is-on' : ''} onClick={() => actions.setPlanOverride(p.id, key, o)}>
                        {o.replace(', about 4s', '').replace(', under 3s', ' <3s').replace(' transitions', '').replace(', dynamic cuts', '')}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="fineprint">This Reel only. The Agent notes repeated choices and may suggest saving them — it never saves on its own.</p>
          </div>
        )}
      </Card>

      <SectionTitle aside={<span className="chip chip--sig">{hookStyle}</span>}>Hook · 0–4s</SectionTitle>
      <Card className="hook">
        <p className="hook__line">「{p.script[0]}」</p>
        <p className="muted">{rows[0].effect} — from {sourceOf(rows[0].src).label === 'Memory' ? 'your Creator Memory' : sourceOf(rows[0].src).label.toLowerCase()}.</p>
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
                <span>Balance after</span>
                <b>{balanceAfter}</b>
              </li>
            </ul>
            <Disclosure>DEMO quote. Generation is simulated with prepared media, and no real coins or money are used.</Disclosure>
            <button
              className="btn btn--primary btn--block btn--lg"
              disabled={balanceAfter < 0}
              onClick={() => {
                actions.approveGenerate(p.id);
                setConfirm(false);
                go('create');
              }}
            >
              Confirm · {CREDIT_COSTS.generate} demo coins
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
