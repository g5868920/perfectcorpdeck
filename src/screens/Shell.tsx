/**
 * Recreations of EXISTING YouCam AI Pro surfaces (from visual-references/), with the
 * PROPOSED Reel Agent entry points added and tagged. Existing tools outside this concept
 * respond with an explanation instead of acting as dead buttons.
 */
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { HomeHeader, ProposedTag } from '../components/ui';
import type { Route, Store } from '../store';

const OUT_OF_SCOPE = 'Existing YouCam tool — not part of this concept demo';

/* ------------------------------------------------------------------ Explore */

const FEATURES: { label: string; icon: string; badge?: 'HOT' | 'NEW'; to?: Route }[] = [
  { label: 'Image Generator', icon: 'image' },
  { label: 'Video Generator', icon: 'videoEdit', to: 'video' },
  { label: 'Character Animator', icon: 'dance', badge: 'HOT' },
  { label: 'AI Video Editor', icon: 'videoEdit', badge: 'HOT' },
  { label: 'AI Conversation', icon: 'conversation', badge: 'NEW' },
  { label: 'AI Influencer', icon: 'influencer', badge: 'HOT' },
  { label: 'Talking Photo', icon: 'talking', badge: 'NEW' },
  { label: 'AI Replace', icon: 'replace' },
  { label: 'AI Remove', icon: 'erase' },
  { label: 'All Tools', icon: 'grid', to: 'tools' },
];

const TEMPLATE_TABS = ['Trending', 'Marketing', 'UGC Vlogger', 'AI Conversation'];

