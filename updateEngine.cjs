const fs = require('fs');
let code = fs.readFileSync('src/services/calculationEngine.ts', 'utf8');

code = code.replace(
  /recentBolusMinutesAgo\?: number,\n\s*selectedInsulinId\?: string\n\): DoseCalculationResult/m,
  `recentBolusMinutesAgo?: number,
  selectedInsulinId?: string,
  slot?: string
): DoseCalculationResult`
);

// We need to fetch the regimen dose if available
code = code.replace(
  /const estimatedTdd = baseTdd;/m,
  `const estimatedTdd = baseTdd;
  
  // Try to find a precise regimen dose for this specific slot and insulin
  const regimenDose = (profile.insulinRegimen || []).find(r => r.insulinId === selectedInsulinId && r.slot === slot);
  const preciseAnchorDose = regimenDose ? regimenDose.doseUnits : undefined;
  `
);

// For long, premixed, intermediate - use preciseAnchorDose if available
code = code.replace(
  /const prescribedBasal = profile.prescribedBasalDose \|\| Math.round\(estimatedTdd \* 0.5\);/g,
  `const prescribedBasal = preciseAnchorDose !== undefined ? preciseAnchorDose : (profile.prescribedBasalDose || Math.round(estimatedTdd * 0.5));`
);

code = code.replace(
  /const anchorDose = profile.prescribedBasalDose \|\| Math.round\(estimatedTdd \* 0.5\);/g,
  `const anchorDose = preciseAnchorDose !== undefined ? preciseAnchorDose : (profile.prescribedBasalDose || Math.round(estimatedTdd * 0.5));`
);

fs.writeFileSync('src/services/calculationEngine.ts', code);
