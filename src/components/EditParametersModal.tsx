import React, { useState, useEffect } from 'react';
import { PatientProfile, InsulinScheduleItem } from '../types';
import {
  INSULIN_DATABASE,
  getInsulinProfileById,
  getRecommendedDiaForInsulin,
  TIMING_SLOT_OPTIONS,
  getDefaultSchedulesForInsulins
} from '../data/insulinDatabase';

interface EditParametersModalProps {
  profile: PatientProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: PatientProfile) => void;
}

export const EditParametersModal: React.FC<EditParametersModalProps> = ({
  profile,
  isOpen,
  onClose,
  onSave
}) => {
  const [targetGlucose, setTargetGlucose] = useState(profile.targetGlucose || 110);
  const [targetMin, setTargetMin] = useState(profile.targetRangeMin || 70);
  const [targetMax, setTargetMax] = useState(profile.targetRangeMax || 180);
  const [isf, setIsf] = useState(profile.insulinSensitivityFactor || 40);
  const [icr, setIcr] = useState(profile.insulinToCarbRatio || 10);
  const [prescribedBasal, setPrescribedBasal] = useState(profile.prescribedBasalDose || 0);
  const [defaultDeliveryDevice, setDefaultDeliveryDevice] = useState(profile.defaultDeliveryDevice || 'pen_whole');
  const [autoDia, setAutoDia] = useState<boolean>(profile.autoDiaEnabled !== false);
  const [dia, setDia] = useState(profile.activeDurationHours || 6.0);
  const [hypoLimit, setHypoLimit] = useState(profile.hypoLimit || 70);
  const [personalNotes, setPersonalNotes] = useState(profile.personalNotes || 'Personal Protocol');

  // Physiology
  const [weightKg, setWeightKg] = useState(profile.weightKg || 70);
  const [heightCm, setHeightCm] = useState(profile.heightCm || 170);
  const [weightGoal,
setWeightGoal] = useState<'lose' | 'maintain' | 'gain'>(profile.weightGoal || 'maintain');
  const [weightGoalRatePercent, setWeightGoalRatePercent] = useState<number>(profile.weightGoalRatePercent || 1.0);

  const [activeInsulinIds, setActiveInsulinIds] = useState<string[]>(
    profile.activeInsulinIds && profile.activeInsulinIds.length > 0
      ? profile.activeInsulinIds
      : ['actrapid', 'mixtard_30']
  );

  const [schedules, setSchedules] = useState<InsulinScheduleItem[]>(() => {
    if (profile.insulinSchedules && profile.insulinSchedules.length > 0) {
      return profile.insulinSchedules;
    }
    const initialIds = profile.activeInsulinIds && profile.activeInsulinIds.length > 0
      ? profile.activeInsulinIds
      : ['actrapid', 'mixtard_30'];
    return getDefaultSchedulesForInsulins(initialIds);
  });

  const [insulinRegimen, setInsulinRegimen] = useState<any[]>(profile.insulinRegimen || []);

  useEffect(() => {
    if (autoDia && activeInsulinIds.length > 0) {
      const primary = activeInsulinIds[0];
      const recommended = getRecommendedDiaForInsulin(primary);
      setDia(recommended);
    }
  }, [autoDia, activeInsulinIds]);

  if (!isOpen) return null;

  const handleToggleSlotForInsulin = (insulinId: string, slotId: string) => {
    setSchedules(prev => {
      const existing = prev.find(s => s.insulinId === insulinId);
      if (!existing) {
        return [...prev, { insulinId, slots: [slotId] }];
      }
      const hasSlot = existing.slots.includes(slotId);
      const updatedSlots = hasSlot
        ? existing.slots.filter(s => s !== slotId)
        : [...existing.slots, slotId];
      return prev.map(s => (s.insulinId === insulinId ? { ...s, slots: updatedSlots } : s));
    });

    setInsulinRegimen(prev => {
      const existing = prev.find(r => r.insulinId === insulinId && r.slot === slotId);
      if (existing) {
        return prev.filter(r => r.id !== existing.id);
      } else {
        return [...prev, { id: `${insulinId}_${slotId}`, insulinId, slot: slotId as any, doseUnits: 0 }];
      }
    });
  };

  const handleUpdateRegimenDose = (insulinId: string, slotId: string, dose: number) => {
    setInsulinRegimen(prev => {
      const existing = prev.find(r => r.insulinId === insulinId && r.slot === slotId);
      if (existing) {
        return prev.map(r => r.insulinId === insulinId && r.slot === slotId ? { ...r, doseUnits: dose } : r);
      } else {
        return [...prev, { id: `${insulinId}_${slotId}`, insulinId, slot: slotId as any, doseUnits: dose }];
      }
    });
  };

  const handleToggleInsulinInRegimen = (id: string) => {
    let nextIds: string[];
    if (activeInsulinIds.includes(id)) {
      if (activeInsulinIds.length === 1) return;
      nextIds = activeInsulinIds.filter(i => i !== id);
    } else {
      nextIds = [...activeInsulinIds, id];
    }
    setActiveInsulinIds(nextIds);

    setSchedules(prev => {
      const remaining = prev.filter(s => nextIds.includes(s.insulinId));
      for (const nid of nextIds) {
        if (!remaining.some(s => s.insulinId === nid)) {
          const defaults = getDefaultSchedulesForInsulins([nid])[0];
          remaining.push(defaults);
        }
      }
      return remaining;
    });

    if (autoDia && nextIds.length > 0) {
      setDia(getRecommendedDiaForInsulin(nextIds[0]));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...profile,
      targetGlucose,
      targetRangeMin: targetMin,
      targetRangeMax: targetMax,
      insulinSensitivityFactor: isf,
      insulinToCarbRatio: icr,
      prescribedBasalDose: prescribedBasal,
      defaultDeliveryDevice,
      activeDurationHours: dia,
      autoDiaEnabled: autoDia,
      hypoLimit,
      personalNotes,
      weightKg,
      heightCm,
      weightGoal,
      weightGoalRatePercent,
      activeInsulinIds,
      insulinSchedules: schedules,
      insulinRegimen
    });
    onClose();
  };

  const primaryInsulin = getInsulinProfileById(activeInsulinIds[0] || 'actrapid');

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        <div className="p-4 bg-[#eff4ff] border-b border-[#e5eeff] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00685f] text-[22px]">tune</span>
            <div>
              <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[16px] text-[#0b1c30]">
                Treatment Parameters &amp; Insulin Timings
              </h3>
              <span className="text-[11px] text-[#3d4947] block">
                Target BG, ISF, ICR, Auto DIA &amp; Meal Routines
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white text-[#3d4947] hover:bg-[#e5eeff] flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4">
          <div className="p-3.5 bg-[#eff4ff] rounded-2xl border border-[#dce9ff]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] text-[#0b1c30] font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-[#006947]">my_location</span>
                Target Blood Glucose (mg/dL)
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#006947]/10 text-[#006947] font-bold">
                Recommended: 110
              </span>
            </div>
            <input
              type="number"
              value={targetGlucose}
              onChange={(e) => setTargetGlucose(Number(e.target.value))}
              min={70}
              max={180}
              required
              className="w-full h-11 px-3 rounded-xl bg-white border border-[#c0c1ff]/50 text-[#0b1c30] text-[15px] font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-[#eff4ff] rounded-2xl border border-[#dce9ff]">
              <label className="text-[11px] text-[#3d4947] font-semibold block mb-1">
                Target Min (mg/dL)
              </label>
              <input
                type="number"
                value={targetMin}
                onChange={(e) => setTargetMin(Number(e.target.value))}
                min={60}
                max={100}
                required
                className="w-full h-10 px-3 rounded-xl bg-white border border-[#e5eeff] text-[#0b1c30] text-[13px] font-semibold"
              />
            </div>
            <div className="p-3 bg-[#eff4ff] rounded-2xl border border-[#dce9ff]">
              <label className="text-[11px] text-[#3d4947] font-semibold block mb-1">
                Target Max (mg/dL)
              </label>
              <input
                type="number"
                value={targetMax}
                onChange={(e) => setTargetMax(Number(e.target.value))}
                min={120}
                max={220}
                required
                className="w-full h-10 px-3 rounded-xl bg-white border border-[#e5eeff] text-[#0b1c30] text-[13px] font-semibold"
              />
            </div>
          </div>

          <div className="p-3.5 bg-[#eff4ff] rounded-2xl border border-[#dce9ff]">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="material-symbols-outlined text-[17px] text-[#4648d4]">accessibility_new</span>
              <span className="text-[12px] text-[#0b1c30] font-bold">Body Physiology &amp; Goal</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2.5 mb-2.5">
              <div>
                <label className="text-[11px] text-[#3d4947] font-semibold block mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  min={20}
                  max={300}
                  step="0.5"
                  required
                  className="w-full h-10 px-3 rounded-xl bg-white border border-[#e5eeff] text-[#0b1c30] text-[13px] font-semibold"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#3d4947] font-semibold block mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  min={50}
                  max={250}
                  required
                  className="w-full h-10 px-3 rounded-xl bg-white border border-[#e5eeff] text-[#0b1c30] text-[13px] font-semibold"
                />
              </div>
            </div>
            
            <div>
              <label className="text-[11px] text-[#3d4947] font-semibold block mb-1">
                Weight Goal
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setWeightGoal('lose')}
                  className={`py-1.5 rounded-lg text-[11px] font-bold border ${
                    weightGoal === 'lose' ? 'bg-[#4648d4] text-white border-[#4648d4]' : 'bg-white text-[#3d4947] border-[#e5eeff] hover:bg-[#dce9ff]'
                  }`}
                >
                  Lose
                </button>
                <button
                  type="button"
                  onClick={() => setWeightGoal('maintain')}
                  className={`py-1.5 rounded-lg text-[11px] font-bold border ${
                    weightGoal === 'maintain' ? 'bg-[#4648d4] text-white border-[#4648d4]' : 'bg-white text-[#3d4947] border-[#e5eeff] hover:bg-[#dce9ff]'
                  }`}
                >
                  Maintain
                </button>
                <button
                  type="button"
                  onClick={() => setWeightGoal('gain')}
                  className={`py-1.5 rounded-lg text-[11px] font-bold border ${
                    weightGoal === 'gain' ? 'bg-[#4648d4] text-white border-[#4648d4]' : 'bg-white text-[#3d4947] border-[#e5eeff] hover:bg-[#dce9ff]'
                  }`}
                >
                  Gain
                </button>
              </div>
            </div>

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

          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-[#eff4ff] rounded-2xl border border-[#dce9ff]">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-[#3d4947] font-semibold block">
                  ISF (1u : mg/dL)
                </label>
                <span className="text-[10px] text-[#00685f] font-bold">1:40</span>
              </div>
              <input
                type="number"
                value={isf}
                onChange={(e) => setIsf(Number(e.target.value))}
                min={5}
                max={200}
                required
                className="w-full h-10 px-3 rounded-xl bg-white border border-[#e5eeff] text-[#0b1c30] text-[13px] font-bold"
              />
              <span className="text-[10px] text-[#3d4947] mt-0.5 block">Sensitivity factor</span>
            </div>
            <div className="p-3 bg-[#eff4ff] rounded-2xl border border-[#dce9ff]">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-[#3d4947] font-semibold block">
                  ICR (1u : grams carbs)
                </label>
                <span className="text-[10px] text-[#4648d4] font-bold">1:10</span>
              </div>
              <input
                type="number"
                value={icr}
                onChange={(e) => setIcr(Number(e.target.value))}
                min={1}
                max={50}
                required
                className="w-full h-10 px-3 rounded-xl bg-white border border-[#e5eeff] text-[#0b1c30] text-[13px] font-bold"
              />
              <span className="text-[10px] text-[#3d4947] mt-0.5 block">Carb coverage ratio</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3 mt-3">
            <div className="p-3 bg-[#eff4ff] rounded-2xl border border-[#dce9ff]">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-[#3d4947] font-semibold block">
                  Doctor Prescribed Basal Dose (Units/Day)
                </label>
              </div>
              <input
                type="number"
                value={prescribedBasal}
                onChange={(e) => setPrescribedBasal(Number(e.target.value))}
                min={0}
                max={200}
                className="w-full h-10 px-3 rounded-xl bg-white border border-[#e5eeff] text-[#0b1c30] text-[13px] font-bold"
              />
              <span className="text-[10px] text-[#3d4947] mt-0.5 block">Used for 3-day dose adjustment tracking</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3 mt-3">
            <div className="p-3 bg-[#eff4ff] rounded-2xl border border-[#dce9ff]">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-[#3d4947] font-semibold block">
                  Default Insulin Delivery Device
                </label>
              </div>
              <select
                value={defaultDeliveryDevice}
                onChange={(e) => setDefaultDeliveryDevice(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl bg-white border border-[#e5eeff] text-[#0b1c30] text-[13px] font-bold outline-none"
              >
                <option value="pen_whole">Insulin Pen (Whole Unit increments)</option>
                <option value="pen_half">Insulin Pen (Half Unit increments)</option>
                <option value="syringe">Standard Syringe</option>
              </select>
              <span className="text-[10px] text-[#3d4947] mt-0.5 block">Used to automatically round dose calculations</span>
            </div>
          </div>

          <div className="p-3.5 bg-gradient-to-r from-[#eff4ff] to-[#e1e0ff]/60 rounded-2xl border border-[#c0c1ff]/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#4648d4]">hourglass_bottom</span>
                <div>
                  <span className="text-[12px] font-bold text-[#0b1c30] block">Active Duration (DIA hours)</span>
                  <span className="text-[10px] text-[#3d4947]">Duration of Insulin Action for anti-stacking</span>
                </div>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1 rounded-full border border-[#c0c1ff] shadow-2xs">
                <input
                  type="checkbox"
                  checked={autoDia}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAutoDia(checked);
                    if (checked && activeInsulinIds.length > 0) {
                      setDia(getRecommendedDiaForInsulin(activeInsulinIds[0]));
                    }
                  }}
                  className="rounded text-[#00685f] focus:ring-0"
                />
                <span className="text-[10px] font-bold text-[#00685f]">Auto-Adjust</span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.5"
                value={dia}
                disabled={autoDia}
                onChange={(e) => setDia(Number(e.target.value))}
                min={2}
                max={24}
                required
                className={`w-24 h-11 px-3 rounded-xl text-center text-[16px] font-extrabold border ${
                  autoDia
                    ? 'bg-white/80 text-[#00685f] border-[#00685f]/30'
                    : 'bg-white text-[#0b1c30] border-[#c0c1ff]'
                }`}
              />
              <div className="text-[11px] text-[#3d4947] leading-tight">
                {autoDia ? (
                  <span className="text-[#00685f] font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                    Automatically set to {dia}h based on {primaryInsulin?.name || 'selected formulation'}.
                  </span>
                ) : (
                  <span>Manually set duration. Switch to Auto-Adjust to track insulin kinetics automatically.</span>
                )}
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-[#dce9ff] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[20px] text-[#00685f]">vaccines</span>
                <div>
                  <h4 className="text-[13px] font-bold text-[#0b1c30]">
                    Individual Insulin Regimen &amp; Meal Timings
                  </h4>
                  <p className="text-[11px] text-[#3d4947]">
                    Choose when to take each insulin (e.g. before lunch, before breakfast, bedtime)
                  </p>
                </div>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-[#3d4947] font-semibold block mb-1.5">
                Active Insulins in Your Regimen (Select 1 or 2):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {INSULIN_DATABASE.map(ins => {
                  const isSelected = activeInsulinIds.includes(ins.id);
                  const insDia = getRecommendedDiaForInsulin(ins.id);
                  return (
                    <button
                      key={ins.id}
                      type="button"
                      onClick={() => handleToggleInsulinInRegimen(ins.id)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#00685f] text-white shadow-2xs'
                          : 'bg-[#eff4ff] text-[#3d4947] hover:bg-[#e5eeff]'
                      }`}
                    >
                      <span>{ins.name}</span>
                      <span className="text-[9px] opacity-80">({insDia}h)</span>
                      {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {activeInsulinIds.map((insId, idx) => {
                const ins = getInsulinProfileById(insId);
                if (!ins) return null;
                const schedule = schedules.find(s => s.insulinId === insId) || {
                  insulinId: insId,
                  slots: []
                };
                const insDia = getRecommendedDiaForInsulin(insId);

                return (
                  <div key={insId} className="p-3 bg-[#eff4ff] rounded-2xl border border-[#dce9ff] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#00685f] text-white text-[11px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-[13px] text-[#0b1c30]">{ins.name}</span>
                          <span className="text-[10px] text-[#3d4947] ml-2">
                            {ins.category} • DIA: <strong>{insDia}h</strong>
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-[#00685f] font-bold border border-[#dce9ff]">
                        {schedule.slots.length} timing{schedule.slots.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-[#3d4947] uppercase tracking-wider block mb-1.5">
                        When do you take {ins.name}?
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {TIMING_SLOT_OPTIONS.map(slot => {
                          const isAssigned = schedule.slots.includes(slot.id);
                          const regimenDose = insulinRegimen.find(r => r.insulinId === insId && r.slot === slot.id);
                          return (
                            <div key={slot.id} className={`p-1.5 px-2 rounded-xl text-[11px] font-medium flex flex-col transition-all ${
                                isAssigned
                                  ? 'bg-[#00685f]/10 border border-[#00685f]/30 shadow-2xs'
                                  : 'bg-white text-[#3d4947] hover:bg-[#dce9ff] border border-[#dce9ff]'
                              }`}>
                              <button
                                type="button"
                                onClick={() => handleToggleSlotForInsulin(insId, slot.id)}
                                className="flex items-center justify-between text-left w-full cursor-pointer"
                              >
                                <div className="truncate">
                                  <span className={`block font-semibold leading-tight ${isAssigned ? 'text-[#00685f]' : ''}`}>{slot.shortLabel}</span>
                                  <span className={`text-[9px] block leading-none mt-0.5 ${isAssigned ? 'text-[#00685f]/80' : 'text-[#3d4947]'}`}>
                                    {slot.timeHint}
                                  </span>
                                </div>
                                <span className={`material-symbols-outlined text-[14px] flex-shrink-0 ml-1 ${isAssigned ? 'text-[#00685f]' : ''}`}>
                                  {isAssigned ? 'check_circle' : 'add_circle'}
                                </span>
                              </button>
                              {isAssigned && (
                                <div className="mt-2 flex items-center gap-1 border-t border-[#00685f]/20 pt-1.5">
                                  <label className="text-[9px] text-[#00685f] font-bold">Dose (u):</label>
                                  <input 
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    className="w-full h-6 px-1.5 rounded-md bg-white border border-[#00685f]/30 text-[#00685f] text-[11px] font-bold"
                                    value={regimenDose?.doseUnits !== undefined ? regimenDose.doseUnits : ''}
                                    onChange={(e) => handleUpdateRegimenDose(insId, slot.id, Number(e.target.value))}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-[#eff4ff] rounded-2xl border border-[#dce9ff]">
              <label className="text-[11px] text-[#3d4947] font-semibold block mb-1">
                Hypo Safety Limit (mg/dL)
              </label>
              <input
                type="number"
                value={hypoLimit}
                onChange={(e) => setHypoLimit(Number(e.target.value))}
                min={50}
                max={90}
                required
                className="w-full h-10 px-3 rounded-xl bg-white border border-[#e5eeff] text-[#0b1c30] text-[12px] font-semibold"
              />
            </div>
            <div className="p-3 bg-[#eff4ff] rounded-2xl border border-[#dce9ff]">
              <label className="text-[11px] text-[#3d4947] font-semibold block mb-1">
                Personal Protocol Label
              </label>
              <input
                type="text"
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                placeholder="e.g. My T1D Regimen"
                className="w-full h-10 px-3 rounded-xl bg-white border border-[#e5eeff] text-[#0b1c30] text-[12px]"
              />
            </div>
          </div>

          <div className="p-3 bg-[#eff4ff] rounded-2xl text-[11px] text-[#3d4947] leading-snug flex items-start gap-2">
            <span className="material-symbols-outlined text-[#00685f] text-[16px] flex-shrink-0 mt-0.5">verified_user</span>
            <span>
              <strong>Clinical Guard:</strong> When multiple insulins are configured, the dosage engine automatically routes the scheduled insulin when you select meal slots (e.g. Before Lunch) and deducts active IOB using that formulation&apos;s active duration.
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full bg-[#eff4ff] text-[#3d4947] text-[12px] font-semibold hover:bg-[#dce9ff] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-full bg-[#00685f] hover:bg-[#005049] text-white text-[12px] font-bold shadow-xs transition-colors cursor-pointer"
            >
              Save Parameters &amp; Timings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
