import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { PlayerHandle, ReelPlayer } from '../components/ReelPlayer';
import { Card, Disclosure, Empty, Sheet, Steps } from '../components/ui';
import { BASE_CUES, CAPTION_STYLES, CREDIT_COSTS, CaptionStyle, MUSIC, MusicId, SCENE2_ALT, SCENES, versionDiff } from '../state';
import type { Route, Store } from '../store';

type Tool = 'replace' | 'voice' | 'captions' | 'music';
const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: 'replace', label: 'Replace Scene', icon: 'swap' },
  { id: 'voice', label: 'Edit Voiceover', icon: 'mic' },
  { id: 'captions', label: 'Fix Captions', icon: 'cc' },
  { id: 'music', label: 'Change Music', icon: 'music' },
];

export function RefineScreen({ store, go }: { store: Store; go: (r: Route) => void }) {
  const { state, current: p, actions, notify } = store;
  const player = useRef<PlayerHandle>(null);
  const [scene, setScene] = useState(2);
  const [tool, setTool] = useState<Tool>('captions');
  const [view, setView] = useState<'original' | 'revision'>('revision');
  const [quote, setQuote] = useState(false);
  const [voiceVol, setVoiceVol] = useState(1);
  const [musicVol, setMusicVol] = useState(0.32);

  useEffect(() => {
    if (p && p.original && !p.revision) actions.ensureRevision(p.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.id, p?.revision]);

  if (!p || !p.original) {
    return (
      <div className="screen">
        <Empty
          title="No Reel to refine"
          body="Generate a Reel first — then change a scene, captions or music here."
          action={
            <button className="btn btn--primary" onClick={() => go('new')}>
              Start a Reel
            </button>
          }
        />
      </div>
    );
  }
  if (!p.revision) return null;
  const rev = p.revision;
  const orig = p.original;
  const shown = view === 'original' ? orig : rev;
  const diffs = versionDiff(orig, rev);
  const sceneCues = BASE_CUES.map((c, i) => ({ ...c, i })).filter((c) => c.scene === scene);
  const editRevision = () => {
    if (view === 'original') setView('revision');
  };

  const pickScene = (n: number) => {
    setScene(n);
    const s = SCENES.coffee.find((x) => x.n === n)!;
    player.current?.seek(s.start + 0.05);
  };

  const confirmReplace = () => {
    setQuote(false);
    const ok = actions.replaceScene2(p.id);
    if (!ok) {
      go('error');
      return;
    }
    editRevision();
    notify(`Scene 02 replaced · ${CREDIT_COSTS.replaceScene} demo coins`);
    window.setTimeout(() => player.current?.seek(4.05), 60);
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
      <Disclosure>Concept demo — prepared media · illustrative coins.</Disclosure>
      <ReelPlayer
        ref={player}
        version={shown}
        compact
        activeScene={scene}
        onScene={setScene}
        voiceVolume={voiceVol}
        musicVolume={musicVol}
        badge={view === 'original' ? 'ORIGINAL' : diffs.length ? 'REVISED' : 'REVISED · no changes yet'}
      />

      <div className="scenecards" role="tablist" aria-label="Scenes">
        {SCENES.coffee.map((s) => {
          const img = s.n === 2 && shown.scene2 === 'alt' ? SCENE2_ALT.img : s.img;
          const changed = s.n === 2 && rev.scene2 === 'alt';
          return (
            <button key={s.n} role="tab" aria-selected={scene === s.n} className={`scenecard ${scene === s.n ? 'is-on' : ''}`} onClick={() => pickScene(s.n)}>
              <img src={img} alt="" />
              <span className="scenecard__n">{String(s.n).padStart(2, '0')}</span>
              {changed && <span className="scenecard__dot" title="Changed in revision" />}
              <span className="scenecard__tag">{s.tag}</span>
            </button>
          );
        })}
      </div>

      <div className="tools" role="tablist" aria-label="Editing tools">
        {TOOLS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tool === t.id} className={`tool ${tool === t.id ? 'is-on' : ''}`} onClick={() => setTool(t.id)}>
            <Icon name={t.icon} size={18} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <Card className="panel">
        {tool === 'replace' &&
          (scene === 2 ? (
            <>
              <p className="panel__title">Scene 02 · {rev.scene2 === 'alt' ? SCENE2_ALT.title : 'Pour-over coffee'}</p>
              <div className="altrow">
                <figure className={rev.scene2 === 'original' ? 'is-on' : ''}>
                  <img src="media/scene2.jpg" alt="Original Scene 02, pour-over" />
                  <figcaption>Original · Pour-over</figcaption>
                </figure>
                <Icon name="arrowRight" size={18} />
                <figure className={rev.scene2 === 'alt' ? 'is-on' : ''}>
                  <img src={SCENE2_ALT.img} alt="Alternate Scene 02, French press" />
                  <figcaption>Alternate · French press</figcaption>
                </figure>
              </div>
              {rev.scene2 === 'original' ? (
                <button className="btn btn--primary btn--block" onClick={() => setQuote(true)}>
                  <Icon name="swap" size={15} /> Replace Scene 02
                </button>
              ) : (
                <button
                  className="btn btn--outline btn--block"
                  onClick={() => {
                    actions.restoreScene2(p.id);
                    notify('Scene 02 restored to the original (no coins)');
                  }}
                >
                  Use original Scene 02 again
                </button>
              )}
              <p className="fineprint">The alternate is a prepared clip. In the real product this would be a new generation.</p>
            </>
          ) : (
            <>
              <p className="panel__title">Scene {String(scene).padStart(2, '0')}</p>
              <button className="btn btn--outline btn--block" disabled>
                Replace Scene {String(scene).padStart(2, '0')}
              </button>
              <p className="fineprint">This concept demo only has a prepared alternate for Scene 02. Select Scene 02 to try it.</p>
            </>
          ))}

        {tool === 'captions' && (
          <>
            <p className="panel__title">Captions · Scene {String(scene).padStart(2, '0')}</p>
            {sceneCues.map((c) => (
              <label key={c.i} className="capedit">
                <span>
                  {c.start.toFixed(1)}–{c.end.toFixed(1)}s
                </span>
                <input
                  value={rev.captions[c.i]}
                  maxLength={24}
                  onFocus={() => {
                    editRevision();
                    player.current?.seek(c.start + 0.2);
                  }}
                  onChange={(e) => actions.setCaption(p.id, c.i, e.target.value)}
                  aria-label={`Caption ${c.i + 1}`}
                />
                {rev.captions[c.i] !== orig.captions[c.i] && <em className="chip chip--override">Edited</em>}
              </label>
            ))}
            <div className="segmented" role="radiogroup" aria-label="Caption style">
              {(Object.keys(CAPTION_STYLES) as CaptionStyle[]).map((k) => (
                <button
                  key={k}
                  role="radio"
                  aria-checked={rev.captionStyle === k}
                  className={rev.captionStyle === k ? 'is-on' : ''}
                  onClick={() => {
                    editRevision();
                    actions.setCaptionStyle(p.id, k);
                  }}
                >
                  {CAPTION_STYLES[k]}
                </button>
              ))}
            </div>
            <div className="panel__foot">
              <span className="fineprint">Free · updates the preview instantly</span>
              <button className="btn btn--ghost btn--sm" onClick={() => actions.resetCaptions(p.id)}>
                Reset captions
              </button>
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
                  editRevision();
                  actions.setMusic(p.id, m);
                  notify(`Music: ${MUSIC[m].name} — press play to hear it`);
                }}
                aria-pressed={rev.music === m}
              >
                <span className="musicopt__icon">
                  <Icon name="music" size={16} />
                </span>
                <span className="musicopt__text">
                  <b>
                    {MUSIC[m].name}
                    {state.memory.find((x) => x.id === 'music' && x.enabled)?.value === MUSIC[m].name && <em className="chip chip--sig">Memory</em>}
                  </b>
                  <span className="muted">{MUSIC[m].desc}</span>
                </span>
                {rev.music === m && <Icon name="check" size={18} />}
              </button>
            ))}
            <p className="fineprint">Original demo tracks · 0 demo coins to swap</p>
          </>
        )}

        {tool === 'voice' && (
          <>
            <p className="panel__title">Voiceover · Scene {String(scene).padStart(2, '0')}</p>
            <p className="voiceline">「{p.script[scene - 1] ?? ''}」</p>
            <label className="slider">
              <span>Voice level</span>
              <input type="range" min={0} max={1} step={0.05} value={voiceVol} onChange={(e) => setVoiceVol(parseFloat(e.target.value))} />
            </label>
            <label className="slider">
              <span>Music level</span>
              <input type="range" min={0} max={0.8} step={0.02} value={musicVol} onChange={(e) => setMusicVol(parseFloat(e.target.value))} />
            </label>
            <p className="fineprint">
              Level changes are preview-only. Re-voicing a rewritten line isn’t simulated in this demo — the prepared Mandarin narration is kept.
            </p>
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
            notify('Keeping the original Reel. Your revision is still saved.');
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
            notify('Using the revised Reel');
            go('finish');
          }}
        >
          Use Revision
        </button>
      </div>

      <Sheet open={quote} onClose={() => setQuote(false)} title="Replace Scene 02?">
        <ul className="breakdown">
          <li>
            <span>New Scene 02 · French press</span>
            <b>{CREDIT_COSTS.replaceScene}</b>
          </li>
          <li>
            <span>Your balance</span>
            <b>{state.credits}</b>
          </li>
          <li className="breakdown__total">
            <span>Balance after</span>
            <b>{state.credits >= CREDIT_COSTS.replaceScene ? `${state.credits - CREDIT_COSTS.replaceScene} demo coins` : 'Not enough'}</b>
          </li>
        </ul>
        <Disclosure>DEMO quote. Only Scene 02 changes. Your original Reel is kept, and no real coins or money are used.</Disclosure>
        <button className="btn btn--primary btn--block btn--lg" onClick={confirmReplace}>
          Confirm · {CREDIT_COSTS.replaceScene} demo coins
        </button>
        <button className="btn btn--ghost btn--block" onClick={() => setQuote(false)}>
          Cancel
        </button>
      </Sheet>
    </div>
  );
}
