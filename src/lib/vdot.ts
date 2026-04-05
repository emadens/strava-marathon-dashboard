/**
 * Jack Daniels / Gilbert VDOT Calculator
 * Based on the oxygen cost equations from "Daniels' Running Formula"
 */

/**
 * VO2 cost of running at velocity v (meters/min)
 */
function vo2AtVelocity(v: number): number {
  return -4.60 + 0.182258 * v + 0.000104 * v * v;
}

/**
 * Fraction of VO2max sustainable for duration t (minutes)
 */
function fractionVO2max(t: number): number {
  return 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
}

/**
 * Calculate VDOT from a race performance
 * @param distanceMeters - race distance in meters
 * @param timeSeconds - finish time in seconds
 */
export function calculateVDOT(distanceMeters: number, timeSeconds: number): number {
  const timeMinutes = timeSeconds / 60;
  const velocity = distanceMeters / timeMinutes; // m/min
  const vo2 = vo2AtVelocity(velocity);
  const fraction = fractionVO2max(timeMinutes);
  return vo2 / fraction;
}

/**
 * Predict race time for a given distance from a VDOT value
 * Uses bisection method to solve for time
 * @param vdot - the VDOT value
 * @param distanceMeters - target race distance in meters
 * @returns predicted time in seconds
 */
export function predictRaceTime(vdot: number, distanceMeters: number): number {
  // Bisection: find time t where calculateVDOT(distance, t) = vdot
  let lo = 60; // 1 minute minimum
  let hi = 60 * 60 * 8; // 8 hours maximum

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const v = calculateVDOT(distanceMeters, mid);
    if (Math.abs(v - vdot) < 0.001) return mid;
    if (v > vdot) hi = mid; // too fast
    else lo = mid; // too slow
  }

  return (lo + hi) / 2;
}

/**
 * Standard race distances
 */
export const RACE_DISTANCES = [
  { name: '5K', meters: 5000 },
  { name: '10K', meters: 10000 },
  { name: 'Mezza Maratona', meters: 21097 },
  { name: 'Maratona', meters: 42195 },
] as const;

/**
 * Training pace zones derived from VDOT
 * Returns paces in seconds per km
 */
export function trainingPaces(vdot: number) {
  // Easy: 59-74% of VDOT -> solve for corresponding paces
  // These are approximations based on Daniels' tables
  const easy = predictPaceFromVDOT(vdot, 0.65);
  const marathon = predictPaceFromVDOT(vdot, 0.79);
  const tempo = predictPaceFromVDOT(vdot, 0.86);
  const interval = predictPaceFromVDOT(vdot, 0.975);
  const repetition = predictPaceFromVDOT(vdot, 1.10);

  return {
    easy: { min: easy * 1.05, max: easy * 0.95, label: 'Easy' },
    marathon: { min: marathon * 1.02, max: marathon * 0.98, label: 'Maratona' },
    tempo: { min: tempo * 1.02, max: tempo * 0.98, label: 'Tempo' },
    interval: { min: interval * 1.02, max: interval * 0.98, label: 'Intervalli' },
    repetition: { min: repetition * 1.02, max: repetition * 0.98, label: 'Ripetute' },
  };
}

/**
 * Helper: predict pace (s/km) at a given %VDOT intensity
 */
function predictPaceFromVDOT(vdot: number, intensity: number): number {
  const targetVO2 = vdot * intensity;
  // Solve vo2AtVelocity(v) = targetVO2 for v
  // -4.60 + 0.182258*v + 0.000104*v^2 = targetVO2
  // Quadratic: 0.000104*v^2 + 0.182258*v + (-4.60 - targetVO2) = 0
  const a = 0.000104;
  const b = 0.182258;
  const c = -4.60 - targetVO2;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return 0;
  const v = (-b + Math.sqrt(discriminant)) / (2 * a); // m/min
  return 1000 / v * 60; // s/km
}

/**
 * Combine VDOT from performance with VO2 max from Apple Watch
 * @param vdotFromPerformance - VDOT calculated from race/best effort
 * @param vo2maxAppleWatch - VO2 max value from Apple Watch (ml/kg/min)
 * @returns blended estimate
 */
export function blendedVDOT(vdotFromPerformance: number, vo2maxAppleWatch?: number | null): number {
  if (!vo2maxAppleWatch) return vdotFromPerformance;
  // Apple Watch VO2 max is roughly equivalent to VDOT for well-trained runners
  // but can differ. Blend with 60% weight on performance, 40% on measured VO2
  return vdotFromPerformance * 0.6 + vo2maxAppleWatch * 0.4;
}
