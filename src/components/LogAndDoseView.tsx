import React, { useState, useEffect, useMemo } from 'react';
import { GlucoseRecord, InsulinRecord, PatientProfile, RoutineSlot } from '../types';
import { calculateDecisionSupportDose } from '../services/calculationEngine';
import { calculateCurrentIob, calculateSingleDoseIob } from '../services/iobEngine';
import { INSULIN_DATABASE, getRecommendedDiaForInsulin, getInsulinProfileById, InsulinProfile } from '../data/insulinDatabase';

interface LogAndDoseViewProps {
  profile: PatientProfile;
  glucoseRecords: GlucoseRecord[];
  insulinRecords: InsulinRecord[];
  initialMode?: 'calc' | 'quick';
  initialSlot?: RoutineSlot;
  onSaveGlucoseAndDose: (
    glucoseVal: number,
    slot: RoutineSlot,
    carbs: number,
    insulinId: string,
    dose: number,
    priorDoseToSave?: {
      insulinId: string;
      doseUnits: number;
      hoursAgo: number;
      slot: RoutineSlot;
      notes?: string;
    }
  ) => void;
  onSaveQuickInsulin: (insulinId: string, dose: number, slot: RoutineSlot, timeIso: string, notes?: string) => void;
  onDeleteInsulinRecord?: (id: string) => void;
  onOpenParameterModal: () => void;
}

