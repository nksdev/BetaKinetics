const fs = require('fs');
let code = fs.readFileSync('src/components/LogAndDoseView.tsx', 'utf8');

code = code.replace(
  /effectiveRecentBolusMinutesAgo,\n\s*selectedInsulinId\n\s*\);/m,
  `effectiveRecentBolusMinutesAgo,
      selectedInsulinId,
      selectedSlot
    );`
);

fs.writeFileSync('src/components/LogAndDoseView.tsx', code);
