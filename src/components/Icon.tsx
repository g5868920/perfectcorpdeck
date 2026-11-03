const PATHS: Record<string, string> = {
  compass: 'M12 21a9 9 0 100-18 9 9 0 000 18zM15.5 8.5l-2 5-5 2 2-5 5-2z',
  agentChat: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2h-7l-4 3v-3H6a2 2 0 01-2-2zM9 8.5l.8 1.7 1.7.8-1.7.8L9 13.5l-.8-1.7-1.7-.8 1.7-.8zM15 8l.6 1.2 1.2.6-1.2.6-.6 1.2-.6-1.2-1.2-.6 1.2-.6z',
  grid: 'M4 4h6v6H4zM4 14h6v6H4zM14 14h6v6h-6zM17 3.5l3.5 3.5-3.5 3.5-3.5-3.5z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  menu: 'M4 7h16M8 12h12M12 17h8',
  send: 'M3 11.5L21 4l-7.5 18-2.5-7.5z',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 8.5h.01',
  chevronDown: 'M6 9l6 6 6-6',
  crown: 'M4 18h16l-1.5-9-4.5 4-2-6-2 6-4.5-4z',
  dance: 'M13 3.5a1.5 1.5 0 100 .01M9 21l2-6-2-3 3-4 3 3h3M11 15l3 2v4M6 9l3-1',
  videoEdit: 'M3 8h12v10H3zM15 11l6-3v10l-6-3M7 2.5l.7 1.5 1.3.5-1.3.5L7 6.5l-.7-1.5L5 4.5l1.3-.5z',
  conversation: 'M4 5h10v7H8l-3 3v-3H4zM14 9h6v7h-1v3l-3-3h-4v-2',
  influencer: 'M4 8V5h3M17 5h3v3M20 16v3h-3M7 19H4v-3M12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM7.5 17a4.5 4.5 0 019 0',
  talking: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20a6 6 0 0112 0M17 7a2 2 0 012 2v2a2 2 0 01-4 0V9a2 2 0 012-2zM15 16h4',
  replace: 'M4 4h8v8H4zM14 14l6 6M20 14v6h-6M15 5a4.5 4.5 0 014.5 4.5',
  erase: 'M14 4l6 6-9 9H6l-3-3zM9 9l6 6',
  textVideo: 'M4 6h12v12H4zM16 10l4-2v8l-4-2M7 9h6M10 9v6',
  reel: 'M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM3 8h18M8 3l3 5M14 3l3 5M10 12v5l4-2.5z',
  memory: 'M9 4a3 3 0 00-3 3 3 3 0 00-2 5 3 3 0 002 5 3 3 0 006 0V7a3 3 0 00-3-3zM15 4a3 3 0 013 3 3 3 0 012 5 3 3 0 01-2 5 3 3 0 01-6 0M12 9h2M12 14h3',
  robot: 'M8 9h8a3 3 0 013 3v3a3 3 0 01-3 3H8a3 3 0 01-3-3v-3a3 3 0 013-3zM12 5v4M9.5 13.5h.01M14.5 13.5h.01',
  heartVideo: 'M12 20s-7-4.4-7-9.5A4 4 0 0112 8a4 4 0 017 2.5c0 5.1-7 9.5-7 9.5zM10.5 11v4l3.5-2z',
  hd: 'M4 6h16v12H4zM8 10v4M8 12h3M11 10v4M14 10v4h1.5a2 2 0 000-4z',
  expand: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5M9 9l6 6',
  person: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  sparkle: 'M12 3l1.8 4.6L18.5 9.4l-4.7 1.8L12 16l-1.8-4.8L5.5 9.4l4.7-1.8L12 3zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z',
  film: 'M4 4h16v16H4zM8 4v16M16 4v16M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4',
  hook: 'M7 8h10M7 12h6M5 4h14a2 2 0 012 2v9a2 2 0 01-2 2H9l-4 4V6a2 2 0 012-2z',
  mic: 'M12 3a3 3 0 013 3v6a3 3 0 01-6 0V6a3 3 0 013-3zM5 11a7 7 0 0014 0M12 18v3',
  cc: 'M3 6h18v12H3zM10 10.5a2 2 0 100 3M16 10.5a2 2 0 100 3',
  music: 'M9 18V5l11-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM20 16a3 3 0 11-6 0 3 3 0 016 0z',
  frame: 'M8 3h8a2 2 0 012 2v14a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2z',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
  check: 'M5 12l5 5L20 7',
  x: 'M6 6l12 12M18 6L6 18',
  play: 'M7 4l13 8-13 8z',
  pause: 'M7 4h4v16H7zM13 4h4v16h-4z',
  volume: 'M4 9h4l5-5v16l-5-5H4zM16 8a5 5 0 010 8M19 5a9 9 0 010 14',
  mute: 'M4 9h4l5-5v16l-5-5H4zM17 9l5 6M22 9l-5 6',
  library: 'M4 4h4v16H4zM10 4h4v16h-4zM16 5l4 1-3 14-4-1z',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  arrowLeft: 'M15 5l-7 7 7 7',
  arrowRight: 'M9 5l7 7-7 7',
  upload: 'M12 16V4M7 9l5-5 5 5M4 16v4h16v-4',
  swap: 'M7 7h11l-3-3M17 17H6l3 3',
  info: 'M12 8h.01M11 12h1v5h1M12 21a9 9 0 100-18 9 9 0 000 18z',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  coin: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9 9.5c0-1 1.3-1.8 3-1.8s3 .8 3 1.8-1.3 1.6-3 2-3 1-3 2 1.3 1.8 3 1.8 3-.8 3-1.8M12 6v1.7M12 16.3V18',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  refresh: 'M20 11a8 8 0 10-2.3 5.7M20 4v7h-7',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5',
  bolt: 'M13 3L4 14h7l-1 7 9-11h-7l1-7z',
};

export function Icon({ name, size = 18, stroke = 1.8, className }: { name: keyof typeof PATHS | string; size?: number; stroke?: number; className?: string }) {
  const filled = name === 'play' || name === 'pause' || name === 'sparkle' || name === 'send';
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name] ?? ''} />
    </svg>
  );
}
