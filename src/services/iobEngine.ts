import { InsulinProfile, InsulinRecord, IobCalculationResult } from '../types';
import { getInsulinProfileById } from '../data/insulinDatabase';

/**
 * Calculates remaining active fraction of insulin at elapsed time `t` (in hours).
 * Uses the evidence-based Mudaliar / Walsh continuous exponential pharmacokinetic model
 * adopted by modern clinical Automated Insulin Delivery (AID) research and open-source closed loops.
 */
export function calculateActiveFraction(
  t: number,
  profile: InsulinProfile,
  diaHours: number
): number {
  if (t <= 0) return 1.0;

  // Biphasic Premixed Formulations (e.g., Mixtard 30: 30% soluble regular, 70% isophane NPH)
  if (profile.category === 'premixed' && profile.biphasicRatio) {
    const rapidDia = 5.5;
    const nphDia = Math.max(16.0, profile.effectiveDurationHours);

    // Rapid soluble prandial fraction
    const rapidFraction = calculateMudaliarExponentialIob(t, profile.peakMinHours || 1.5, rapidDia);
    // Intermediate protamine / NPH fraction (slower absorption peak ~5.5h)
    const nphFraction = calculateMudaliarExponentialIob(t, 5.5, nphDia);

    const active =
      profile.biphasicRatio.rapid * rapidFraction +
      profile.biphasicRatio.intermediate * nphFraction;

    return Math.max(0, Math.min(1.0, active));
  }

  // Long-acting Basal Insulins (e.g., Glargine U-100/U-300, Degludec, Detemir)
  // Characterized by flat, steady zero-order continuous absorption with terminal clearance
  if (profile.category === 'long') {
    const dur = profile.effectiveDurationHours || 24;
    if (t >= dur) return 0;
    // Gradual linear-exponential clearance
    const linearFraction = 1 - t / dur;
    return Math.max(0, Math.min(1.0, linearFraction));
  }

  // Rapid-Acting Analogs, Ultra-Rapid, and Regular Human Insulin
  const effectiveDia = diaHours || profile.effectiveDurationHours || 4.5;
  const peakTime = (profile.peakMinHours + profile.peakMaxHours) / 2 || 1.25;

  return calculateMudaliarExponentialIob(t, peakTime, effectiveDia);
}

/**
 * Mudaliar / Walsh continuous exponential pharmacokinetic model.
 * Derived by integrating the continuous insulin activity curve over elapsed time `t`.
 * 
 * Parameters:
 *   t:  Elapsed time in hours
 *   tp: Peak insulin action time in hours
 *   td: Total duration of insulin action (DIA) in hours
 * 
 * Returns:
 *   Fraction of active insulin remaining in circulation [0.0 - 1.0].
 */
export function calculateMudaliarExponentialIob(t: number, tp: number, td: number): number {
  if (t <= 0) return 1.0;
  if (t >= td) return 0.0;

  // Protect against edge conditions where tp >= td / 2
  const safeTp = Math.min(tp, td * 0.48);

  // Time constant tau
  const tau = (safeTp * (1 - safeTp / td)) / (1 - (2 * safeTp) / td);
  const a = (2 * tau) / td;
  const expTdOverTau = Math.exp(-td / tau);
  const s = 1 / (1 - a + (1 + a) * expTdOverTau);

  const expTOverTau = Math.exp(-t / tau);

  // Analytical integral of Mudaliar activity curve
  // Fraction of insulin absorbed up to time t
  const absorbedFraction =
    s *
    ((1 - tau / td) * (1 - expTOverTau) +
      (t / td) * expTOverTau -
      (t / tau) * expTdOverTau * (1 - t / (2 * td)));

  // Remaining active insulin on board (IOB)
  const remainingFraction = 1.0 - absorbedFraction;

  return Math.max(0, Math.min(1.0, remainingFraction));
}

/**
 * Computes aggregate active IOB given a list of logged insulin events and current timestamp.
 */
