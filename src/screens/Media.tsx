/** PROPOSED media-first Reel path: Choose mode → Import media + brief → Plan → Preview → Refine → Export. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { MediaPlayerHandle, MediaReelPlayer } from '../components/MediaReelPlayer';
import { MemoryInfluence, SourceChip } from '../components/MemoryInfluence';
import { Card, Disclosure, Empty, ProposedTag, SectionTitle, Sheet, Steps } from '../components/ui';
import { describeFile, useAssetUrls } from '../mediaStore';
import {
  CAPTION_STYLES,
  CREDIT_COSTS,
  CaptionStyle,
  MEDIA_BREAKDOWN,
  MEDIA_SEGMENTS,
  MUSIC,
  MediaAsset,
  MusicId,
  OPTIONS,
  ReelProject,
  SERIES_LABEL,
  exclusions,
  mediaDiff,
  mediaScript,
  mediaTimeline,
  seriesOf,
} from '../state';
import type { Route, Store } from '../store';

/* ------------------------------------------------------------------ shared bits */

function Thumb({ asset, url, small }: { asset?: MediaAsset; url?: string | null; small?: boolean }) {
  if (!asset || !url) return <span className={`mthumb ${small ? 'mthumb--sm' : ''} mthumb--missing`}>?</span>;
  return (
    <span className={`mthumb ${small ? 'mthumb--sm' : ''}`}>
      {asset.kind === 'image' ? <img src={url} alt={asset.name} /> : <video src={`${url}#t=0.5`} muted playsInline preload="metadata" aria-label={asset.name} />}
      {asset.kind === 'video' && <em className="mthumb__dur">▶ {asset.duration ? `${Math.round(asset.duration)}s` : 'clip'}</em>}
      <em className={`mthumb__src mthumb__src--${asset.source}`}>{asset.source === 'sample' ? 'Sample' : 'Yours'}</em>
    </span>
  );
}

/* ------------------------------------------------------------------ Choose creation mode */

export function ModeScreen({ store, startReel }: { store: Store; startReel: (brief?: string, mode?: 'idea' | 'media') => void }) {
  const n = store.state.memory.filter((m) => m.enabled).length;
  return (
    <div className="screen">
      <div className="hero hero--tight">
        <h2 className="hero__title">How do you want to start?</h2>
        <p className="hero__sub">Both use your Creator Memory ({n} saved preferences), the Agent Plan, review and refinement.</p>
      </div>
      <button className="modecard modecard--primary" onClick={() => startReel(undefined, 'media')}>
        <span className="modecard__icon">
          <Icon name="upload" size={22} />
        </span>
        <span className="modecard__body">
          <b>Use My Photos & Videos</b>
          <span>You already have footage. The Agent plans scenes around it and assembles a complete Reel in your style.</span>
          <em>Recommended for creators · Demo: Tokyo Yakiniku — 5 Restaurants</em>
        </span>
        <Icon name="arrowRight" size={18} />
      </button>
      <button className="modecard" onClick={() => startReel(undefined, 'idea')}>
        <span className="modecard__icon modecard__icon--soft">
          <Icon name="sparkle" size={22} />
        </span>
        <span className="modecard__body">
          <b>Start from an Idea</b>
          <span>You have a topic but no media. The Agent plans and uses prepared scenes.</span>
          <em>Demo: A cozy weekend coffee ritual</em>
        </span>
        <Icon name="arrowRight" size={18} />
      </button>
      <Disclosure>Proposed feature · concept demo. AI analysis, planning and generation are simulated; your files never leave this device.</Disclosure>
    </div>
  );
}

/* ------------------------------------------------------------------ Import media + restaurant brief */

