import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { Card, Disclosure, ProposedTag, SectionTitle, Steps } from '../components/ui';
import { BOOKSTORE_BRIEF, COFFEE_BRIEF, OPTIONS, exclusions } from '../state';
import type { Route, Store } from '../store';
import { MediaBriefScreen } from './Media';

const SAMPLE_MEDIA = ['media/scene1.jpg', 'media/scene3.jpg'];

export function NewReelScreen({ store, go }: { store: Store; go: (r: Route) => void }) {
  // NOTE: the Reel Agent entry points create the project before routing here.
  const { state, current, actions } = store;
  const fileRef = useRef<HTMLInputElement>(null);
  const [customizing, setCustomizing] = useState(false);
  const [viewAll, setViewAll] = useState(false);

  // Always work on a project in "brief" stage; create one if needed (first brief is seeded).
  useEffect(() => {
    if (!current || current.stage !== 'brief') {
      const isFirst = !state.projects.some((p) => p.original);
      actions.startReel(isFirst ? COFFEE_BRIEF : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!current || current.stage !== 'brief') return null;
  if (current.mode === 'media') return <MediaBriefScreen store={store} go={go} />;
  const p = current;
  const enabled = state.memory.filter((m) => m.enabled && m.category !== 'avoid');
  const avoid = exclusions(state.memory);
  const overrideCount = Object.entries(p.overrides).filter(([k, v]) => enabled.find((m) => m.id === k && m.value !== v)).length;
  const shown = viewAll ? enabled : enabled.slice(0, 4);

  const setOverride = (id: string, value: string) => {
    const saved = state.memory.find((m) => m.id === id);
    const next = { ...p.overrides };
    if (!saved || saved.value === value) delete next[id];
    else next[id] = value;
    actions.patchProject(p.id, { overrides: next });
  };

  return (
    <div className="screen">
      <Steps step={0} />
      <div className="hero hero--tight">
        <h2 className="hero__title">What’s this Reel about?</h2>
        <p className="hero__sub">Describe it in a sentence. Your agent plans a complete 15–30s Reel.</p>
      </div>

      <div className="promptbox">
        <Icon name="bolt" size={18} className="promptbox__icon" />
        <textarea
          value={p.brief}
          maxLength={300}
          rows={2}
          aria-label="Reel topic"
          placeholder="e.g. An evening bookstore visit"
          onChange={(e) => actions.patchProject(p.id, { brief: e.target.value })}
        />
        <span className="promptbox__count">{p.brief.length}/300</span>
      </div>
      <div className="chiprow" aria-label="Sample topics">
        {[COFFEE_BRIEF, BOOKSTORE_BRIEF].map((b) => (
          <button key={b} className={`chip chip--btn ${p.brief === b ? 'is-on' : ''}`} onClick={() => actions.patchProject(p.id, { brief: b })}>
            {b}
          </button>
        ))}
      </div>

      <Card tone="agent" className="applied">
        <div className="applied__head">
          <span className="agentdot">
            <Icon name="memory" size={13} />
          </span>
          <div>
            <strong>Using Creator Memory · {enabled.length} defaults</strong>
            <span className="muted">{overrideCount ? `${overrideCount} changed for this Reel only` : 'Applied automatically — no retyping'}</span>
          </div>
          <ProposedTag inline />
        </div>
        {enabled.length === 0 ? (
          <p className="fineprint">No saved preferences yet — the Agent uses neutral defaults. Add some in Creator Memory.</p>
        ) : (
          <ul className="applied__list">
            {shown.map((m) => {
              const v = p.overrides[m.id] ?? m.value;
              const changed = v !== m.value;
              return (
                <li key={m.id} className={changed ? 'is-override' : ''}>
                  <span>{m.label}</span>
                  <b>{v}</b>
                  {changed && <em className="chip chip--override">This Reel only</em>}
                </li>
              );
            })}
            {viewAll &&
              avoid.map((m) => (
                <li key={m.id}>
                  <span>Avoid</span>
                  <b>{m.value}</b>
                </li>
              ))}
          </ul>
        )}
        <div className="applied__actions">
          <button className="btn btn--ghost btn--sm" onClick={() => setViewAll((v) => !v)} aria-expanded={viewAll}>
            <Icon name="memory" size={14} /> {viewAll ? 'Show less' : `View Memory${enabled.length > 4 ? ` (+${enabled.length - 4 + avoid.length})` : ''}`}
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => go('memory')}>
            <Icon name="gear" size={14} /> Manage Memory
          </button>
        </div>
        <button className="btn btn--outline btn--block" onClick={() => setCustomizing((c) => !c)} aria-expanded={customizing}>
          <Icon name="edit" size={15} /> {customizing ? 'Done customizing' : 'Customize for This Reel'}
        </button>
        {customizing && (
          <div className="override">
            <p className="fineprint">Changes here apply to this Reel only. Your Creator Memory stays the same unless you tap “Make default”.</p>
            {enabled.map((m) => {
              const opts = OPTIONS[m.id] ?? [m.value];
              const v = p.overrides[m.id] ?? m.value;
              const changed = v !== m.value;
              return (
                <div key={m.id} className="override__row">
                  <span>{m.label}</span>
                  <select value={v} onChange={(e) => setOverride(m.id, e.target.value)} aria-label={`${m.label} for this Reel`}>
                    {(opts.includes(m.value) ? opts : [m.value, ...opts]).map((o) => (
                      <option key={o} value={o}>
                        {o === m.value ? `${o} (Memory)` : o}
                      </option>
                    ))}
                  </select>
                  {changed && (
                    <button
                      className="linkbtn"
                      onClick={() => {
                        actions.saveOverrideAsDefault(m.id, v);
                        const next = { ...p.overrides };
                        delete next[m.id];
                        actions.patchProject(p.id, { overrides: next });
                        store.notify(`${m.label} saved to Creator Memory`);
                      }}
                    >
                      Make default
                    </button>
                  )}
                </div>
              );
            })}
            {overrideCount > 0 && (
              <button className="btn btn--ghost btn--sm" onClick={() => actions.patchProject(p.id, { overrides: {} })}>
                Reset to my Memory
              </button>
            )}
          </div>
        )}
      </Card>

      <SectionTitle aside={<span className="muted">Optional</span>}>Your photos & clips</SectionTitle>
      <div className="mediarow">
        <button className="mediaadd" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={20} />
          <span>Add</span>
        </button>
        {p.uploads.map((u) => (
          <div key={u} className="mediathumb">
            {u.startsWith('media/') ? <img src={u} alt="Sample clip" /> : <span className="mediathumb__name">{u}</span>}
            <button
              className="mediathumb__x"
              aria-label={`Remove ${u}`}
              onClick={() => actions.patchProject(p.id, { uploads: p.uploads.filter((x) => x !== u) })}
            >
              <Icon name="x" size={12} />
            </button>
          </div>
        ))}
        {p.uploads.length === 0 && (
          <button className="chip chip--btn" onClick={() => actions.patchProject(p.id, { uploads: SAMPLE_MEDIA })}>
            Use demo samples
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => {
            const names = Array.from(e.target.files ?? []).map((f) => f.name);
            if (names.length) actions.patchProject(p.id, { uploads: [...p.uploads, ...names] });
            e.target.value = '';
          }}
        />
      </div>
      <p className="fineprint">Files stay in this browser and aren’t used to make the prepared demo video.</p>

      <Disclosure>Planning is free in this demo. Demo coins are quoted only before generation.</Disclosure>
      <div className="stickycta">
        <button
          className="btn btn--primary btn--block btn--lg"
          disabled={!p.brief.trim()}
          onClick={() => {
            actions.planReel(p.id);
            go('plan');
          }}
        >
          <Icon name="sparkle" size={18} /> Plan My Reel
        </button>
      </div>
    </div>
  );
}
