import React, { useState } from 'react';
import { PatientProfile } from '../types';
import { INSULIN_DATABASE } from '../data/insulinDatabase';
import { getStorageDaysUsed } from '../services/storageEngine';

interface ProfileRxViewProps {
  profile: PatientProfile;
  glucoseCount: number;
  insulinCount: number;
  onOpenSetupChatbot: () => void;
  onOpenParameterModal: () => void;
  onClearAll: () => void;
  onOpenBackupRestore?: () => void;
  onOpenLoginScreen?: () => void;
  onLogout?: () => void;
}

export const ProfileRxView: React.FC<ProfileRxViewProps> = ({
  profile,
  glucoseCount,
  insulinCount,
  onOpenSetupChatbot,
  onOpenParameterModal,
  onClearAll,
  onOpenBackupRestore,
  onOpenLoginScreen,
  onLogout
}) => {
  const [selectedInsulinId, setSelectedInsulinId] = useState<string>('mixtard_30');
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const daysUsed = getStorageDaysUsed();
  const selectedInsulin = INSULIN_DATABASE.find(i => i.id === selectedInsulinId) || INSULIN_DATABASE[4];

  // Physiological / BMI calculations
  const heightMeters = (profile.heightCm || 170) / 100;
  const weightKg = profile.weightKg || 70;
  const bmi = weightKg / (heightMeters * heightMeters);
  
  let bmiCategory = '';
  let bmiColor = '';
  let bmiAdvice = '';
  
  if (bmi < 18.5) {
    bmiCategory = 'Underweight';
    bmiColor = 'text-[#e65100]';
    bmiAdvice = 'Your BMI indicates you are underweight. A nutrient-dense diet and adjusting insulin sensitivity with your clinician may be needed to safely reach your weight goal.';
  } else if (bmi >= 18.5 && bmi <= 24.9) {
    bmiCategory = 'Normal / Healthy';
    bmiColor = 'text-[#006947]';
    bmiAdvice = 'Your BMI is within the healthy range. Maintaining your current body weight optimizes insulin sensitivity and stabilizes glycemic control.';
  } else if (bmi >= 25 && bmi <= 29.9) {
    bmiCategory = 'Overweight';
    bmiColor = 'text-[#e65100]';
    bmiAdvice = 'Your BMI indicates you are slightly above the standard range. Gentle aerobic activity can improve insulin resistance and help achieve your weight goal.';
  } else {
    bmiCategory = 'Obese';
    bmiColor = 'text-[#b71c1c]';
    bmiAdvice = 'Your BMI is in the obese range, which can significantly increase insulin resistance. Work with your care team on a structured activity and nutrition plan.';
  }

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto px-4 pt-3 pb-24 space-y-4">
      {/* Patient Profile Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#e5eeff] space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div
                className="w-14 h-14 rounded-2xl text-white flex items-center justify-center font-bold text-[22px] shadow-sm"
                style={{ backgroundColor: profile.avatarColor || '#00685f' }}
              >
                {(profile.name || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#006947] border-2 border-white rounded-full" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-[18px] font-bold text-[#0b1c30]">
                  {profile.name || 'Self-Care User'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#e1e0ff] text-[#07006c] text-[10px] font-bold">
                  {profile.diabetesType}
                </span>
              </div>
              <p className="text-[12px] text-[#3d4947]">
                {profile.age} yrs • {profile.weightKg} kg
              </p>
              <div className="flex items-center space-x-1.5 text-[11px] text-[#00685f] mt-1 font-medium">
                <span className="material-symbols-outlined text-[15px]">colorize</span>
                <span>{profile.monitoringMethod || 'Manual Fingerstick BGM'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenLoginScreen}
            className="text-[11px] text-[#00685f] px-2.5 py-1 bg-[#eff4ff] hover:bg-[#dce9ff] rounded-xl font-bold cursor-pointer transition-colors"
          >
            Edit Profile
          </button>
        </div>

        {/* Profile Session & Logout Controls */}
        <div className="p-3.5 bg-[#eff4ff] rounded-2xl border border-[#dce9ff] space-y-2.5">
          <div className="flex items-center justify-between text-[12px]">
            <div className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-[#00685f] text-[18px]">verified_user</span>
              <div>
                <span className="text-[#3d4947] block text-[10px] font-semibold uppercase">Active Profile Session</span>
                <span className="font-bold text-[#0b1c30]">{profile.name} (Active)</span>
              </div>
            </div>

            {onLogout && (
              <button
                onClick={() => {
                  onLogout();
                }}
                className="px-3 py-1.5 bg-[#ffdad6] hover:bg-[#ffb4ab] text-[#ba1a1a] rounded-xl text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <span className="material-symbols-outlined text-[14px]">logout</span>
                <span>Log Out</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            {onOpenLoginScreen && (
              <button
                onClick={onOpenLoginScreen}
                className="flex-1 py-2 px-3 bg-white hover:bg-[#dce9ff] text-[#00685f] rounded-xl text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-[#c2d7ff]/50"
              >
                <span className="material-symbols-outlined text-[15px]">switch_account</span>
                <span>Switch / Select Profile</span>
              </button>
            )}

            <button
              onClick={onOpenParameterModal}
              className="py-2 px-3 bg-white hover:bg-[#dce9ff] text-[#4648d4] rounded-xl text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 border border-[#c2d7ff]/50"
            >
              <span className="material-symbols-outlined text-[15px]">tune</span>
              <span>Edit Ratios</span>
            </button>
          </div>
        </div>

        {/* Setup Assistant Trigger Button */}
        <button
          onClick={onOpenSetupChatbot}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#00685f] to-[#4648d4] text-white text-[13px] font-bold flex items-center justify-center space-x-2 shadow-xs active:scale-98 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">chat</span>
          <span>Interactive Protocol Assistant (Chatbot)</span>
        </button>
      </div>

      {/* Treatment Parameters Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#e5eeff] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-[#00685f] text-[20px]">tune</span>
            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-bold text-[#0b1c30]">
              Treatment Parameters &amp; Targets
            </h3>
          </div>
          <button
            onClick={onOpenParameterModal}
            className="text-[12px] text-[#00685f] font-semibold hover:underline flex items-center cursor-pointer"
          >
            <span>Edit Ratios</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div className="p-3 bg-[#eff4ff] rounded-2xl">
            <span className="text-[10px] text-[#3d4947] block font-semibold uppercase">Target Glucose</span>
            <span className="text-[18px] font-bold text-[#006947]">{profile.targetGlucose}</span>
            <span className="text-[11px] text-[#3d4947] ml-1">mg/dL</span>
          </div>

          <div className="p-3 bg-[#eff4ff] rounded-2xl">
            <span className="text-[10px] text-[#3d4947] block font-semibold uppercase">ISF Sensitivity</span>
            <span className="text-[18px] font-bold text-[#00685f]">1:{profile.insulinSensitivityFactor}</span>
            <span className="text-[11px] text-[#3d4947] ml-1">mg/dL/u</span>
          </div>

          <div className="p-3 bg-[#eff4ff] rounded-2xl">
            <span className="text-[10px] text-[#3d4947] block font-semibold uppercase">ICR Carb Ratio</span>
            <span className="text-[18px] font-bold text-[#4648d4]">1:{profile.insulinToCarbRatio}</span>
            <span className="text-[11px] text-[#3d4947] ml-1">g/u</span>
          </div>

          <div className="p-3 bg-[#eff4ff] rounded-2xl">
            <span className="text-[10px] text-[#3d4947] block font-semibold uppercase">Active Duration (DIA)</span>
            <span className="text-[18px] font-bold text-[#0b1c30]">{profile.activeDurationHours}</span>
            <span className="text-[11px] text-[#3d4947] ml-1">hours</span>
          </div>
        </div>
      </div>

      {/* Body Physiology & BMI */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#e5eeff] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-[#e65100] text-[20px]">accessibility_new</span>
            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-bold text-[#0b1c30]">
              Body Physiology
            </h3>
          </div>
          <button
            onClick={onOpenParameterModal}
            className="text-[12px] text-[#00685f] font-semibold hover:underline flex items-center cursor-pointer"
          >
            <span>Edit Metrics</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 p-3 bg-[#eff4ff] rounded-2xl flex flex-col justify-center">
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-[28px] font-extrabold text-[#0b1c30] leading-none">
                {bmi.toFixed(1)}
              </span>
              <span className="text-[12px] text-[#3d4947] font-semibold">BMI</span>
            </div>
            <span className={`text-[13px] font-bold ${bmiColor}`}>
              {bmiCategory}
            </span>
            <span className="text-[10px] text-[#3d4947] font-semibold mt-1">
              Goal: <strong className="uppercase text-[#0b1c30]">{profile.weightGoal || 'Maintain'}</strong> weight
            </span>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-2">
            <div className="p-3 bg-white border border-[#e5eeff] rounded-2xl flex flex-col justify-center items-center text-center">
              <span className="text-[10px] text-[#3d4947] font-semibold mb-0.5">Weight</span>
              <span className="text-[16px] font-bold text-[#0b1c30]">{profile.weightKg} <span className="text-[11px] font-medium text-[#3d4947]">kg</span></span>
            </div>
            <div className="p-3 bg-white border border-[#e5eeff] rounded-2xl flex flex-col justify-center items-center text-center">
              <span className="text-[10px] text-[#3d4947] font-semibold mb-0.5">Height</span>
              <span className="text-[16px] font-bold text-[#0b1c30]">{profile.heightCm || 170} <span className="text-[11px] font-medium text-[#3d4947]">cm</span></span>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white border border-[#e5eeff] text-[11px] text-[#3d4947] leading-snug">
          {bmiAdvice}
        </div>
      </div>

      {/* Pharmacological Action Reference Database */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#e5eeff] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-[#4648d4] text-[20px]">menu_book</span>
            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-bold text-[#0b1c30]">
              Insulin Reference Database
            </h3>
          </div>
          <span className="text-[11px] text-[#3d4947] font-semibold">{INSULIN_DATABASE.length} Profiles</span>
        </div>

        {/* Insulin selector chips */}
        <div className="flex space-x-1.5 overflow-x-auto pb-1 -mx-2 px-2 no-scrollbar">
          {INSULIN_DATABASE.map(ins => (
            <button
              key={ins.id}
              onClick={() => setSelectedInsulinId(ins.id)}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                selectedInsulinId === ins.id
                  ? 'bg-[#4648d4] text-white shadow-xs'
                  : 'bg-[#eff4ff] text-[#3d4947] hover:bg-[#e5eeff]'
              }`}
            >
              {ins.name}
            </button>
          ))}
        </div>

        {/* Selected Insulin Detail Card */}
        <div className="p-3.5 bg-[#eff4ff] rounded-2xl border border-[#e5eeff] space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[14px] text-[#0b1c30]">{selectedInsulin.name}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#dce9ff] text-[#00685f] font-bold">
              {selectedInsulin.category}
            </span>
          </div>
          <p className="text-[12px] text-[#3d4947] leading-snug">{selectedInsulin.description}</p>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[11px]">
            <div className="p-2 bg-white rounded-xl">
              <span className="text-[10px] text-[#3d4947] block font-semibold">Onset</span>
              <span className="font-bold text-[#0b1c30]">{selectedInsulin.onsetMinutes}m</span>
            </div>
            <div className="p-2 bg-white rounded-xl">
              <span className="text-[10px] text-[#3d4947] block font-semibold">Peak</span>
              <span className="font-bold text-[#4648d4]">
                {selectedInsulin.peakMinHours === selectedInsulin.peakMaxHours
                  ? `${selectedInsulin.peakMinHours}h`
                  : `${selectedInsulin.peakMinHours}-${selectedInsulin.peakMaxHours}h`}
              </span>
            </div>
            <div className="p-2 bg-white rounded-xl">
              <span className="text-[10px] text-[#3d4947] block font-semibold">Duration</span>
              <span className="font-bold text-[#006947]">{selectedInsulin.effectiveDurationHours}h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Engineering & Research Report (.docx) Download Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#e5eeff] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-[#00685f] text-[20px]">description</span>
            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-bold text-[#0b1c30]">
              Clinical Engineering Report (.docx)
            </h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#e1e0ff] text-[#07006c] font-bold">
            Full Specification
          </span>
        </div>

        <p className="text-[12px] text-[#3d4947] leading-relaxed">
          Comprehensive project report (.docx) detailing problem statement, literature survey (Mudaliar bi-exponential, Berger-Rodbard, Wilinska, Battelino consensus), mathematical algorithm derivations, subcutaneous biphasic absorption models, and peer-reviewed research citations.
        </p>

        <a
          href="/BetaKinetics_Technical_Report.docx"
          download="BetaKinetics_Technical_Report.docx"
          className="w-full py-2.5 px-4 rounded-full bg-[#00685f] hover:bg-[#005049] text-white text-[12px] font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          <span>Download Technical Report (.docx)</span>
        </a>
      </div>

      {/* SQLite Database & 90-Day Rolling Storage Management */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#e5eeff] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-[#00685f] text-[20px]">database</span>
            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-bold text-[#0b1c30]">
              SQLite Storage Management
            </h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#6ffbbe] text-[#002113] font-bold">
            90-Day Rolling
          </span>
        </div>

        <p className="text-[12px] text-[#3d4947] leading-relaxed">
          The system maintains a maximum of <strong>90 days of continuous records</strong>. All older data is pruned automatically during save operations to prevent memory saturation and preserve high indexing velocity.
        </p>

        <div className="p-3 bg-[#eff4ff] rounded-2xl flex items-center justify-between text-[12px]">
          <div>
            <span className="text-[#3d4947] block text-[11px]">Storage Buffer Allocation</span>
            <span className="font-bold text-[#0b1c30]">
              {glucoseCount} Glucose Logs • {insulinCount} Insulin Injections
            </span>
          </div>
          <div className="text-right">
            <span className="text-[#00685f] font-bold">{daysUsed} / 90 Days</span>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          {onOpenBackupRestore && (
            <button
              onClick={onOpenBackupRestore}
              className="flex-1 py-2.5 px-3 rounded-full bg-[#00685f] hover:bg-[#005049] text-white text-[12px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">cloud_sync</span>
              <span>Backup / Restore</span>
            </button>
          )}
          <button
            onClick={() => {
              if (confirmClear) {
                onClearAll();
                setConfirmClear(false);
              } else {
                setConfirmClear(true);
                setTimeout(() => setConfirmClear(false), 5000);
              }
            }}
            className={`py-2.5 px-4 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
              confirmClear
                ? 'bg-[#ba1a1a] text-white shadow-md animate-pulse'
                : 'bg-[#ffdad6] hover:bg-[#ffb4ab] text-[#ba1a1a]'
            }`}
          >
            {confirmClear ? 'Tap to Confirm Clear' : 'Clear Database'}
          </button>
        </div>
      </div>
    </div>
  );
};
