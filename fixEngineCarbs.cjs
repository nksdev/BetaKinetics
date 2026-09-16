const fs = require('fs');
let code = fs.readFileSync('src/services/calculationEngine.ts', 'utf8');

// Replace the premixed branch to remove carb coverage

const premixedRegex = /\/\/ --- Branch 2: Pre-Mixed \(70\/30 or 75\/25\) ---[\s\S]*?\/\/ --- Branch 3: Intermediate \(NPH\) ---/m;

const replacement = `// --- Branch 2: Pre-Mixed (70/30 or 75/25) ---
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

  // --- Branch 3: Intermediate (NPH) ---`;

code = code.replace(premixedRegex, replacement);
fs.writeFileSync('src/services/calculationEngine.ts', code);
