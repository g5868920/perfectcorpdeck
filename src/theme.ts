/**
 * Single source of visual tokens for the concept demo.
 *
 * v3 values are sampled from the CURRENT YouCam AI Pro iPhone app screenshots in
 * `visual-references/` (Explore, AI Agent, All Tools, AI Video, History, Settings — Nov 2026).
 * They are inferred, not official Perfect Corp design tokens. See YOUCAM_UI_AUDIT.md.
 *
 * Direction (approved by Gina): fully LIGHT app; dark only behind video playback.
 */
export const theme = {
  color: {
    canvas: '#FFFFFF', // app background is white (Explore, AI Agent, AI Video, History)
    surface: '#FFFFFF',
    surfaceAlt: '#F2F2F6', // prompt fields, upload box, chat input bar
    group: '#F5F5FC', // All Tools category cards
    band: '#EBEBF3', // Settings section headers (SUPPORT / PREFERENCES …)
    stage: '#0B0B12', // dark surface — reserved for video playback only
    ink: '#16161F',
    inkSoft: '#4A4A5C',
    inkMute: '#6B6B80', // ≥4.5:1 on white (WCAG AA)
    line: '#E6E6EE',
    primary: '#3E3BD6', // YouCam indigo: active segment, Details button, Sign out, chat agent name
    primaryInk: '#FFFFFF',
    primarySoft: '#ECEDFC', // lavender chips, model selector, inactive segment
    navy: '#20206A', // bottom-nav labels / icons
    violet: '#7B33F0', // text-safe violet
    magenta: '#D24CFF',
    chipDark: '#1C1C28', // active filter chip (AI Templates "Trending", All Tools "AI Video")
    hot: '#EF4444', // HOT badge
    new: '#2FA866', // NEW badge
    discount: '#F59A23', // "-25%" / "25% OFF" tags
    coin: '#F6B92B',
    coinInk: '#7A4B00',
    coinPill: '#EFEFF3',
    success: '#0B7A4E',
    successSoft: '#E4F7EF',
    warn: '#A35400',
    warnSoft: '#FFF3E0',
    danger: '#D93A4A',
    dangerSoft: '#FDECEE',
    proposed: '#7B33F0', // marks proposed (not shipped) UI
    proposedSoft: '#F4EDFF',
  },
  gradient: {
    brand: 'linear-gradient(100deg, #4D5BF2 0%, #6A45F0 55%, #9A4BF5 100%)', // primary CTAs
    generate: 'linear-gradient(90deg, #7B3FF2 0%, #5B8CF5 100%)', // History "Generate"
    subscribe: 'linear-gradient(90deg, #4FA8F7 0%, #3E3BD6 100%)', // AI Agent "Subscribe Now"
    ring: 'linear-gradient(135deg, #7B3FF2, #4FA8F7)', // selected Duration / Resolution border
    icon: 'linear-gradient(160deg, #5A63F0 0%, #3E3BD6 100%)', // Explore round feature icons
    credits: 'linear-gradient(120deg, #EADFFC 0%, #DCE6FD 100%)', // Settings "My Credits" card
    agentSoft: 'linear-gradient(135deg, #EEF1FF 0%, #F3ECFF 60%, #FBEEFF 100%)',
  },
  radius: { xs: '8px', sm: '12px', md: '16px', lg: '20px', pill: '999px' },
  shadow: {
    card: '0 1px 2px rgba(20,20,40,.04), 0 4px 16px rgba(20,20,60,.06)',
    float: '0 8px 30px rgba(30,20,90,.14)',
    glow: '0 0 0 4px rgba(123,51,240,.12)',
  },
  font: {
    family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang TC", "Noto Sans TC", "Helvetica Neue", Arial, sans-serif',
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
