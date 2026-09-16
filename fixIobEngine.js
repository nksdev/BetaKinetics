const fs = require('fs');
let code = fs.readFileSync('src/services/iobEngine.ts', 'utf8');

code = code.replace(
  /let totalIob = 0;\n\s*let maxRemainingHours = 0;/m,
  `let totalIob = 0; // Will now only track bolus/prandial IOB for correction deduction\n  let maxRemainingHours = 0;`
);

// We need to change the logic inside the loop
const loopRegex = /const remainingUnits = record\.doseUnits \* fraction;\n\s*if \(remainingUnits > 0\.01\) \{\n\s*totalIob \+= remainingUnits;/m;

code = code.replace(loopRegex, `const remainingUnits = record.doseUnits * fraction;
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
      totalIob += prandialRemaining;
`);

fs.writeFileSync('src/services/iobEngine.ts', code);
