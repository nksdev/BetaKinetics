const fs = require('fs');
let code = fs.readFileSync('src/components/LogAndDoseView.tsx', 'utf8');

const regex = /const adjustedTotalInsulinDrop = Math\.round\(\(\(currentFinalDose \* prandialFractionOfCurrentDose\) \+ effectiveTotalIob\) \* isf\);\s*const adjustedProjectedBg = Math\.round\(currentGlucose \+ estimatedCarbRise - adjustedTotalInsulinDrop\);/m;

code = code.replace(regex, `const adjustedTotalInsulinDrop = Math.round(((currentFinalDose * prandialFractionOfCurrentDose) + effectiveTotalIob) * isf);
  // If user didn't enter glucose, we project based on their target glucose (or don't show the warning)
  const baseForProjection = currentGlucose > 0 ? currentGlucose : (profile.targetGlucose || 110);
  const adjustedProjectedBg = Math.round(baseForProjection + estimatedCarbRise - adjustedTotalInsulinDrop);`);

fs.writeFileSync('src/components/LogAndDoseView.tsx', code);
