import React, { useState, useRef } from 'react';
import { PatientProfile, PatientBackupData } from '../types';
import { INSULIN_DATABASE, getDefaultSchedulesForInsulins } from '../data/insulinDatabase';
import { restorePatientBackup } from '../services/storageEngine';

interface LoginScreenProps {
  initialProfile: PatientProfile;
  profilesList: PatientProfile[];
  onLoginComplete: (profile: PatientProfile) => void;
  onSelectProfile: (profileId: string) => void;
  onDeleteProfile?: (profileId: string) => void;
  onCancel?: () => void;
  onRestoreBackupSuccess?: () => void;
  initialMode?: 'select' | 'create' | 'edit';
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  initialProfile,
  profilesList,
  onLoginComplete,
  onSelectProfile,
  onDeleteProfile,
  onCancel,
  onRestoreBackupSuccess,
  initialMode
}) => {
  // If we have existing profiles, default to 'select' mode unless told otherwise
  const [viewMode, setViewMode] = useState<'select' | 'create' | 'edit'>(
    initialMode || (profilesList.length > 0 ? 'select' : 'create')
  );

  React.useEffect(() => {
    if (profilesList.length === 0 && viewMode === 'select') {
      setViewMode('create');
    }
  }, [profilesList, viewMode]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreStatus, setRestoreStatus] = useState<{ msg: string; isError: boolean } | null>(null);

  // Form states for create / edit
  const [name, setName] = useState(initialProfile.name || '');
  const [age, setAge] = useState(initialProfile.age || 28);
  const [weightKg, setWeightKg] = useState(initialProfile.weightKg || 70);
  const [diabetesType, setDiabetesType] = useState(initialProfile.diabetesType || 'Type 1 Diabetes (T1D)');
  const [monitoringMethod, setMonitoringMethod] = useState(
    initialProfile.monitoringMethod || 'Manual Fingerstick Glucometer (Accu-Chek / OneTouch / Contour)'
  );
  const [targetGlucose, setTargetGlucose] = useState(initialProfile.targetGlucose || 110);
  const [targetMin, setTargetMin] = useState(initialProfile.targetRangeMin || 70);
  const [targetMax, setTargetMax] = useState(initialProfile.targetRangeMax || 180);
  const [isf, setIsf] = useState(initialProfile.insulinSensitivityFactor || 40);
  const [icr, setIcr] = useState(initialProfile.insulinToCarbRatio || 10);
  const [dia, setDia] = useState(initialProfile.activeDurationHours || 4.5);
  const [selectedInsulins, setSelectedInsulins] = useState<string[]>(
    initialProfile.activeInsulinIds && initialProfile.activeInsulinIds.length > 0
      ? initialProfile.activeInsulinIds
      : ['mixtard_30', 'actrapid']
  );
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const startCreate = () => {
    setName('');
    setAge(28);
    setWeightKg(70);
    setDiabetesType('Type 1 Diabetes (T1D)');
    setMonitoringMethod('Manual Fingerstick Glucometer (Accu-Chek / OneTouch / Contour)');
    setTargetGlucose(110);
    setTargetMin(70);
    setTargetMax(180);
    setIsf(40);
    setIcr(10);
    setDia(4.0);
    setSelectedInsulins([]); // Clean default: no insulins pre-selected
    setEditingProfileId(null);
    setViewMode('create');
  };

  const startEdit = (prof: PatientProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setName(prof.name);
    setAge(prof.age);
    setWeightKg(prof.weightKg);
    setDiabetesType(prof.diabetesType);
    setMonitoringMethod(prof.monitoringMethod || 'Manual Fingerstick Glucometer (Accu-Chek / OneTouch / Contour)');
    setTargetGlucose(prof.targetGlucose || 110);
    setTargetMin(prof.targetRangeMin || 70);
    setTargetMax(prof.targetRangeMax || 180);
    setIsf(prof.insulinSensitivityFactor || 40);
    setIcr(prof.insulinToCarbRatio || 10);
    setDia(prof.activeDurationHours || 4.0);
    setSelectedInsulins(prof.activeInsulinIds || []);
    setEditingProfileId(prof.id || null);
    setViewMode('edit');
  };

  const toggleInsulin = (id: string) => {
    if (selectedInsulins.includes(id)) {
      setSelectedInsulins(selectedInsulins.filter(i => i !== id));
    } else {
      setSelectedInsulins([...selectedInsulins, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || 'T1D User';
    const schedules = selectedInsulins.length > 0
      ? getDefaultSchedulesForInsulins(selectedInsulins)
      : [];

    const updated: PatientProfile = {
      ...initialProfile,
      id: editingProfileId || `profile_${Date.now()}`,
      name: finalName,
      age: Number(age) || 28,
      weightKg: Number(weightKg) || 70,
      diabetesType,
      monitoringMethod,
      careMode: 'Self-Managed T1D',
      protocolRx: 'Personal Protocol',
      targetGlucose: Number(targetGlucose) || 110,
      targetRangeMin: Number(targetMin) || 70,
      targetRangeMax: Number(targetMax) || 180,
      insulinSensitivityFactor: Number(isf) || 40,
      insulinToCarbRatio: Number(icr) || 10,
      activeDurationHours: Number(dia) || 4.0,
      autoDiaEnabled: selectedInsulins.length > 0,
      hypoLimit: 70,
      activeInsulinIds: selectedInsulins,
      insulinSchedules: schedules,
      setupCompleted: true,
      lastLoginAt: new Date().toISOString()
    };
    onLoginComplete(updated);
  };

  const handleBackupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreStatus(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text) as PatientBackupData;
        const res = restorePatientBackup(parsed, 'replace');
        if (res.success) {
          setRestoreStatus({ msg: res.message, isError: false });
          if (onRestoreBackupSuccess) {
            onRestoreBackupSuccess();
          } else if (parsed.profile) {
            onLoginComplete(parsed.profile);
          }
        } else {
          setRestoreStatus({ msg: res.message, isError: true });
        }
      } catch (err: unknown) {
        setRestoreStatus({
          msg: `Invalid backup file: ${err instanceof Error ? err.message : 'Parse error'}`,
          isError: true
        });
      }
    };
    reader.onerror = () => {
      setRestoreStatus({ msg: 'Failed to read backup file from device disk.', isError: true });
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#e5eeff] relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-[#00685f]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-[#4648d4]/10 blur-3xl pointer-events-none" />

        {/* Header Branding */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#00685f] to-[#008378] text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[24px]">water_drop</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-[20px] font-extrabold text-[#0b1c30]">
                  BetaKinetics
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-[#e1e0ff] text-[#07006c] text-[10px] font-bold uppercase">
                  T1D
                </span>
              </div>
              <p className="text-[12px] text-[#3d4947]">Self-Managed Diabetes Decision-Support</p>
            </div>
          </div>

          <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#006947]/10 text-[#006947] font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#006947] animate-pulse" />
            Fingerstick BGM
          </span>
        </div>

        {/* VIEW MODE 1: SELECT PROFILE / ACCOUNT PICKER */}
        {viewMode === 'select' && (
          <div className="relative z-10 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-bold text-[#0b1c30] font-['Plus_Jakarta_Sans',sans-serif]">
                  Select Profile to Log In
                </h2>
                <span className="text-[11px] text-[#00685f] font-semibold">
                  {profilesList.length} {profilesList.length === 1 ? 'Profile' : 'Profiles'} Available
                </span>
              </div>
              <p className="text-[13px] text-[#3d4947] mt-1 leading-relaxed">
                Choose an existing self-care profile or create a new profile for individualized calculations and manual logs.
              </p>
            </div>

            {/* List of Profiles */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {profilesList.map((prof) => {
                const initial = (prof.name || 'U').charAt(0).toUpperCase();
                const isCurrent = prof.id === initialProfile.id || prof.name === initialProfile.name;
                const insulinNames = (prof.activeInsulinIds || [])
                  .map(id => INSULIN_DATABASE.find(i => i.id === id)?.name || id)
                  .join(', ');

                return (
                  <div
                    key={prof.id || prof.name}
                    onClick={() => onSelectProfile(prof.id || '')}
                    className="group relative p-3.5 rounded-2xl bg-[#eff4ff] hover:bg-[#e4edff] border border-[#d5e3fc] hover:border-[#00685f] transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-[18px] text-white shadow-xs flex-shrink-0"
                        style={{ backgroundColor: prof.avatarColor || '#00685f' }}
                      >
                        {initial}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[15px] text-[#0b1c30] truncate">
                            {prof.name}
                          </h3>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded-md bg-[#006947]/10 text-[#006947] text-[10px] font-bold">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#3d4947] truncate">
                          {prof.diabetesType} • {prof.age} yrs • {prof.weightKg} kg
                        </p>
                        {insulinNames && (
                          <p className="text-[10px] text-[#00685f] font-medium truncate mt-0.5">
                            Rx: {insulinNames}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => startEdit(prof, e)}
                        title="Edit profile parameters"
                        className="w-8 h-8 rounded-xl bg-white hover:bg-[#dce9ff] text-[#3d4947] hover:text-[#00685f] flex items-center justify-center text-[15px] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[17px]">edit</span>
                      </button>

                      {onDeleteProfile && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirmDeleteId === prof.id) {
                              onDeleteProfile(prof.id || '');
                              setConfirmDeleteId(null);
                            } else {
                              setConfirmDeleteId(prof.id || '');
                              setTimeout(() => setConfirmDeleteId(null), 4000);
                            }
                          }}
                          title={confirmDeleteId === prof.id ? "Click again to confirm delete" : "Delete profile"}
                          className={`h-8 rounded-xl flex items-center justify-center text-[12px] font-bold transition-all px-2 ${
                            confirmDeleteId === prof.id
                              ? 'bg-[#ba1a1a] text-white shadow-xs'
                              : 'w-8 bg-white hover:bg-[#ffdad6] text-[#3d4947] hover:text-[#ba1a1a]'
                          }`}
                        >
                          {confirmDeleteId === prof.id ? (
                            <span>Delete?</span>
                          ) : (
                            <span className="material-symbols-outlined text-[17px]">delete</span>
                          )}
                        </button>
                      )}

                      <div className="w-8 h-8 rounded-xl bg-[#00685f] text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform shadow-2xs">
                        <span className="material-symbols-outlined text-[18px]">login</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={startCreate}
                className="w-full h-12 rounded-full bg-[#00685f] hover:bg-[#005049] text-white text-[13px] font-bold flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                <span>+ Create New Profile</span>
              </button>

              {/* Restore / Import from Device Storage Backup */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleBackupFileSelect}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-3 rounded-2xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00685f] text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#c2d7ff]"
              >
                <span className="material-symbols-outlined text-[17px]">restore</span>
                <span>Import &amp; Restore Patient Backup</span>
              </button>

              {restoreStatus && (
                <div
                  className={`p-2.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 ${
                    restoreStatus.isError
                      ? 'bg-[#ffdad6] text-[#ba1a1a]'
                      : 'bg-[#006947]/10 text-[#006947]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {restoreStatus.isError ? 'error' : 'check_circle'}
                  </span>
                  <span>{restoreStatus.msg}</span>
                </div>
              )}

              {initialProfile.setupCompleted && onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full py-2 text-[12px] text-[#3d4947] hover:text-[#ba1a1a] transition-colors cursor-pointer text-center"
                >
                  ← Return to Active Dashboard
                </button>
              )}
            </div>
          </div>
        )}

        {/* VIEW MODE 2: CREATE / EDIT PROFILE FORM */}
        {(viewMode === 'create' || viewMode === 'edit') && (
          <div className="relative z-10">
            {/* Top Navigation Back */}
            {profilesList.length > 0 && (
              <button
                type="button"
                onClick={() => setViewMode('select')}
                className="inline-flex items-center gap-1 text-[12px] font-bold text-[#00685f] hover:underline mb-3 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back to Profile List</span>
              </button>
            )}

            <div className="mb-5">
              <h2 className="text-[18px] font-bold text-[#0b1c30] font-['Plus_Jakarta_Sans',sans-serif]">
                {viewMode === 'edit' ? 'Edit Profile & Parameters' : 'Create New Patient Profile'}
              </h2>
              <p className="text-[13px] text-[#3d4947] mt-1 leading-relaxed">
                {viewMode === 'edit'
                  ? 'Update your personal diabetes ratios and insulin regimen.'
                  : 'Enter patient details to configure personalized dose calculations and IOB tracking.'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* User Name */}
              <div>
                <label className="text-[12px] font-bold text-[#0b1c30] block mb-1">
                  Full Name / Profile Name <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#3d4947] text-[18px]">
                    person
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sarah Chen or Alex Rivera"
                    required
                    className="w-full h-11 pl-10 pr-4 rounded-2xl bg-[#eff4ff] border border-[#e5eeff] text-[#0b1c30] text-[13px] font-medium focus:bg-white focus:border-[#00685f] focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Age & Weight Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#3d4947] block mb-1">
                    Age (years)
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    min={1}
                    max={120}
                    required
                    className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-[#e5eeff] text-[#0b1c30] text-[13px] font-medium focus:bg-white focus:border-[#00685f] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#3d4947] block mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    min={10}
                    max={250}
                    required
                    className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-[#e5eeff] text-[#0b1c30] text-[13px] font-medium focus:bg-white focus:border-[#00685f] focus:outline-none"
                  />
                </div>
              </div>

              {/* Testing Method (Manual Fingerstick) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-[#3d4947] block">
                    Testing Method (Manual Fingerstick)
                  </label>
                  <span className="text-[10px] text-[#00685f] font-semibold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                    Manual meter
                  </span>
                </div>
                <select
                  value={monitoringMethod}
                  onChange={(e) => setMonitoringMethod(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#eff4ff] border border-[#e5eeff] text-[#0b1c30] text-[12px] font-medium focus:bg-white focus:border-[#00685f] focus:outline-none"
                >
                  <option value="Manual Fingerstick Glucometer (Accu-Chek / OneTouch / Contour)">
                    Manual Fingerstick Meter (Accu-Chek, OneTouch, Contour)
                  </option>
                  <option value="Capillary Blood Glucose Strip Test (BGM)">
                    Capillary Blood Glucose Strip Test (BGM)
                  </option>
                  <option value="Handheld Glucometer">
                    Handheld Glucometer
                  </option>
                  <option value="Manual Daily Self-Test Logbook">
                    Manual Daily Self-Test Logbook
                  </option>
                </select>
              </div>

              {/* My Insulins Multi-Select */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12px] font-bold text-[#0b1c30]">
                    Insulins Prescribed
                  </label>
                  <span className="text-[10px] text-[#555f5d]">
                    {selectedInsulins.length === 0 ? 'None selected (tap to add)' : `${selectedInsulins.length} selected`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {INSULIN_DATABASE.map(ins => {
                    const isSelected = selectedInsulins.includes(ins.id);
                    return (
                      <button
                        key={ins.id}
                        type="button"
                        onClick={() => toggleInsulin(ins.id)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-[#00685f] text-white shadow-2xs'
                            : 'bg-[#eff4ff] text-[#3d4947] hover:bg-[#e5eeff]'
                        }`}
                      >
                        {isSelected && (
                          <span className="material-symbols-outlined text-[13px]">check</span>
                        )}
                        <span>{ins.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Collapsible Treatment Parameters (ISF, ICR, Target) */}
              <div className="border border-[#e5eeff] rounded-2xl p-3 bg-[#eff4ff]/60">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between text-[12px] font-bold text-[#0b1c30] cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-[#00685f]">
                    <span className="material-symbols-outlined text-[18px]">tune</span>
                    <span>Target &amp; Sensitivity Ratios</span>
                  </div>
                  <span className="text-[11px] text-[#3d4947] font-normal flex items-center gap-0.5">
                    <span>{showAdvanced ? 'Hide' : 'Review / Adjust'}</span>
                    <span className="material-symbols-outlined text-[16px]">
                      {showAdvanced ? 'expand_less' : 'expand_more'}
                    </span>
                  </span>
                </button>

                {showAdvanced && (
                  <div className="mt-3 space-y-3 pt-2 border-t border-[#e5eeff]">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-[#3d4947] font-semibold block mb-0.5">
                          Target BG (mg/dL)
                        </label>
                        <input
                          type="number"
                          value={targetGlucose}
                          onChange={(e) => setTargetGlucose(Number(e.target.value))}
                          className="w-full h-9 px-2.5 rounded-lg bg-white border border-[#e5eeff] text-[12px] text-[#0b1c30] font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-[#3d4947] font-semibold block mb-0.5">
                          Target Range (mg/dL)
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={targetMin}
                            onChange={(e) => setTargetMin(Number(e.target.value))}
                            className="w-full h-9 px-2 rounded-lg bg-white border border-[#e5eeff] text-[11px] text-[#0b1c30]"
                          />
                          <span className="text-[#3d4947]">-</span>
                          <input
                            type="number"
                            value={targetMax}
                            onChange={(e) => setTargetMax(Number(e.target.value))}
                            className="w-full h-9 px-2 rounded-lg bg-white border border-[#e5eeff] text-[11px] text-[#0b1c30]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-[#3d4947] font-semibold block mb-0.5">
                          ISF (1u : mg/dL)
                        </label>
                        <input
                          type="number"
                          value={isf}
                          onChange={(e) => setIsf(Number(e.target.value))}
                          placeholder="e.g. 40"
                          className="w-full h-9 px-2.5 rounded-lg bg-white border border-[#e5eeff] text-[12px] text-[#0b1c30]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-[#3d4947] font-semibold block mb-0.5">
                          ICR (1u : carbs)
                        </label>
                        <input
                          type="number"
                          value={icr}
                          onChange={(e) => setIcr(Number(e.target.value))}
                          placeholder="e.g. 10"
                          className="w-full h-9 px-2.5 rounded-lg bg-white border border-[#e5eeff] text-[12px] text-[#0b1c30]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#3d4947] font-semibold block mb-0.5">
                        Active Duration (DIA hours)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={dia}
                        onChange={(e) => setDia(Number(e.target.value))}
                        className="w-full h-9 px-2.5 rounded-lg bg-white border border-[#e5eeff] text-[12px] text-[#0b1c30]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full h-12 rounded-full bg-[#00685f] hover:bg-[#005049] text-white text-[14px] font-bold flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
                >
                  <span>{viewMode === 'edit' ? 'Update & Log In' : 'Save Profile & Log In'}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>

                {profilesList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setViewMode('select')}
                    className="w-full py-2.5 text-[12px] text-[#3d4947] hover:text-[#00685f] font-semibold transition-colors cursor-pointer text-center"
                  >
                    Cancel and Return to Profile Picker
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
