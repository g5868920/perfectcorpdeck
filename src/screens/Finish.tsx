import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Card, Disclosure, Empty, SectionTitle, Sheet, Steps } from '../components/ui';
import { CREDIT_COSTS, MUSIC, ReelProject, captionsEdited, exportFile, versionDiff } from '../state';
import type { Route, Store } from '../store';

/* ------------------------------------------------------------------ exception */

export function ErrorScreen({ store, go }: { store: Store; go: (r: Route) => void }) {
  const { state, current: p, actions, notify } = store;
  const [review, setReview] = useState(false);
  if (!p || !p.original) {
    return (
      <div className="screen">
        <Empty title="Nothing to recover" body="There’s no revision in progress." action={<button className="btn btn--primary" onClick={() => go('library')}>Open History</button>} />
      </div>
    );
  }
  const need = CREDIT_COSTS.replaceScene;
  const enough = state.credits >= need;
  return (
    <div className="screen">
      <Steps step={3} />
      <Card className="errorcard">
        <div className="errorcard__icon">
          <Icon name="alert" size={26} />
        </div>
        <h2>We couldn't complete this revision. Your previous Reel is safe.</h2>
        <p className="errorcard__why">
          Replacing Scene 02 needs <b>{need} demo coins</b>, and your balance is <b>{state.credits}</b>. Nothing was charged and nothing in your Reel changed.
        </p>
        <div className="errorcard__request">
          <span className="muted">Request</span>
          <b>Replace Scene 02 → French press</b>
        </div>
      </Card>
      <div className="stack">
        <button className="btn btn--outline btn--block btn--lg" onClick={() => go('refine')}>
          <Icon name="edit" size={15} /> Edit Request
        </button>
        <button className="btn btn--primary btn--block btn--lg" onClick={() => setReview(true)}>
          <Icon name="refresh" size={15} /> Try Again (review credits)
        </button>
        <button
          className="btn btn--ghost btn--block btn--lg"
          onClick={() => {
            actions.chooseVersion(p.id, 'original');
            notify('Kept your original Reel');
            go('preview');
          }}
        >
          Keep Original
        </button>
      </div>
      <Disclosure>Simulated exception for the demo. Coins are illustrative and no payment is involved.</Disclosure>

      <Sheet open={review} onClose={() => setReview(false)} title="Review demo coins">
        <ul className="breakdown">
          <li>
            <span>Needed for Scene 02</span>
            <b>{need}</b>
          </li>
          <li className="breakdown__total">
            <span>Your balance</span>
            <b>{state.credits} demo coins</b>
          </li>
        </ul>
        {!enough && (
          <>
            <p className="sheet__text">This demo has no store or payments. To continue the walkthrough, restore the demo balance.</p>
            <button
              className="btn btn--outline btn--block"
              onClick={() => {
                actions.setCredits(120);
                notify('Demo balance restored to 120 (simulated)');
              }}
            >
              Restore demo balance (120)
            </button>
          </>
        )}
        <button
          className="btn btn--primary btn--block btn--lg"
          disabled={!enough}
          onClick={() => {
            const ok = actions.replaceScene2(p.id);
            setReview(false);
            if (ok) {
              notify(`Scene 02 replaced · ${need} demo coins`);
              go('refine');
            }
          }}
        >
          Try Again · {need} demo coins
        </button>
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------ S6 finish */

function versionOf(p: ReelProject) {
  return p.chosen === 'revision' && p.revision ? p.revision : p.original;
}

export function FinishScreen({ store, go }: { store: Store; go: (r: Route) => void }) {
  const { current: p, actions, notify } = store;
  if (!p || !p.original) {
    return (
      <div className="screen">
        <Empty title="No Reel to finish" body="Generate a Reel first." action={<button className="btn btn--primary" onClick={() => go('new')}>Start a Reel</button>} />
      </div>
    );
  }
  const v = versionOf(p)!;
  const diffs = versionDiff(p.original, v);
  const previewOnly = captionsEdited(v);
  const file = exportFile(v);
  const thumb = 'media/scene1.jpg';

  return (
    <div className="screen">
      <Steps step={4} />
      <Card className="finishcard">
        <div className="finishcard__thumb">
          <img src={thumb} alt="Reel cover" />
          <span>0:20</span>
        </div>
        <div className="finishcard__body">
          <span className={`status ${p.readyToUse ? 'status--ready' : 'status--draft'}`}>{p.readyToUse ? 'Ready to Use' : 'Draft'}</span>
          <h2>{p.brief}</h2>
          <p className="muted">
            {p.chosen === 'revision' ? 'Revised version' : 'Original version'} · {MUSIC[v.music].name}
          </p>
          {diffs.length > 0 && <p className="finishcard__diff">{diffs.join(' · ')}</p>}
          {p.saved && (
            <p className="finishcard__saved">
              <Icon name="check" size={13} /> Saved to History
            </p>
          )}
        </div>
      </Card>

      <button
        className={`readytoggle ${p.readyToUse ? 'is-on' : ''}`}
        onClick={() => {
          actions.setReady(p.id, !p.readyToUse);
          notify(p.readyToUse ? 'Moved back to Draft' : 'Marked Ready to Use');
        }}
        aria-pressed={p.readyToUse}
      >
        <span className="readytoggle__box">{p.readyToUse && <Icon name="check" size={16} stroke={2.6} />}</span>
        <span>
          <b>Mark as Ready to Use</b>
          <span className="muted">{p.readyToUse ? 'Finished — you can still reopen and refine it.' : 'Still a draft. Mark it when you’re happy with it.'}</span>
        </span>
      </button>

      <div className="stack">
        <button
          className="btn btn--primary btn--block btn--lg"
          disabled={!p.readyToUse}
          onClick={() => {
            actions.saveProject(p.id);
            notify('Saved to History as a finished Reel');
          }}
        >
          <Icon name="library" size={16} /> {p.saved ? 'Saved to History' : 'Save Finished Reel'}
        </button>
        {!p.readyToUse && <p className="fineprint center">Mark it Ready to Use to save it as finished.</p>}
        <a className="btn btn--outline btn--block btn--lg" href={file} download={`reel-${p.id}.mp4`} onClick={() => notify('Downloading the prepared MP4')}>
          <Icon name="download" size={16} /> Export Video (MP4)
        </a>
        {previewOnly ? (
          <Disclosure tone="warn">
            The exported MP4 includes your scene and music choice but uses the <b>original captions (Bold White)</b>. Caption text and style edits are preview-only in this demo.
          </Disclosure>
        ) : (
          <Disclosure>The export is a prepared 20s MP4 that matches this version: scenes, narration, music and captions.</Disclosure>
        )}
      </div>

      <SectionTitle>Publishing</SectionTitle>
      <Card className="publish">
        <p>
          <b>Not published.</b> Ready to Use just means finished. Post it whenever you like, even next month. This demo doesn’t post to social apps.
        </p>
      </Card>

      <button
        className="btn btn--ghost btn--block btn--lg nextreel"
        onClick={() => {
          actions.startReel('');
          go('new');
        }}
      >
        <Icon name="plus" size={16} /> Start Another Reel
      </button>
      <p className="fineprint center">Your Creator Signature is applied again automatically.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ History */

export function LibraryScreen({ store, go }: { store: Store; go: (r: Route) => void }) {
  const { state, actions } = store;
  const [confirmReset, setConfirmReset] = useState(false);
  const items = state.projects.filter((p) => p.original || p.stage === 'draft-plan');
  return (
    <div className="screen">
      <div className="hero hero--tight">
        <h2 className="hero__title">Your Reels</h2>
        <p className="hero__sub">Your Reels on this device. Ready to Use means finished, not posted.</p>
      </div>
      {items.length === 0 && (
        <Empty title="No Reels yet" body="Finished and draft Reels show up here." action={<button className="btn btn--primary" onClick={() => go('new')}>Create a Reel</button>} />
      )}
      <ul className="history">
        {items.map((p) => {
          const look = p.applied.find((a) => a.id === 'visual');
          const cool = look?.value === 'Cool Night Look';
          const img = p.pack === 'coffee' ? 'media/scene1.jpg' : `media/bookstore1-${cool ? 'cool' : 'warm'}.jpg`;
          const status = p.stage === 'draft-plan' ? 'Draft plan' : p.readyToUse ? 'Ready to Use' : 'Draft';
          return (
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
                <img src={img} alt="" />
                <span className="historyrow__body">
                  <b>{p.brief}</b>
                  <span className="muted">
                    {p.original ? `${p.chosen === 'revision' ? 'Revised' : 'Original'} · 20s · ` : 'Plan only · '}
                    {look ? `${look.value}${look.override ? ' (this Reel only)' : ''}` : ''}
                  </span>
                  <span className="historyrow__tags">
                    <em className={`status ${p.readyToUse ? 'status--ready' : 'status--draft'}`}>{status}</em>
                    {p.saved && <em className="chip">Saved</em>}
                  </span>
                </span>
                <Icon name="arrowRight" size={16} />
              </button>
            </li>
          );
        })}
      </ul>
      <button className="btn btn--ghost btn--block" onClick={() => setConfirmReset(true)}>
        <Icon name="refresh" size={14} /> Reset Demo
      </button>
      <Disclosure>Stored only in this browser (synthetic demo data). Not cloud storage.</Disclosure>
      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset the demo?">
        <p className="sheet__text">This restores the seeded Creator Signature and coins and clears History on this device.</p>
        <button
          className="btn btn--primary btn--block btn--lg"
          onClick={() => {
            actions.resetDemo();
            setConfirmReset(false);
            go('signature');
          }}
        >
          Reset Demo
        </button>
        <button className="btn btn--ghost btn--block" onClick={() => setConfirmReset(false)}>
          Cancel
        </button>
      </Sheet>
    </div>
  );
}
