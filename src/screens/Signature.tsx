import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Card, Disclosure, SectionTitle } from '../components/ui';
import { OPTIONS, SignatureItem } from '../state';
import type { Store } from '../store';

const ICONS: Record<string, string> = {
  visual: 'film',
  hook: 'hook',
  voice: 'mic',
  captions: 'cc',
  music: 'music',
  format: 'frame',
};

function Row({ item, store }: { item: SignatureItem; store: Store }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.value);
  const opts = OPTIONS[item.id];
  const save = () => {
    const v = draft.trim();
    if (v && v !== item.value) {
      store.actions.updateSig(item.id, v);
      store.notify(`${item.label} updated in your Creator Signature`);
    }
    setEditing(false);
  };
  return (
    <li className={`sigrow ${item.enabled ? '' : 'is-off'}`}>
      <div className="sigrow__icon">
        <Icon name={ICONS[item.id] ?? 'sparkle'} size={18} />
      </div>
      <div className="sigrow__body">
        <span className="sigrow__label">
          {item.label}
          {item.source === 'agent-suggestion' && <em className="chip chip--agent">Saved from suggestion</em>}
          {item.source === 'creator' && <em className="chip">Added by you</em>}
        </span>
        {editing ? (
          <div className="sigrow__edit">
            {opts ? (
              <select value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={`${item.label} value`} autoFocus>
                {opts.map((o) => (
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
            aria-label={`Remove ${item.label}`}
            onClick={() => {
              store.actions.removeSig(item.id);
              store.notify(`${item.label} removed from your Signature`);
            }}
          >
            <Icon name="trash" size={16} />
          </button>
          <label className="switch" title={item.enabled ? 'Applied to new Reels' : 'Not applied'}>
            <input
              type="checkbox"
              checked={item.enabled}
              onChange={() => store.actions.toggleSig(item.id)}
              aria-label={`Apply ${item.label} to new Reels`}
            />
            <span />
          </label>
        </div>
      )}
    </li>
  );
}

export function SignatureScreen({ store }: { store: Store }) {
  const { state, actions, notify } = store;
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const s = state.suggestion;
  const active = state.signature.filter((i) => i.enabled).length;

  return (
    <div className="screen">
      <div className="hero">
        <p className="eyebrow">
          <Icon name="sparkle" size={13} /> Creator Memory
        </p>
        <h2 className="hero__title">Your Creator Signature</h2>
        <p className="hero__sub">
          Approved defaults your agent applies to every new Reel. {active} of {state.signature.length} active — change them anytime.
        </p>
      </div>

      {s.status === 'pending' && (
        <Card tone="agent" className="suggest">
          <div className="suggest__head">
            <span className="agentdot">
              <Icon name="sparkle" size={14} />
            </span>
            <strong>Suggested memory</strong>
            <span className="chip chip--agent">Needs your OK</span>
          </div>
          <p className="suggest__text">{s.text}</p>
          <div className="suggest__preview">
            <span>{s.item.label}</span>
            <b>{s.item.value}</b>
          </div>
          <div className="btnrow">
            <button
              className="btn btn--primary"
              onClick={() => {
                actions.saveSuggestion();
                notify('Saved to your Creator Signature');
              }}
            >
              <Icon name="check" size={16} /> Save to Signature
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => {
                actions.dismissSuggestion();
                notify('Not saved. The agent won’t remember this.');
              }}
            >
              Not Now
            </button>
          </div>
          <p className="fineprint">Demo suggestion (scripted, not real behavior modeling). Nothing is added unless you choose Save.</p>
        </Card>
      )}
      {s.status !== 'pending' && (
        <p className="fineprint fineprint--row">
          <Icon name={s.status === 'saved' ? 'check' : 'x'} size={14} />
          {s.status === 'saved' ? 'Suggestion saved by you: “Hook Length — Short, under 3s”.' : 'Suggestion dismissed — not stored.'}
        </p>
      )}

      <SectionTitle
        aside={
          <button className="btn btn--sm btn--ghost" onClick={() => setAdding((a) => !a)}>
            <Icon name="plus" size={14} /> Add
          </button>
        }
      >
        Default preferences
      </SectionTitle>

      {adding && (
        <Card className="addform">
          <label>
            Preference
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Transitions" />
          </label>
          <label>
            Default
            <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. Soft cross-fade" />
          </label>
          <div className="btnrow">
            <button
              className="btn btn--primary btn--sm"
              disabled={!label.trim() || !value.trim()}
              onClick={() => {
                actions.addSig(label.trim(), value.trim());
                notify(`${label.trim()} added to your Signature`);
                setLabel('');
                setValue('');
                setAdding(false);
              }}
            >
              Add to Signature
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </Card>
      )}

      <ul className="siglist">
        {state.signature.map((i) => (
          <Row key={`${i.id}-${i.value}`} item={i} store={store} />
        ))}
        {state.signature.length === 0 && <li className="fineprint">No preferences yet — add one above.</li>}
      </ul>

      <Disclosure>Stored only on this device. Demo uses synthetic creator data — no account, no upload.</Disclosure>
    </div>
  );
}