export function MediaBriefScreen({ store, go }: { store: Store; go: (r: Route) => void }) {
  const { state, current: p, actions, notify } = store;
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const urls = useAssetUrls(p?.media ?? []);
  if (!p) return null;
  const settings = store.resolveFor(p);
  const series = seriesOf(state, p.series);
  const named = p.spots.filter((s) => s.name.trim()).length;
  const canPlan = p.media.length >= 2 && named === 5 && p.brief.trim();
  const shown = ['visual', 'voice', 'captions', 'music', 'pacing', 'hook-length'];

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const ok: { file: File; kind: 'image' | 'video'; duration?: number }[] = [];
    let skipped = 0;
    for (const f of Array.from(files).slice(0, 12)) {
      const d = await describeFile(f);
      if (d) ok.push({ file: f, ...d });
      else skipped++;
    }
    await actions.addUploads(p.id, ok);
    setBusy(false);
    notify(`${ok.length} file${ok.length === 1 ? '' : 's'} imported${skipped ? ` · ${skipped} skipped (format not playable here)` : ''}`);
  };

  return (
    <div className="screen">
      <Steps step={0} />
      <div className="hero hero--tight">
        <p className="eyebrow">
          <Icon name="upload" size={13} /> Use My Photos & Videos
        </p>
        <h2 className="hero__title">Your footage, a complete Reel</h2>
      </div>
      <div className="promptbox">
        <Icon name="bolt" size={18} className="promptbox__icon" />
        <textarea value={p.brief} maxLength={120} rows={1} aria-label="Reel title" onChange={(e) => actions.patchProject(p.id, { brief: e.target.value })} />
        <span className="promptbox__count">{p.brief.length}/120</span>
      </div>

      <SectionTitle aside={<span className="muted">{p.media.length} selected</span>}>1 · Import media</SectionTitle>
      <div className="importrow">
        <button className="btn btn--primary btn--sm" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Icon name="upload" size={14} /> {busy ? 'Importing…' : 'Import photos & videos'}
        </button>
        <button className="btn btn--outline btn--sm" onClick={() => actions.addSampleMedia(p.id)}>
          Use sample media
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => void onFiles(e.target.files).then(() => (e.target.value = ''))} />
      </div>
      {p.media.length === 0 ? (
        <div className="dropzone" onClick={() => fileRef.current?.click()}>
          <Icon name="image" size={28} />
          <span>Add 2–12 photos or clips from your trip</span>
          <span className="muted">Stays on this device · nothing is uploaded</span>
        </div>
      ) : (
        <ol className="mediagrid" aria-label="Selected media, in order">
          {p.media.map((m, i) => (
            <li key={m.id}>
              <Thumb asset={m} url={urls[m.id]} />
              <span className="mediagrid__name">
                {i + 1}. {m.name}
              </span>
              <span className="mediagrid__ctl">
                <button className="iconbtn iconbtn--sm iconbtn--ghost" disabled={i === 0} onClick={() => actions.moveMedia(p.id, i, -1)} aria-label={`Move ${m.name} earlier`}>
                  <Icon name="arrowLeft" size={13} />
                </button>
                <button className="iconbtn iconbtn--sm iconbtn--ghost" disabled={i === p.media.length - 1} onClick={() => actions.moveMedia(p.id, i, 1)} aria-label={`Move ${m.name} later`}>
                  <Icon name="arrowRight" size={13} />
                </button>
                <button className="iconbtn iconbtn--sm iconbtn--ghost" onClick={() => actions.removeMedia(p.id, m.id)} aria-label={`Remove ${m.name}`}>
                  <Icon name="trash" size={13} />
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}
      {p.media.some((m) => m.source === 'sample') && <p className="fineprint">Sample media are demo illustrations made for this prototype — not real restaurants.</p>}

      <SectionTitle
        aside={
          <button className="linkbtn" onClick={() => actions.fillSampleSpots(p.id)}>
            Fill fictional names
          </button>
        }
      >
        2 · Your 5 restaurants
      </SectionTitle>
      <ol className="spots">
        {p.spots.map((s, i) => (
          <li key={i}>
            <span className="spots__n">{i + 1}</span>
            <div className="spots__fields">
              <input value={s.name} placeholder="Restaurant name" aria-label={`Restaurant ${i + 1} name`} onChange={(e) => actions.setSpot(p.id, i, { name: e.target.value })} />
              <div className="spots__row">
                <input value={s.area} placeholder="Area (optional)" aria-label={`Restaurant ${i + 1} area`} onChange={(e) => actions.setSpot(p.id, i, { area: e.target.value })} />
                <input value={s.note} placeholder="Your note (optional)" aria-label={`Restaurant ${i + 1} note`} onChange={(e) => actions.setSpot(p.id, i, { note: e.target.value })} />
              </div>
            </div>
          </li>
        ))}
      </ol>
      <p className="fineprint">Only what you type appears in captions. The Agent doesn’t look anything up or invent details. Names stay in this Reel — never in Memory.</p>

      <SectionTitle>3 · Content series</SectionTitle>
      <div className="chiprow chiprow--wrap">
        {[null, 'travel-food', 'sponsored-beauty'].map((id) => (
          <button key={id ?? 'none'} className={`chip chip--btn ${p.series === id ? 'is-on' : ''}`} onClick={() => actions.setSeries(p.id, id)}>
            {id ? SERIES_LABEL[id] : 'None'}
          </button>
        ))}
      </div>
      <p className="fineprint">
        {p.series === 'travel-food' ? 'Suggested from your brief (restaurants). ' : ''}Series preferences apply on top of your Creator Identity for this kind of content.
      </p>
      {p.series === 'sponsored-beauty' && (
        <label className="campaign">
          <span>
            Brand / campaign notes <em className="chip chip--override">This Reel only</em>
          </span>
          <textarea rows={2} value={p.campaignNotes} placeholder="e.g. product name, required disclosure" onChange={(e) => actions.patchProject(p.id, { campaignNotes: e.target.value })} />
          <span className="fineprint">Never saved to Creator Memory or used to suggest preferences.</span>
        </label>
      )}

      <Card tone="agent" className="applied">
        <div className="applied__head">
          <span className="agentdot">
            <Icon name="memory" size={13} />
          </span>
          <div>
            <strong>Using Creator Memory{series ? ` + ${series.name}` : ''}</strong>
            <span className="muted">Applied automatically — no retyping</span>
          </div>
          <ProposedTag inline />
        </div>
        <ul className="applied__list applied__list--src">
          {shown.map((k) => (
            <li key={k} className={settings[k].source === 'reel' ? 'is-override' : ''}>
              <span>{settings[k].label}</span>
              <b>{settings[k].value}</b>
              <SourceChip s={settings[k]} />
            </li>
          ))}
        </ul>
        <div className="applied__actions">
          <button className="btn btn--ghost btn--sm" onClick={() => go('memory')}>
            <Icon name="gear" size={14} /> Manage Memory
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => setCustomizing((v) => !v)} aria-expanded={customizing}>
            <Icon name="edit" size={14} /> {customizing ? 'Done' : 'Customize for This Reel'}
          </button>
        </div>
        {customizing && (
          <div className="override">
            <p className="fineprint">This Reel only — your Memory stays the same.</p>
            {shown.map((k) => (
              <div key={k} className="override__row">
                <span>{settings[k].label}</span>
                <select
                  value={settings[k].value}
                  aria-label={`${settings[k].label} for this Reel`}
                  onChange={(e) => {
                    const next = { ...p.overrides, [k]: e.target.value };
                    actions.patchProject(p.id, { overrides: next });
                  }}
                >
                  {OPTIONS[k].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                {p.overrides[k] !== undefined && (
                  <button
                    className="linkbtn"
                    onClick={() => {
                      const next = { ...p.overrides };
                      delete next[k];
                      actions.patchProject(p.id, { overrides: next });
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="stickycta">
        <button
          className="btn btn--primary btn--block btn--lg"
          disabled={!canPlan}
          onClick={() => {
            actions.planReel(p.id);
            go('plan');
          }}
        >
          <Icon name="sparkle" size={18} /> Plan My Reel
        </button>
        {!canPlan && <p className="fineprint center">Add at least 2 media and all 5 restaurant names.</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Media-based Agent Plan */

export function MediaPlanScreen({ store, go }: { store: Store; go: (r: Route) => void }) {
  const { state, current: p, actions } = store;
  const [pick, setPick] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const urls = useAssetUrls(p?.media ?? []);
  if (!p) return null;
  const settings = store.resolveFor(p);
  const tl = mediaTimeline(settings);
  const lines = mediaScript(p.spots, settings);
  const avoid = exclusions(state.memory, seriesOf(state, p.series));
  const byId = Object.fromEntries(p.media.map((m) => [m.id, m]));
  const uploads = p.media.filter((m) => m.source === 'upload').length;
  const samples = p.media.length - uploads;
  const balanceAfter = state.credits - CREDIT_COSTS.generate;

  return (
    <div className="screen">
      <Steps step={1} />
      <Card tone="agent" className="planhead">
        <div className="planhead__row">
          <span className="agentdot agentdot--lg">
            <Icon name="sparkle" size={16} />
          </span>
          <div>
            <p className="eyebrow">Your Agent’s Plan · from your media</p>
            <h2 className="planhead__title">{p.brief}</h2>
          </div>
        </div>
        <p className="planhead__meta">
          {Math.round(tl.total)}s · 7 segments · {p.media.length} files · {settings.format.value}
          {p.series ? ` · ${SERIES_LABEL[p.series]}` : ''}
        </p>
      </Card>

      <SectionTitle aside={<span className="muted">Tap footage to change</span>}>Storyboard from your footage</SectionTitle>
      <Disclosure>Simulated analysis: footage is matched by simple rules (a clip opens, then your import order). You choose the final match.</Disclosure>
      <ol className="mstory">
        {tl.segs.map((s) => {
          const a = byId[p.slots[s.i]];
          return (
            <li key={s.i} className="mstory__item" data-seg={s.i}>
              <button className="mstory__thumb" onClick={() => setPick(pick === s.i ? null : s.i)} aria-label={`Change footage for ${MEDIA_SEGMENTS[s.i]}`}>
                <Thumb asset={a} url={a ? urls[a.id] : null} />
              </button>
              <div className="mstory__body">
                <div className="scene__meta">
                  <span className="scene__tag">{s.tag}</span>
                  <span className="muted">
                    {s.start.toFixed(1)}–{s.end.toFixed(1)}s
                  </span>
                </div>
                <strong className="mstory__line">{lines[s.i]}</strong>
                <span className="muted mstory__file">{a ? `${a.name} · ${a.source === 'sample' ? 'sample' : 'your upload'}` : 'No footage'}</span>
                {pick === s.i && (
                  <div className="mpicker" role="listbox" aria-label="Choose footage">
                    {p.media.map((m) => (
                      <button
                        key={m.id}
                        role="option"
                        aria-selected={p.slots[s.i] === m.id}
                        className={p.slots[s.i] === m.id ? 'is-on' : ''}
                        onClick={() => {
                          actions.setSlot(p.id, s.i, m.id);
                          setPick(null);
                        }}
                      >
                        <Thumb asset={m} url={urls[m.id]} small />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <MemoryInfluence settings={settings} avoid={avoid} kind="media" onAdjust={(k, v) => actions.setPlanOverride(p.id, k, v)} />

      <SectionTitle>Source plan</SectionTitle>
      <Card className="sources">
        <p>
          <b>Footage</b> {uploads} your upload{uploads === 1 ? '' : 's'} · {samples} sample{samples === 1 ? '' : 's'} (labelled)
        </p>
        <p>
          <b>Text</b> Only your restaurant names & notes — nothing looked up
        </p>
        <p>
          <b>Narration</b> {settings.voice.value === 'No voiceover' ? 'Off' : 'Browser Mandarin voice in preview · export has captions + music'}
        </p>
        <p>
          <b>Music</b> Original demo track “{settings.music.value}”
        </p>
      </Card>

      <div className="stickycta stickycta--split">
        <button
          className="btn btn--outline btn--lg"
          onClick={() => {
            actions.patchProject(p.id, { stage: 'brief' });
            go('new');
          }}
        >
          Edit Plan
        </button>
        <button className="btn btn--primary btn--lg" onClick={() => setConfirm(true)}>
          Approve & Generate Reel
        </button>
      </div>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Confirm generation">
        <ul className="breakdown">
          {MEDIA_BREAKDOWN.map((b) => (
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
        <Disclosure>DEMO quote. The Reel is assembled in your browser from your footage; no real coins or money are used.</Disclosure>
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
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------ Preview (media) */

function useMediaCtx(store: Store, p: ReelProject | null) {
  const urls = useAssetUrls(p?.media ?? []);
  const settings = useMemo(() => {
    const live = store.resolveFor(p);
    // after generation, the plan is frozen in p.applied (what the Reel was made with)
    if (p?.applied.length) return Object.fromEntries(p.applied.map((a) => [a.id, a]));
    return live;
  }, [store, p]);
  return { urls, settings };
}

export function MediaPreviewScreen({ store, go }: { store: Store; go: (r: Route) => void }) {
  const p = store.current;
  const { urls, settings } = useMediaCtx(store, p);
  if (!p || !p.mOriginal) return <Empty title="No Reel yet" body="Approve a media plan first." />;
  const v = p.chosen === 'revision' && p.mRevision ? p.mRevision : p.mOriginal;
  return (
    <div className="screen screen--player">
      <Steps step={2} />
      <div className="previewhead">
        <div>
          <h2 className="previewhead__title">Your Reel is ready to review</h2>
          <p className="muted">
            {Math.round(mediaTimeline(settings).total)}s · from your {p.media.length} files · {MUSIC[v.music].name}
          </p>
        </div>
        <span className="chip chip--sig">{p.chosen === 'revision' ? 'Revised' : 'Original'}</span>
      </div>
      <Disclosure>Concept demo — assembled in your browser from your footage. Narration uses your browser’s voice; AI analysis is simulated.</Disclosure>
      <MediaReelPlayer version={v} assets={p.media} urls={urls} settings={settings} spots={p.spots} />
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

/* ------------------------------------------------------------------ Refine (media) */

type MTool = 'footage' | 'captions' | 'music';

export function MediaRefineScreen({ store, go }: { store: Store; go: (r: Route) => void }) {
  const { current: p, actions, notify } = store;
  const { urls, settings } = useMediaCtx(store, p);
  const player = useRef<MediaPlayerHandle>(null);
  const [seg, setSeg] = useState(1);
  const [tool, setTool] = useState<MTool>('footage');
  const [view, setView] = useState<'original' | 'revision'>('revision');
  useEffect(() => {
    if (p?.mOriginal && !p.mRevision) actions.ensureRevision(p.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.id, p?.mRevision]);
  if (!p || !p.mOriginal) return <Empty title="No Reel to refine" body="Generate a Reel first." />;
  if (!p.mRevision) return null;
  const rev = p.mRevision;
  const shown = view === 'original' ? p.mOriginal : rev;
  const diffs = mediaDiff(p.mOriginal, rev);
  const tl = mediaTimeline(settings);
  const byId = Object.fromEntries(p.media.map((m) => [m.id, m]));
  const toRev = () => view === 'original' && setView('revision');
  const pickSeg = (i: number) => {
    setSeg(i);
    player.current?.seek(tl.segs[i].start + 0.05);
  };

  return (
    <div className="screen screen--player">
      <Steps step={3} />
      <div className="compare" role="group" aria-label="Compare versions">
        <button className={view === 'original' ? 'is-on' : ''} onClick={() => setView('original')} aria-pressed={view === 'original'}>
          Original
        </button>
        <button className={view === 'revision' ? 'is-on' : ''} onClick={() => setView('revision')} aria-pressed={view === 'revision'}>
          Revised{diffs.length ? ` · ${diffs.length}` : ''}
        </button>
      </div>
      <Disclosure>Re-cuts use footage you already imported — nothing is regenerated · 0 demo coins.</Disclosure>
      <MediaReelPlayer ref={player} version={shown} assets={p.media} urls={urls} settings={settings} spots={p.spots} compact activeSeg={seg} onSeg={setSeg} badge={view === 'original' ? 'ORIGINAL' : 'REVISED'} />
      <div className="segcards" role="tablist" aria-label="Segments">
        {tl.segs.map((s) => {
          const a = byId[shown.slots[s.i]];
          return (
            <button key={s.i} role="tab" aria-selected={seg === s.i} className={`segcard ${seg === s.i ? 'is-on' : ''}`} onClick={() => pickSeg(s.i)}>
              <Thumb asset={a} url={a ? urls[a.id] : null} small />
              <span>{s.i === 0 ? 'Hook' : s.i === 6 ? 'End' : s.i}</span>
              {rev.slots[s.i] !== p.mOriginal!.slots[s.i] && <i className="scenecard__dot" />}
            </button>
          );
        })}
      </div>
      <div className="tools tools--3" role="tablist">
        {(
          [
            ['footage', 'Swap Footage', 'swap'],
            ['captions', 'Fix Captions', 'cc'],
            ['music', 'Change Music', 'music'],
          ] as [MTool, string, string][]
        ).map(([id, label, icon]) => (
          <button key={id} role="tab" aria-selected={tool === id} className={`tool ${tool === id ? 'is-on' : ''}`} onClick={() => setTool(id)}>
            <Icon name={icon} size={18} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <Card className="panel">
        {tool === 'footage' && (
          <>
            <p className="panel__title">Footage · {MEDIA_SEGMENTS[seg]}</p>
            <div className="mpicker mpicker--wide">
              {p.media.map((m) => (
                <button
                  key={m.id}
                  className={rev.slots[seg] === m.id ? 'is-on' : ''}
                  onClick={() => {
                    toRev();
                    actions.setRevisionSlot(p.id, seg, m.id);
                    notify(`${MEDIA_SEGMENTS[seg]} re-cut with “${m.name}”`);
                  }}
                  aria-label={`Use ${m.name}`}
                >
                  <Thumb asset={m} url={urls[m.id]} small />
                </button>
              ))}
            </div>
          </>
        )}
        {tool === 'captions' && (
          <>
            <p className="panel__title">Caption · {MEDIA_SEGMENTS[seg]}</p>
            <label className="capedit">
              <span>
                {tl.segs[seg].start.toFixed(1)}–{tl.segs[seg].end.toFixed(1)}s
              </span>
              <input value={rev.captions[seg]} maxLength={30} onFocus={toRev} onChange={(e) => actions.setCaption(p.id, seg, e.target.value)} aria-label={`Caption for ${MEDIA_SEGMENTS[seg]}`} />
              {rev.captions[seg] !== p.mOriginal.captions[seg] && <em className="chip chip--override">Edited</em>}
            </label>
            <div className="segmented" role="radiogroup" aria-label="Caption style">
              {(Object.keys(CAPTION_STYLES) as CaptionStyle[]).map((k) => (
                <button
                  key={k}
                  role="radio"
                  aria-checked={rev.captionStyle === k}
                  className={rev.captionStyle === k ? 'is-on' : ''}
                  onClick={() => {
                    toRev();
                    actions.setCaptionStyle(p.id, k);
                  }}
                >
                  {CAPTION_STYLES[k]}
                </button>
              ))}
            </div>
          </>
        )}
        {tool === 'music' && (
          <>
            <p className="panel__title">Music</p>
            {(Object.keys(MUSIC) as MusicId[]).map((m) => (
              <button
                key={m}
                className={`musicopt ${rev.music === m ? 'is-on' : ''}`}
                onClick={() => {
                  toRev();
                  actions.setMusic(p.id, m);
                }}
                aria-pressed={rev.music === m}
              >
                <span className="musicopt__icon">
                  <Icon name="music" size={16} />
                </span>
                <span className="musicopt__text">
                  <b>{MUSIC[m].name}</b>
                  <span className="muted">{MUSIC[m].desc}</span>
                </span>
                {rev.music === m && <Icon name="check" size={18} />}
              </button>
            ))}
          </>
        )}
      </Card>
      {diffs.length > 0 && (
        <p className="diffs">
          <b>Revision:</b> {diffs.join(' · ')}. <span className="muted">Original stays saved.</span>
        </p>
      )}
      <div className="stickycta stickycta--split">
        <button
          className="btn btn--outline btn--lg"
          onClick={() => {
            actions.chooseVersion(p.id, 'original');
            go('finish');
          }}
        >
          Keep Original
        </button>
        <button
          className="btn btn--primary btn--lg"
          disabled={!diffs.length}
          onClick={() => {
            actions.chooseVersion(p.id, 'revision');
            go('finish');
          }}
        >
          Use Revision
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Export (media) — real browser recording */

export function MediaExport({ store }: { store: Store }) {
  const p = store.current!;
  const { urls, settings } = useMediaCtx(store, p);
  const player = useRef<MediaPlayerHandle>(null);
  const [state, setState] = useState<'idle' | 'recording' | 'done' | 'unsupported'>('idle');
  const [sec, setSec] = useState(0);
  const [file, setFile] = useState<{ url: string; name: string; size: number } | null>(null);
  const v = p.chosen === 'revision' && p.mRevision ? p.mRevision : p.mOriginal!;
  const total = mediaTimeline(settings).total;
  return (
    <div className="mexport">
      <div className="mexport__hidden" aria-hidden={state !== 'recording'}>
        <MediaReelPlayer ref={player} version={v} assets={p.media} urls={urls} settings={settings} spots={p.spots} compact />
      </div>
      {state === 'idle' && (
        <button
          className="btn btn--outline btn--block btn--lg"
          onClick={async () => {
            setState('recording');
            const r = await player.current?.exportVideo(setSec);
            if (!r) return setState('unsupported');
            const ext = r.type.includes('mp4') ? 'mp4' : 'webm';
            setFile({ url: URL.createObjectURL(r.blob), name: `reel-${p.id}.${ext}`, size: r.blob.size });
            setState('done');
          }}
        >
          <Icon name="download" size={16} /> Export Video
        </button>
      )}
      {state === 'recording' && (
        <div className="mexport__rec" role="status">
          <span className="recdot" /> Recording in real time… {sec.toFixed(0)}s / {Math.round(total)}s
        </div>
      )}
      {state === 'done' && file && (
        <a className="btn btn--outline btn--block btn--lg" href={file.url} download={file.name}>
          <Icon name="download" size={16} /> Download {file.name.split('.').pop()?.toUpperCase()} · {(file.size / 1e6).toFixed(1)} MB
        </a>
      )}
      {state === 'unsupported' && <Disclosure tone="warn">This browser can’t record video. Export isn’t available here — try Chrome.</Disclosure>}
      <Disclosure>The export is recorded from your footage with captions and music. Browser narration can’t be captured, so it isn’t in the file.</Disclosure>
    </div>
  );
}
