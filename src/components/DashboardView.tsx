import React from 'react';
import { GlucoseRecord, InsulinRecord, PatientProfile, RoutineSlot } from '../types';
import { calculateCurrentIob } from '../services/iobEngine';
import { calculatePeriodAnalysis } from '../services/analysisEngine';
import { detectClinicalPatterns } from '../services/patternEngine';
import { getInsulinProfileById, getRecommendedDiaForInsulin } from '../data/insulinDatabase';
import { TabKey } from './BottomNav';
import { PWAInstallButton } from './PWAInstallButton';

interface DashboardViewProps {
  profile: PatientProfile;
  glucoseRecords: GlucoseRecord[];
  insulinRecords: InsulinRecord[];
  onNavigate: (tab: TabKey, submode?: 'calc' | 'quick') => void;
  onSlotClick: (slot: string) => void;
  onClearData?: () => void;
  onOpenParameterModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  glucoseRecords,
  insulinRecords,
  onNavigate,
  onSlotClick,
  onClearData,
  onOpenParameterModal
}) => {
  // Current IOB
  const nowIso = new Date().toISOString();
  const iobResult = calculateCurrentIob(insulinRecords, nowIso, profile.activeDurationHours);

  // Dynamic period metrics
  const analysis3d = calculatePeriodAnalysis(glucoseRecords, 3, '3-Day');
  const analysis7d = calculatePeriodAnalysis(glucoseRecords, 7, '7-Day');
  const analysis30d = calculatePeriodAnalysis(glucoseRecords, 30, '30-Day');
  const analysis90d = calculatePeriodAnalysis(glucoseRecords, 90, '90-Day');

  // Clinical patterns detection (only triggers if readings exist and match pattern criteria)
  const clinicalPatterns = detectClinicalPatterns(glucoseRecords);
  const dawnPattern = clinicalPatterns.find(p => p.type === 'dawn_phenomenon');

  // Doctor Prescribed Basal Dose & Auto-Titration (3-Day Rules)
  const prescribedBasal = profile.prescribedBasalDose || 0;
  const has3DaysData = analysis3d.day1Avg !== undefined && analysis3d.day2Avg !== undefined && analysis3d.day3Avg !== undefined;
  
  let doseAdjustment = 0;
  let doseAdvice = 'Requires 3 consecutive days of glucose readings to unlock safe basal adjustments.';
  let titrationAction = 'Need Data';
  let titrationColor = 'text-[#d97706]';
  let titrationBg = 'bg-[#d97706]/10';

  if (has3DaysData && prescribedBasal > 0) {
    if (analysis3d.avgGlucose > profile.targetRangeMax) {
      doseAdjustment = Math.ceil(prescribedBasal * 0.1); // +10% rule
      doseAdvice = `3-Day Average (${analysis3d.avgGlucose} mg/dL) is above target (${profile.targetRangeMax}). Consult your doctor to increase basal by +${doseAdjustment}u.`;
      titrationAction = `+${doseAdjustment} Units`;
      titrationColor = 'text-[#ba1a1a]';
      titrationBg = 'bg-[#ba1a1a]/10';
    } else if (analysis3d.avgGlucose < profile.targetRangeMin) {
      doseAdjustment = Math.ceil(prescribedBasal * 0.1); // -10% rule
      doseAdvice = `3-Day Average (${analysis3d.avgGlucose} mg/dL) is below target (${profile.targetRangeMin}). Reduce basal immediately by -${doseAdjustment}u to prevent hypoglycemia.`;
      titrationAction = `-${doseAdjustment} Units`;
      titrationColor = 'text-[#006947]';
      titrationBg = 'bg-[#006947]/10';
    } else {
      doseAdvice = `3-Day Average (${analysis3d.avgGlucose} mg/dL) is strictly within target. No adjustments needed to your prescribed dose.`;
      titrationAction = `Optimal`;
      titrationColor = 'text-[#4648d4]';
      titrationBg = 'bg-[#4648d4]/10';
    }
  } else if (prescribedBasal === 0) {
    doseAdvice = 'Set your Doctor Prescribed Basal Dose in profile settings to unlock clinical auto-titration.';
    titrationAction = 'Setup';
    titrationColor = 'text-[#4648d4]';
    titrationBg = 'bg-[#4648d4]/10';
  }

  // Latest glucose reading and manual history comparison
  const latestRec = glucoseRecords[0];
  const previousRec = glucoseRecords[1];
  const hasReadings = glucoseRecords.length > 0;
  const latestGlucose = latestRec?.value ?? null;
  const delta = latestRec && previousRec ? latestRec.value - previousRec.value : null;
  const isTarget = latestGlucose !== null && latestGlucose >= profile.targetRangeMin && latestGlucose <= profile.targetRangeMax;
  const lastLoggedTime = latestRec
    ? new Date(latestRec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'No entries yet';
  const lastLoggedSlotName = latestRec?.slot
    ? latestRec.slot.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : 'No checks recorded';

  // 6 Routine Slots Definition
  const ROUTINE_SLOTS_DEF: { id: RoutineSlot; label: string; defaultWindow: string; targetTime: string }[] = [
    { id: 'before_breakfast', label: '1. Before Breakfast', defaultWindow: 'Fasting wake-up', targetTime: '7:30 AM' },
    { id: 'after_breakfast', label: '2. After Breakfast', defaultWindow: 'Postprandial 2h', targetTime: '9:15 AM' },
    { id: 'before_lunch', label: '3. Before Lunch', defaultWindow: 'Pre-meal check', targetTime: '12:45 PM' },
    { id: 'after_lunch', label: '4. After Lunch', defaultWindow: 'Postprandial 2h', targetTime: '2:00 PM' },
    { id: 'before_dinner', label: '5. Before Dinner', defaultWindow: 'Evening check', targetTime: '7:00 PM' },
    { id: 'after_dinner', label: '6. After Dinner', defaultWindow: 'Bedtime check', targetTime: '9:30 PM' },
  ];

  const completedSlotsCount = ROUTINE_SLOTS_DEF.filter(s => glucoseRecords.some(r => r.slot === s.id)).length;

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto px-4 pt-3 pb-24 space-y-4">
      {/* TOP HERO: Real-time Telemetry Card */}
      <div className="relative overflow-hidden bg-white rounded-3xl p-5 shadow-sm border border-[#e5eeff]">
        {/* Ambient target glow background tint */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#6ffbbe]/25 blur-3xl pointer-events-none" />

        {/* Header Meta Row */}
        <div className="flex items-center justify-between relative z-10">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${
            !hasReadings
              ? 'bg-[#eff4ff] text-[#3d4947]'
              : isTarget
              ? 'bg-[#006947]/10 text-[#006947]'
              : latestGlucose! < 70
              ? 'bg-[#ba1a1a]/10 text-[#ba1a1a]'
              : 'bg-[#d97706]/10 text-[#d97706]'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              !hasReadings
                ? 'bg-[#bcc9c6]'
                : isTarget
                ? 'bg-[#006947]'
                : latestGlucose! < 70
                ? 'bg-[#ba1a1a]'
                : 'bg-[#d97706]'
            }`} />
            <span className="text-[11px] uppercase tracking-wider font-semibold">
              {!hasReadings
                ? 'No Readings Recorded'
                : isTarget
                ? 'In Target Range (70–180)'
                : latestGlucose! < 70
                ? 'Hypo Alert (<70)'
                : 'Elevated (>180)'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[#3d4947] text-[11px]">
            <span className="material-symbols-outlined text-[15px]">colorize</span>
            <span>Manual Fingerstick Log</span>
          </div>
        </div>

        {/* Glycemic Big Number & Trend Velocity */}
        <div className="flex items-baseline justify-between mt-3 mb-1 relative z-10">
          <div className="flex items-baseline gap-2">
            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[48px] leading-none text-[#0b1c30] font-extrabold tracking-tight">
              {hasReadings ? latestGlucose : '--'}
            </span>
            <span className="text-[15px] text-[#3d4947] font-semibold">mg/dL</span>
          </div>
          <div className="flex flex-col items-end">
            {hasReadings && delta !== null ? (
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-white shadow-sm ${
                  Math.abs(delta) <= 15
                    ? 'bg-[#006947]'
                    : delta > 15
                    ? 'bg-[#d97706]'
                    : 'bg-[#00685f]'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">
                  {delta > 5 ? 'north_east' : delta < -5 ? 'south_east' : 'horizontal_rule'}
                </span>
                <span className="text-[12px] font-bold">
                  {delta > 0 ? `+${delta}` : `${delta}`} mg/dL
                </span>
              </div>
            ) : hasReadings ? (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#00685f] text-white shadow-sm">
                <span className="material-symbols-outlined text-[15px]">colorize</span>
                <span className="text-[11px] font-bold">Initial Entry</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('log-and-dose', 'calc')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#00685f] hover:bg-[#005049] text-white shadow-sm text-[11px] font-bold cursor-pointer"
              >
                <span>+ Log Reading</span>
              </button>
            )}
            <span className="text-[11px] text-[#3d4947] mt-0.5">
              {hasReadings ? (delta !== null ? 'vs prior test' : 'Self-tested') : 'Ready for first test'}
            </span>
          </div>
        </div>

        {/* Sub-context bar */}
        <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-[#eff4ff] text-[#3d4947] text-[12px] relative z-10">
          <span className="material-symbols-outlined text-[16px] text-[#00685f]">schedule</span>
          <span>{hasReadings ? `Logged: ${lastLoggedTime}` : 'No reading recorded yet today'}</span>
          {hasReadings && (
            <>
              <span className="w-1 h-1 rounded-full bg-[#bcc9c6]" />
              <span className="font-medium text-[#0b1c30]">{lastLoggedSlotName}</span>
            </>
          )}
        </div>

        {/* Micro Target Band Visualizer (70 - 180 zone) */}
        <div className="mt-3.5 space-y-1 relative z-10">
          <div className="flex justify-between text-[10px] text-[#3d4947] font-medium">
            <span>Hypo &lt;70</span>
            <span className="text-[#006947] font-semibold">Target 70–180</span>
            <span>Hyper &gt;180</span>
          </div>
          <div className="h-2 w-full bg-[#e5eeff] rounded-full overflow-hidden flex p-0.5 relative">
            <div className="h-full w-[25%] bg-[#ba1a1a]/20 rounded-l-full" />
            <div className="h-full w-[50%] bg-[#6ffbbe]/50 rounded-sm relative">
              {hasReadings && latestGlucose !== null && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#00685f] rounded-full shadow"
                  style={{
                    left: `${Math.max(5, Math.min(95, ((latestGlucose - 70) / (180 - 70)) * 100))}%`
                  }}
                />
              )}
            </div>
            <div className="h-full w-[25%] bg-[#4648d4]/20 rounded-r-full" />
          </div>
        </div>

        {/* Micro Divider */}
        <div className="h-px w-full bg-[#e5eeff] my-3" />

        {/* Prominent IOB Real-Time Section */}
        <div className="p-3.5 rounded-2xl bg-[#e1e0ff]/50 border border-[#c0c1ff]/40 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#4648d4] text-white flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-[18px]">vaccines</span>
              </div>
              <div>
                <span className="text-[10px] text-[#2f2ebe] uppercase tracking-wider font-bold">
                  Insulin On Board
                </span>
                <div className="font-['Plus_Jakarta_Sans',sans-serif] text-[18px] text-[#07006c] font-bold leading-tight">
                  {iobResult.totalIob.toFixed(1)} Units Active
                </div>
              </div>
            </div>
            <div className="text-right">
              {iobResult.totalIob > 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-white text-[#4648d4] font-semibold shadow-xs">
                  <span className="material-symbols-outlined text-[13px]">timelapse</span>
                  Est. clear {Math.floor(iobResult.estimatedClearanceHours)}h{' '}
                  {Math.round((iobResult.estimatedClearanceHours % 1) * 60)}m
                </span>
              ) : (
                <span className="text-[11px] text-[#555f5d] px-2 py-0.5 rounded-full bg-white/80 font-medium">
                  Clear
                </span>
              )}
            </div>
          </div>

          {/* Stack breakdown */}
          {iobResult.breakdown.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 mt-1">
              {iobResult.breakdown.map((item, idx) => (
                <div key={idx} className="bg-white/90 rounded-xl p-2.5 flex flex-col border border-[#c0c1ff]/30 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#0b1c30] font-bold truncate">{item.insulinName}</span>
                    <span className="text-[11px] font-bold text-[#4648d4]">{item.remainingUnits.toFixed(1)} u</span>
                  </div>
                  <span className="text-[10px] text-[#3d4947]/80 capitalize">{item.category} active</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-1 p-2 bg-white/70 rounded-xl text-center text-[11px] text-[#555f5d]">
              No active insulin on board currently.
            </div>
          )}
        </div>
      </div>

      {/* QUICK ACTION BUTTONS */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onNavigate('log-and-dose', 'calc')}
          className="flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl bg-[#00685f] hover:bg-[#005049] text-white shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px] mb-0.5">colorize</span>
          <span className="text-[12px] font-semibold tracking-tight">+ Log Reading</span>
        </button>
        <button
          onClick={() => onNavigate('log-and-dose', 'quick')}
          className="flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl bg-[#4648d4] hover:bg-[#3739be] text-white shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px] mb-0.5">medication</span>
          <span className="text-[12px] font-semibold tracking-tight">+ Log Insulin</span>
        </button>
        <button
          onClick={() => onNavigate('log-and-dose', 'calc')}
          className="flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl bg-[#dce9ff] hover:bg-[#cbdbf5] text-[#00685f] active:scale-95 transition-all shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px] mb-0.5 text-[#00685f]">bolt</span>
          <span className="text-[12px] font-semibold tracking-tight">Dose Advisor</span>
        </button>
      </div>

      {/* CLINICAL TREATMENT PARAMETERS & INSULIN TIMINGS */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-[#e5eeff] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00685f] text-[20px]">tune</span>
            <div>
              <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-[15px] font-bold text-[#0b1c30]">
                Active Clinical Protocol &amp; Targets
              </h3>
              <span className="text-[11px] text-[#3d4947]">
                Target 110 mg/dL • ISF 1:40 • ICR 1:10
              </span>
            </div>
          </div>
          {onOpenParameterModal && (
            <button
              type="button"
              onClick={onOpenParameterModal}
              className="text-[11px] font-bold text-[#00685f] bg-[#eff4ff] hover:bg-[#e5eeff] px-2.5 py-1 rounded-full flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Edit</span>
              <span className="material-symbols-outlined text-[14px]">edit</span>
            </button>
          )}
        </div>

        {/* 4-stat metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-2xl bg-[#eff4ff] border border-[#e5eeff]/60">
            <span className="text-[10px] text-[#3d4947] font-semibold block">Target BG</span>
            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-extrabold text-[#006947]">
              {profile.targetGlucose || 110} <span className="text-[10px] font-normal text-[#3d4947]">mg/dL</span>
            </span>
            <span className="text-[9px] text-[#3d4947] block mt-0.5">Range {profile.targetRangeMin || 70}–{profile.targetRangeMax || 180}</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#eff4ff] border border-[#e5eeff]/60">
            <span className="text-[10px] text-[#3d4947] font-semibold block">ISF Ratio</span>
            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-extrabold text-[#00685f]">
              1 : {profile.insulinSensitivityFactor || 40}
            </span>
            <span className="text-[9px] text-[#3d4947] block mt-0.5">1u drops 40 mg/dL</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#eff4ff] border border-[#e5eeff]/60">
            <span className="text-[10px] text-[#3d4947] font-semibold block">ICR Ratio</span>
            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-extrabold text-[#4648d4]">
              1 : {profile.insulinToCarbRatio || 10}
            </span>
            <span className="text-[9px] text-[#3d4947] block mt-0.5">1u covers 10g carbs</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#eff4ff] border border-[#e5eeff]/60">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#3d4947] font-semibold block">Active DIA</span>
              <span className="material-symbols-outlined text-[#00685f] text-[12px]">auto_awesome</span>
            </div>
            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-extrabold text-[#00685f]">
              {profile.activeDurationHours || 6.0} <span className="text-[10px] font-normal text-[#3d4947]">hrs</span>
            </span>
            <span className="text-[9px] text-[#00685f] font-semibold block mt-0.5">
              {profile.autoDiaEnabled !== false ? 'Auto-adjusted' : 'Manual'}
            </span>
          </div>
        </div>

        {/* Individual Insulin Regimen & Assigned Meal Times */}
        {profile.insulinSchedules && profile.insulinSchedules.length > 0 ? (
          <div className="pt-1 border-t border-[#e5eeff]">
            <span className="text-[11px] font-bold text-[#3d4947] block mb-1.5">
              Individual Insulin Regimen &amp; Assigned Routines:
            </span>
            <div className="space-y-1.5">
              {profile.insulinSchedules.map((item) => {
                const insObj = getInsulinProfileById(item.insulinId);
                if (!insObj) return null;
                const recDia = getRecommendedDiaForInsulin(item.insulinId);
                return (
                  <div
                    key={item.insulinId}
                    className="p-2 rounded-xl bg-[#eff4ff] flex items-center justify-between gap-2 text-[11px]"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-[#00685f]" />
                      <span className="font-bold text-[#0b1c30] truncate">{insObj.name}</span>
                      <span className="text-[10px] text-[#3d4947]">
                        (DIA: {recDia}h)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {item.slots.map(s => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-full bg-white text-[#00685f] font-semibold text-[10px] border border-[#e5eeff]"
                        >
                          {s.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="pt-2 border-t border-[#e5eeff] flex items-center justify-between text-[11px] text-[#3d4947]">
            <span>No insulins assigned to routines yet.</span>
            <button
              type="button"
              onClick={onOpenParameterModal}
              className="text-[#00685f] font-bold hover:underline cursor-pointer"
            >
              + Assign Insulins
            </button>
          </div>
        )}
      </div>

      {/* Pattern Detection Notice (Only shown if clinical criteria detected in telemetry) */}
      {dawnPattern && (
        <div className="p-3.5 rounded-2xl bg-[#ffdad6]/60 border border-[#ba1a1a]/20 flex items-start gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-full bg-[#ba1a1a] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[18px]">warning</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold text-[#93000a]">{dawnPattern.title}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#ba1a1a]/15 text-[#ba1a1a] text-[10px] font-bold uppercase tracking-wider">
                Pattern Review
              </span>
            </div>
            <p className="text-[12px] text-[#93000a]/90 mt-0.5 leading-snug">
              {dawnPattern.description}
            </p>
          </div>
        </div>
      )}

      {/* DAILY ROUTINE: 6-Slot Check Tracker */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-[#e5eeff]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00685f] text-[20px]">fact_check</span>
            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-bold text-[#0b1c30]">
              Daily 6-Slot Tracker
            </h3>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#3d4947] font-semibold">
            {completedSlotsCount} of 6 Complete
          </span>
        </div>

        <div className="space-y-2">
          {ROUTINE_SLOTS_DEF.map((slot) => {
            const rec = glucoseRecords.find((r) => r.slot === slot.id);
            if (rec) {
              const inRange = rec.value >= profile.targetRangeMin && rec.value <= profile.targetRangeMax;
              const formattedTime = new Date(rec.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-[#eff4ff] border border-[#e5eeff]/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#006947] text-white flex items-center justify-center">
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-[#0b1c30]">{slot.label}</div>
                      <div className="text-[11px] text-[#3d4947]">Logged {formattedTime}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-bold ${
                        inRange
                          ? 'text-[#006947]'
                          : rec.value < profile.hypoLimit
                          ? 'text-[#ba1a1a]'
                          : 'text-[#d97706]'
                      }`}
                    >
                      {rec.value}
                    </span>
                    <span className="text-[11px] text-[#3d4947] ml-1">mg/dL</span>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={slot.id}
                onClick={() => onSlotClick(slot.id)}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white border border-[#e5eeff] text-left hover:bg-[#eff4ff] active:bg-[#dce9ff] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#d3e4fe] text-[#3d4947] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-[#0b1c30]">{slot.label}</div>
                    <div className="text-[11px] text-[#3d4947]">{slot.defaultWindow} ({slot.targetTime})</div>
                  </div>
                </div>
                <span className="text-[12px] text-[#00685f] font-semibold py-1 px-3 rounded-full bg-[#dce9ff]">
                  + Tap to Log
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ROLLING PERIOD CLINICAL SUMMARIES */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#4648d4] text-[20px]">analytics</span>
            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-bold text-[#0b1c30]">
              Clinical Period Rolling
            </h3>
          </div>
          <span className="text-[11px] text-[#3d4947]">Auto-synced</span>
        </div>

        {/* Horizontal scrollable strip for period summary cards */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
          {/* Card: Today */}
          <div className="min-w-[210px] bg-white p-3.5 rounded-3xl shadow-sm border border-[#e5eeff] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#89f5e7] text-[#00201d]">
                  Today
                </span>
                <span className="text-[11px] text-[#006947] font-bold">
                  {analysis3d.totalReadings > 0 ? `${analysis3d.hypoPercent}% Lows` : 'No logs'}
                </span>
              </div>
              <div className="font-['Plus_Jakarta_Sans',sans-serif] text-[22px] text-[#0b1c30] font-bold">
                {analysis3d.totalReadings > 0 ? analysis3d.avgGlucose : '--'}{' '}
                <span className="text-[11px] text-[#3d4947] font-normal">mg/dL Avg</span>
              </div>
            </div>
            <div className="mt-3 pt-2">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#3d4947]">Time in Range</span>
                <span className="text-[#006947] font-bold">{analysis3d.totalReadings > 0 ? `${analysis3d.tirPercent}%` : '--'}</span>
              </div>
              <div className="h-1.5 w-full bg-[#e5eeff] rounded-full overflow-hidden">
                <div className="h-full bg-[#006947] rounded-full" style={{ width: `${analysis3d.tirPercent}%` }} />
              </div>
            </div>
          </div>

          {/* Card: 3-Day Average */}
          <div className="min-w-[210px] bg-white p-3.5 rounded-3xl shadow-sm border border-[#e5eeff] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#dce9ff] text-[#0b1c30]">
                  3-Day Mean
                </span>
                <span className="text-[11px] text-[#00685f] font-semibold">
                  {analysis3d.totalReadings > 0 ? `${analysis3d.tirPercent}% TIR` : '--'}
                </span>
              </div>
              <div className="font-['Plus_Jakarta_Sans',sans-serif] text-[22px] text-[#0b1c30] font-bold">
                {analysis3d.totalReadings > 0 ? analysis3d.avgGlucose : '--'}{' '}
                <span className="text-[11px] text-[#3d4947] font-normal">mg/dL</span>
              </div>
            </div>
            <div className="mt-2 text-[12px] text-[#3d4947] flex items-center justify-between pt-1">
              <span>D1: {analysis3d.day1Avg ?? '--'}</span>
              <span>D2: {analysis3d.day2Avg ?? '--'}</span>
              <span>D3: {analysis3d.day3Avg ?? '--'}</span>
            </div>
          </div>

          {/* Card: 7-Day Average */}
          <div className="min-w-[200px] bg-white p-3.5 rounded-3xl shadow-sm border border-[#e5eeff] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#dce9ff] text-[#0b1c30]">
                  7-Day
                </span>
                <span className="material-symbols-outlined text-[16px] text-[#006947]">trending_flat</span>
              </div>
              <div className="font-['Plus_Jakarta_Sans',sans-serif] text-[22px] text-[#0b1c30] font-bold">
                {analysis7d.totalReadings > 0 ? analysis7d.avgGlucose : '--'}{' '}
                <span className="text-[11px] text-[#3d4947] font-normal">mg/dL</span>
              </div>
            </div>
            <span className="text-[11px] text-[#3d4947] mt-3">
              {analysis7d.totalReadings > 0 ? `${analysis7d.totalReadings} tests recorded` : 'No data in 7d'}
            </span>
          </div>

          {/* Card: 30-Day & Estimated HbA1c */}
          <div className="min-w-[210px] bg-white p-3.5 rounded-3xl shadow-sm border border-[#e5eeff] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e1e0ff] text-[#07006c]">
                  30-Day
                </span>
                <span className="text-[11px] text-[#4648d4] font-bold">Est. HbA1c</span>
              </div>
              <div className="font-['Plus_Jakarta_Sans',sans-serif] text-[22px] text-[#0b1c30] font-bold">
                {analysis30d.totalReadings > 0 ? analysis30d.avgGlucose : '--'}{' '}
                <span className="text-[11px] text-[#3d4947] font-normal">mg/dL</span>
              </div>
            </div>
            <div className="mt-2 p-1.5 rounded-xl bg-[#4648d4]/10 flex items-center justify-between">
              <span className="text-[11px] text-[#3d4947]">Projected HbA1c</span>
              <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[15px] font-bold text-[#4648d4]">
                {analysis30d.totalReadings > 0 ? `${analysis30d.projectedA1c}%` : '--%'}
              </span>
            </div>
          </div>

          {/* Card: 90-Day Rolling Active */}
          <div className="min-w-[210px] bg-white p-3.5 rounded-3xl shadow-sm border border-[#e5eeff] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#d3e4fe] text-[#0b1c30]">
                  90-Day Window
                </span>
                <span className="material-symbols-outlined text-[16px] text-[#00685f]">database</span>
              </div>
              <div className="font-['Plus_Jakarta_Sans',sans-serif] text-[22px] text-[#0b1c30] font-bold">
                {analysis90d.totalReadings > 0 ? analysis90d.avgGlucose : '--'}{' '}
                <span className="text-[11px] text-[#3d4947] font-normal">mg/dL</span>
              </div>
            </div>
            <span className="text-[11px] text-[#3d4947] mt-3">
              {analysis90d.totalReadings > 0 ? `${analysis90d.totalReadings} tests stored` : 'No data in 90d'}
            </span>
          </div>
        </div>
      </div>

      {/* CONNECTED MONITORING METRICS & PATIENT CONTEXT */}
      <div className="grid grid-cols-2 gap-3">
        {/* Active Food Carbs Card */}
        <div className="bg-white p-3.5 rounded-3xl shadow-sm border border-[#e5eeff]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#00685f]">
              <span className="material-symbols-outlined text-[16px]">restaurant</span>
            </div>
            <span className="text-[10px] font-bold text-[#3d4947] uppercase">Carbs Logged</span>
          </div>
          <div className="font-['Plus_Jakarta_Sans',sans-serif] text-[22px] font-bold text-[#0b1c30]">
            {hasReadings ? '32 g' : '0 g'}
          </div>
          <span className="text-[11px] text-[#3d4947]">
            {hasReadings ? 'Recorded meal carbs' : 'No meal entries yet'}
          </span>
        </div>

        {/* Manual Tests Completed Routine Card */}
        <div className="bg-white p-3.5 rounded-3xl shadow-sm border border-[#e5eeff]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-[#6ffbbe]/40 flex items-center justify-center text-[#00685f]">
              <span className="material-symbols-outlined text-[16px]">colorize</span>
            </div>
            <span className="text-[10px] font-bold text-[#3d4947] uppercase">Daily Routine</span>
          </div>
          <div className="font-['Plus_Jakarta_Sans',sans-serif] text-[22px] font-bold text-[#0b1c30]">
            {completedSlotsCount} / 6
          </div>
          <span className="text-[11px] text-[#006947] font-medium">Manual checks logged</span>
        </div>
      </div>

      {/* AUTO-TITRATION / DOSE ADJUSTMENT ADVISOR */}
      <div className="bg-white p-4 rounded-3xl border border-[#e5eeff] shadow-sm mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#00685f]">medical_services</span>
            <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[14px] font-bold text-[#0b1c30]">
              Prescribed Dose Adjustment
            </span>
          </div>
          <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${titrationBg} ${titrationColor}`}>
            {titrationAction}
          </div>
        </div>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-[28px] font-['Plus_Jakarta_Sans',sans-serif] font-extrabold text-[#0b1c30] leading-none">
            {prescribedBasal > 0 ? prescribedBasal : '--'}
          </span>
          <span className="text-[12px] font-semibold text-[#3d4947] mb-1">Units (Base)</span>
        </div>
        <p className="text-[12px] text-[#3d4947] leading-relaxed">
          {doseAdvice}
        </p>
      </div>

      {/* PATIENT COACHING CARD */}
      <div className="relative overflow-hidden rounded-3xl bg-[#eff4ff] p-4 border border-[#e5eeff]">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1 text-[#00685f] text-[10px] font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px]">smart_toy</span>
              <span>GlucoCoach Insights</span>
            </div>
            <div className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-semibold text-[#0b1c30]">
              {hasReadings ? 'Glycemic Guidance' : 'Welcome to BetaKinetics'}
            </div>
            <p className="text-[12px] text-[#3d4947] leading-relaxed">
              {hasReadings
                ? `Your current glucose of ${latestGlucose} mg/dL with ${iobResult.totalIob.toFixed(1)}u active insulin is tracked. Use the dose advisor for meal bolus suggestions.`
                : 'Start by logging your blood glucose reading or active insulins. The dose advisor will calculate accurate corrections and carb coverage based on your clinical targets.'}
            </p>
          </div>
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-white shadow-xs border border-[#e5eeff]">
            <img
              className="w-full h-full object-cover"
              alt="Healthy Meal"
              src="https://images.unsplash.com/photo-1540420773420-3366772f4999?w=160&auto=format&fit=crop&q=80"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      </div>

      {/* CROSS-PLATFORM PWA & ABOUT GUIDE CARD */}
      <div className="rounded-3xl bg-white border border-[#e5eeff] p-4 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00685f] text-[20px]">devices</span>
            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[14px] text-[#0b1c30]">
              Cross-Platform &amp; Offline PWA
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e1e0ff] text-[#07006c]">
            Installable App
          </span>
        </div>

        <p className="text-[12px] text-[#3d4947] leading-relaxed">
          Add BetaKinetics to your mobile home screen (iOS / Android) or computer desktop. Runs seamlessly offline with instant SQLite storage.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1">
            <PWAInstallButton variant="banner" />
          </div>

          <button
            type="button"
            onClick={() => onNavigate('about')}
            className="h-11 px-3.5 rounded-2xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#dce9ff]"
          >
            <span className="material-symbols-outlined text-[17px] text-[#4648d4]">info</span>
            <span>How to Use &amp; Creator Info</span>
          </button>
        </div>
      </div>
    </div>
  );
};
