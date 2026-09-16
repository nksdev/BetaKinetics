const fs = require('fs');
let code = fs.readFileSync('src/services/iobEngine.ts', 'utf8');

const regex = /const remainingUnits = Math\.max\(0, Math\.round\(doseUnits \* fraction \* 100\) \/ 100\);\s*const absorbedUnits = Math\.max\(0, Math\.round\(\(doseUnits - remainingUnits\) \* 100\) \/ 100\);\s*const percentRemaining = Math\.max\(0, Math\.min\(100, Math\.round\(fraction \* 100\)\)\);\s*const percentAbsorbed = 100 - percentRemaining;\s*const clearanceHoursLeft = Math\.max\(0, Math\.round\(\(effectiveDuration - elapsedHours\) \* 10\) \/ 10\);\s*return \{\s*remainingUnits,\s*absorbedUnits,\s*percentRemaining,\s*percentAbsorbed,\s*clearanceHoursLeft,\s*insulinName: name\s*\};/m;

code = code.replace(regex, `const remainingUnits = Math.max(0, Math.round(doseUnits * fraction * 100) / 100);
  
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
  };`);

// also add prandialRemainingUnits to the return type
const typeRegex = /percentAbsorbed: number;\s*clearanceHoursLeft: number;\s*insulinName: string;\s*\}/m;
code = code.replace(typeRegex, `percentAbsorbed: number;
  clearanceHoursLeft: number;
  insulinName: string;
  prandialRemainingUnits?: number;
}`);

fs.writeFileSync('src/services/iobEngine.ts', code);
