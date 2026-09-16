import { PatientProfile, DoseCalculationResult } from '../types';
import { evaluateSafetyEngine } from './safetyEngine';
import { getInsulinProfileById } from '../data/insulinDatabase';

/**
 * Advanced Multi-Factor Scientific Bolus Wizard & Decision Support Algorithm.
 * Incorporates:
 * 1. Target Delta with Bidirectional Adjustment (reduces carb bolus if pre-meal glucose is below target).
 * 2. Scientific IOB Anti-Stacking Allocation (deducts IOB from correction first, then remaining IOB from carbs).
 * 3. Predictive Glucose at Clearance (forecasting glucose drop from active IOB and carbs).
 * 4. Physiological Parameter Cross-Checks (Rule of 1800/1500 for ISF and Rule of 500/450 for ICR).
 * 5. Pharmacokinetic Pre-Bolus Timing Advisory based on formulation onset.
 */

export function calculateDecisionSupportDose(
  currentGlucose: number,
  carbsGrams: number,
  activeIob: number,
  profile: PatientProfile,
  recentBolusMinutesAgo?: number,
  selectedInsulinId?: string,
  slot?: string
): DoseCalculationResult {
  const missingParameters: string[] = [];
  const hypoLimit = profile.hypoLimit || 70;
  const targetGlucose = profile.targetGlucose || 110;
  const isf = profile.insulinSensitivityFactor || 40;
  const icr = profile.insulinToCarbRatio || 10;
  const weightKg = profile.weightKg || 70;
  
  const isHypoAlert = currentGlucose < hypoLimit;
  const isHyperAlert = currentGlucose > (profile.targetRangeMax || 180);
  const safeIob = Math.max(0, activeIob || 0);

  const insulinObj = selectedInsulinId ? getInsulinProfileById(selectedInsulinId) : undefined;
  const category = insulinObj?.category || 'rapid';
  
  // Calculate Base TDD (Rule: Weight * 0.5)
  const baseTdd = Math.round(weightKg * 0.5 * 10) / 10;
  // TODO: Add 3-day pattern logic if fasting avg was available, for now use baseTdd
  const estimatedTdd = baseTdd;
  
  // Try to find a precise regimen dose for this specific slot and insulin
  const regimenDose = (profile.insulinRegimen || []).find(r => r.insulinId === selectedInsulinId && r.slot === slot);
  const preciseAnchorDose = regimenDose ? regimenDose.doseUnits : undefined;
  

  // --- Branch 1: Long-Acting / Ultra-Long (Basal) ---
  if (category === 'long') {
    if (!profile.weightKg && !profile.prescribedBasalDose) missingParameters.push('Weight or Prescribed Basal');
    if (isHypoAlert) return buildHypoResult(currentGlucose, targetGlucose, isf, icr, safeIob, carbsGrams, profile, recentBolusMinutesAgo);
    
    const prescribedBasal = preciseAnchorDose !== undefined ? preciseAnchorDose : (profile.prescribedBasalDose || Math.round(estimatedTdd * 0.5));
    let slidingScaleUnits = 0;
    if (currentGlucose > targetGlucose && preciseAnchorDose !== undefined) {
      slidingScaleUnits = Math.round((currentGlucose - targetGlucose) / isf * 100) / 100;
    } else if (currentGlucose < targetGlucose && preciseAnchorDose !== undefined) {
      slidingScaleUnits = Math.round((currentGlucose - targetGlucose) / isf * 100) / 100;
    }
    const netDose = Math.max(0, prescribedBasal + slidingScaleUnits);
    
    return buildResult({
      currentGlucose, targetGlucose, isf, icr, carbsGrams, safeIob,
      netRecommendedUnits: netDose,
      correctionUnits: slidingScaleUnits > 0 ? slidingScaleUnits : 0,
      negativeCorrectionUnits: slidingScaleUnits < 0 ? slidingScaleUnits : undefined,
      carbCoverageUnits: 0,
      iobDeductionUnits: 0,
      calculationMethod: 'fixed_basal',
      isSlidingScale: slidingScaleUnits !== 0,
      slidingScaleUnits,
      isHypoAlert, isHyperAlert, profile, recentBolusMinutesAgo, insulinObj, estimatedTdd
    });
  }
  
  // --- Branch 2: Pre-Mixed (70/30 or 75/25) ---
  if (category === 'premixed') {
    if (isHypoAlert) return buildHypoResult(currentGlucose, targetGlucose, isf, icr, safeIob, carbsGrams, profile, recentBolusMinutesAgo);
    
    const anchorDose = preciseAnchorDose !== undefined ? preciseAnchorDose : (profile.prescribedBasalDose || Math.round(estimatedTdd * 0.5)); 
    
    let slidingScaleUnits = 0;
    let isSlidingScale = false;
    
    // Dynamic ISF-based correction for Premixed
    if (currentGlucose > targetGlucose) { 
      slidingScaleUnits = (currentGlucose - targetGlucose) / isf; 
      isSlidingScale = true; 
    }
    else if (currentGlucose < targetGlucose && currentGlucose > 0) {
      slidingScaleUnits = (currentGlucose - targetGlucose) / isf;
      isSlidingScale = true;
    }
    
    slidingScaleUnits = Math.round(slidingScaleUnits * 100) / 100;
    
    // IOB Deduction from Correction Only
    const iobDeductedFromCorrection = Math.min(Math.max(0, slidingScaleUnits), safeIob);
    let netCorrection = slidingScaleUnits;
    if (slidingScaleUnits > 0) {
      netCorrection = Math.max(0, slidingScaleUnits - iobDeductedFromCorrection);
    }
    
    const totalIobDeduction = Math.round(iobDeductedFromCorrection * 100) / 100;

    let netDose = Math.max(0, anchorDose + netCorrection);
    if (slidingScaleUnits < 0) {
       netDose = Math.max(0, anchorDose + slidingScaleUnits);
    }
    
    return buildResult({
      currentGlucose, targetGlucose, isf, icr, carbsGrams, safeIob,
      netRecommendedUnits: netDose,
      correctionUnits: slidingScaleUnits > 0 ? slidingScaleUnits : 0,
      negativeCorrectionUnits: slidingScaleUnits < 0 ? slidingScaleUnits : undefined,
      carbCoverageUnits: 0,
      iobDeductionUnits: totalIobDeduction,
      calculationMethod: 'dynamic_premixed',
      isSlidingScale, slidingScaleUnits,
      isHypoAlert, isHyperAlert, profile, recentBolusMinutesAgo, insulinObj, estimatedTdd
    });
  }

  // --- Branch 3: Intermediate (NPH) ---
  if (category === 'intermediate') {
    if (isHypoAlert) return buildHypoResult(currentGlucose, targetGlucose, isf, icr, safeIob, carbsGrams, profile, recentBolusMinutesAgo);
    
    const anchorDose = preciseAnchorDose !== undefined ? preciseAnchorDose : (profile.prescribedBasalDose || Math.round(estimatedTdd * 0.5));
    
    let slidingScaleUnits = 0;
    let isSlidingScale = false;
    if (currentGlucose > targetGlucose && preciseAnchorDose !== undefined) {
      slidingScaleUnits = (currentGlucose - targetGlucose) / isf;
      isSlidingScale = true;
    } else if (currentGlucose < targetGlucose && preciseAnchorDose !== undefined) {
      slidingScaleUnits = (currentGlucose - targetGlucose) / isf;
      isSlidingScale = true;
    }
    slidingScaleUnits = Math.round(slidingScaleUnits * 100) / 100;
    const netDose = Math.max(0, anchorDose + slidingScaleUnits);
    
    return buildResult({
      currentGlucose, targetGlucose, isf, icr, carbsGrams, safeIob,
      netRecommendedUnits: netDose,
      correctionUnits: slidingScaleUnits,
      carbCoverageUnits: 0,
      calculationMethod: 'fixed_intermediate',
      isSlidingScale, slidingScaleUnits,
      isHypoAlert, isHyperAlert, profile, recentBolusMinutesAgo, insulinObj, estimatedTdd
    });
  }

  // --- Branch 4: Rapid / Short-Acting (Dynamic Bolus) ---
  // Requires ISF and ICR
  if (!profile.targetGlucose) missingParameters.push('Target Glucose');
  if (!profile.insulinSensitivityFactor) missingParameters.push('Insulin Sensitivity Factor (ISF)');
  if (!profile.insulinToCarbRatio) missingParameters.push('Insulin-to-Carb Ratio (ICR)');
  
  if (missingParameters.length > 0) {
    return {
      currentGlucose, targetGlucose, excessGlucose: 0, isf, correctionUnits: 0,
      carbsGrams, icr, carbCoverageUnits: 0, grossRequiredUnits: 0, iobDeductionUnits: 0,
      netRecommendedUnits: 0, roundedPenUnits: 0, isHypoAlert, isHyperAlert, safetyPassed: false,
      safetyMessage: `Missing parameters: ${missingParameters.join(', ')}`, missingParameters
    };
  }

  if (isHypoAlert) return buildHypoResult(currentGlucose, targetGlucose, isf, icr, safeIob, carbsGrams, profile, recentBolusMinutesAgo);

  const glucoseDelta = currentGlucose - targetGlucose;
  let correctionUnits = 0;
  let negativeCorrectionUnits = 0;

  if (glucoseDelta > 0) {
    correctionUnits = Math.round((glucoseDelta / isf) * 100) / 100;
  } else if (glucoseDelta < 0 && carbsGrams > 0) {
    negativeCorrectionUnits = Math.round((glucoseDelta / isf) * 100) / 100; 
  }

  const rawCarbCoverage = carbsGrams > 0 ? carbsGrams / icr : 0;
  const carbCoverageUnits = Math.round(rawCarbCoverage * 100) / 100;

  const iobDeductedFromCorrection = Math.min(correctionUnits, safeIob);
  const netCorrection = Math.max(0, correctionUnits - iobDeductedFromCorrection);
  const remainingExcessIob = Math.max(0, safeIob - iobDeductedFromCorrection);
  
  const carbDoseAfterNegativeCorrection = Math.max(0, carbCoverageUnits + negativeCorrectionUnits);
  const iobDeductedFromCarbs = Math.min(carbDoseAfterNegativeCorrection, remainingExcessIob);
  const netCarbCoverage = Math.max(0, carbDoseAfterNegativeCorrection - iobDeductedFromCarbs);
  
  const totalIobDeduction = Math.round((iobDeductedFromCorrection + iobDeductedFromCarbs) * 100) / 100;
  const anchorDose = preciseAnchorDose !== undefined ? preciseAnchorDose : 0;
  const netRecommendedUnits = Math.max(0, Math.round((anchorDose + netCorrection + netCarbCoverage) * 100) / 100);

  return buildResult({
    currentGlucose, targetGlucose, isf, icr, carbsGrams, safeIob,
    netRecommendedUnits,
    correctionUnits,
    negativeCorrectionUnits,
    carbCoverageUnits,
    iobDeductionUnits: totalIobDeduction,
    calculationMethod: 'dynamic',
    isHypoAlert, isHyperAlert, profile, recentBolusMinutesAgo, insulinObj, estimatedTdd
  });
}

