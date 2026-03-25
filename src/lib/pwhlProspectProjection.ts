/**
 * Illustrative prospect translation → PWHL points.
 * Calibrate factors with historical PWHL rookie PPG by source league — not a published league model.
 */

export type SourceLeagueId =
  | 'pwhl'
  | 'ncaa_d1'
  | 'usports'
  | 'phf_legacy'
  | 'pwhle_elite'
  | 'u18_u22_ntp'
  | 'euro_pro'
  | 'custom';

export interface SourceLeagueOption {
  id: SourceLeagueId;
  label: string;
  /** Multiplier on source PPG to approximate PWHL equivalency (tunable). */
  ppgToPwhlFactor: number;
  blurb: string;
}

export const SOURCE_LEAGUES: SourceLeagueOption[] = [
  {
    id: 'pwhl',
    label: 'PWHL (same league)',
    ppgToPwhlFactor: 1,
    blurb: 'No translation — already in PWHL sample.',
  },
  {
    id: 'pwhle_elite',
    label: 'PWHLe — elite junior',
    ppgToPwhlFactor: 0.55,
    blurb:
      'Prospect tool: translate PWHLe (elite junior) scoring pace into an illustrative first-PWHL season points total. Factor is a default — tune to your comps.',
  },
  {
    id: 'ncaa_d1',
    label: 'NCAA Division I',
    ppgToPwhlFactor: 0.72,
    blurb: 'Typical step from DI scoring to pro pace; wide by conference.',
  },
  {
    id: 'usports',
    label: 'U Sports (Canada)',
    ppgToPwhlFactor: 0.68,
    blurb: 'Similar use case to NCAA with slightly conservative default.',
  },
  {
    id: 'phf_legacy',
    label: 'PHF / prior NA pro',
    ppgToPwhlFactor: 0.88,
    blurb: 'Closer to PWHL level than college defaults.',
  },
  {
    id: 'u18_u22_ntp',
    label: 'U18 / U22 national team pool',
    ppgToPwhlFactor: 0.5,
    blurb: 'Short tournaments — enter full club season GP + points where possible.',
  },
  {
    id: 'euro_pro',
    label: 'European pro / SDHL etc.',
    ppgToPwhlFactor: 0.78,
    blurb: 'Adjust manually for ice time and league goal rates.',
  },
  {
    id: 'custom',
    label: 'Custom factor',
    ppgToPwhlFactor: 1,
    blurb: 'Set your own multiplier (e.g. from internal comps).',
  },
];

export function projectPwhlPoints(input: {
  points: number;
  gp: number;
  ppgToPwhlFactor: number;
  pwhlScheduleGp?: number;
}): {
  sourcePpg: number;
  pwhlPpg: number;
  projectedPointsPwhlSeason: number;
} {
  const gp = Math.max(0, input.gp);
  const pwhlGp = input.pwhlScheduleGp ?? 30;
  if (gp <= 0 || !Number.isFinite(input.points)) {
    return { sourcePpg: 0, pwhlPpg: 0, projectedPointsPwhlSeason: 0 };
  }
  const sourcePpg = input.points / gp;
  const pwhlPpg = sourcePpg * input.ppgToPwhlFactor;
  const projectedPointsPwhlSeason = pwhlPpg * pwhlGp;
  return {
    sourcePpg,
    pwhlPpg,
    projectedPointsPwhlSeason,
  };
}

/** PWHLe (elite junior) → PWHL points: dedicated path using PPG + position (not raw points/GP). */
const PWHLE_BASE_PPG_FACTOR = 0.55;

export function projectPwhleEliteToPwhl(input: {
  /** Points per game in PWHLe / elite junior (or equivalent junior sample). */
  ppg: number;
  position: 'F' | 'D';
  pwhlScheduleGp?: number;
}): {
  pwhlPpg: number;
  projectedPointsPwhlSeason: number;
  combinedFactor: number;
} {
  const pwhlGp = input.pwhlScheduleGp ?? 30;
  if (!Number.isFinite(input.ppg) || input.ppg < 0) {
    return { pwhlPpg: 0, projectedPointsPwhlSeason: 0, combinedFactor: PWHLE_BASE_PPG_FACTOR };
  }
  /** Light position nudge — D scoring translation often runs below F at same junior PPG. */
  const posAdj = input.position === 'D' ? 0.92 : 1;
  const combinedFactor = PWHLE_BASE_PPG_FACTOR * posAdj;
  const pwhlPpg = input.ppg * combinedFactor;
  return {
    pwhlPpg,
    projectedPointsPwhlSeason: pwhlPpg * pwhlGp,
    combinedFactor,
  };
}
