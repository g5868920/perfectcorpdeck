import { useState } from 'react';
import { AppliedSetting, MemoryItem, OPTIONS } from '../state';
import { Icon } from './Icon';
import { ProposedTag } from './ui';

export function SourceChip({ s }: { s: AppliedSetting }) {
  const cls = s.source === 'reel' ? 'chip--override' : s.source === 'series' ? 'chip--series' : s.source === 'identity' ? 'chip--sig' : '';
  return <em className={`chip ${cls}`}>{s.sourceLabel}</em>;
}

interface Row {
  key: string;
  area: string;
  icon: string;
  effect: string;
  planOnly?: boolean;
}

/** Effects describe what the Agent does with each resolved value (no hidden defaults). */
function rowsFor(a: Record<string, AppliedSetting>, kind: 'coffee' | 'bookstore' | 'media'): Row[] {
  const prepared = kind === 'coffee';
  const pacing = a.pacing.value;
  const rows: Row[] = [
    { key: 'hook', area: 'Hook style', icon: 'bolt', effect: a.hook.value.includes('Question') ? 'Opens with a question' : a.hook.value.startsWith('Countdown') ? 'Opens with a countdown' : 'Opens with a statement' },
    { key: 'hook-length', area: 'Hook length', icon: 'clock', effect: a['hook-length'].value.startsWith('Short') ? 'Hook segment under 3s' : 'Hook segment about 4s' },
    { key: 'visual', area: 'Visual treatment', icon: 'film', effect: kind === 'media' ? 'Color grade applied to your footage' : 'Color grade and lighting on all 4 scenes', planOnly: prepared && a.visual.value !== 'Warm Cinematic' },
    {
      key: 'voice',
      area: 'Narration',
      icon: 'mic',
      effect: a.voice.value === 'No voiceover' ? 'Captions only, no voice' : kind === 'media' ? 'Read by your browser’s Mandarin voice (preview)' : 'Voice for the 4 script lines',
      planOnly: prepared && a.voice.value !== 'Mandarin, Neutral',
    },
    { key: 'music', area: 'Music', icon: 'music', effect: a.music.value === 'No music' ? 'No background music' : 'Background bed under the narration' },
    { key: 'captions', area: 'Captions', icon: 'cc', effect: a.captions.value === 'Off' ? 'No captions' : 'Timed to each segment · style shown in preview' },
    {
      key: 'pacing',
      area: 'Pacing',
      icon: 'layers',
      effect: pacing.startsWith('Fast') ? 'Quick cuts, shorter segments' : pacing.startsWith('Minimal') ? 'Soft cross-fades, longer segments' : 'Simple cuts between scenes',
      planOnly: prepared && pacing.startsWith('Fast'),
    },
  ];
  if (kind === 'media') rows.push({ key: 'overlay', area: 'On-screen info', icon: 'info', effect: a.overlay.value === 'Off' ? 'No info label' : 'Label on each restaurant segment' });
  if (a.tone.source !== 'default') rows.push({ key: 'tone', area: 'Storytelling tone', icon: 'hook', effect: 'Wording of hook and lines' });
  rows.push({ key: 'format', area: 'Format', icon: 'frame', effect: 'Canvas shape', planOnly: a.format.value !== '9:16' });
  return rows;
}

export function MemoryInfluence({
  settings,
  avoid,
  kind,
  onAdjust,
}: {
  settings: Record<string, AppliedSetting>;
  avoid: MemoryItem[];
  kind: 'coffee' | 'bookstore' | 'media';
  onAdjust: (key: string, value: string) => void;
}) {
  const [adjust, setAdjust] = useState(false);
  const rows = rowsFor(settings, kind);
  return (
    <section className="card influence">
      <div className="influence__head">
        <Icon name="memory" size={16} />
        <h3>How your Creator Memory shaped this plan</h3>
        <ProposedTag inline />
      </div>
      <ul className="influence__list">
        {rows.map((r) => {
          const s = settings[r.key];
          return (
            <li key={r.key} data-key={r.key}>
              <span className="influence__icon">
                <Icon name={r.icon} size={15} />
              </span>
              <div className="influence__body">
                <span className="influence__area">{r.area}</span>
                <b data-value={s.value}>{s.value}</b>
                <span className="muted">
                  {r.effect}
                  {r.planOnly && ' · plan only (prepared demo media unchanged)'}
                </span>
              </div>
              <SourceChip s={s} />
            </li>
          );
        })}
        {avoid.length > 0 && (
          <li data-key="avoid">
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
      <p className="fineprint">Precedence: This Reel only → Series → Creator Identity → App default.</p>
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
                  const on = settings[key].value === o;
                  return (
                    <button key={o} role="radio" aria-checked={on} className={on ? 'is-on' : ''} onClick={() => onAdjust(key, o)}>
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
    </section>
  );
}