function buildHypoResult(cg: number, tg: number, isf: number, icr: number, iob: number, carbs: number, profile: any, recentAgo?: number): DoseCalculationResult {
  const safety = evaluateSafetyEngine(cg, carbs, iob, profile, recentAgo);
  return {
    currentGlucose: cg, targetGlucose: tg, excessGlucose: 0, isf, correctionUnits: 0,
    carbsGrams: carbs, icr, carbCoverageUnits: 0, grossRequiredUnits: 0, iobDeductionUnits: 0,
    netRecommendedUnits: 0, roundedPenUnits: 0, isHypoAlert: true, isHyperAlert: false,
    projectedGlucose: cg, isProjectedHypo: true, projectedBgDrop: Math.round(iob * isf),
    safetyPassed: false, safetyMessage: safety.message + ' ' + (safety.actionRecommendation || ''),
    missingParameters: []
  };
}

function buildResult(args: any): DoseCalculationResult {
  const {
    currentGlucose, targetGlucose, isf, icr, carbsGrams, safeIob,
    netRecommendedUnits, correctionUnits, negativeCorrectionUnits = 0, carbCoverageUnits,
    iobDeductionUnits = 0, calculationMethod, isSlidingScale, slidingScaleUnits,
    isHypoAlert, isHyperAlert, profile, recentBolusMinutesAgo, insulinObj, estimatedTdd
  } = args;

  const excessGlucose = Math.max(0, currentGlucose - targetGlucose);
  const grossRequiredUnits = Math.max(0, Math.round((correctionUnits + carbCoverageUnits + negativeCorrectionUnits) * 100) / 100);
  
  const roundedPenUnits = Math.round(netRecommendedUnits * 2) / 2;
  const roundedWholeUnits = Math.round(netRecommendedUnits);

  const totalIobDrop = Math.round(safeIob * isf);
  const estimatedCarbRise = carbsGrams > 0 ? Math.round(carbCoverageUnits * isf * 0.9) : 0;
  const projectedGlucose = Math.round(currentGlucose - totalIobDrop + estimatedCarbRise);
  const isProjectedHypo = projectedGlucose < (profile.hypoLimit || 70);

  const expectedIsf = Math.round(1800 / estimatedTdd);
  const expectedIcr = Math.round(500 / estimatedTdd);
  let notes;
  if (Math.abs(isf - expectedIsf) > expectedIsf * 0.6) notes = `Configured ISF (${isf}) differs from typical weight-based estimate (~${expectedIsf} mg/dL).`;
  
  let preBolusMinutes = 15;
  let preBolusAdvice = 'Administer 15 minutes before meal.';
  if (insulinObj) {
    if (insulinObj.category === 'regular' || insulinObj.category === 'premixed') { preBolusMinutes = 30; preBolusAdvice = `Administer 30 mins before meal for ${insulinObj.name}.`; }
    else if (insulinObj.category === 'long' || insulinObj.category === 'intermediate') { preBolusMinutes = 0; preBolusAdvice = 'Administer at scheduled consistent time daily.'; }
    else if (insulinObj.onsetMinutes <= 10) { preBolusMinutes = 5; preBolusAdvice = 'Inject 0-5 mins before eating.'; }
  }

  const safety = evaluateSafetyEngine(currentGlucose, carbsGrams, safeIob, profile, recentBolusMinutesAgo, projectedGlucose);

  return {
    currentGlucose, targetGlucose, excessGlucose, isf, correctionUnits,
    negativeCorrectionUnits: negativeCorrectionUnits !== 0 ? negativeCorrectionUnits : undefined,
    carbsGrams, icr, carbCoverageUnits, grossRequiredUnits, iobDeductionUnits,
    netRecommendedUnits, roundedPenUnits, roundedWholeUnits, projectedGlucose, isProjectedHypo,
    projectedBgDrop: totalIobDrop, preBolusMinutes, preBolusAdvice,
    calculationMethod, isSlidingScale, slidingScaleUnits,
    isHypoAlert, isHyperAlert, safetyPassed: safety.safe,
    safetyMessage: safety.message + (safety.actionRecommendation ? ` ${safety.actionRecommendation}` : ''),
    missingParameters: [],
    physiologicalCheck: { estimatedTdd, expectedIsf, expectedIcr, notes }
  };
}