export function ExploreScreen({ store, go }: { store: Store; go: (r: Route) => void }) {
  const [tab, setTab] = useState('Trending');
  return (
    <div className="screen screen--flush">
      <HomeHeader coins={store.state.credits} onSettings={() => go('settings')} />
      <div className="featuregrid">
        {FEATURES.map((f) => (
          <button key={f.label} className="feature" onClick={() => (f.to ? go(f.to) : store.notify(OUT_OF_SCOPE))}>
            <span className="feature__icon">
              <Icon name={f.icon} size={26} stroke={1.7} />
              {f.badge && <em className={`badge badge--${f.badge.toLowerCase()}`}>{f.badge}</em>}
            </span>
            <span className="feature__label">{f.label}</span>
          </button>
        ))}
      </div>

      <h2 className="ytitle">AI Templates</h2>
      <div className="chiprow ychips">
        {TEMPLATE_TABS.map((t) => (
          <button key={t} className={`ychip ${tab === t ? 'is-on' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <h3 className="ysub">🤍 Social Trend</h3>
      <div className="templates">
        <button className="template template--big" onClick={() => store.notify(OUT_OF_SCOPE)}>
          <img src="media/scene1.jpg" alt="" />
          <span>Slow Morning</span>
        </button>
        <div className="templates__col">
          {[
            ['media/bookstore2-cool.jpg', 'Night Shelves'],
            ['media/scene3.jpg', 'Window Diary'],
          ].map(([img, t]) => (
            <button key={t} className="template" onClick={() => store.notify(OUT_OF_SCOPE)}>
              <img src={img} alt="" />
              <span>{t}</span>
            </button>
          ))}
        </div>
        <div className="templates__col">
          {[
            ['media/bookstore1-warm.jpg', 'Corner Shop'],
            ['media/scene2-alt.jpg', 'Press & Pour'],
          ].map(([img, t]) => (
            <button key={t} className="template" onClick={() => store.notify(OUT_OF_SCOPE)}>
              <img src={img} alt="" />
              <span>{t}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="fineprint fineprint--pad">Template thumbnails are this demo’s own illustrations, not YouCam content.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ AI Agent (conversation-first entry) */

const AGENT_PROMPTS = ['Turn my photo into a moving video', 'Combine photos into one composition naturally', 'Enhance photo quality', 'Remove unwanted objects or people', 'Enhance the video quality'];
const REEL_PROMPT = 'Create a complete Reel from an idea';
const REEL_INTENT = /reel|short video|complete video|story video|vlog|短影音|影片|腳本|旁白|字幕/i;

type ChatMsg = { from: 'me' | 'agent'; text: string; action?: 'reel' };

export function AgentScreen({ store, go, startReel }: { store: Store; go: (r: Route) => void; startReel: (brief?: string) => void }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // scroll only the screen's own scroller (never the app frame) so the latest reply sits above the chat bar
    const sc = endRef.current?.closest('.frame__scroll');
    if (msgs.length && sc) sc.scrollTop = sc.scrollHeight;
  }, [msgs.length]);

  const ask = (q: string) => {
    const wantsReel = q === REEL_PROMPT || REEL_INTENT.test(q);
    const reply: ChatMsg = wantsReel
      ? {
          from: 'agent',
          text: 'I can plan and make a complete 15–30s Reel — script, scenes, narration, music and captions — using your Creator Memory. Want to start?',
          action: 'reel',
        }
      : { from: 'agent', text: 'That’s an existing YouCam AI Agent capability. It isn’t simulated in this concept demo — try “Create a complete Reel from an idea”.' };
    setMsgs((m) => [...m, { from: 'me', text: q }, reply]);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    ask(text.trim());
    setText('');
  };

  return (
    <div className="screen screen--flush agent">
      <header className="appbar">
        <div className="appbar__side">
          <button className="iconbtn iconbtn--ghost iconbtn--back" onClick={() => go('explore')} aria-label="Back">
            <Icon name="arrowLeft" size={24} stroke={1.7} />
          </button>
        </div>
        <h1 className="appbar__title">AI Agent</h1>
        <div className="appbar__side appbar__side--end">
          <button className="iconbtn iconbtn--ghost" onClick={() => store.notify('Chat history — existing feature, not part of this demo')} aria-label="Chat history">
            <Icon name="menu" size={24} />
          </button>
        </div>
      </header>
      <div className="agent__body">
        <p className="agent__terms">
          This AI agent is powered by Generative AI Models, please see our <u>Terms of Use</u> for more information.
        </p>
        <p className="agent__name">
          <span className="agent__avatar">
            <Icon name="robot" size={18} stroke={2} />
          </span>
          AI Agent
        </p>
        <p className="agent__hello">Hey there! 👋 I’m your AI agent ✨</p>
        <p className="agent__intro">Upload a photo or a video, and I’ll help you enhance quality, restore old memories, remove unwanted objects, and even turn your ideas into stunning AI images or videos—just tell me what you’d like!</p>
        <hr />
        <div className="agent__prompts">
          <button className="agentprompt agentprompt--proposed" onClick={() => ask(REEL_PROMPT)}>
            <Icon name="reel" size={16} /> {REEL_PROMPT} <ProposedTag inline />
          </button>
          {AGENT_PROMPTS.map((p) => (
            <button key={p} className="agentprompt" onClick={() => ask(p)}>
              {p}
            </button>
          ))}
          <button className="subscribe" onClick={() => store.notify('Subscriptions are not part of this demo — no payments')}>
            <Icon name="crown" size={16} /> Subscribe Now
          </button>
        </div>
        {msgs.map((m, i) =>
          m.from === 'me' ? (
            <p key={i} className="bubble bubble--me">
              {m.text}
            </p>
          ) : (
            <div key={i} className="bubble bubble--agent">
              <p>{m.text}</p>
              {m.action === 'reel' && (
                <button className="btn btn--primary btn--sm" onClick={() => startReel()}>
                  <Icon name="reel" size={14} /> Start Reel Agent
                </button>
              )}
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>
      <form className="chatbar" onSubmit={submit}>
        <button type="button" className="chatbar__img" aria-label="Upload a photo" onClick={() => store.notify('Uploads aren’t sent anywhere in this demo')}>
          <Icon name="image" size={20} />
        </button>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask anything" aria-label="Ask anything" />
        <button type="submit" className="chatbar__send" aria-label="Send" disabled={!text.trim()}>
          <Icon name="send" size={20} />
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ All Tools */

type ToolItem = { label: string; icon?: string; badge?: 'HOT' | 'NEW'; to?: Route; proposed?: boolean; img?: string };
const TOOL_GROUPS: { id: string; title: string; items: ToolItem[] }[] = [
  {
    id: 'AI Video',
    title: 'AI Video',
    items: [
      { label: 'Image to Video', icon: 'heartVideo', to: 'video' },
      { label: 'Text to Video', icon: 'textVideo', to: 'video' },
      { label: 'AI Video Editor', icon: 'videoEdit', badge: 'HOT' },
      { label: 'AI Influencer', icon: 'influencer', badge: 'HOT' },
      { label: 'Character Animator', icon: 'dance', badge: 'NEW' },
      { label: 'Talking Photo', icon: 'talking' },
      { label: 'AI Conversation', icon: 'conversation', badge: 'NEW' },
      { label: 'Reel Agent', icon: 'reel', to: 'reel-agent', proposed: true },
    ],
  },
  {
    id: 'AI Image',
    title: 'AI Image',
    items: [
      { label: 'Image to Image', icon: 'image' },
      { label: 'AI Enhance', icon: 'hd' },
      { label: 'AI Replace', icon: 'replace' },
      { label: 'AI Remove', icon: 'erase' },
      { label: 'AI Background', icon: 'person' },
      { label: 'AI Expand', icon: 'expand' },
    ],
  },
  {
    id: 'AI Portrait',
    title: 'AI Portrait',
    items: [
      { label: 'Human Avatar', icon: 'person', badge: 'HOT' },
      { label: 'AI Headshot', icon: 'person', badge: 'HOT' },
      { label: 'AI Fashion', icon: 'person' },
      { label: 'AI Studio', icon: 'person' },
    ],
  },
];

export function ToolsScreen({ store, go, openReelAgent }: { store: Store; go: (r: Route) => void; openReelAgent: () => void }) {
  const [tab, setTab] = useState('AI Video');
  const groups = TOOL_GROUPS.filter((g) => g.id === tab).concat(TOOL_GROUPS.filter((g) => g.id !== tab));
  return (
    <div className="screen screen--flush tools">
      <header className="appbar appbar--sheet">
        <div className="appbar__side">
          <button className="iconbtn iconbtn--ghost" onClick={() => go('explore')} aria-label="Close">
            <Icon name="x" size={24} stroke={1.6} />
          </button>
        </div>
        <h1 className="appbar__title">All Tools</h1>
        <div className="appbar__side" />
      </header>
      <div className="tooltabs">
        {TOOL_GROUPS.map((g) => (
          <button key={g.id} className={`ychip ychip--plain ${tab === g.id ? 'is-on' : ''}`} onClick={() => setTab(g.id)}>
            {g.title}
          </button>
        ))}
      </div>
      {groups.map((g) => (
        <section key={g.id} className="toolgroup">
          <h2>{g.title}</h2>
          <div className="toolgroup__grid">
            {g.items.map((t) => (
              <button
                key={t.label}
                className={`toolitem ${t.proposed ? 'toolitem--proposed' : ''}`}
                onClick={() => (t.to === 'reel-agent' ? openReelAgent() : t.to ? go(t.to) : store.notify(OUT_OF_SCOPE))}
              >
                <span className="toolitem__icon">
                  <Icon name={t.icon ?? 'image'} size={30} stroke={1.6} />
                  {t.badge && <em className={`badge badge--${t.badge.toLowerCase()}`}>{t.badge}</em>}
                  {t.proposed && <em className="badge badge--proposed">CONCEPT</em>}
                </span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ AI Video Generator (task-first entry) */

export function VideoGenScreen({ store, back, openReelAgent }: { store: Store; back: () => void; openReelAgent: () => void }) {
  const [mode, setMode] = useState<'image' | 'text'>('image');
  const [dur, setDur] = useState('10s');
  const [res, setRes] = useState('720p');
  const [prompt, setPrompt] = useState('Bring this image to life with playful, dynamic, and eye-catching animations that are fun and visually appealing.');
  return (
    <div className="screen screen--flush vgen">
      <header className="appbar">
        <div className="appbar__side">
          <button className="iconbtn iconbtn--ghost iconbtn--back" onClick={back} aria-label="Back">
            <Icon name="arrowLeft" size={24} stroke={1.7} />
          </button>
          <button className="historypill" onClick={() => store.notify('Opens History — existing feature')}>
            History
          </button>
        </div>
        <h1 className="appbar__title">AI Video</h1>
        <div className="appbar__side appbar__side--end">
          <span className="coinpill" aria-label={`${store.state.credits} demo coins`}>
            <span className="coinpill__coin">C</span>
            <b>{store.state.credits}</b>
          </span>
        </div>
      </header>
      <div className="vgen__body">
        <div className="segment" role="tablist">
          <button role="tab" aria-selected={mode === 'image'} className={mode === 'image' ? 'is-on' : ''} onClick={() => setMode('image')}>
            Image to Video
          </button>
          <button role="tab" aria-selected={mode === 'text'} className={mode === 'text' ? 'is-on' : ''} onClick={() => setMode('text')}>
            Text to Video
          </button>
        </div>

        {/* PROPOSED entry point */}
        <section className="reelentry" aria-label="Proposed: Create a Complete Reel with AI Agent">
          <div className="reelentry__top">
            <span className="reelentry__icon">
              <Icon name="reel" size={22} />
            </span>
            <div>
              <ProposedTag>New · Proposed</ProposedTag>
              <h2>Create a Complete Reel with AI Agent</h2>
            </div>
          </div>
          <p>Turn your idea into a complete Reel with script, scenes, narration, music, and captions.</p>
          <div className="reelentry__chips">
            {['Script', 'Scenes', 'Narration', 'Music', 'Captions'].map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <button className="btn btn--primary btn--block" onClick={openReelAgent}>
            <Icon name="sparkle" size={15} /> Create Reel
          </button>
        </section>

        <h3 className="vgen__label">AI Model</h3>
        <button className="modelsel" onClick={() => store.notify('Model selection — existing feature, not simulated')}>
          <span className="modelsel__logo" aria-hidden="true" />
          <b>Demo Model</b>
          <em className="disc">DEMO</em>
          <Icon name="chevronDown" size={20} />
        </button>
        {mode === 'image' && (
          <button className="uploadbox" onClick={() => store.notify('Photo upload — existing feature, not simulated')}>
            <Icon name="plus" size={34} stroke={1.5} />
            <span>Add 1-10 Photos</span>
          </button>
        )}
        <h3 className="vgen__label">Prompt (Required):</h3>
        <div className="vprompt">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} aria-label="Prompt" />
          <span>{prompt.length}/26000</span>
        </div>
        <h3 className="vgen__label">Duration</h3>
        <div className="optrow">
          {['5s', '10s', '15s', '20s'].map((d) => (
            <button key={d} className={`opt ${dur === d ? 'is-on' : ''}`} onClick={() => setDur(d)}>
              {d}
            </button>
          ))}
        </div>
        <h3 className="vgen__label">Resolution</h3>
        <div className="optrow optrow--2">
          {['720p', '1080p'].map((d) => (
            <button key={d} className={`opt ${res === d ? 'is-on' : ''}`} onClick={() => setRes(d)}>
              {d}
            </button>
          ))}
        </div>
        <div className="vgen__gen">
          <button className="genbtn" disabled title="Single-clip generation is an existing feature and is not simulated here">
            <span>
              Generate <span className="coinpill__coin coinpill__coin--sm">C</span> —
            </span>
            <small>Existing single-clip tool · not simulated</small>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Settings (existing) + proposed PREFERENCES row */

export function SettingsScreen({ store, back, go }: { store: Store; back: () => void; go: (r: Route) => void }) {
  const { state, actions, notify } = store;
  const saved = state.memory.filter((m) => m.enabled).length;
  const row = (label: string, onClick = () => notify('Existing setting — not part of this demo')) => (
    <button className="setrow" onClick={onClick}>
      <span>{label}</span>
      <Icon name="arrowRight" size={18} />
    </button>
  );
  return (
    <div className="screen screen--flush settings">
      <header className="appbar">
        <div className="appbar__side">
          <button className="iconbtn iconbtn--ghost iconbtn--back" onClick={back} aria-label="Back">
            <Icon name="arrowLeft" size={24} stroke={1.7} />
          </button>
        </div>
        <h1 className="appbar__title">Settings</h1>
        <div className="appbar__side" />
      </header>
      <div className="account">
        <span className="account__avatar">D</span>
        <div>
          <b>Demo Creator</b>
          <span className="muted">demo.creator@example.com · synthetic</span>
        </div>
      </div>
      <div className="mycredits">
        <div className="mycredits__head">
          <b>My Credits</b>
          <span className="chip">DEMO</span>
        </div>
        <div className="mycredits__row">
          <span className="coinpill__coin">C</span>
          <b className="mycredits__n">{state.credits}</b>
          <span>demo coins</span>
        </div>
        <p className="muted">Illustrative balance for the concept demo. No purchases or subscriptions.</p>
      </div>
      <h3 className="band">SUPPORT</h3>
      {row('Send Feedback')}
      {row('FAQ')}
      <h3 className="band">PREFERENCES</h3>
      <label className="setrow">
        <span>Remove watermark</span>
        <span className="switch">
          <input type="checkbox" checked={state.settings.removeWatermark} onChange={actions.toggleWatermark} aria-label="Remove watermark" />
          <span />
        </span>
      </label>
      <button className="setrow setrow--proposed" onClick={() => go('memory')}>
        <span className="setrow__main">
          <span>
            Creator Memory <ProposedTag inline />
          </span>
          <span className="muted">
            {saved} saved preference{saved === 1 ? '' : 's'} · used by Reel Agent
          </span>
        </span>
        <Icon name="arrowRight" size={18} />
      </button>
      <h3 className="band">ABOUT</h3>
      {row('Terms of Service')}
      {row('Privacy Policy')}
    </div>
  );
}
