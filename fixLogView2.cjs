const fs = require('fs');
let code = fs.readFileSync('src/components/LogAndDoseView.tsx', 'utf8');

const messageRegex = /<span>No prior unrecorded dose specified\. Using \{baseActiveIob\.toFixed\(2\)\}u IOB from logbook\.<\/span>/m;
code = code.replace(messageRegex, `<span>No prior unrecorded dose specified. Using {baseActiveIob.toFixed(2)}u Bolus IOB from logbook.</span>`);

fs.writeFileSync('src/components/LogAndDoseView.tsx', code);
