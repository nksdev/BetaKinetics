const fs = require('fs');
let code = fs.readFileSync('src/components/EditParametersModal.tsx', 'utf8');

code = code.replace(
  "weightGoal,",
  "weightGoal,\n      weightGoalRatePercent,"
);

fs.writeFileSync('src/components/EditParametersModal.tsx', code);
