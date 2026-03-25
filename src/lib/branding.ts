/** Public asset path (Vite serves from `public/`) */
export const TEAM_LOGO_PATH = '/Seattle_Torrent_logo.png';

/** Seattle Torrent / hub palette — matches `index.css` @theme */
export const BRAND = {
  teal: [0, 163, 173] as [number, number, number],
  navy: [10, 28, 58] as [number, number, number],
  blue: [29, 79, 145] as [number, number, number],
  coral: [232, 93, 74] as [number, number, number],
  muted: [92, 107, 137] as [number, number, number],
  cream: [244, 241, 234] as [number, number, number],
} as const;

export const BRAND_HEX = {
  teal: '#00A3AD',
  navy: '#0A1C3A',
  blue: '#1D4F91',
  coral: '#E85D4A',
} as const;
