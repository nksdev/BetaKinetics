const fs = require('fs');
let code = fs.readFileSync('src/services/calculationEngine.ts', 'utf8');

// I need to find the start of Branch 3 and insert Branch 2 before it, and also fix Branch 1.

// Let's rewrite the branches up to Branch 4.

const regex = /\/\/ --- Branch 1: Long-Acting \/ Ultra-Long \(Basal\) ---[\s\S]*?\/\/ --- Branch 4: Rapid \/ Short-Acting \(Dynamic Bolus\) ---/m;

const replacement = `// --- Branch 1: Long-Acting / Ultra-Long (Basal) ---
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
    
    // Allow carb coverage if carbs are entered (some advanced users do this with premixed)
    const rawCarbCoverage = carbsGrams > 0 ? carbsGrams / icr : 0;
    const carbCoverageUnits = Math.round(rawCarbCoverage * 100) / 100;
    
    // IOB Deduction
    const iobDeductedFromCorrection = Math.min(Math.max(0, slidingScaleUnits), safeIob);
    let netCorrection = slidingScaleUnits;
    if (slidingScaleUnits > 0) {
      netCorrection = Math.max(0, slidingScaleUnits - iobDeductedFromCorrection);
    }
    const remainingExcessIob = Math.max(0, safeIob - iobDeductedFromCorrection);
    
    const carbDoseAfterNegativeCorrection = Math.max(0, carbCoverageUnits + (netCorrection < 0 ? netCorrection : 0));
    const iobDeductedFromCarbs = Math.min(carbDoseAfterNegativeCorrection, remainingExcessIob);
    const netCarbCoverage = Math.max(0, carbDoseAfterNegativeCorrection - iobDeductedFromCarbs);
    
    const totalIobDeduction = Math.round((iobDeductedFromCorrection + iobDeductedFromCarbs) * 100) / 100;

    let netDose = Math.max(0, anchorDose + (netCorrection > 0 ? netCorrection : slidingScaleUnits) + netCarbCoverage);
    if (slidingScaleUnits < 0 && netCarbCoverage === 0) {
       // if only negative correction, subtract directly from anchor
       netDose = Math.max(0, anchorDose + slidingScaleUnits);
    }
    
    return buildResult({
      currentGlucose, targetGlucose, isf, icr, carbsGrams, safeIob,
      netRecommendedUnits: netDose,
      correctionUnits: slidingScaleUnits > 0 ? slidingScaleUnits : 0,
      negativeCorrectionUnits: slidingScaleUnits < 0 ? slidingScaleUnits : undefined,
      carbCoverageUnits,
      iobDeductionUnits: typeof totalIobDeduction !== 'undefined' ? totalIobDeduction : 0,
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

  // --- Branch 4: Rapid / Short-Acting (Dynamic Bolus) ---`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/services/calculationEngine.ts', code);
