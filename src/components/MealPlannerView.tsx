import React, { useMemo } from 'react';
import { PatientProfile } from '../types';

interface MealPlannerViewProps {
  profile: PatientProfile;
  onOpenParameterModal: () => void;
}

export const MealPlannerView: React.FC<MealPlannerViewProps> = ({ profile, onOpenParameterModal }) => {
  // Calculate BMR
  const bmr = useMemo(() => {
    if (profile.heightCm && profile.age) {
      // Mifflin-St Jeor
      let base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
      // Default to male if not specified for a generic estimate, or use female modifier
      base += (profile.gender === 'female' ? -161 : 5);
      return Math.round(base);
    }
    // Fallback simple multiplier
    return Math.round(profile.weightKg * 24);
  }, [profile.weightKg, profile.heightCm, profile.age, profile.gender]);

  // Target TDEE and Macros
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
  }, [bmr, profile.weightGoal, profile.weightGoalRatePercent, profile.weightKg]);

  const meals = [
    { name: 'Breakfast', percent: 0.25, time: '08:00 AM', icon: 'bakery_dining', focus: 'Balanced start' },
    { name: 'Fruit Timing', percent: 0.10, time: '11:00 AM', icon: 'nutrition', focus: 'Vitamins & Fiber' },
    { name: 'Lunch', percent: 0.25, time: '01:00 PM', icon: 'lunch_dining', focus: 'Energy sustain' },
    { name: 'Evening Snacks', percent: 0.10, time: '04:30 PM', icon: 'tapas', focus: 'Light energy' },
    { name: 'Dinner', percent: 0.20, time: '08:00 PM', icon: 'restaurant', focus: 'Light & Digestible' },
    { name: 'After Dinner', percent: 0.10, time: '10:00 PM', icon: 'nightlight', focus: 'Protein/Fat stable' },
  ];

  return (
    <div className="p-4 space-y-4 pb-24 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-[#00685f] to-[#004d46] text-white p-5 rounded-3xl shadow-md">
        <h2 className="text-[18px] font-bold font-['Plus_Jakarta_Sans',sans-serif] mb-1">
          Automated Meal Plan
        </h2>
        <p className="text-[13px] text-white/80 leading-snug">
          Algorithmically generated 6-meal split based on your physiology and {profile.weightGoal || 'maintain'} goal.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
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
      </div>

      <div className="space-y-3">
        <h3 className="text-[15px] font-bold text-[#0b1c30] px-1">Daily Breakdown (6 Meals)</h3>
        {meals.map((meal, idx) => {
          const cals = Math.round(targetCalories * meal.percent);
          return (
            <div key={idx} className="bg-white p-3.5 rounded-2xl border border-[#e5eeff] shadow-xs flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#00685f]">
                <span className="material-symbols-outlined">{meal.icon}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[14px] text-[#0b1c30]">{meal.name}</span>
                  <span className="text-[11px] font-bold text-[#00685f] bg-[#00685f]/10 px-2 py-0.5 rounded-md">
                    {cals} kcal
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-[#3d4947] font-medium">{meal.time}</span>
                  <span className="text-[10px] text-[#3d4947]">{Math.round(meal.percent * 100)}% • {meal.focus}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="p-3 bg-[#fff8e6] rounded-2xl border border-[#ffe099] flex items-start gap-2">
        <span className="material-symbols-outlined text-[#b37700] text-[18px]">info</span>
        <p className="text-[11px] text-[#805500] font-medium leading-snug">
          Calories are mathematically adjusted for your '{profile.weightGoal || 'maintain'}' goal targeting a {profile.weightGoalRatePercent || 1.0}% body weight change per month ({dailyAdjustment > 0 ? '+' : ''}{dailyAdjustment} kcal). Protein is locked to 2.0g/kg to support muscle retention/growth.
        </p>
      </div>
    </div>
  );
};
