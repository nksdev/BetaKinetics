const fs = require('fs');
let code = fs.readFileSync('src/components/EditParametersModal.tsx', 'utf8');

// Add state for weightGoalRatePercent
code = code.replace(
  "const [weightGoal, setWeightGoal] = useState<'lose' | 'maintain' | 'gain'>(profile.weightGoal || 'maintain');",
  `const [weightGoal, setWeightGoal] = useState<'lose' | 'maintain' | 'gain'>(profile.weightGoal || 'maintain');
  const [weightGoalRatePercent, setWeightGoalRatePercent] = useState<number>(profile.weightGoalRatePercent || 1.0);`
);

// Add to handleSave
code = code.replace(
  "weightGoal,",
  `weightGoal,
      weightGoalRatePercent,`
);

// Add the rate selection UI
const uiToInsert = `
            {weightGoal === 'gain' && (
              <div className="mt-2 p-2 bg-[#f0f9ff] rounded-xl border border-[#bce3ff]">
                <label className="text-[11px] text-[#0b1c30] font-semibold block mb-1">
                  How much do you want to gain per month?
                </label>
                <select 
                  value={weightGoalRatePercent} 
                  onChange={(e) => setWeightGoalRatePercent(Number(e.target.value))}
                  className="w-full h-8 px-2 rounded-lg bg-white border border-[#bce3ff] text-[#0b1c30] text-[11px]"
                >
                  <option value={0.5}>0.5% of body weight (~0.35kg - very slow/lean)</option>
                  <option value={1.0}>1.0% of body weight (~0.7kg - recommended)</option>
                  <option value={1.5}>1.5% of body weight (~1.0kg - moderate)</option>
                  <option value={2.0}>2.0% of body weight (~1.4kg - fast)</option>
                </select>
                <p className="text-[9px] text-[#3d4947] mt-1 leading-tight">
                  For a {weightKg}kg person, {weightGoalRatePercent}% is roughly {(weightKg * (weightGoalRatePercent/100)).toFixed(2)}kg per month. 1-2% is the realistic limit for building muscle without excessive fat gain.
                </p>
              </div>
            )}
`;

code = code.replace(
  /<\/div>\s*<\/div>\s*<\/div>\s*<div className="grid grid-cols-2 gap-2\.5">/,
  `</div>
            </div>
${uiToInsert}
          </div>

          <div className="grid grid-cols-2 gap-2.5">`
);

fs.writeFileSync('src/components/EditParametersModal.tsx', code);
