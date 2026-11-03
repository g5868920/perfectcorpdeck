const PATHS: Record<string, string> = {
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
  const filled = name === 'play' || name === 'pause' || name === 'sparkle';
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
