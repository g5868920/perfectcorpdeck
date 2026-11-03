/**
 * Single source of visual tokens for the concept demo.
 * Values are INFERRED from public YouCam AI Pro store screenshots (v1.32.1, Oct 2026) —
 * they are not official Perfect Corp design tokens. See YOUCAM_UI_AUDIT.md.
 *
 * Direction (approved by Gina, 2026-11-04): fully LIGHT app canvas; dark only behind video playback.
 */
export const theme = {
  color: {
    canvas: '#F5F5FA', // light page background behind cards
    surface: '#FFFFFF',
    surfaceAlt: '#F1F1F6', // input fields, inactive chips
    stage: '#0B0B12', // dark surface — reserved for video playback only (S4/S5 player)
    ink: '#14141F',
    inkSoft: '#4A4A5C',
    inkMute: '#6B6B80', // ≥4.5:1 on canvas (WCAG AA)
    line: '#E5E5EE',
    primary: '#4A3AFF', // indigo-blue primary (chat bubble / active tab family)
    primaryInk: '#FFFFFF',
    primarySoft: '#EEEDFF', // pale lavender active-tab pill
    violet: '#7B33F0', // text-safe violet (≥5:1 on lavender)
    magenta: '#D24CFF',
    coin: '#F6B92B',
    coinInk: '#7A4B00',
    success: '#0B7A4E',
    successSoft: '#E4F7EF',
    warn: '#A35400',
    warnSoft: '#FFF3E0',
    danger: '#D93A4A',
    dangerSoft: '#FDECEE',
  },
  gradient: {
    brand: 'linear-gradient(135deg, #2F6BFF 0%, #6A3BFF 50%, #C44DFF 100%)',
    ring: 'linear-gradient(135deg, #3A7BFF, #8B3DFF 55%, #E04DD8)',
    agentSoft: 'linear-gradient(135deg, #EEF2FF 0%, #F3ECFF 60%, #FCEEFF 100%)',
  },
  radius: { xs: '8px', sm: '12px', md: '16px', lg: '20px', pill: '999px' },
  shadow: {
    card: '0 1px 2px rgba(20,20,40,.04), 0 4px 16px rgba(20,20,60,.06)',
    float: '0 8px 30px rgba(30,20,90,.14)',
    glow: '0 0 0 4px rgba(139,61,255,.14)',
  },
  font: {
    family:
      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang TC", "Noto Sans TC", "Helvetica Neue", Arial, sans-serif',
  },
  /** Base app frame for desktop projection & screenshot capture (iPhone 14/15-class logical size). */
  frame: { width: 393, height: 852 },
} as const;

/** Writes tokens onto :root as CSS custom properties, so styles.css only references variables. */
export function applyTheme() {
  const r = document.documentElement.style;
  for (const [k, v] of Object.entries(theme.color)) r.setProperty(`--c-${k}`, v);
  for (const [k, v] of Object.entries(theme.gradient)) r.setProperty(`--g-${k}`, v);
  for (const [k, v] of Object.entries(theme.radius)) r.setProperty(`--r-${k}`, v);
  for (const [k, v] of Object.entries(theme.shadow)) r.setProperty(`--s-${k}`, v);
  r.setProperty('--font', theme.font.family);
  r.setProperty('--frame-w', `${theme.frame.width}px`);
  r.setProperty('--frame-h', `${theme.frame.height}px`);
}
