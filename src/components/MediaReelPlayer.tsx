/**
 * Assembles a Reel IN THE BROWSER from the creator's own photos/clips (or labelled samples):
 * canvas compositing with Ken Burns motion, Memory-driven color grade, pacing-based transitions,
 * timed captions and info labels, plus the chosen music bed (Web Audio). Narration in preview uses
 * the browser's built-in speech voice. Export records the same canvas + music with MediaRecorder
 * (browser narration can't be captured, so the export is captions + music only — disclosed in UI).
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { AppliedSetting, CaptionStyle, MUSIC, MediaAsset, MediaVersion, Spot, mediaTimeline } from '../state';
import { Icon } from './Icon';

export interface MediaPlayerHandle {
  seek: (t: number) => void;
  play: () => void;
  pause: () => void;
  exportVideo: (onProgress: (sec: number) => void) => Promise<{ blob: Blob; type: string } | null>;
}

interface Props {
  version: MediaVersion;
  assets: MediaAsset[];
  urls: Record<string, string | null>;
  settings: Record<string, AppliedSetting>;
  spots: Spot[];
  compact?: boolean;
  badge?: string;
  activeSeg?: number;
  onSeg?: (i: number) => void;
}

const CW = 720;
const CH = 1280;

type Loaded = { kind: 'image'; el: HTMLImageElement } | { kind: 'video'; el: HTMLVideoElement };

function loadAsset(url: string, kind: 'image' | 'video'): Promise<Loaded | null> {
  return new Promise((resolve) => {
    if (kind === 'image') {
      const img = new Image();
      img.onload = () => resolve({ kind: 'image', el: img });
      img.onerror = () => resolve(null);
      img.src = url;
    } else {
      const v = document.createElement('video');
      v.muted = true;
      v.playsInline = true;
      v.loop = true;
      v.preload = 'auto';
      v.crossOrigin = 'anonymous';
      v.onloadeddata = () => resolve({ kind: 'video', el: v });
      v.onerror = () => resolve(null);
      v.src = url;
      v.load();
    }
  });
}

function captionFont(style: CaptionStyle) {
  return style === 'bold-white' ? '700 46px "PingFang TC", -apple-system, sans-serif' : style === 'clean-minimal' ? '500 42px "PingFang TC", -apple-system, sans-serif' : '600 44px "PingFang TC", -apple-system, sans-serif';
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const lines: string[] = [];
  let cur = '';
  for (const ch of [...text]) {
    if (ctx.measureText(cur + ch).width > max && cur) {
      lines.push(cur);
      cur = ch;
    } else cur += ch;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

export const MediaReelPlayer = forwardRef<MediaPlayerHandle, Props>(function MediaReelPlayer({ version, assets, urls, settings, spots, compact, badge, activeSeg, onSeg }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const loaded = useRef<Record<string, Loaded | null>>({});
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);
  const [noSpeech] = useState(() => typeof window === 'undefined' || !('speechSynthesis' in window));
  const clock = useRef({ startPerf: 0, playing: false, t: 0, exporting: false });
  const audio = useRef<{ ctx: AudioContext | null; buffers: Record<string, AudioBuffer>; src: AudioBufferSourceNode | null; gain: GainNode | null; dest: MediaStreamAudioDestinationNode | null }>({
    ctx: null,
    buffers: {},
    src: null,
    gain: null,
    dest: null,
  });
  const speechTimers = useRef<number[]>([]);

  const tl = useMemo(() => mediaTimeline(settings), [settings]);
  const visual = settings.visual?.value ?? 'Natural color';
  const overlay = settings.overlay?.value ?? 'Off';
  const voice = settings.voice?.value ?? 'Mandarin, Neutral';
  const musicOn = settings.music?.value !== 'No music';
  const captionsOn = settings.captions?.value !== 'Off';

  /* ---------------- load media */
  const usedIds = useMemo(() => [...new Set(version.slots)], [version.slots]);
  useEffect(() => {
    let alive = true;
    setReady(false);
    (async () => {
      const miss: string[] = [];
      for (const id of usedIds) {
        if (loaded.current[id] !== undefined) continue;
        const a = assets.find((x) => x.id === id);
        const url = urls[id];
        if (!a || !url) {
          miss.push(id);
          continue;
        }
        loaded.current[id] = await loadAsset(url, a.kind);
        if (!loaded.current[id]) miss.push(id);
      }
      if (alive) {
        setMissing(miss);
        setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usedIds.join('|'), JSON.stringify(urls)]);

  /* ---------------- drawing */
  const drawMedia = useCallback(
    (ctx: CanvasRenderingContext2D, id: string, local: number, dur: number, alpha: number, seg: number, live: boolean) => {
      const m = loaded.current[id];
      ctx.save();
      ctx.globalAlpha = alpha;
      if (visual === 'High-Contrast Mono') ctx.filter = 'grayscale(1) contrast(1.2)';
      if (!m) {
        ctx.fillStyle = '#26263a';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#9a9ab8';
        ctx.font = '500 30px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Media unavailable on this device', CW / 2, CH / 2);
        ctx.restore();
        return;
      }
      const el = m.el;
      const w = m.kind === 'image' ? m.el.naturalWidth : m.el.videoWidth;
      const h = m.kind === 'image' ? m.el.naturalHeight : m.el.videoHeight;
      if (m.kind === 'video') {
        const v = m.el;
        const target = v.duration ? local % v.duration : local;
        if (!live || Math.abs(v.currentTime - target) > 0.35) {
          try {
            v.currentTime = target;
          } catch {
            /* not seekable yet */
          }
        }
        if (live && v.paused) void v.play().catch(() => undefined);
        if (!live && !v.paused) v.pause();
      }
      const p = dur ? Math.min(1, local / dur) : 0;
      const fast = tl.transition === 'cut';
      const zoom = m.kind === 'image' ? 1.02 + 0.08 * p : 1.0 + (fast ? 0.04 * Math.max(0, 1 - local / 0.4) : 0);
      const s = Math.max(CW / w, CH / h) * zoom;
      const dw = w * s;
      const dh = h * s;
      const panX = m.kind === 'image' ? (seg % 2 ? 1 : -1) * (dw - CW) * 0.35 * (p - 0.5) : 0;
      ctx.drawImage(el, (CW - dw) / 2 + panX, (CH - dh) / 2, dw, dh);
      ctx.restore();
    },
    [visual, tl.transition],
  );

  const drawFrame = useCallback(
    (time: number, live: boolean) => {
      const c = canvas.current;
      if (!c) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const segs = tl.segs;
      const i = Math.max(0, segs.findIndex((s) => time >= s.start && time < s.end));
      const seg = segs[i === -1 ? segs.length - 1 : i];
      const local = time - seg.start;
      ctx.clearRect(0, 0, CW, CH);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, CW, CH);
      const TR = tl.transition === 'crossfade' ? 0.6 : 0;
      if (TR && i > 0 && local < TR) {
        const prev = segs[i - 1];
        drawMedia(ctx, version.slots[i - 1], prev.dur + local, prev.dur, 1, i - 1, false);
        drawMedia(ctx, version.slots[i], local, seg.dur, local / TR, i, live);
      } else drawMedia(ctx, version.slots[i], local, seg.dur, 1, i, live);

      // Memory-driven color treatment
      ctx.save();
      if (visual === 'Warm Cinematic') {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = 'rgba(255,140,60,0.35)';
        ctx.fillRect(0, 0, CW, CH);
      } else if (visual === 'Cool Night Look') {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = 'rgba(40,80,220,0.45)';
        ctx.fillRect(0, 0, CW, CH);
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgba(20,24,60,0.18)';
        ctx.fillRect(0, 0, CW, CH);
      } else if (visual === 'Soft Pastel') {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = 'rgba(255,210,235,0.16)';
        ctx.fillRect(0, 0, CW, CH);
      }
      ctx.restore();
      const vg = ctx.createRadialGradient(CW / 2, CH * 0.46, CH * 0.35, CW / 2, CH * 0.46, CH * 0.8);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, CW, CH);

      // dip transition (standard cuts)
      if (tl.transition === 'dip') {
        const edge = Math.min(local, seg.dur - local);
        if (edge < 0.18 && i > 0) {
          ctx.fillStyle = `rgba(0,0,0,${0.55 * (1 - edge / 0.18)})`;
          ctx.fillRect(0, 0, CW, CH);
        }
      }

      // info label on restaurant segments
      if (overlay !== 'Off' && i >= 1 && i <= 5) {
        const sp = spots[i - 1];
        const label = `${i}/5  ${sp?.name || `第${i}間`}${overlay.startsWith('Name +') && sp?.area ? ` · ${sp.area}` : ''}`;
        ctx.font = '700 32px "PingFang TC", -apple-system, sans-serif';
        const w = Math.min(CW - 80, ctx.measureText(label).width + 44);
        ctx.fillStyle = 'rgba(16,14,30,0.62)';
        ctx.beginPath();
        ctx.roundRect(40, 96, w, 62, 31);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(label, 62, 128, w - 44);
      }

      // captions
      const text = version.captions[i];
      if (captionsOn && text) {
        const a = Math.min(1, local / 0.15, (seg.dur - local) / 0.15);
        ctx.save();
        ctx.globalAlpha = Math.max(0, a);
        ctx.font = captionFont(version.captionStyle);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        const lines = wrap(ctx, text, 600);
        const lh = 60;
        const base = 1060 - (lines.length - 1) * lh;
        lines.forEach((ln, k) => {
          const y = base + k * lh;
          if (version.captionStyle === 'bold-white') {
            ctx.lineWidth = 9;
            ctx.strokeStyle = 'rgba(20,12,6,0.6)';
            ctx.strokeText(ln, CW / 2, y);
            ctx.fillStyle = '#fff';
          } else if (version.captionStyle === 'soft-cream') {
            ctx.shadowColor = 'rgba(0,0,0,0.7)';
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#ffe9c2';
          } else {
            ctx.shadowColor = 'rgba(0,0,0,0.55)';
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#fff';
          }
          ctx.fillText(ln, CW / 2, y);
        });
        ctx.restore();
      }
    },
    [tl, drawMedia, version, visual, overlay, spots, captionsOn],
  );

  /* ---------------- audio + narration */
  const ensureAudio = useCallback(async () => {
    const A = audio.current;
    if (!A.ctx) {
      A.ctx = new AudioContext();
      A.gain = A.ctx.createGain();
      A.gain.connect(A.ctx.destination);
      A.dest = A.ctx.createMediaStreamDestination();
      A.gain.connect(A.dest);
    }
    if (A.ctx.state === 'suspended') await A.ctx.resume();
    const id = version.music;
    if (!A.buffers[id]) {
      const buf = await fetch(MUSIC[id].src).then((r) => r.arrayBuffer());
      A.buffers[id] = await A.ctx.decodeAudioData(buf);
    }
    return A;
  }, [version.music]);

  const stopAudio = () => {
    const A = audio.current;
    try {
      A.src?.stop();
    } catch {
      /* already stopped */
    }
    A.src = null;
    speechTimers.current.forEach((x) => window.clearTimeout(x));
    speechTimers.current = [];
    if (!noSpeech) window.speechSynthesis.cancel();
  };

  const startAudio = useCallback(
    async (from: number, withSpeech: boolean) => {
      stopAudio();
      if (musicOn) {
        const A = await ensureAudio();
        const src = A.ctx!.createBufferSource();
        src.buffer = A.buffers[version.music];
        src.loop = true;
        src.connect(A.gain!);
        A.gain!.gain.value = muted ? 0 : 0.42;
        src.start(0, from % (src.buffer?.duration || 20));
        A.src = src;
      }
      if (withSpeech && !noSpeech && voice !== 'No voiceover' && !muted) {
        const zh = window.speechSynthesis.getVoices().find((v) => /zh[-_]TW/i.test(v.lang)) ?? window.speechSynthesis.getVoices().find((v) => /^zh/i.test(v.lang));
        tl.segs.forEach((s) => {
          if (s.start + 0.2 < from) return;
          speechTimers.current.push(
            window.setTimeout(() => {
              const u = new SpeechSynthesisUtterance(version.captions[s.i].replace(/^\d\.\s*/, '第' + s.i + '間，').replace('｜', '，'));
              u.lang = 'zh-TW';
              if (zh) u.voice = zh;
              u.rate = voice === 'Mandarin, Warm' ? 0.92 : 1.02;
              u.pitch = voice === 'Mandarin, Warm' ? 1.05 : 1;
              window.speechSynthesis.speak(u);
            }, (s.start - from + 0.25) * 1000),
          );
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ensureAudio, musicOn, version.music, version.captions, voice, muted, tl],
  );

  /* ---------------- clock */
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const C = clock.current;
      if (C.playing) {
        C.t = (performance.now() - C.startPerf) / 1000;
        if (C.t >= tl.total) {
          C.t = tl.total - 0.01;
          C.playing = false;
          setPlaying(false);
          stopAudio();
          Object.values(loaded.current).forEach((m) => m?.kind === 'video' && m.el.pause());
        }
        setT(C.t);
      }
      drawFrame(C.t, C.playing);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawFrame, tl.total]);

  useEffect(() => () => stopAudio(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const play = useCallback(async () => {
    const C = clock.current;
    if (C.t >= tl.total - 0.05) C.t = 0;
    C.startPerf = performance.now() - C.t * 1000;
    C.playing = true;
    setPlaying(true);
    setStarted(true);
    await startAudio(C.t, true);
  }, [startAudio, tl.total]);

  const pause = useCallback(() => {
    clock.current.playing = false;
    setPlaying(false);
    stopAudio();
    Object.values(loaded.current).forEach((m) => m?.kind === 'video' && m.el.pause());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seek = useCallback(
    (x: number) => {
      const C = clock.current;
      C.t = Math.max(0, Math.min(tl.total - 0.02, x));
      setT(C.t);
      if (C.playing) {
        C.startPerf = performance.now() - C.t * 1000;
        void startAudio(C.t, true);
      }
    },
    [startAudio, tl.total],
  );

  // restart audio when music/version changes during playback
  useEffect(() => {
    if (clock.current.playing) void startAudio(clock.current.t, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version.music, muted]);

  const exportVideo = useCallback(
    async (onProgress: (sec: number) => void) => {
      const c = canvas.current;
      if (!c || typeof MediaRecorder === 'undefined' || !c.captureStream) return null;
      pause();
      const A = musicOn ? await ensureAudio() : null;
      const stream = c.captureStream(30);
      A?.dest?.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
      const type = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
      const rec = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 5_000_000 } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise<void>((r) => (rec.onstop = () => r()));
      const C = clock.current;
      C.t = 0;
      C.exporting = true;
      rec.start(250);
      C.startPerf = performance.now();
      C.playing = true;
      setPlaying(true);
      await startAudio(0, false); // browser speech can't be recorded — export carries captions + music
      await new Promise<void>((resolve) => {
        const iv = window.setInterval(() => {
          onProgress(Math.min(tl.total, C.t));
          if (!C.playing) {
            window.clearInterval(iv);
            resolve();
          }
        }, 200);
      });
      rec.stop();
      await done;
      C.exporting = false;
      stream.getTracks().forEach((tr) => tr.stop());
      return { blob: new Blob(chunks, { type: type || 'video/webm' }), type: type || 'video/webm' };
    },
    [pause, musicOn, ensureAudio, startAudio, tl.total],
  );

  useImperativeHandle(ref, () => ({ seek, play: () => void play(), pause, exportVideo }), [seek, play, pause, exportVideo]);

  const segNow = tl.segs.findIndex((s) => t >= s.start && t < s.end);

  return (
    <div className={`player ${compact ? 'player--compact' : ''}`}>
      <div className="player__stage" onClick={() => (playing ? pause() : void play())}>
        <canvas ref={canvas} width={CW} height={CH} className="player__canvas" aria-label="Reel preview assembled from your media" />
        {badge && <div className="player__badge">{badge}</div>}
        {!ready && <div className="player__loading">Loading your media…</div>}
        {!playing && ready && (
          <button
            className="player__bigplay"
            aria-label="Play Reel with sound"
            onClick={(e) => {
              e.stopPropagation();
              void play();
            }}
          >
            <Icon name="play" size={30} />
            <span>{started ? 'Resume' : 'Play with sound'}</span>
          </button>
        )}
        {missing.length > 0 && <div className="player__error">{missing.length} file(s) aren’t available on this device — re-import them.</div>}
      </div>
      <div className="player__controls">
        <button className="iconbtn" aria-label={playing ? 'Pause' : 'Play'} onClick={() => (playing ? pause() : void play())}>
          <Icon name={playing ? 'pause' : 'play'} size={16} />
        </button>
        <div className="player__timeline">
          <input type="range" min={0} max={tl.total} step={0.01} value={t} aria-label="Playback position" onChange={(e) => seek(parseFloat(e.target.value))} style={{ ['--pct' as string]: `${(t / tl.total) * 100}%` }} />
          <div className="player__scenes">
            {tl.segs.map((s) => (
              <button
                key={s.i}
                className={`scenetick ${(activeSeg ?? segNow) === s.i ? 'is-on' : ''}`}
                style={{ left: `${(s.start / tl.total) * 100}%`, width: `${(s.dur / tl.total) * 100}%` }}
                onClick={() => {
                  seek(s.start + 0.05);
                  onSeg?.(s.i);
                }}
                aria-label={`Jump to ${s.tag}`}
              >
                {s.i === 0 ? 'H' : s.i === 6 ? 'E' : s.i}
              </button>
            ))}
          </div>
        </div>
        <span className="player__time">{`0:${String(Math.floor(t)).padStart(2, '0')} / 0:${String(Math.round(tl.total)).padStart(2, '0')}`}</span>
        <button className="iconbtn" aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted((m) => !m)}>
          <Icon name={muted ? 'mute' : 'volume'} size={16} />
        </button>
      </div>
      {noSpeech && voice !== 'No voiceover' && <p className="fineprint center">This browser has no built-in voice — captions carry the narration.</p>}
    </div>
  );
});
