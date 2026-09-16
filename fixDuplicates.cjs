const fs = require('fs');
let code = fs.readFileSync('src/components/EditParametersModal.tsx', 'utf8');

code = code.replace(
  "const [weightGoal,\n      weightGoalRatePercent, setWeightGoal]",
  "const [weightGoal, setWeightGoal]"
);

fs.writeFileSync('src/components/EditParametersModal.tsx', code);
