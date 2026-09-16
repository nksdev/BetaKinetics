const fs = require('fs');
let code = fs.readFileSync('src/services/calculationEngine.ts', 'utf8');

// Branch 1 (long-acting)
const branch1Regex = /const prescribedBasal = preciseAnchorDose !== undefined \? preciseAnchorDose : \(profile\.prescribedBasalDose \|\| Math\.round\(estimatedTdd \* 0\.5\)\);\s*let netDose = prescribedBasal;\s*let slidingScaleUnits = 0;\s*\/\/ Pattern fix \(simplified for single instance\): No dynamic correction for Long-acting/m;

code = code.replace(branch1Regex, `const prescribedBasal = preciseAnchorDose !== undefined ? preciseAnchorDose : (profile.prescribedBasalDose || Math.round(estimatedTdd * 0.5));
    let slidingScaleUnits = 0;
    if (currentGlucose > targetGlucose && preciseAnchorDose !== undefined) {
      slidingScaleUnits = Math.round((currentGlucose - targetGlucose) / isf * 100) / 100;
    } else if (currentGlucose < targetGlucose && preciseAnchorDose !== undefined) {
      slidingScaleUnits = Math.round((currentGlucose - targetGlucose) / isf * 100) / 100;
    }
    const netDose = Math.max(0, prescribedBasal + slidingScaleUnits);`);


// Branch 2 (premixed)
const branch2Regex = /const anchorDose = preciseAnchorDose !== undefined \? preciseAnchorDose : \(profile\.prescribedBasalDose \|\| Math\.round\(estimatedTdd \* 0\.5\)\);\s*let slidingScaleUnits = 0;\s*let isSlidingScale = false;\s*\/\/ Sliding Scale Fix\s*if \(currentGlucose >= 150 && currentGlucose <= 200\) \{ slidingScaleUnits = 2; isSlidingScale = true; \}\s*else if \(currentGlucose >= 201 && currentGlucose <= 250\) \{ slidingScaleUnits = 4; isSlidingScale = true; \}\s*else if \(currentGlucose > 250\) \{ slidingScaleUnits = 6; isSlidingScale = true; \}\s*\/\/ No carb coverage formula for premixed, just base \+ sliding scale\s*const netDose = anchorDose \+ slidingScaleUnits;/m;

code = code.replace(branch2Regex, `const anchorDose = preciseAnchorDose !== undefined ? preciseAnchorDose : (profile.prescribedBasalDose || Math.round(estimatedTdd * 0.5)); 
    
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
    `);

code = code.replace(
    /return buildResult\(\{[\s\S]*?netRecommendedUnits: netDose,[\s\S]*?correctionUnits: slidingScaleUnits,[\s\S]*?carbCoverageUnits: 0,[\s\S]*?calculationMethod: 'fixed_premixed',[\s\S]*?isSlidingScale, slidingScaleUnits,[\s\S]*?isHypoAlert, isHyperAlert, profile, recentBolusMinutesAgo, insulinObj, estimatedTdd\s*\}\);/m,
    `return buildResult({
      currentGlucose, targetGlucose, isf, icr, carbsGrams, safeIob,
      netRecommendedUnits: netDose,
      correctionUnits: slidingScaleUnits > 0 ? slidingScaleUnits : 0,
      negativeCorrectionUnits: slidingScaleUnits < 0 ? slidingScaleUnits : undefined,
      carbCoverageUnits,
      iobDeductionUnits: typeof totalIobDeduction !== 'undefined' ? totalIobDeduction : 0,
      calculationMethod: 'dynamic_premixed',
      isSlidingScale, slidingScaleUnits,
      isHypoAlert, isHyperAlert, profile, recentBolusMinutesAgo, insulinObj, estimatedTdd
    });`
);

// Branch 3 (intermediate)
const branch3Regex = /const anchorDose = preciseAnchorDose !== undefined \? preciseAnchorDose : \(profile\.prescribedBasalDose \|\| Math\.round\(estimatedTdd \* 0\.5\)\);\s*let slidingScaleUnits = 0;\s*let isSlidingScale = false;\s*if \(currentGlucose > 200\) \{ slidingScaleUnits = 2; isSlidingScale = true; \} \/\/ Basic NPH fix\s*const netDose = anchorDose \+ slidingScaleUnits;/m;

code = code.replace(branch3Regex, `const anchorDose = preciseAnchorDose !== undefined ? preciseAnchorDose : (profile.prescribedBasalDose || Math.round(estimatedTdd * 0.5));
    
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
    const netDose = Math.max(0, anchorDose + slidingScaleUnits);`);

// One more issue is that if branch4 (rapid) uses exact anchor doses, it currently ignores preciseAnchorDose!
const branch4Regex = /const netRecommendedUnits = Math\.max\(0, Math\.round\(\(netCorrection \+ netCarbCoverage\) \* 100\) \/ 100\);/m;
code = code.replace(branch4Regex, `const anchorDose = preciseAnchorDose !== undefined ? preciseAnchorDose : 0;
  const netRecommendedUnits = Math.max(0, Math.round((anchorDose + netCorrection + netCarbCoverage) * 100) / 100);`);


fs.writeFileSync('src/services/calculationEngine.ts', code);
