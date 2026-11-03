import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { BASE_CUES, MUSIC, ReelVersion, SCENES } from '../state';
import { Icon } from './Icon';

export interface PlayerHandle {
  seek: (t: number) => void;
  play: () => void;
  pause: () => void;
}

interface Props {
  version: ReelVersion;
  voiceVolume?: number;
  musicVolume?: number;
  /** highlight a scene on the timeline */
  activeScene?: number;
  onScene?: (n: number) => void;
  badge?: string;
  compact?: boolean;
}

const DURATION = 20;
const VIDEO = { original: 'media/preview-original.mp4', alt: 'media/preview-alt.mp4' };

/**
 * Plays the prepared Reel: a silent 9:16 visual track, a narration stem and a music stem,
 * kept in sync against the video clock. Captions are drawn live from the version's caption
 * texts so caption edits are visible immediately.
 */
export const ReelPlayer = forwardRef<PlayerHandle, Props>(function ReelPlayer(
  { version, voiceVolume = 1, musicVolume = 0.32, activeScene, onScene, badge, compact },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const voRef = useRef<HTMLAudioElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [muted, setMuted] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [started, setStarted] = useState(false);
  const playingRef = useRef(false);
  const resume = useRef<{ time: number; play: boolean } | null>(null);

  const videoSrc = VIDEO[version.scene2];
  const musicSrc = MUSIC[version.music].src;

  const audios = () => [voRef.current, musicRef.current].filter(Boolean) as HTMLAudioElement[];

  const syncAudio = useCallback((force = false) => {
    const v = videoRef.current;
    if (!v) return;
    for (const a of audios()) {
      if (!a.duration || v.currentTime >= a.duration - 0.05) {
        if (!a.paused) a.pause();
        continue;
      }
      if (force || Math.abs(a.currentTime - v.currentTime) > 0.15) a.currentTime = v.currentTime;
      if (playingRef.current && a.paused) a.play().catch(() => setSoundBlocked(true));
    }
  }, []);

  const pause = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    videoRef.current?.pause();
    audios().forEach((a) => a.pause());
  }, []);

  const play = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.ended || v.currentTime >= DURATION - 0.05) v.currentTime = 0;
    try {
      await v.play();
    } catch {
      setVideoError(true);
      return;
    }
    playingRef.current = true;
    setPlaying(true);
    setStarted(true);
    setSoundBlocked(false);
    for (const a of audios()) {
      a.currentTime = v.currentTime;
      if (a.duration && v.currentTime >= a.duration - 0.05) continue;
      try {
        await a.play();
      } catch {
        setSoundBlocked(true);
      }
    }
  }, []);

  const seek = useCallback(
    (x: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = Math.max(0, Math.min(DURATION - 0.05, x));
      setT(v.currentTime);
      syncAudio(true);
    },
    [syncAudio],
  );

  useImperativeHandle(ref, () => ({ seek, play: () => void play(), pause }), [seek, play, pause]);

  // clock loop
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v) {
        setT(v.currentTime);
        if (playingRef.current) syncAudio();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [syncAudio]);

  // volumes / mute
  useEffect(() => {
    if (voRef.current) voRef.current.volume = muted ? 0 : voiceVolume;
    if (musicRef.current) musicRef.current.volume = muted ? 0 : musicVolume;
  }, [voiceVolume, musicVolume, muted, musicSrc]);

  // when a source changes mid-playback, continue from the same moment
  const onVideoMeta = () => {
    const v = videoRef.current;
    if (!v) return;
    setVideoError(false);
    if (resume.current) {
      v.currentTime = resume.current.time;
      if (resume.current.play) void play();
      resume.current = null;
    }
  };
  const lastVideo = useRef(videoSrc);
  if (lastVideo.current !== videoSrc) {
    lastVideo.current = videoSrc;
    resume.current = { time: videoRef.current?.currentTime ?? 0, play: playingRef.current };
  }
  const onMusicMeta = () => {
    const m = musicRef.current;
    const v = videoRef.current;
    if (!m || !v) return;
    m.volume = muted ? 0 : musicVolume;
    m.currentTime = v.currentTime;
    if (playingRef.current) m.play().catch(() => setSoundBlocked(true));
  };

  const cueIndex = BASE_CUES.findIndex((c) => t >= c.start && t < c.end);
  const caption = cueIndex >= 0 ? version.captions[cueIndex] : '';
  const sceneNow = SCENES.coffee.find((s) => t >= s.start && t < s.end)?.n ?? 4;

  return (
    <div className={`player ${compact ? 'player--compact' : ''}`}>
      <div className="player__stage" onClick={() => (playing ? pause() : void play())}>
        <video
          ref={videoRef}
          src={videoSrc}
          poster="media/scene1.jpg"
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={onVideoMeta}
          onEnded={() => {
            pause();
          }}
          onError={() => setVideoError(true)}
        />
        {caption && (
          <div className={`player__caption player__caption--${version.captionStyle ?? 'bold-white'}`} key={`${cueIndex}-${caption}`}>
            {caption}
          </div>
        )}
        {badge && <div className="player__badge">{badge}</div>}
        {!playing && (
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
        {soundBlocked && playing && (
          <button
            className="player__soundblocked"
            onClick={(e) => {
              e.stopPropagation();
              syncAudio(true);
              audios().forEach((a) => a.play().then(() => setSoundBlocked(false)).catch(() => undefined));
            }}
          >
            <Icon name="volume" size={16} /> Sound was blocked — tap to enable
          </button>
        )}
        {videoError && <div className="player__error">Prepared video couldn’t load. Check that /media files are present.</div>}
      </div>
      <div className="player__controls">
        <button className="iconbtn" aria-label={playing ? 'Pause' : 'Play'} onClick={() => (playing ? pause() : void play())}>
          <Icon name={playing ? 'pause' : 'play'} size={16} />
        </button>
        <div className="player__timeline">
          <input
            type="range"
            min={0}
            max={DURATION}
            step={0.01}
            value={t}
            aria-label="Playback position"
            onChange={(e) => seek(parseFloat(e.target.value))}
            style={{ ['--pct' as string]: `${(t / DURATION) * 100}%` }}
          />
          <div className="player__scenes">
            {SCENES.coffee.map((s) => (
              <button
                key={s.n}
                className={`scenetick ${(activeScene ?? sceneNow) === s.n ? 'is-on' : ''}`}
                style={{ left: `${(s.start / DURATION) * 100}%`, width: `${((s.end - s.start) / DURATION) * 100}%` }}
                onClick={() => {
                  seek(s.start + 0.05);
                  onScene?.(s.n);
                }}
                aria-label={`Jump to scene ${s.n}`}
              >
                {String(s.n).padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>
        <span className="player__time">{`0:${String(Math.floor(t)).padStart(2, '0')} / 0:20`}</span>
        <button className="iconbtn" aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted((m) => !m)}>
          <Icon name={muted ? 'mute' : 'volume'} size={16} />
        </button>
      </div>
      <audio ref={voRef} src="media/voiceover.m4a" preload="auto" />
      <audio ref={musicRef} src={musicSrc} preload="auto" onLoadedMetadata={onMusicMeta} />
    </div>
  );
});
