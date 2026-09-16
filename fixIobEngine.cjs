const fs = require('fs');
let code = fs.readFileSync('src/services/iobEngine.ts', 'utf8');

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
      totalIob += Math.max(0, prandialRemaining);
`);

fs.writeFileSync('src/services/iobEngine.ts', code);