export const LogAndDoseView: React.FC<LogAndDoseViewProps> = ({
  profile,
  glucoseRecords,
  insulinRecords,
  initialMode = 'calc',
  initialSlot = 'before_dinner',
  onSaveGlucoseAndDose,
  onSaveQuickInsulin,
  onDeleteInsulinRecord,
  onOpenParameterModal
}) => {
  const activeInsulins = useMemo(() => {
    if (profile.activeInsulinIds && profile.activeInsulinIds.length > 0) {
      return profile.activeInsulinIds.map(id => getInsulinProfileById(id)).filter(Boolean) as typeof INSULIN_DATABASE;
    }
    return INSULIN_DATABASE;
  }, [profile.activeInsulinIds]);

  const [mode, setMode] = useState<'calc' | 'quick'>(initialMode);
  const [currentGlucose, setCurrentGlucose] = useState<number>(220);
  const [currentCarbs, setCurrentCarbs] = useState<number>(45);
  const [selectedSlot, setSelectedSlot] = useState<RoutineSlot>(initialSlot);

  // Default to first active insulin or actrapid
  const activeRegimenInsulins = profile.activeInsulinIds && profile.activeInsulinIds.length > 0
    ? profile.activeInsulinIds
    : ['actrapid', 'mixtard_30'];

  const [selectedInsulinId, setSelectedInsulinId] = useState<string>(activeRegimenInsulins[0] || 'actrapid');
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string>('Entry safely written to clinical database');

  const [deliveryDevice, setDeliveryDevice] = useState<'pen_whole' | 'pen_half' | 'syringe'>(profile.defaultDeliveryDevice || 'pen_whole');
  const [injectionSite, setInjectionSite] = useState<string>('');

  // --- PRIOR INSULIN STATE ---
  // Allows user to account for insulin taken previously (before using app or earlier bolus)
  const [includePriorDose, setIncludePriorDose] = useState<boolean>(false);
  const [priorInsulinId, setPriorInsulinId] = useState<string>(activeRegimenInsulins[0] || 'actrapid');
  const [priorDoseUnits, setPriorDoseUnits] = useState<number>(4.0);
  const [priorDoseHoursAgo, setPriorDoseHoursAgo] = useState<number>(1.5); // Default 1.5 hours ago
  const [priorDoseSlot, setPriorDoseSlot] = useState<RoutineSlot>('before_lunch');
  const [savePriorDoseToLog, setSavePriorDoseToLog] = useState<boolean>(true);

  // --- USER MANUAL DOSE ADJUSTMENT STATE ---
  // "and then adjust that dose": Allows user to fine-tune the final recommended dose
  const [userAdjustedDose, setUserAdjustedDose] = useState<number | null>(null);

  // Exercise modifier state
  const [exerciseIntensity, setExerciseIntensity] = useState<'none' | 'light' | 'moderate' | 'intense'>('none');

  // Quick entry state
  const [quickInsulinId, setQuickInsulinId] = useState<string>(activeRegimenInsulins[1] || activeRegimenInsulins[0] || 'mixtard_30');
  const [quickDose, setQuickDose] = useState<number>(20);
  const [quickSlot, setQuickSlot] = useState<RoutineSlot>('before_dinner');
  const [quickTime, setQuickTime] = useState<string>('19:30');
  const [quickDate, setQuickDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [quickNotes, setQuickNotes] = useState<string>('');

  // Delete confirmation modal state
  const [recordToDelete, setRecordToDelete] = useState<InsulinRecord | null>(null);

  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (initialSlot) setSelectedSlot(initialSlot);
  }, [initialSlot]);

  // Helper to find scheduled insulin for a given slot
  const getScheduledInsulinForSlot = (slot: RoutineSlot): string | undefined => {
    const match = profile.insulinSchedules?.find(s => s.slots.includes(slot));
    return match?.insulinId;
  };

  // Synchronize insulin when slot changes
  useEffect(() => {
    const scheduled = getScheduledInsulinForSlot(selectedSlot);
    if (scheduled) {
      setSelectedInsulinId(scheduled);
    }
  }, [selectedSlot, profile.insulinSchedules]);

  useEffect(() => {
    const scheduled = getScheduledInsulinForSlot(quickSlot);
    if (scheduled) {
      setQuickInsulinId(scheduled);
    }
  }, [quickSlot, profile.insulinSchedules]);

  // Dynamically calculate DIA based on selected insulin
  const autoDia = profile.autoDiaEnabled !== false;
  const effectiveDia = autoDia
    ? getRecommendedDiaForInsulin(selectedInsulinId)
    : (profile.activeDurationHours || 6.0);

  // Base IOB from saved insulin records
  const nowIso = new Date().toISOString();
  const baseIobResult = calculateCurrentIob(insulinRecords, nowIso, effectiveDia, profile.insulinSensitivityFactor);
  const baseActiveIob = baseIobResult.totalIob;

  // Calculate pharmacokinetic decay of previously taken insulin
  const priorInsulinObj = getInsulinProfileById(priorInsulinId);
  const priorDia = getRecommendedDiaForInsulin(priorInsulinId);
  const priorDoseDecay = useMemo(() => {
    return calculateSingleDoseIob(priorDoseUnits, priorInsulinId, priorDoseHoursAgo, priorDia);
  }, [priorDoseUnits, priorInsulinId, priorDoseHoursAgo, priorDia]);

  // Aggregate active IOB including prior dose decay if toggled ON
  const effectiveTotalIob = includePriorDose
    ? Math.round((baseActiveIob + (priorDoseDecay.prandialRemainingUnits || 0)) * 100) / 100
    : baseActiveIob;

  // Recent bolus minutes calculation
  const recentRecord = insulinRecords.length > 0 ? insulinRecords[0] : undefined;
  const dbRecentMinutes = recentRecord
    ? Math.max(0, Math.round((new Date().getTime() - new Date(recentRecord.timestamp).getTime()) / 60000))
    : undefined;

  const effectiveRecentBolusMinutesAgo = includePriorDose
    ? Math.min(dbRecentMinutes ?? 9999, Math.round(priorDoseHoursAgo * 60))
    : dbRecentMinutes;

  // Effective profile
  const effectiveProfile: PatientProfile = {
    ...profile,
    activeDurationHours: effectiveDia
  };

  // Algorithmic bolus calculation incorporating effective active IOB
  const doseResult = calculateDecisionSupportDose(
    currentGlucose,
    currentCarbs,
    effectiveTotalIob,
    effectiveProfile,
    effectiveRecentBolusMinutesAgo,
      selectedInsulinId,
      selectedSlot
    );

  // Determine the active pen dose: either user-adjusted or advisor recommendation
  let recommendedPenUnits = doseResult.netRecommendedUnits;
  
  if (deliveryDevice === 'pen_half') {
    recommendedPenUnits = Math.round(recommendedPenUnits * 2) / 2;
  } else {
    recommendedPenUnits = Math.round(recommendedPenUnits); // pen_whole or syringe
  }
  
  // Apply exercise reduction
  let exerciseReductionPercent = 0;
  if (exerciseIntensity === 'light') exerciseReductionPercent = 10;
  else if (exerciseIntensity === 'moderate') exerciseReductionPercent = 20;
  else if (exerciseIntensity === 'intense') exerciseReductionPercent = 30;

  if (exerciseReductionPercent > 0) {
    recommendedPenUnits = Math.max(0, recommendedPenUnits * (1 - (exerciseReductionPercent / 100)));
    if (deliveryDevice === 'pen_half') {
      recommendedPenUnits = Math.round(recommendedPenUnits * 2) / 2;
    } else {
      recommendedPenUnits = Math.round(recommendedPenUnits);
    }
  }

  const currentFinalDose = userAdjustedDose !== null ? userAdjustedDose : recommendedPenUnits;

  // Real-time recalculated projected blood glucose at clearance with the final adjusted dose
  const isf = profile.insulinSensitivityFactor || 40;
  const icr = profile.insulinToCarbRatio || 10;
  const estimatedCarbRise = currentCarbs > 0 ? Math.round((currentCarbs / icr) * isf * 0.9) : 0;
  const chosenInsulinProfile = getInsulinProfileById(selectedInsulinId);
  let prandialFractionOfCurrentDose = 1;
  if (chosenInsulinProfile) {
    if (chosenInsulinProfile.category === 'long' || chosenInsulinProfile.category === 'intermediate') {
      prandialFractionOfCurrentDose = 0;
    } else if (chosenInsulinProfile.category === 'premixed' && chosenInsulinProfile.biphasicRatio) {
      prandialFractionOfCurrentDose = chosenInsulinProfile.biphasicRatio.rapid;
    }
  }
  const adjustedTotalInsulinDrop = Math.round(((currentFinalDose * prandialFractionOfCurrentDose) + effectiveTotalIob) * isf);
  // If user didn't enter glucose, we project based on their target glucose (or don't show the warning)
  const baseForProjection = currentGlucose > 0 ? currentGlucose : (profile.targetGlucose || 110);
  const adjustedProjectedBg = Math.round(baseForProjection + estimatedCarbRise - adjustedTotalInsulinDrop);
  const isAdjustedProjectedHypo = adjustedProjectedBg < (profile.hypoLimit || 70);

  const slotOptions: { id: RoutineSlot; label: string }[] = [
    { id: 'before_breakfast', label: 'Before Breakfast' },
    { id: 'after_breakfast', label: 'After Breakfast' },
    { id: 'before_lunch', label: 'Before Lunch' },
    { id: 'after_lunch', label: 'After Lunch' },
    { id: 'before_dinner', label: 'Before Dinner' },
    { id: 'after_dinner', label: 'After Dinner' },
    { id: 'manual', label: 'Manual / Correction' }
  ];

  const handleAdjustGlucose = (delta: number) => {
    setCurrentGlucose(prev => Math.max(40, Math.min(450, prev + delta)));
  };

  const handleAdjustCarbs = (delta: number) => {
    setCurrentCarbs(prev => Math.max(0, Math.min(250, prev + delta)));
  };

  const handleAdjustQuickDose = (delta: number) => {
    setQuickDose(prev => Math.max(0.5, Math.min(100, Math.round((prev + delta) * 2) / 2)));
  };

  // Adjust final dose stepper (+/- 0.5 units)
  const handleStepFinalDose = (delta: number) => {
    const base = userAdjustedDose !== null ? userAdjustedDose : recommendedPenUnits;
    const next = Math.max(0, Math.round((base + delta) * 2) / 2);
    setUserAdjustedDose(next);
  };

  const handleResetToAdvisorDose = () => {
    setUserAdjustedDose(null);
  };

  // Apply quick time preset for quick entry
  const handleApplyQuickTimePreset = (minutesAgo: number) => {
    const target = new Date(Date.now() - minutesAgo * 60000);
    const dateStr = target.toISOString().split('T')[0];
    const hours = String(target.getHours()).padStart(2, '0');
    const mins = String(target.getMinutes()).padStart(2, '0');
    setQuickDate(dateStr);
    setQuickTime(`${hours}:${mins}`);
  };

  const handleCommitCalculation = () => {
    const priorDosePayload = (includePriorDose && savePriorDoseToLog && priorDoseUnits > 0)
      ? {
          insulinId: priorInsulinId,
          doseUnits: priorDoseUnits,
          hoursAgo: priorDoseHoursAgo,
          slot: priorDoseSlot,
          notes: `Prior dose: ${priorDoseUnits}u ${priorInsulinObj?.name || 'Insulin'} taken ${priorDoseHoursAgo}h ago`
        }
      : undefined;

    onSaveGlucoseAndDose(
      currentGlucose,
      selectedSlot,
      currentCarbs,
      selectedInsulinId,
      currentFinalDose,
      priorDosePayload,
      deliveryDevice,
      injectionSite
    );

    const adjustmentText = userAdjustedDose !== null && userAdjustedDose !== recommendedPenUnits
      ? ` (Adjusted from ${recommendedPenUnits}u)`
      : '';
    const priorText = includePriorDose ? ` + Prior ${priorDoseUnits}u accounted` : '';

    setToastMsg(`Logged ${currentGlucose} mg/dL & ${currentFinalDose}u insulin${adjustmentText}${priorText}`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleCommitQuickInsulin = (e: React.FormEvent) => {
    e.preventDefault();
    const dateTimeIso = new Date(`${quickDate}T${quickTime}:00`).toISOString();
    onSaveQuickInsulin(quickInsulinId, quickDose, quickSlot, dateTimeIso, quickNotes, deliveryDevice, injectionSite);
    const ins = INSULIN_DATABASE.find(i => i.id === quickInsulinId)?.name || 'Insulin';
    setToastMsg(`Logged ${quickDose}u ${ins}`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2600);
  };

  const handleDeleteConfirmed = () => {
    if (recordToDelete && onDeleteInsulinRecord) {
      onDeleteInsulinRecord(recordToDelete.id);
      setToastMsg(`Deleted ${recordToDelete.doseUnits}u ${recordToDelete.insulinName} record`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2600);
    }
    setRecordToDelete(null);
  };

  const scheduledForCurrentSlot = getScheduledInsulinForSlot(selectedSlot);
  const selectedInsulinObj = getInsulinProfileById(selectedInsulinId);

  // Quick preset chips for prior dose
  const priorHoursPresets = [
    { label: '30m ago', hours: 0.5 },
    { label: '1h ago', hours: 1.0 },
    { label: '1.5h ago', hours: 1.5 },
    { label: '2h ago', hours: 2.0 },
    { label: '3h ago', hours: 3.0 },
    { label: '4h ago', hours: 4.0 }
  ];

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto pb-24">
      {/* Top Advisory & Context Header */}
      <div className="px-4 pt-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#008378] text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[19px]">vital_signs</span>
            </div>
            <div>
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[16px] text-[#0b1c30] block leading-tight">
                Clinical Decision Support
              </span>
              <span className="text-[10px] text-[#3d4947] uppercase tracking-wider font-semibold">
                Smart Dose Advisor &amp; IOB Adjuster
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#dce9ff] text-[#00685f] text-[11px] font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">lock</span> Rx Verified
          </span>
        </div>

        {/* Regulatory Medical Disclaimer Banner */}
        <div className="p-3 rounded-2xl bg-[#eff4ff] border border-[#e5eeff] text-[#0b1c30] flex items-start gap-2.5 shadow-xs">
          <span className="material-symbols-outlined text-[#4648d4] text-[20px] flex-shrink-0 mt-0.5">
            verified_user
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-[#3d4947] leading-snug">
              <strong className="font-semibold text-[#0b1c30]">Prescription Reference Only.</strong> Algorithmic bolus recommendations do not replace direct medical orders or fingerstick cross-verification.
            </p>
          </div>
        </div>
      </div>

      {/* Dual Mode Segmented Switcher */}
      <div className="px-4 mt-3">
        <div className="p-1 rounded-full bg-[#e5eeff] flex items-center shadow-inner">
          <button
            onClick={() => setMode('calc')}
            className={`flex-1 py-2 px-3 rounded-full text-center text-[12px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'calc'
                ? 'bg-white text-[#00685f] shadow-sm'
                : 'text-[#3d4947] hover:text-[#0b1c30]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">calculate</span>
            <span>Log Glucose &amp; Dose</span>
          </button>
          <button
            onClick={() => setMode('quick')}
            className={`flex-1 py-2 px-3 rounded-full text-center text-[12px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'quick'
                ? 'bg-white text-[#4648d4] shadow-sm'
                : 'text-[#3d4947] hover:text-[#0b1c30]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            <span>Quick Insulin Entry</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Log Glucose & Dose Advisor */}
      {mode === 'calc' && (
        <div className="flex flex-col gap-3 mt-3">
          {/* Card 1: Current Blood Glucose & Slot */}
          <div className="px-4">
            <div className="p-4 rounded-3xl bg-white border border-[#e5eeff] shadow-sm flex flex-col gap-3.5">
              {/* Glucose Stepper & Visual Alert */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12px] text-[#3d4947] font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-[#00685f]">bloodtype</span>
                    Current Blood Glucose
                  </label>
                  {currentGlucose > 180 ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#93000a] text-[10px] font-bold flex items-center gap-1 animate-pulse">
                      <span className="material-symbols-outlined text-[13px]">warning</span> Elevated High
                    </span>
                  ) : currentGlucose < 70 ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#ba1a1a] text-white text-[10px] font-bold flex items-center gap-1 animate-bounce">
                      <span className="material-symbols-outlined text-[13px]">emergency</span> Hypoglycemia Alert
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-[#006947]/15 text-[#006947] text-[10px] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">check_circle</span> In Target Band
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#eff4ff]">
                  <button
                    type="button"
                    onClick={() => handleAdjustGlucose(-5)}
                    className="w-12 h-12 rounded-xl bg-white active:scale-95 text-[#0b1c30] flex items-center justify-center shadow-xs transition-transform border border-[#e5eeff] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[24px]">remove</span>
                  </button>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <input
                        type="number"
                        min={20}
                        max={500}
                        value={currentGlucose}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val)) setCurrentGlucose(val);
                        }}
                        className="w-28 text-center font-['Plus_Jakarta_Sans',sans-serif] text-[36px] leading-none text-[#0b1c30] font-extrabold bg-white border border-[#c0c1ff]/60 rounded-xl px-1 py-1 shadow-2xs focus:ring-2 focus:ring-[#00685f] focus:outline-none"
                      />
                      <span className="text-[13px] text-[#3d4947] font-semibold">mg/dL</span>
                    </div>
                    <span className="text-[11px] text-[#00685f] font-medium flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-[13px]">edit</span>
                      Type directly or tap +/-
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAdjustGlucose(5)}
                    className="w-12 h-12 rounded-xl bg-white active:scale-95 text-[#0b1c30] flex items-center justify-center shadow-xs transition-transform border border-[#e5eeff] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[24px]">add</span>
                  </button>
                </div>
              </div>

              {/* Target vs Elevated Track Bar */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-[#3d4947] font-medium">
                  <span>Hypo &lt;70</span>
                  <span className="text-[#006947] font-semibold">Target: 70–110</span>
                  <span className="text-[#ba1a1a] font-semibold">Elevated &gt;180</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#e5eeff] flex overflow-hidden">
                  <div className="h-full bg-[#ffdad6] w-[20%]" />
                  <div className="h-full bg-[#4edea3] w-[40%]" />
                  <div className="h-full bg-[#ba1a1a] w-[40%]" />
                </div>
              </div>

              {/* Slot Selector Chips */}
              <div>
                <label className="text-[12px] text-[#3d4947] font-semibold mb-2 block">
                  Measurement Timing Slot
                </label>
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                  {slotOptions.map(slot => {
                    const isSelected = selectedSlot === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlot(slot.id)}
                        className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#00685f] text-white shadow-xs'
                            : 'bg-[#eff4ff] text-[#3d4947] hover:bg-[#e5eeff]'
                        }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Meal Carbohydrates & Formulation */}
          <div className="px-4">
            <div className="p-4 rounded-3xl bg-white border border-[#e5eeff] shadow-sm flex flex-col gap-3.5">
              {/* Carbs Stepper */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12px] text-[#3d4947] font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-[#006947]">restaurant</span>
                    Meal Carbohydrates (g)
                  </label>
                  <span className="text-[11px] text-[#3d4947]">e.g., Oatmeal &amp; Apple</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#eff4ff]">
                  <button
                    type="button"
                    onClick={() => handleAdjustCarbs(-5)}
                    className="w-12 h-12 rounded-xl bg-white active:scale-95 text-[#0b1c30] flex items-center justify-center shadow-xs transition-transform border border-[#e5eeff] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[24px]">remove</span>
                  </button>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={300}
                        value={currentCarbs}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val)) setCurrentCarbs(Math.max(0, val));
                        }}
                        className="w-24 text-center font-['Plus_Jakarta_Sans',sans-serif] text-[30px] leading-none text-[#0b1c30] font-extrabold bg-white border border-[#c0c1ff]/60 rounded-xl px-1 py-1 shadow-2xs focus:ring-2 focus:ring-[#00685f] focus:outline-none"
                      />
                      <span className="text-[13px] text-[#3d4947] font-bold">grams</span>
                    </div>
                    <span className="text-[11px] text-[#006947] font-semibold mt-1">
                      ICR: 1 unit per {profile.insulinToCarbRatio}g
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAdjustCarbs(5)}
                    className="w-12 h-12 rounded-xl bg-white active:scale-95 text-[#0b1c30] flex items-center justify-center shadow-xs transition-transform border border-[#e5eeff] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[24px]">add</span>
                  </button>
                </div>
              </div>

              {/* Formulation Selector & Multi-Insulin Regimen */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12px] text-[#3d4947] font-semibold block">
                    Prescribed Insulin Formulation &amp; Timing
                  </label>
                  <button
                    type="button"
                    onClick={onOpenParameterModal}
                    className="text-[11px] text-[#00685f] font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">tune</span>
                    Manage Regimen
                  </button>
                </div>

                {/* Multi-Insulin Active Regimen Switcher */}
                {activeRegimenInsulins.length > 0 && (
                  <div className="mb-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeRegimenInsulins.map(insId => {
                        const insObj = getInsulinProfileById(insId);
                        if (!insObj) return null;
                        const insDia = getRecommendedDiaForInsulin(insId);
                        const isSelected = selectedInsulinId === insId;
                        const isScheduled = scheduledForCurrentSlot === insId;
                        return (
                          <button
                            key={insId}
                            type="button"
                            onClick={() => setSelectedInsulinId(insId)}
                            className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#00685f] bg-[#00685f]/5 shadow-2xs'
                                : 'border-[#e5eeff] bg-[#eff4ff] hover:bg-[#e5eeff]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[13px] text-[#0b1c30]">{insObj.name}</span>
                              {isSelected ? (
                                <span className="material-symbols-outlined text-[#00685f] text-[18px]">radio_button_checked</span>
                              ) : (
                                <span className="material-symbols-outlined text-[#bcc9c6] text-[18px]">radio_button_unchecked</span>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1 text-[10px]">
                              <span className="text-[#3d4947] font-medium">{insObj.category}</span>
                              <span className="px-1.5 py-0.5 rounded-md bg-white font-bold text-[#00685f] border border-[#dce9ff]">
                                DIA: {insDia}h
                              </span>
                            </div>
                            {isScheduled && (
                              <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-[#006947] bg-[#006947]/10 px-2 py-0.5 rounded-full w-fit">
                                <span className="material-symbols-outlined text-[13px]">schedule</span>
                                <span>Scheduled for {selectedSlot.replace('_', ' ')}</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="relative">
                  <select
                    value={selectedInsulinId}
                    onChange={(e) => setSelectedInsulinId(e.target.value)}
                    className="w-full h-11 pl-3 pr-10 rounded-xl bg-[#eff4ff] border border-[#e5eeff] text-[#0b1c30] text-[13px] font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-[#00685f]"
                  >
                    {activeInsulins.map(ins => {
                      const recDia = getRecommendedDiaForInsulin(ins.id);
                      return (
                        <option key={ins.id} value={ins.id}>
                          {ins.name} ({ins.category} • DIA: {recDia}h)
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute right-3 top-3 pointer-events-none text-[#3d4947]">
                    <span className="material-symbols-outlined text-[20px]">expand_more</span>
                  </div>
                </div>

                {/* Auto-Adjusted DIA & Active IOB Indicator */}
                <div className="mt-2.5 p-2.5 rounded-2xl bg-gradient-to-r from-[#eff4ff] to-[#e1e0ff]/40 border border-[#c0c1ff]/50 flex flex-col gap-1 text-[11px] text-[#3d4947]">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 font-semibold text-[#00685f]">
                      <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                      DIA Auto-Calibrated: <strong>{effectiveDia} Hours</strong>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-[#4648d4] font-bold border border-[#c0c1ff]">
                      {selectedInsulinObj?.name || 'Insulin'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#3d4947]">
                    <span className="material-symbols-outlined text-[#4648d4] text-[16px]">history</span>
                    <span>
                      Active IOB in Blood: <strong>{effectiveTotalIob.toFixed(2)} u</strong> decaying across {effectiveDia}h
                      {includePriorDose && (
                        <span className="ml-1 text-[#4648d4] font-bold">
                          (+{priorDoseDecay.remainingUnits.toFixed(2)}u from prior dose)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: PRIOR INSULIN TAKEN & PHARMACOKINETIC ADJUSTER */}
          {/* Fulfills user request: "add insulin taken previously and adjust that like before using this app" */}
          <div className="px-4">
            <div className={`p-4 rounded-3xl border transition-all shadow-sm flex flex-col gap-3.5 ${
              includePriorDose
                ? 'bg-gradient-to-b from-[#f5f8ff] to-white border-[#c0c1ff]'
                : 'bg-white border-[#e5eeff]'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-xs ${
                    includePriorDose ? 'bg-[#4648d4] text-white' : 'bg-[#eff4ff] text-[#3d4947]'
                  }`}>
                    <span className="material-symbols-outlined text-[18px]">history_toggle_off</span>
                  </div>
                  <div>
                    <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[15px] text-[#0b1c30] block leading-tight">
                      Prior Insulin Taken
                    </span>
                    <span className="text-[11px] text-[#3d4947]">
                      Taken before this session or earlier bolus
                    </span>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setIncludePriorDose(!includePriorDose)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    includePriorDose
                      ? 'bg-[#4648d4] text-white shadow-xs'
                      : 'bg-[#eff4ff] text-[#3d4947] hover:bg-[#e5eeff]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {includePriorDose ? 'toggle_on' : 'toggle_off'}
                  </span>
                  <span>{includePriorDose ? 'Active Decay On' : 'Account Prior Dose'}</span>
                </button>
              </div>

              {includePriorDose ? (
                <div className="flex flex-col gap-3 pt-1 border-t border-[#e5eeff]/80">
                  <p className="text-[11px] text-[#3d4947] leading-relaxed">
                    Specify insulin injected previously (e.g. before opening this app or earlier in the day). The scientific Mudaliar exponential model calculates its continuous clearance and automatically adjusts your current dose to avert insulin stacking.
                  </p>

                  {/* Prior Formulation & Context */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-[#3d4947] font-semibold mb-1 block">
                        Prior Insulin Formulation
                      </label>
                      <select
                        value={priorInsulinId}
                        onChange={(e) => setPriorInsulinId(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white border border-[#c0c1ff] text-[#0b1c30] text-[12px] font-medium"
                      >
                        {activeInsulins.map(ins => {
                          const dia = getRecommendedDiaForInsulin(ins.id);
                          return (
                            <option key={ins.id} value={ins.id}>
                              {ins.name} ({ins.category} • DIA {dia}h)
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#3d4947] font-semibold mb-1 block">
                        Prior Dose Context / Meal
                      </label>
                      <select
                        value={priorDoseSlot}
                        onChange={(e) => setPriorDoseSlot(e.target.value as RoutineSlot)}
                        className="w-full h-10 px-3 rounded-xl bg-white border border-[#c0c1ff] text-[#0b1c30] text-[12px] font-medium"
                      >
                        <option value="before_breakfast">Earlier: Before Breakfast</option>
                        <option value="before_lunch">Earlier: Before Lunch</option>
                        <option value="before_dinner">Earlier: Before Dinner</option>
                        <option value="manual">Earlier: Correction / Unscheduled</option>
                      </select>
                    </div>
                  </div>

                  {/* Prior Dose Units Stepper */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] text-[#3d4947] font-semibold">
                        Prior Dose Injected
                      </label>
                      <span className="text-[11px] font-bold text-[#4648d4]">
                        {priorDoseUnits} Units Administered
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-2xl bg-white border border-[#c0c1ff]">
                      <button
                        type="button"
                        onClick={() => setPriorDoseUnits(prev => Math.max(0.5, Math.round((prev - 0.5) * 2) / 2))}
                        className="w-10 h-10 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] active:scale-95 text-[#0b1c30] font-bold flex items-center justify-center transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">remove</span>
                      </button>
                      <div className="flex items-center justify-center gap-1.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="100"
                          value={priorDoseUnits}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (!isNaN(val)) setPriorDoseUnits(Math.max(0, val));
                          }}
                          className="w-24 text-center font-['Plus_Jakarta_Sans',sans-serif] text-[26px] font-extrabold text-[#0b1c30] bg-[#eff4ff] border border-[#dce9ff] rounded-xl px-1 py-0.5 focus:ring-2 focus:ring-[#4648d4] focus:outline-none"
                        />
                        <span className="text-[12px] text-[#3d4947] font-semibold">Units</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPriorDoseUnits(prev => Math.min(100, Math.round((prev + 0.5) * 2) / 2))}
                        className="w-10 h-10 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] active:scale-95 text-[#0b1c30] font-bold flex items-center justify-center transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                      </button>
                    </div>
                  </div>

                  {/* Elapsed Time Since Prior Dose */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] text-[#3d4947] font-semibold">
                        When was this prior dose taken?
                      </label>
                      <span className="text-[10px] text-[#4648d4] font-bold">
                        {priorDoseHoursAgo.toFixed(1)}h ago ({Math.round(priorDoseHoursAgo * 60)} min)
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-2">
                      {priorHoursPresets.map(preset => {
                        const isSelected = Math.abs(priorDoseHoursAgo - preset.hours) < 0.05;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setPriorDoseHoursAgo(preset.hours)}
                            className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all text-center cursor-pointer ${
                              isSelected
                                ? 'bg-[#4648d4] text-white shadow-xs'
                                : 'bg-white border border-[#c0c1ff] text-[#3d4947] hover:bg-[#eff4ff]'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#c0c1ff]/80">
                      <span className="text-[11px] text-[#3d4947] font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-[#4648d4]">edit</span>
                        Or type exact hours:
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="24"
                        value={priorDoseHoursAgo}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val)) setPriorDoseHoursAgo(Math.max(0.1, Math.min(24, val)));
                        }}
                        className="w-18 text-center text-[12px] font-bold text-[#0b1c30] bg-[#eff4ff] border border-[#dce9ff] rounded-lg py-1 px-1 focus:ring-2 focus:ring-[#4648d4] focus:outline-none"
                      />
                      <span className="text-[11px] text-[#3d4947]">hours ago</span>
                    </div>
                  </div>

                  {/* Scientific Pharmacokinetic Decay Visualizer Card */}
                  <div className="p-3.5 rounded-2xl bg-white border border-[#c0c1ff] shadow-xs flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-[#4648d4] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">timeline</span>
                        Mudaliar Exponential Decay
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e1e0ff] text-[#07006c] font-bold">
                        DIA: {priorDia}h
                      </span>
                    </div>

                    {/* Absorption Breakdown Metric Strip */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-xl bg-[#f8f9ff] border border-[#e5eeff]">
                        <span className="text-[10px] text-[#6d7a77] block font-medium">Absorbed So Far</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[18px] font-extrabold text-[#0b1c30]">
                            {priorDoseDecay.absorbedUnits.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-[#3d4947] font-semibold">
                            units ({priorDoseDecay.percentAbsorbed}%)
                          </span>
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-[#e1e0ff]/60 border border-[#c0c1ff]">
                        <span className="text-[10px] text-[#2f2ebe] block font-bold">Remaining Active IOB</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[18px] font-extrabold text-[#07006c]">
                            {priorDoseDecay.remainingUnits.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-[#07006c] font-bold">
                            units ({priorDoseDecay.percentRemaining}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Two-Tone Visual Decay Progress Bar */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[10px] text-[#3d4947] font-medium">
                        <span>Cleared: {priorDoseDecay.percentAbsorbed}%</span>
                        <span className="text-[#4648d4] font-bold">Active in Circulation: {priorDoseDecay.percentRemaining}%</span>
                      </div>
                      <div className="h-2.5 w-full bg-[#eff4ff] rounded-full overflow-hidden flex p-0.5 border border-[#dce9ff]">
                        <div
                          className="h-full bg-[#006947]/40 rounded-l-full transition-all duration-300"
                          style={{ width: `${priorDoseDecay.percentAbsorbed}%` }}
                        />
                        <div
                          className="h-full bg-[#4648d4] rounded-r-full transition-all duration-300"
                          style={{ width: `${priorDoseDecay.percentRemaining}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-[#3d4947] bg-[#eff4ff] p-2 rounded-xl">
                      <span className="material-symbols-outlined text-[#4648d4] text-[16px] flex-shrink-0">
                        info
                      </span>
                      <span>
                        <strong>Dose Adjustment Impact:</strong> -{priorDoseDecay.remainingUnits.toFixed(2)} Units will be subtracted from your current meal bolus to prevent double-dosing.
                      </span>
                    </div>

                    {/* Save to Log Checkbox */}
                    <label className="flex items-center gap-2 text-[11px] text-[#0b1c30] font-medium cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={savePriorDoseToLog}
                        onChange={(e) => setSavePriorDoseToLog(e.target.checked)}
                        className="w-4 h-4 text-[#4648d4] rounded focus:ring-0"
                      />
                      <span>Save this prior dose to historical logbook (timed {priorDoseHoursAgo}h ago)</span>
                    </label>
                  </div>
                </div>
              ) : (
                /* Collapsed / Inactive view */
                <div className="flex items-center justify-between text-[11px] text-[#3d4947] bg-[#eff4ff] p-2.5 rounded-2xl">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#00685f]">check_circle</span>
                    <span>No prior unrecorded dose specified. Using {baseActiveIob.toFixed(2)}u Bolus IOB from logbook.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIncludePriorDose(true)}
                    className="text-[#4648d4] font-bold hover:underline cursor-pointer text-[11px]"
                  >
                    + Add Dose
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CARD 4: CLINICAL DOSE MATRIX & SAFETY BREAKDOWN */}
          <div className="px-4">
            <div className="rounded-3xl bg-white border border-[#e5eeff] p-4 shadow-sm flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#00685f] text-[20px]">biotech</span>
                  <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[16px] text-[#0b1c30]">
                    Clinical Dose Matrix
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e1e0ff] text-[#07006c]">
                    ISF 1:{profile.insulinSensitivityFactor}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e1e0ff] text-[#07006c]">
                    ICR 1:{profile.insulinToCarbRatio}
                  </span>
                </div>
              </div>

              
              {/* Step-by-Step Breakdown Rows */}
              <div className="flex flex-col gap-2 rounded-2xl bg-[#eff4ff] p-3 text-[12px]">
                {(!doseResult.calculationMethod || doseResult.calculationMethod === 'dynamic') ? (
                  <>
                    {/* Target Base */}
                    <div className="flex items-center justify-between text-[#3d4947]">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-[#006947]">my_location</span>
                        Target Glucose
                      </span>
                      <span className="font-semibold text-[#0b1c30]">
                        {profile.targetGlucose || 110} mg/dL
                      </span>
                    </div>

                    {/* Correction Dose */}
                    {doseResult.correctionUnits > 0 && (
                      <div className="flex items-center justify-between text-[#ba1a1a]">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">trending_up</span>
                          Correction Dose (Excess / {profile.insulinSensitivityFactor})
                        </span>
                        <span className="font-semibold text-[#0b1c30]">
                          +{doseResult.correctionUnits.toFixed(2)} Units
                        </span>
                      </div>
                    )}

                    {/* Negative Offset */}
                    {doseResult.negativeCorrectionUnits && doseResult.negativeCorrectionUnits < 0 && (
                      <div className="flex items-center justify-between text-[#00685f]">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">remove_circle_outline</span>
                          Negative Delta Offset (Safe Carb Reduction)
                        </span>
                        <span className="font-semibold">
                          {doseResult.negativeCorrectionUnits.toFixed(2)} Units
                        </span>
                      </div>
                    )}

                    {/* Carbohydrate Coverage */}
                    <div className="flex items-center justify-between text-[#3d4947]">
                      <span>Carbohydrate Coverage ({currentCarbs}g / {profile.insulinToCarbRatio})</span>
                      <span className="font-semibold text-[#0b1c30]">
                        +{doseResult.carbCoverageUnits.toFixed(2)} Units
                      </span>
                    </div>

                    <div className="h-px bg-[#bcc9c6]/40 my-0.5" />

                    {/* Gross Required */}
                    <div className="flex items-center justify-between text-[#0b1c30]">
                      <span className="font-bold">Gross Required Bolus</span>
                      <span className="font-bold">{doseResult.grossRequiredUnits.toFixed(2)} Units</span>
                    </div>

                    {/* IOB Deduction */}
                    <div className="flex items-center justify-between text-[#4648d4]">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">shield_with_heart</span>
                        Active IOB Deduction (Anti-Stacking)
                      </span>
                      <span className="font-semibold">
                        -{doseResult.iobDeductionUnits.toFixed(2)} Units
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Fixed Basal / Pre-Mixed Base Amount */}
                    <div className="flex items-center justify-between text-[#3d4947]">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-[#006947]">my_location</span>
                        Prescribed Base Dose (Anchor)
                      </span>
                      <span className="font-semibold text-[#0b1c30]">
                        {(doseResult.netRecommendedUnits - (doseResult.correctionUnits || 0) - (doseResult.negativeCorrectionUnits || 0) + (doseResult.iobDeductionUnits || 0)).toFixed(2)} Units
                      </span>
                    </div>

                    {/* Sliding Scale (if applicable) */}
                    {doseResult.correctionUnits > 0 && (
                      <div className="flex items-center justify-between text-[#ba1a1a]">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">trending_up</span>
                          High BG Sliding Scale Addition
                        </span>
                        <span className="font-semibold">
                          +{doseResult.correctionUnits.toFixed(2)} Units
                        </span>
                      </div>
                    )}
                    
                    {/* Negative Sliding Scale */}
                    {doseResult.negativeCorrectionUnits && doseResult.negativeCorrectionUnits < 0 && (
                      <div className="flex items-center justify-between text-[#00685f]">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">remove_circle_outline</span>
                          Low BG Sliding Scale Reduction
                        </span>
                        <span className="font-semibold">
                          {doseResult.negativeCorrectionUnits.toFixed(2)} Units
                        </span>
                      </div>
                    )}
                    
                    {/* IOB Deduction for Premixed */}
                    {doseResult.iobDeductionUnits > 0 && (
                      <div className="flex items-center justify-between text-[#4648d4]">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">shield_with_heart</span>
                          Active IOB Deduction (Anti-Stacking)
                        </span>
                        <span className="font-semibold">
                          -{doseResult.iobDeductionUnits.toFixed(2)} Units
                        </span>
                      </div>
                    )}
                  </>
                )}

                <div className="h-px bg-[#bcc9c6]/40 my-0.5" />

                {/* Net Recommended */}
                <div className="flex flex-col text-[#00685f] font-bold pt-0.5">
                  <div className="flex items-center justify-between">
                    <span>Net Algorithmic Recommendation</span>
                    <span>{doseResult.netRecommendedUnits.toFixed(2)} Units</span>
                  </div>
                  <span className="text-[10px] font-normal mt-0.5 opacity-80">
                    Exact mathematical requirement before physical device rounding constraints.
                  </span>
                </div>
              </div>

              {/* Pre-Bolus Timing Advisory Card */}

              {doseResult.preBolusAdvice && (
                <div className="p-3 rounded-2xl bg-[#eff4ff] border border-[#dce9ff] flex items-start gap-2 text-[11px] text-[#3d4947]">
                  <span className="material-symbols-outlined text-[18px] text-[#4648d4] flex-shrink-0 mt-0.5">
                    timer
                  </span>
                  <div>
                    <span className="font-bold text-[#0b1c30] block">
                      Pharmacokinetic Pre-Bolus Advisory ({doseResult.preBolusMinutes} min wait)
                    </span>
                    <span>{doseResult.preBolusAdvice}</span>
                  </div>
                </div>
              )}

              {/* CARD 4.5: EXERCISE MODIFIER */}
              <div className="p-4 rounded-2xl bg-white border border-[#e5eeff] shadow-sm space-y-3">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#e65100]">directions_run</span>
                  <h4 className="font-bold text-[13px] text-[#0b1c30]">Exercise / Activity Modifier</h4>
                </div>
                <p className="text-[11px] text-[#3d4947] leading-snug">
                  Physical activity acts as "invisible insulin". Select your activity level to safely reduce the recommended dose.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'none', label: 'None', reduction: 0 },
                    { id: 'light', label: 'Light (-10%)', reduction: 10 },
                    { id: 'moderate', label: 'Moderate (-20%)', reduction: 20 },
                    { id: 'intense', label: 'Intense (-30%)', reduction: 30 },
                  ].map(level => (
                    <button
                      key={level.id}
                      onClick={() => setExerciseIntensity(level.id as any)}
                      className={`py-2 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer flex flex-col items-center ${
                        exerciseIntensity === level.id
                          ? 'bg-[#e65100] text-white border-[#e65100] shadow-xs'
                          : 'bg-white text-[#3d4947] border-[#e5eeff] hover:bg-[#eff4ff]'
                      }`}
                    >
                      <span>{level.label.split(' ')[0]}</span>
                      {level.reduction > 0 && (
                        <span className={`text-[9px] ${exerciseIntensity === level.id ? 'text-white/80' : 'text-[#e65100]'}`}>
                          -{level.reduction}% Dose
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* CARD 5: RECOMMENDED DOSE & INTERACTIVE DOSE ADJUSTER */}
              {/* Fulfills user request: "and then adjust that dose" */}
              <div className="p-4 rounded-2xl bg-[#00685f] text-white flex flex-col items-center justify-center relative overflow-hidden shadow-md">
                <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
                  <span className="material-symbols-outlined text-[120px]">vaccines</span>
                </div>

                <span className="text-[10px] uppercase tracking-wider text-white/80 font-bold mb-1">
                  Adjusted Recommended Dose
                </span>

                <div className="flex items-baseline gap-2">
                  <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[48px] font-extrabold tracking-tight leading-none">
                    {recommendedPenUnits.toFixed(1)}
                  </span>
                  <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[20px] font-bold">Units</span>
                </div>

                <div className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#008378] text-white text-[11px] font-medium">
                  <span className="material-symbols-outlined text-[14px]">tune</span>
                  <span>Exact {doseResult.netRecommendedUnits.toFixed(2)}u rounded to 0.5u pen step</span>
                </div>
              </div>

              {/* INTERACTIVE DOSE ADJUSTMENT TOOL */}
              <div className="p-3.5 rounded-2xl bg-[#f5f8ff] border border-[#dce9ff] flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#0b1c30] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[17px] text-[#00685f]">tune</span>
                    Total Bolus Dose to Inject Now
                  </span>

                  {userAdjustedDose !== null && userAdjustedDose !== recommendedPenUnits && (
                    <button
                      type="button"
                      onClick={handleResetToAdvisorDose}
                      className="text-[11px] text-[#00685f] hover:underline font-bold cursor-pointer"
                    >
                      Reset to Advisor ({recommendedPenUnits}u)
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-[#3d4947]">
                  This is the <strong>total rapid-acting bolus</strong> you should inject right now. Do not add this to your long-acting (basal) insulin. You can dial it up or down for physical exercise, illness, or personal calibration.
                </p>

                {/* Stepper Controls */}
                <div className="flex items-center justify-between p-2 rounded-2xl bg-white border border-[#c0c1ff]">
                  <button
                    type="button"
                    onClick={() => handleStepFinalDose(-0.5)}
                    className="w-11 h-11 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] active:scale-95 text-[#0b1c30] font-bold flex items-center justify-center transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[22px]">remove</span>
                  </button>

                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={currentFinalDose}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val)) setUserAdjustedDose(Math.max(0, val));
                        }}
                        className="w-24 text-center font-['Plus_Jakarta_Sans',sans-serif] text-[32px] font-extrabold text-[#0b1c30] leading-none bg-[#eff4ff] border border-[#dce9ff] rounded-xl px-1 py-0.5 focus:ring-2 focus:ring-[#00685f] focus:outline-none"
                      />
                      <span className="text-[13px] text-[#3d4947] font-bold">Units</span>
                    </div>

                    {userAdjustedDose !== null && userAdjustedDose !== recommendedPenUnits ? (
                      <span className={`text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full ${
                        currentFinalDose > recommendedPenUnits
                          ? 'bg-[#e1e0ff] text-[#07006c]'
                          : 'bg-[#006947]/10 text-[#006947]'
                      }`}>
                        {currentFinalDose > recommendedPenUnits ? '+' : ''}
                        {(currentFinalDose - recommendedPenUnits).toFixed(1)}u User Adjustment
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#00685f] font-semibold mt-1">
                        Matches Clinical Advisor
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStepFinalDose(0.5)}
                    className="w-11 h-11 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] active:scale-95 text-[#0b1c30] font-bold flex items-center justify-center transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[22px]">add</span>
                  </button>
                </div>

                {/* Real-time Predictive BG with Adjusted Dose */}
                <div className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] ${
                  isAdjustedProjectedHypo
                    ? 'bg-[#ffdad6] border-[#ffb4ab] text-[#93000a]'
                    : adjustedProjectedBg > 180
                    ? 'bg-[#fff8e1] border-[#ffe082] text-[#8d6e00]'
                    : 'bg-white border-[#e5eeff] text-[#0b1c30]'
                }`}>
                  <span className="flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-[16px]">
                      {isAdjustedProjectedHypo ? 'warning' : 'timelapse'}
                    </span>
                    Projected BG at Clearance:
                  </span>
                  <span className="font-extrabold text-[12px]">
                    ~{adjustedProjectedBg} mg/dL
                    {isAdjustedProjectedHypo && ' (Hypoglycemia Risk!)'}
                    {adjustedProjectedBg >= 70 && adjustedProjectedBg <= 180 && ' (Target Range)'}
                  </span>
                </div>
              </div>

              {/* Safety Engine Guard Banner */}
              <div className="p-3 rounded-2xl bg-[#006947]/10 text-[#006947] flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5 text-[#006947]">
                  verified
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-bold block text-[#006947]">
                    Safety Engine Protection Passed
                  </span>
                  <p className="text-[11px] text-[#3d4947] mt-0.5 leading-snug">
                    {doseResult.safetyMessage ||
                      'Anti-stacking algorithm verified. Active IOB deducted to avert severe postprandial hypoglycemic overshoot.'}
                  </p>
                </div>
              </div>

              {/* Injection Site & Device Tracker */}
              <div className="p-3 rounded-2xl bg-[#eff4ff] border border-[#dce9ff] flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#0b1c30] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[17px] text-[#00685f]">body_system</span>
                    Injection Site & Device Tracker
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {['Abdomen', 'Left Arm', 'Right Arm', 'Left Thigh', 'Right Thigh', 'Buttocks'].map(site => (
                    <button
                      key={site}
                      type="button"
                      onClick={() => setInjectionSite(site)}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        injectionSite === site
                          ? 'bg-[#00685f] text-white border-[#00685f]'
                          : 'bg-white text-[#3d4947] border-[#c0c1ff] hover:bg-[#e5eeff]'
                      }`}
                    >
                      {site}
                    </button>
                  ))}
                </div>
                
                <div className="mt-1">
                  <label className="text-[10px] text-[#3d4947] font-semibold mb-1 block">Insulin Delivery Device</label>
                  <div className="flex gap-1.5">
                    {[
                      { id: 'pen_whole', label: 'Pen (1u)' },
                      { id: 'pen_half', label: 'Pen (0.5u)' },
                      { id: 'syringe', label: 'Syringe' }
                    ].map(dev => (
                      <button
                        key={dev.id}
                        type="button"
                        onClick={() => setDeliveryDevice(dev.id as any)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                          deliveryDevice === dev.id
                            ? 'bg-[#4648d4] text-white border-[#4648d4]'
                            : 'bg-white text-[#3d4947] border-[#c0c1ff] hover:bg-[#e5eeff]'
                        }`}
                      >
                        {dev.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={handleCommitCalculation}
                  className="w-full h-12 rounded-full bg-[#00685f] hover:bg-[#005049] text-white text-[13px] font-bold flex items-center justify-center gap-2 active:scale-98 shadow-sm transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  <span>
                    Confirm &amp; Log {currentFinalDose.toFixed(1)}u Bolus
                  </span>
                </button>
                <button
                  onClick={onOpenParameterModal}
                  className="w-full h-11 rounded-full bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                  <span>Customize Clinical Ratios (ISF / ICR / DIA)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Quick Standalone Insulin Entry */}
      {mode === 'quick' && (
        <form onSubmit={handleCommitQuickInsulin} className="px-4 mt-3 flex flex-col gap-3.5">
          <div className="p-4 rounded-3xl bg-white border border-[#e5eeff] shadow-sm flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#4648d4]">
                <span className="material-symbols-outlined text-[20px]">medication</span>
                <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[16px] text-[#0b1c30]">
                  Record Past or Immediate Insulin
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e1e0ff] text-[#07006c]">
                Direct Administration
              </span>
            </div>

            <p className="text-[12px] text-[#3d4947]">
              Record insulin doses taken earlier or before opening the app. Pharmacokinetic clearance and active IOB will be calculated immediately.
            </p>

            {/* Insulin Selector & Quick Regimen Switcher */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] text-[#3d4947] font-semibold block">Insulin Formulation</label>
                <button
                  type="button"
                  onClick={onOpenParameterModal}
                  className="text-[11px] text-[#00685f] font-bold hover:underline cursor-pointer"
                >
                  Manage Timings
                </button>
              </div>

              {activeRegimenInsulins.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  {activeRegimenInsulins.map(insId => {
                    const insObj = getInsulinProfileById(insId);
                    if (!insObj) return null;
                    const insDia = getRecommendedDiaForInsulin(insId);
                    const isSelected = quickInsulinId === insId;
                    const scheduledSlotMatch = profile.insulinSchedules?.find(s => s.insulinId === insId)?.slots.includes(quickSlot);
                    return (
                      <button
                        key={insId}
                        type="button"
                        onClick={() => setQuickInsulinId(insId)}
                        className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#00685f] bg-[#00685f]/5 shadow-2xs'
                            : 'border-[#e5eeff] bg-[#eff4ff] hover:bg-[#e5eeff]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[13px] text-[#0b1c30]">{insObj.name}</span>
                          {isSelected ? (
                            <span className="material-symbols-outlined text-[#00685f] text-[18px]">radio_button_checked</span>
                          ) : (
                            <span className="material-symbols-outlined text-[#bcc9c6] text-[18px]">radio_button_unchecked</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[10px]">
                          <span className="text-[#3d4947]">{insObj.category}</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-white font-bold text-[#00685f] border border-[#dce9ff]">
                            DIA: {insDia}h
                          </span>
                        </div>
                        {scheduledSlotMatch && (
                          <div className="mt-1 text-[10px] font-bold text-[#006947] flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[12px]">schedule</span>
                            Scheduled for {quickSlot.replace('_', ' ')}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <select
                value={quickInsulinId}
                onChange={(e) => setQuickInsulinId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#eff4ff] border border-[#e5eeff] text-[#0b1c30] text-[13px] font-medium"
              >
                {activeInsulins.map(ins => {
                  const insDia = getRecommendedDiaForInsulin(ins.id);
                  return (
                    <option key={ins.id} value={ins.id}>
                      {ins.name} ({ins.category} • DIA: {insDia}h)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Dose Stepper */}
            <div>
              <label className="text-[12px] text-[#3d4947] font-semibold mb-1 block">Dose (Units)</label>
              <div className="flex items-center justify-between p-2 rounded-2xl bg-[#eff4ff]">
                <button
                  type="button"
                  onClick={() => handleAdjustQuickDose(-1)}
                  className="w-11 h-11 rounded-xl bg-white text-[#0b1c30] font-bold flex items-center justify-center shadow-xs border border-[#e5eeff] cursor-pointer"
                >
                  <span className="material-symbols-outlined">remove</span>
                </button>
                <div className="flex items-center justify-center gap-1.5">
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="100"
                    value={quickDose}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val)) setQuickDose(Math.max(0.5, val));
                    }}
                    className="w-24 text-center font-['Plus_Jakarta_Sans',sans-serif] text-[32px] font-extrabold text-[#0b1c30] bg-white border border-[#c0c1ff]/60 rounded-xl px-1 py-0.5 focus:ring-2 focus:ring-[#4648d4] focus:outline-none"
                  />
                  <span className="text-[13px] text-[#3d4947] font-semibold">units</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAdjustQuickDose(1)}
                  className="w-11 h-11 rounded-xl bg-white text-[#0b1c30] font-bold flex items-center justify-center shadow-xs border border-[#e5eeff] cursor-pointer"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
            </div>

            {/* Context */}
            <div>
              <label className="text-[12px] text-[#3d4947] font-semibold mb-1 block">Context / Timing</label>
              <select
                value={quickSlot}
                onChange={(e) => setQuickSlot(e.target.value as RoutineSlot)}
                className="w-full h-11 px-3 rounded-xl bg-[#eff4ff] border border-[#e5eeff] text-[#0b1c30] text-[13px] font-medium"
              >
                <option value="before_breakfast">Before Breakfast (Morning Dose)</option>
                <option value="after_breakfast">After Breakfast</option>
                <option value="before_lunch">Before Lunch (Afternoon Dose)</option>
                <option value="after_lunch">After Lunch</option>
                <option value="before_dinner">Before Dinner (Night Dose)</option>
                <option value="after_dinner">After Dinner</option>
                <option value="manual">Manual / Correction</option>
              </select>
            </div>

            {/* Past Time Quick Presets */}
            <div>
              <label className="text-[11px] text-[#3d4947] font-semibold mb-1.5 block">
                Quick Time Presets (Elapsed Since Dose)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyQuickTimePreset(0)}
                  className="py-1 px-2 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] text-[11px] font-bold text-center cursor-pointer"
                >
                  Just Now
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyQuickTimePreset(30)}
                  className="py-1 px-2 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] text-[11px] font-bold text-center cursor-pointer"
                >
                  30m ago
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyQuickTimePreset(60)}
                  className="py-1 px-2 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] text-[11px] font-bold text-center cursor-pointer"
                >
                  1h ago
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyQuickTimePreset(120)}
                  className="py-1 px-2 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] text-[11px] font-bold text-center cursor-pointer"
                >
                  2h ago
                </button>
              </div>
            </div>

            {/* Date & Time Input */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-[#3d4947] font-semibold mb-1 block">Date</label>
                <input
                  type="date"
                  value={quickDate}
                  onChange={(e) => setQuickDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-[#eff4ff] border border-[#e5eeff] text-[#0b1c30] text-[12px]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#3d4947] font-semibold mb-1 block">Time</label>
                <input
                  type="time"
                  value={quickTime}
                  onChange={(e) => setQuickTime(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-[#eff4ff] border border-[#e5eeff] text-[#0b1c30] text-[12px]"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[11px] text-[#3d4947] font-semibold mb-1 block">Notes (Optional)</label>
              <input
                type="text"
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                placeholder="e.g. Injected before opening app"
                className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-[#e5eeff] text-[#0b1c30] text-[12px]"
              />
            </div>

            {/* Quick Injection Site & Device Tracker */}
            <div className="p-3 rounded-2xl bg-[#eff4ff] border border-[#dce9ff] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#0b1c30] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[17px] text-[#00685f]">body_system</span>
                  Injection Site & Device
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {['Abdomen', 'Left Arm', 'Right Arm', 'Left Thigh', 'Right Thigh', 'Buttocks'].map(site => (
                  <button
                    key={site}
                    type="button"
                    onClick={() => setInjectionSite(site)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                      injectionSite === site
                        ? 'bg-[#00685f] text-white border-[#00685f]'
                        : 'bg-white text-[#3d4947] border-[#c0c1ff] hover:bg-[#e5eeff]'
                    }`}
                  >
                    {site}
                  </button>
                ))}
              </div>
              
              <div className="mt-1">
                <label className="text-[10px] text-[#3d4947] font-semibold mb-1 block">Delivery Device</label>
                <div className="flex gap-1.5">
                  {[
                    { id: 'pen_whole', label: 'Pen (1u)' },
                    { id: 'pen_half', label: 'Pen (0.5u)' },
                    { id: 'syringe', label: 'Syringe' }
                  ].map(dev => (
                    <button
                      key={dev.id}
                      type="button"
                      onClick={() => setDeliveryDevice(dev.id as any)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        deliveryDevice === dev.id
                          ? 'bg-[#4648d4] text-white border-[#4648d4]'
                          : 'bg-white text-[#3d4947] border-[#c0c1ff] hover:bg-[#e5eeff]'
                      }`}
                    >
                      {dev.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-12 rounded-full bg-[#4648d4] hover:bg-[#3739be] text-white text-[13px] font-bold flex items-center justify-center gap-2 active:scale-98 shadow-sm transition-all cursor-pointer mt-1"
            >
              <span className="material-symbols-outlined text-[20px]">save</span>
              <span>Save Past Insulin Dose to SQLite</span>
            </button>
          </div>
        </form>
      )}

      {/* DYNAMIC RECENT DOSE HISTORY LIST */}
      <div className="px-4 mt-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[15px] text-[#0b1c30]">
            Recent Dose History ({insulinRecords.length})
          </span>
          <button
            type="button"
            onClick={() => setMode('quick')}
            className="text-[11px] text-[#00685f] font-bold hover:underline cursor-pointer flex items-center gap-0.5"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            Add Past Dose
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {insulinRecords.length === 0 ? (
            <div className="p-4 rounded-2xl bg-white border border-[#e5eeff] text-center text-[#3d4947] text-[12px]">
              No insulin doses logged yet. Use the Smart Advisor or Quick Entry to record past and current doses.
            </div>
          ) : (
            insulinRecords.slice(0, 8).map(record => {
              const recordTime = new Date(record.timestamp);
              const elapsedHours = Math.max(0, (Date.now() - recordTime.getTime()) / (1000 * 60 * 60));
              const singleIob = calculateSingleDoseIob(record.doseUnits, record.insulinId, elapsedHours);
              const hasActiveIob = singleIob.remainingUnits > 0.05;

              return (
                <div
                  key={record.id}
                  className="p-3 rounded-2xl bg-white border border-[#e5eeff] shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      hasActiveIob ? 'bg-[#e1e0ff] text-[#07006c]' : 'bg-[#eff4ff] text-[#3d4947]'
                    }`}>
                      <span className="material-symbols-outlined text-[20px]">
                        {hasActiveIob ? 'vaccines' : 'check'}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[13px] font-bold text-[#0b1c30]">
                          {record.doseUnits} Units {record.insulinName}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#eff4ff] text-[#3d4947]">
                          {(record.slot || record.context || 'dose').replace('_', ' ')}
                        </span>
                        {record.deliveryDevice && (
                           <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#e1e0ff] text-[#4648d4]" title="Delivery Device">
                             {record.deliveryDevice === 'pen_whole' ? 'Pen (1u)' : record.deliveryDevice === 'pen_half' ? 'Pen (0.5u)' : 'Syringe'}
                           </span>
                        )}
                        {record.injectionSite && (
                           <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#006947]/10 text-[#006947]" title="Injection Site">
                             {record.injectionSite}
                           </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px]">
                        {hasActiveIob ? (
                          <span className="text-[#2f2ebe] font-bold">
                            Active IOB: ~{singleIob.remainingUnits.toFixed(2)}u remaining ({singleIob.percentRemaining}%)
                          </span>
                        ) : (
                          <span className="text-[#6d7a77]">Fully cleared</span>
                        )}
                        {record.notes && (
                          <span className="text-[#3d4947] truncate max-w-[140px]">
                            • {record.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-[#0b1c30] block">
                        {recordTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[10px] text-[#6d7a77]">
                        {elapsedHours < 24
                          ? `${elapsedHours < 1 ? Math.round(elapsedHours * 60) + 'm' : elapsedHours.toFixed(1) + 'h'} ago`
                          : recordTime.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    {onDeleteInsulinRecord && (
                      <button
                        type="button"
                        onClick={() => setRecordToDelete(record)}
                        title="Delete record"
                        className="w-8 h-8 rounded-lg text-[#ba1a1a]/70 hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[17px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-xl flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[#ba1a1a]">
              <span className="material-symbols-outlined text-[24px]">delete</span>
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[16px] text-[#0b1c30]">
                Delete Insulin Record?
              </span>
            </div>
            <p className="text-[12px] text-[#3d4947]">
              Are you sure you want to delete this record of <strong>{recordToDelete.doseUnits} Units of {recordToDelete.insulinName}</strong>? This will remove its active IOB from calculations.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 rounded-full text-[12px] font-semibold text-[#3d4947] hover:bg-[#eff4ff] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                className="px-4 py-2 rounded-full text-[12px] font-bold bg-[#ba1a1a] hover:bg-[#93000a] text-white shadow-xs cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification confirmation for log action */}
      <div
        className={`fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full bg-[#213145] text-[#eaf1ff] shadow-xl flex items-center gap-2 transition-all duration-300 z-50 ${
          showToast ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <span className="material-symbols-outlined text-[#6ffbbe] text-[18px]">verified</span>
        <span className="text-[12px] font-medium">{toastMsg}</span>
      </div>
    </div>
  );
};
