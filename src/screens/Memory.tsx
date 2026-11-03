/** PROPOSED feature screens: Reel Agent landing, first-use Memory setup, Creator Memory Hub. */
import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Card, Disclosure, ProposedTag, SuggestionCard } from '../components/ui';
import { CATEGORIES, CATEGORY_LABEL, CategoryId, ExtractedPref, MemoryItem, OPTIONS, REPEAT_THRESHOLD, SETUP_EXAMPLE, extractPreferences } from '../state';
import type { Route, Store } from '../store';

/* ------------------------------------------------------------------ Reel Agent landing */

export function ReelAgentScreen({ store, go, startReel }: { store: Store; go: (r: Route) => void; startReel: (brief?: string) => void }) {
  const { state, actions, pending } = store;
  const saved = state.memory.filter((m) => m.enabled);
  const recent = state.projects.filter((p) => p.original || p.stage === 'draft-plan').slice(0, 3);
  return (
    <div className="screen">
      <div className="hero hero--tight">
        <h2 className="hero__title">Make a complete Reel from one idea</h2>
        <p className="hero__sub">Your agent plans the script, scenes, narration, music and captions — in your style.</p>
      </div>

      {state.memorySetup === 'unseen' && (
        <Card tone="agent" className="personalize">
          <span className="agentdot agentdot--lg">
            <Icon name="memory" size={18} />
          </span>
          <h3>Personalize Your Reel Agent</h3>
          <p>Tell your Agent how you usually create videos.</p>
          <div className="stack">
            <button className="btn btn--primary btn--block" onClick={() => go('setup')}>
              <Icon name="sparkle" size={15} /> Set Up Creator Memory
            </button>
            <button
              className="btn btn--ghost btn--block"
              onClick={() => {
                actions.skipSetup();
                startReel();
              }}
            >
              Skip for Now
            </button>
          </div>
          <p className="fineprint">Optional. You can set it up any time from Settings → Preferences.</p>
        </Card>
      )}

      <button className="memcard" onClick={() => go('memory')}>
        <span className="memcard__icon">
          <Icon name="memory" size={20} />
        </span>
        <span className="memcard__body">
          <b>Creator Memory</b>
          <span className="muted">
            {saved.length} saved preference{saved.length === 1 ? '' : 's'}
            {pending.length > 0 && ` · ${pending.length} suggestion${pending.length === 1 ? '' : 's'} to review`}
          </span>
          <span className="memcard__chips">
            {saved.slice(0, 3).map((m) => (
              <em key={m.id}>{m.value}</em>
            ))}
            {saved.length > 3 && <em>+{saved.length - 3}</em>}
          </span>
        </span>
        {pending.length > 0 && <span className="dotbadge">{pending.length}</span>}
        <Icon name="arrowRight" size={18} />
      </button>

      <button className="btn btn--primary btn--block btn--lg" onClick={() => startReel()}>
        <Icon name="plus" size={16} /> Start a New Reel
      </button>

      {recent.length > 0 && (
        <>
          <h3 className="ysub">Recent Reels</h3>
          <ul className="history">
            {recent.map((p) => (
              <li key={p.id}>
                <button
                  className="historyrow"
                  onClick={() => {
                    actions.openProject(p.id);
                    if (p.stage === 'draft-plan') {
                      actions.patchProject(p.id, { stage: 'plan' });
                      go('plan');
                    } else go('finish');
                  }}
                >
                  <img src={p.pack === 'coffee' ? 'media/scene1.jpg' : 'media/bookstore1-warm.jpg'} alt="" />
                  <span className="historyrow__body">
                    <b>{p.brief}</b>
                    <span className="muted">{p.stage === 'draft-plan' ? 'Draft plan' : p.readyToUse ? 'Ready to Use' : 'Draft'}</span>
                  </span>
                  <Icon name="arrowRight" size={16} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <Disclosure>Proposed extension of YouCam AI Pro — concept demo. Planning and generation are simulated with prepared media.</Disclosure>
    </div>
  );
}

/* ------------------------------------------------------------------ first-use setup (optional) */

type Draft = ExtractedPref & { include: boolean };

export function SetupScreen({ store, startReel }: { store: Store; startReel: (brief?: string) => void }) {
  const { state, actions, notify } = store;
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<Draft[] | null>(null);

  const suggest = () => setDrafts(extractPreferences(text).map((p) => ({ ...p, include: true })));
  const chosen = drafts?.filter((d) => d.include) ?? [];
  const current = (key: string) => state.memory.find((m) => m.id === key)?.value;

  return (
    <div className="screen">
      <div className="hero hero--tight">
        <p className="eyebrow">
          <Icon name="memory" size={13} /> Optional setup
        </p>
        <h2 className="hero__title">Personalize Your Reel Agent</h2>
        <p className="hero__sub">Tell your Agent how you usually create videos. You’ll review everything before it’s saved.</p>
      </div>

      <ol className="setupsteps" aria-label="Setup steps">
        <li className={!drafts ? 'is-now' : 'is-done'}>Describe</li>
        <li className={drafts ? 'is-now' : ''}>Review</li>
        <li>Save</li>
      </ol>

      <div className="promptbox">
        <Icon name="memory" size={18} className="promptbox__icon" />
        <textarea
          rows={4}
          value={text}
          maxLength={600}
          placeholder="e.g. I prefer warm cinematic videos, short conversational hooks…"
          onChange={(e) => {
            setText(e.target.value);
            setDrafts(null);
          }}
          aria-label="Describe how you usually create videos"
        />
        <span className="promptbox__count">{text.length}/600</span>
      </div>
      <div className="chiprow">
        <button
          className="chip chip--btn"
          onClick={() => {
            setText(SETUP_EXAMPLE);
            setDrafts(null);
          }}
        >
          Use example description
        </button>
      </div>
      {!drafts && (
        <button className="btn btn--primary btn--block btn--lg" disabled={!text.trim()} onClick={suggest}>
          <Icon name="sparkle" size={15} /> Suggest preferences
        </button>
      )}

      {drafts && drafts.length === 0 && (
        <Disclosure tone="warn">No supported preferences found. Try mentioning a visual style, hook, voice, captions, music or transitions.</Disclosure>
      )}

      {drafts && drafts.length > 0 && (
        <>
          <div className="sectiontitle">
            <h2>Review suggested preferences</h2>
            <span className="muted">{chosen.length} selected</span>
          </div>
          <ul className="reviewlist">
            {drafts.map((d, i) => {
              const was = current(d.key);
              const opts = OPTIONS[d.key];
              return (
                <li key={d.key} className={d.include ? '' : 'is-off'}>
                  <label className="reviewlist__check">
                    <input type="checkbox" checked={d.include} onChange={() => setDrafts(drafts.map((x, j) => (j === i ? { ...x, include: !x.include } : x)))} aria-label={`Include ${d.label}`} />
                  </label>
                  <div className="reviewlist__body">
                    <span className="reviewlist__cat">{d.label === 'Avoid' ? CATEGORY_LABEL[d.category] : d.label}</span>
                    {opts ? (
                      <select value={d.value} onChange={(e) => setDrafts(drafts.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} aria-label={`${d.label} value`}>
                        {opts.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input value={d.value} onChange={(e) => setDrafts(drafts.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} aria-label={`${d.label} value`} />
                    )}
                    <span className="muted">
                      From “{d.because}”{was && was !== d.value ? ` · replaces ${was}` : was === d.value ? ' · already saved' : ''}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          <Disclosure>Simulated: preferences are matched with simple keyword rules, not a language model. Nothing is saved until you tap Save.</Disclosure>
          <button
            className="btn btn--primary btn--block btn--lg"
            disabled={!chosen.length}
            onClick={() => {
              actions.saveSetup(chosen);
              notify(`Saved ${chosen.length} preferences to Creator Memory`);
              startReel();
            }}
          >
            <Icon name="check" size={15} /> Save {chosen.length} to Creator Memory
          </button>
        </>
      )}
      <button
        className="btn btn--ghost btn--block"
        onClick={() => {
          actions.skipSetup();
          startReel();
        }}
      >
        Skip for Now
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ Creator Memory Hub */

function MemoryRow({ item, store }: { item: MemoryItem; store: Store }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.value);
  const opts = OPTIONS[item.id];
  const save = () => {
    const v = draft.trim();
    if (v && v !== item.value) {
      store.actions.updateMemory(item.id, v);
      store.notify(`${item.label} updated in Creator Memory`);
    }
    setEditing(false);
  };
  const SOURCE: Record<MemoryItem['source'], string> = { seed: 'Saved', creator: 'Added by you', setup: 'From setup', suggestion: 'Saved from suggestion' };
  return (
    <li className={`sigrow ${item.enabled ? '' : 'is-off'}`}>
      <div className="sigrow__body">
        <span className="sigrow__label">
          {item.label}
          <em className={`chip ${item.source === 'suggestion' ? 'chip--agent' : ''}`}>{SOURCE[item.source]}</em>
        </span>
        {editing ? (
          <div className="sigrow__edit">
            {opts ? (
              <select value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={`${item.label} value`} autoFocus>
                {(opts.includes(item.value) ? opts : [item.value, ...opts]).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={`${item.label} value`} autoFocus />
            )}
            <button className="btn btn--sm btn--primary" onClick={save}>
              Save
            </button>
            <button
              className="btn btn--sm btn--ghost"
              onClick={() => {
                setDraft(item.value);
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <span className="sigrow__value">{item.value}</span>
        )}
      </div>
      {!editing && (
        <div className="sigrow__actions">
          <button className="iconbtn iconbtn--ghost" aria-label={`Edit ${item.label}`} onClick={() => setEditing(true)}>
            <Icon name="edit" size={16} />
          </button>
          <button
            className="iconbtn iconbtn--ghost"
            aria-label={`Delete ${item.label}`}
            onClick={() => {
              store.actions.removeMemory(item.id);
              store.notify(`${item.label} deleted from Creator Memory`);
            }}
          >
            <Icon name="trash" size={16} />
          </button>
          <label className="switch" title={item.enabled ? 'Applied to new Reels' : 'Not applied'}>
            <input type="checkbox" checked={item.enabled} onChange={() => store.actions.toggleMemory(item.id)} aria-label={`Apply ${item.label} to new Reels`} />
            <span />
          </label>
        </div>
      )}
    </li>
  );
}

function AddRow({ category, store, onDone }: { category: CategoryId; store: Store; onDone: () => void }) {
  const keyOpts = OPTIONS[category];
  const [value, setValue] = useState(keyOpts?.[0] ?? '');
  const [label, setLabel] = useState(category === 'avoid' ? 'Avoid' : CATEGORIES.find((c) => c.id === category)!.label);
  return (
    <div className="addform">
      {category !== 'avoid' && (
        <label>
          Name
          <input value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
      )}
      <label>
        {category === 'avoid' ? 'Things to avoid' : 'Default'}
        {keyOpts ? (
          <select value={value} onChange={(e) => setValue(e.target.value)}>
            {keyOpts.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ) : (
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={category === 'avoid' ? 'e.g. No flashing text' : ''} />
        )}
      </label>
      <div className="btnrow">
        <button
          className="btn btn--primary btn--sm"
          disabled={!value.trim() || !label.trim()}
          onClick={() => {
            store.actions.addMemory(category, label.trim(), value.trim());
            store.notify(`Added to Creator Memory`);
            onDone();
          }}
        >
          Add to Memory
        </button>
        <button className="btn btn--ghost btn--sm" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}

type HubTab = 'saved' | 'suggestions' | 'manage';

export function MemoryHubScreen({ store }: { store: Store }) {
  const { state, actions, pending, notify } = store;
  const [tab, setTab] = useState<HubTab>('saved');
  const [adding, setAdding] = useState<CategoryId | null>(null);
  const snoozed = state.suggestions.filter((s) => s.status === 'snoozed');
  const rejected = state.suggestions.filter((s) => s.status === 'rejected');
  const noticed = Object.values(
    state.signals.reduce<Record<string, { label: string; value: string; reels: Set<string> }>>((acc, s) => {
      const k = `${s.key}=${s.value}`;
      acc[k] = acc[k] ?? { label: s.label, value: s.value, reels: new Set() };
      acc[k].reels.add(s.projectId);
      return acc;
    }, {}),
  );

  return (
    <div className="screen">
      <div className="hero hero--tight">
        <p className="hero__sub">What your Reel Agent remembers about how you create. You’re in control — nothing is saved without your OK.</p>
      </div>
      <div className="segment segment--soft" role="tablist" aria-label="Creator Memory sections">
        <button role="tab" aria-selected={tab === 'saved'} className={tab === 'saved' ? 'is-on' : ''} onClick={() => setTab('saved')}>
          Saved
        </button>
        <button role="tab" aria-selected={tab === 'suggestions'} className={tab === 'suggestions' ? 'is-on' : ''} onClick={() => setTab('suggestions')}>
          Suggestions{pending.length ? ` · ${pending.length}` : ''}
        </button>
        <button role="tab" aria-selected={tab === 'manage'} className={tab === 'manage' ? 'is-on' : ''} onClick={() => setTab('manage')}>
          Manage
        </button>
      </div>

      {tab === 'saved' && (
        <>
          {pending.length > 0 && (
            <button className="newsuggest" onClick={() => setTab('suggestions')}>
              <span className="agentdot">
                <Icon name="sparkle" size={12} />
              </span>
              <span>
                <b>
                  {pending.length} new suggestion{pending.length === 1 ? '' : 's'}
                </b>{' '}
                · {pending[0].label}: {pending[0].value}
              </span>
              <Icon name="arrowRight" size={16} />
            </button>
          )}
          {CATEGORIES.map((c) => {
            const items = state.memory.filter((m) => m.category === c.id);
            return (
              <section key={c.id} className="memcat">
                <div className="memcat__head">
                  <span className="memcat__icon">
                    <Icon name={c.icon} size={16} />
                  </span>
                  <h3>{c.label}</h3>
                  <button className="btn btn--ghost btn--sm" onClick={() => setAdding(adding === c.id ? null : c.id)} aria-label={`Add to ${c.label}`}>
                    <Icon name="plus" size={14} /> Add
                  </button>
                </div>
                {adding === c.id && <AddRow category={c.id} store={store} onDone={() => setAdding(null)} />}
                {items.length ? (
                  <ul className="siglist siglist--flat">
                    {items.map((i) => (
                      <MemoryRow key={`${i.id}-${i.value}-${i.enabled}`} item={i} store={store} />
                    ))}
                  </ul>
                ) : (
                  adding !== c.id && <p className="memcat__empty">Not set — the Agent uses a neutral default.</p>
                )}
              </section>
            );
          })}
        </>
      )}

      {tab === 'suggestions' && (
        <>
          {pending.length === 0 && (
            <Card>
              <p className="muted">No suggestions right now. The Agent will ask when it notices a choice you repeat.</p>
            </Card>
          )}
          {pending.map((sg) => (
            <Card key={sg.id} tone="agent">
              <SuggestionCard
                label={sg.label}
                value={sg.value}
                reason={sg.reason}
                onSave={() => {
                  actions.acceptSuggestion(sg.id);
                  notify('Saved to Creator Memory');
                }}
                onNotNow={() => {
                  actions.snoozeSuggestion(sg.id);
                  notify('Okay — I’ll ask again only if it keeps coming up');
                }}
                onDismiss={() => {
                  actions.rejectSuggestion(sg.id);
                  notify('Dismissed. I won’t suggest this again.');
                }}
              />
            </Card>
          ))}
          {snoozed.length > 0 && (
            <>
              <h3 className="ysub">Not now</h3>
              <ul className="mgmtlist">
                {snoozed.map((sg) => (
                  <li key={sg.id}>
                    <span>
                      {sg.label}: <b>{sg.value}</b>
                    </span>
                    <button className="btn btn--ghost btn--sm" onClick={() => actions.reconsiderSuggestion(sg.id)}>
                      Review now
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <Card className="howitworks">
            <b>How suggestions work</b>
            <p>
              The Agent notes the creative choices you make for each Reel — like caption style, music or pacing. When you make the same choice in {REPEAT_THRESHOLD} different Reels, it asks
              whether to remember it. One-off changes are never saved automatically.
            </p>
            <p className="fineprint">Simulated in this demo with a simple, transparent rule — not a real learning model.</p>
          </Card>
        </>
      )}

      {tab === 'manage' && (
        <>
          <h3 className="ysub">What the Agent noticed</h3>
          {noticed.length === 0 ? (
            <p className="muted">Nothing yet. Choices you make for a Reel (overrides, plan adjustments, refinements) show up here.</p>
          ) : (
            <ul className="mgmtlist">
              {noticed.map((n) => (
                <li key={`${n.label}-${n.value}`}>
                  <span>
                    {n.label}: <b>{n.value}</b>
                  </span>
                  <span className="muted">
                    {n.reels.size} Reel{n.reels.size === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {rejected.length > 0 && (
            <>
              <h3 className="ysub">Dismissed suggestions</h3>
              <ul className="mgmtlist">
                {rejected.map((sg) => (
                  <li key={sg.id}>
                    <span>
                      {sg.label}: <b>{sg.value}</b>
                    </span>
                    <button className="btn btn--ghost btn--sm" onClick={() => actions.reconsiderSuggestion(sg.id)}>
                      Reconsider
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <h3 className="ysub">Recent changes</h3>
          {state.memoryLog.length === 0 ? (
            <p className="muted">No changes yet.</p>
          ) : (
            <ul className="mgmtlist mgmtlist--log">
              {state.memoryLog.slice(0, 8).map((l, i) => (
                <li key={i}>
                  <span>{l.text}</span>
                </li>
              ))}
            </ul>
          )}
          <Disclosure>Creator Memory is stored only in this browser (synthetic demo data). Edit, disable or delete anything in Saved.</Disclosure>
        </>
      )}
      <p className="fineprint center">
        <ProposedTag inline /> Creator Memory is a proposed feature.
      </p>
    </div>
  );
}
