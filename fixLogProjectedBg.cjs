const fs = require('fs');
let code = fs.readFileSync('src/components/LogAndDoseView.tsx', 'utf8');

const regex = /const adjustedTotalInsulinDrop = Math\.round\(\(currentFinalDose \+ effectiveTotalIob\) \* isf\);/m;

code = code.replace(regex, `const chosenInsulinProfile = getInsulinProfileById(selectedInsulinId);
  let prandialFractionOfCurrentDose = 1;
  if (chosenInsulinProfile) {
    if (chosenInsulinProfile.category === 'long' || chosenInsulinProfile.category === 'intermediate') {
      prandialFractionOfCurrentDose = 0;
    } else if (chosenInsulinProfile.category === 'premixed' && chosenInsulinProfile.biphasicRatio) {
      prandialFractionOfCurrentDose = chosenInsulinProfile.biphasicRatio.rapid;
    }
  }
  const adjustedTotalInsulinDrop = Math.round(((currentFinalDose * prandialFractionOfCurrentDose) + effectiveTotalIob) * isf);`);

fs.writeFileSync('src/components/LogAndDoseView.tsx', code);
