const fs = require('fs');
let code = fs.readFileSync('src/components/MealPlannerView.tsx', 'utf8');

const tdeeRegex = /\/\/ Target TDEE[\s\S]*?\}, \[bmr, profile\.weightGoal\]\);/m;

const tdeeReplacement = `// Target TDEE and Macros
  const { targetCalories, macros, tdee, dailyAdjustment } = useMemo(() => {
    const maintenanceTdee = Math.round(bmr * 1.2); // Sedentary multiplier
    let adjustment = 0;
    
    // Default rate is 1% per month if not set
    const ratePercent = profile.weightGoalRatePercent || 1.0; 
    
    // 7700 kcal per 1kg of body mass change
    // Monthly change in kg = weightKg * (ratePercent / 100)
    // Daily kcal change = (Monthly change / 30 days) * 7700
    const dailyKcalChange = Math.round(((profile.weightKg * (ratePercent / 100)) / 30) * 7700);

    if (profile.weightGoal === 'lose') {
      adjustment = -dailyKcalChange;
    } else if (profile.weightGoal === 'gain') {
      adjustment = dailyKcalChange;
    }
    
    // Ensure we don't drop below a dangerous threshold (e.g., 1200 kcal)
    let finalCals = Math.max(1200, maintenanceTdee + adjustment);
    
    // Calculate Macros
    // Protein: 2.0g per kg of body weight for muscle maintenance/growth
    const proteinGrams = Math.round(profile.weightKg * 2.0);
    const proteinCals = proteinGrams * 4;
    
    // Fat: 25% of total calories
    const fatCals = finalCals * 0.25;
    const fatGrams = Math.round(fatCals / 9);
    
    // Carbs: The remainder
    const remainingCals = finalCals - proteinCals - fatCals;
    const carbsGrams = Math.max(0, Math.round(remainingCals / 4)); // Prevent negative carbs

    return {
      targetCalories: finalCals,
      tdee: maintenanceTdee,
      dailyAdjustment: adjustment,
      macros: {
        protein: proteinGrams,
        carbs: carbsGrams,
        fat: fatGrams
      }
    };
  }, [bmr, profile.weightGoal, profile.weightGoalRatePercent, profile.weightKg]);`;

code = code.replace(tdeeRegex, tdeeReplacement);

const headerRegex = /<div className="mt-4 grid grid-cols-2 gap-3">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/m;
const headerReplacement = `<div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-2xl p-3 border border-white/20">
            <span className="text-[11px] text-white/70 font-semibold block">Target Daily Calories</span>
            <div className="flex items-end gap-1 mt-1">
              <span className="text-[24px] font-bold leading-none">{targetCalories}</span>
              <span className="text-[12px] text-white/80 pb-0.5">kcal</span>
            </div>
            {dailyAdjustment !== 0 && (
              <span className="text-[10px] text-white/60 block mt-1">
                ({dailyAdjustment > 0 ? '+' : ''}{dailyAdjustment} kcal from TDEE)
              </span>
            )}
          </div>
          <div className="bg-white/10 rounded-2xl p-3 border border-white/20 relative overflow-hidden">
            <span className="text-[11px] text-white/70 font-semibold block">Est. BMR / TDEE</span>
            <div className="flex items-end gap-1 mt-1">
              <span className="text-[20px] font-bold leading-none">{bmr}</span>
              <span className="text-[12px] text-white/80 pb-0.5">/ {tdee}</span>
            </div>
            {(!profile.heightCm || !profile.age) && (
               <button onClick={onOpenParameterModal} className="absolute inset-0 bg-[#004d46]/90 flex items-center justify-center text-[10px] font-bold underline">
                 Add Age/Height
               </button>
            )}
          </div>
        </div>

        <div className="mt-3 bg-white/10 rounded-2xl p-3 border border-white/20">
          <span className="text-[11px] text-white/70 font-semibold block mb-2">Daily Macronutrient Targets</span>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-[10px] text-white/60 block uppercase tracking-wider font-bold">Protein</span>
              <span className="text-[16px] font-bold">{macros.protein}g</span>
            </div>
            <div>
              <span className="text-[10px] text-white/60 block uppercase tracking-wider font-bold">Carbs</span>
              <span className="text-[16px] font-bold">{macros.carbs}g</span>
            </div>
            <div>
              <span className="text-[10px] text-white/60 block uppercase tracking-wider font-bold">Fat</span>
              <span className="text-[16px] font-bold">{macros.fat}g</span>
            </div>
          </div>
        </div>
      </div>`;

code = code.replace(headerRegex, headerReplacement);

const infoRegex = /Calories are adjusted for your '\{profile\.weightGoal \|\| 'maintain'\}' goal \(\±500 kcal from maintenance\)\. For precise macronutrient ratios, please consult a registered dietitian\./;
const infoReplacement = "Calories are mathematically adjusted for your '{profile.weightGoal || 'maintain'}' goal targeting a {profile.weightGoalRatePercent || 1.0}% body weight change per month ({dailyAdjustment > 0 ? '+' : ''}{dailyAdjustment} kcal). Protein is locked to 2.0g/kg to support muscle retention/growth.";

code = code.replace(infoRegex, infoReplacement);

fs.writeFileSync('src/components/MealPlannerView.tsx', code);