export function calculateCurrentIob(
  insulinRecords: InsulinRecord[],
  currentIsoTime: string,
  diaHours: number = 4.5,
  isf?: number
): IobCalculationResult {
  const currentTime = new Date(currentIsoTime).getTime();
  let totalIob = 0;
  let maxRemainingHours = 0;

  const breakdown: IobCalculationResult['breakdown'] = [];

  for (const record of insulinRecords) {
    const recordTime = new Date(record.timestamp).getTime();
    const elapsedHours = (currentTime - recordTime) / (1000 * 60 * 60);

    // Only consider events within the last 24 hours (or 36h for ultra-long basal)
    if (elapsedHours < 0 || elapsedHours > 36) continue;

    const profile = getInsulinProfileById(record.insulinId);
    if (!profile) continue;

    const effectiveDuration =
      profile.category === 'premixed'
        ? 18
        : profile.category === 'long'
        ? profile.effectiveDurationHours || 24
        : diaHours;

    if (elapsedHours >= effectiveDuration) continue;

    const fraction = calculateActiveFraction(elapsedHours, profile, diaHours);
    const remainingUnits = record.doseUnits * fraction;
    if (remainingUnits > 0.01) {
      let prandialRemaining = 0;
      if (profile.category === 'rapid' || profile.category === 'regular' || profile.category === 'short') {
         prandialRemaining = remainingUnits;
      } else if (profile.category === 'premixed' && profile.biphasicRatio) {
         // calculate only the rapid fraction remaining for IOB deduction
         const rapidFraction = calculateMudaliarExponentialIob(elapsedHours, profile.peakMinHours || 1.5, 5.5);
         prandialRemaining = record.doseUnits * profile.biphasicRatio.rapid * rapidFraction;
      }
      
      // We only deduct prandial IOB from future boluses, and only project BG drops from prandial IOB.
      totalIob += Math.max(0, prandialRemaining);


      const remainingHoursForThis = Math.max(0, effectiveDuration - elapsedHours);
      if (remainingHoursForThis > maxRemainingHours) {
        maxRemainingHours = remainingHoursForThis;
      }

      breakdown.push({
        insulinName: profile.name,
        remainingUnits: Math.round(remainingUnits * 100) / 100,
        doseUnits: record.doseUnits,
        hoursAgo: Math.round(elapsedHours * 10) / 10,
        category: profile.category,
        clearanceHoursRemaining: Math.round(remainingHoursForThis * 10) / 10
      });
    }
  }

  const roundedIob = Math.round(totalIob * 100) / 100;

  return {
    totalIob: roundedIob,
    estimatedClearanceHours: Math.round(maxRemainingHours * 10) / 10,
    projectedBgDrop: isf ? Math.round(roundedIob * isf) : undefined,
    breakdown
  };
}

/**
 * Calculates decay, absorption, and active IOB for a single historical dose.
 */
export function calculateSingleDoseIob(
  doseUnits: number,
  insulinId: string,
  elapsedHours: number,
  diaHours?: number
): {
  remainingUnits: number;
  absorbedUnits: number;
  percentRemaining: number;
  percentAbsorbed: number;
  clearanceHoursLeft: number;
  insulinName: string;
  prandialRemainingUnits?: number;
} {
  const profile = getInsulinProfileById(insulinId);
  const name = profile?.name || 'Insulin';

  if (!profile || elapsedHours < 0) {
    return {
      remainingUnits: doseUnits,
      absorbedUnits: 0,
      percentRemaining: 100,
      percentAbsorbed: 0,
      clearanceHoursLeft: diaHours || 4.5,
      insulinName: name
    };
  }

  const effectiveDuration =
    profile.category === 'premixed'
      ? 18
      : profile.category === 'long'
      ? profile.effectiveDurationHours || 24
      : diaHours || profile.effectiveDurationHours || 4.5;

  if (elapsedHours >= effectiveDuration) {
    return {
      remainingUnits: 0,
      absorbedUnits: doseUnits,
      percentRemaining: 0,
      percentAbsorbed: 100,
      clearanceHoursLeft: 0,
      insulinName: name
    };
  }

  const fraction = calculateActiveFraction(elapsedHours, profile, diaHours || effectiveDuration);
  const remainingUnits = Math.max(0, Math.round(doseUnits * fraction * 100) / 100);
  
  let prandialRemaining = 0;
  if (profile.category === 'rapid' || profile.category === 'regular' || profile.category === 'short') {
     prandialRemaining = remainingUnits;
  } else if (profile.category === 'premixed' && profile.biphasicRatio) {
     const rapidFraction = calculateMudaliarExponentialIob(elapsedHours, profile.peakMinHours || 1.5, 5.5);
     prandialRemaining = doseUnits * profile.biphasicRatio.rapid * rapidFraction;
  }
  
  const absorbedUnits = Math.max(0, Math.round((doseUnits - remainingUnits) * 100) / 100);
  const percentRemaining = Math.max(0, Math.min(100, Math.round(fraction * 100)));
  const percentAbsorbed = 100 - percentRemaining;
  const clearanceHoursLeft = Math.max(0, Math.round((effectiveDuration - elapsedHours) * 10) / 10);
  
  return {
    remainingUnits,
    prandialRemainingUnits: Math.max(0, Math.round(prandialRemaining * 100) / 100),
    absorbedUnits,
    percentRemaining,
    percentAbsorbed,
    clearanceHoursLeft,
    insulinName: name
  };
}
