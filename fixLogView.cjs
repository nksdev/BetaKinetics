const fs = require('fs');
let code = fs.readFileSync('src/components/LogAndDoseView.tsx', 'utf8');

const regex = /const effectiveTotalIob = includePriorDose\s*\?\s*Math\.round\(\(baseActiveIob \+ priorDoseDecay\.remainingUnits\) \* 100\) \/ 100\s*:\s*baseActiveIob;/m;

code = code.replace(regex, `const effectiveTotalIob = includePriorDose
    ? Math.round((baseActiveIob + (priorDoseDecay.prandialRemainingUnits || 0)) * 100) / 100
    : baseActiveIob;`);
    
// wait, does baseActiveIob correctly contain only prandial remaining?
// let's check baseIobResult.totalIob ... yes, the previous fix changed totalIob to only accumulate prandial Remaining!

fs.writeFileSync('src/components/LogAndDoseView.tsx', code);
