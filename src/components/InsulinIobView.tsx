import React, { useState, useMemo } from 'react';
import { PatientProfile, InsulinRecord } from '../types';
import { calculateCurrentIob, calculateSingleDoseIob } from '../services/iobEngine';

interface InsulinIobViewProps {
  profile: PatientProfile;
  insulinRecords?: InsulinRecord[];
  onOpenParameterModal: () => void;
}

export const InsulinIobView: React.FC<InsulinIobViewProps> = ({
  profile,
  insulinRecords = [],
  onOpenParameterModal
}) => {
  const [basalActive, setBasalActive] = useState(false);

  const now = new Date();
  const todayDateStr = now.toISOString().split('T')[0];

  // Dynamic IOB computation from real logged records
  const iobResult = useMemo(() => {
    return calculateCurrentIob(
      insulinRecords,
      now.toISOString(),
      profile.activeDurationHours || 6.0,
      profile.insulinSensitivityFactor
    );
  }, [insulinRecords, profile.activeDurationHours, profile.insulinSensitivityFactor]);

  // Find latest active dose
  const latestDose = useMemo(() => {
    if (insulinRecords.length === 0) return null;
    return [...insulinRecords].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
  }, [insulinRecords]);

  // Elapsed hours since latest dose
  const elapsedHours = useMemo(() => {
    if (!latestDose) return 0;
    return Math.max(0, (Date.now() - new Date(latestDose.timestamp).getTime()) / 3600000);
  }, [latestDose]);

  // Today's logged insulin events (or within last 24h)
  const todayRecords = useMemo(() => {
    return insulinRecords.filter(r => {
      const d = new Date(r.timestamp);
      const isToday = d.toISOString().split('T')[0] === todayDateStr;
      const isRecent = (now.getTime() - d.getTime()) <= 24 * 3600 * 1000;
      return isToday || isRecent;
    });
  }, [insulinRecords, todayDateStr]);

  // Check for Morning dose
  const morningRecord = useMemo(() => {
    return todayRecords.find(r => 
      r.slot === 'before_breakfast' ||
      r.slot === 'after_breakfast' ||
      r.context === 'before_breakfast' ||
      r.context === 'after_breakfast' ||
      (r.notes && (r.notes.toLowerCase().includes('morning') || r.notes.toLowerCase().includes('breakfast'))) ||
      (!r.slot && new Date(r.timestamp).getHours() >= 4 && new Date(r.timestamp).getHours() < 12)
    );
  }, [todayRecords]);

  // Check for Night / Dinner dose
  const nightRecord = useMemo(() => {
    return todayRecords.find(r => 
      r.slot === 'before_dinner' ||
      r.slot === 'after_dinner' ||
      r.slot === 'bedtime' ||
      r.context === 'before_dinner' ||
      r.context === 'after_dinner' ||
      r.context === 'bedtime' ||
      (r.notes && (r.notes.toLowerCase().includes('dinner') || r.notes.toLowerCase().includes('night') || r.notes.toLowerCase().includes('bedtime'))) ||
      (!r.slot && new Date(r.timestamp).getHours() >= 17)
    );
  }, [todayRecords]);

  // Calculate residual for specific dose
  const getResidualForRecord = (record?: InsulinRecord) => {
    if (!record) return 0;
    const elapsed = (Date.now() - new Date(record.timestamp).getTime()) / 3600000;
    if (elapsed < 0 || elapsed >= (profile.activeDurationHours || 6.0)) return 0;
    const res = calculateSingleDoseIob(record.doseUnits, record.insulinId || 'mixtard_30', elapsed, profile.activeDurationHours || 6.0);
    return res.remainingUnits;
  };

  const morningResidual = getResidualForRecord(morningRecord);
  const nightResidual = getResidualForRecord(nightRecord);

  const formatTimeOnly = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Predicted clearance string
  const clearanceText = useMemo(() => {
    if (iobResult.totalIob <= 0.02) return '0m (Clear)';
    const hours = Math.floor(iobResult.estimatedClearanceHours);
    const mins = Math.round((iobResult.estimatedClearanceHours % 1) * 60);
    return `${hours}h ${mins}m`;
  }, [iobResult]);

  // Dynamic X position on the 18h PK timeline (10px to 330px)
  const markerX = useMemo(() => {
    if (!latestDose || iobResult.totalIob <= 0.02) return 10;
    return Math.max(10, Math.min(330, 10 + (elapsedHours / 18) * 320));
  }, [latestDose, iobResult.totalIob, elapsedHours]);

  const totalUnitsLoggedToday = useMemo(() => {
    return todayRecords.reduce((acc, r) => acc + (r.doseUnits || 0), 0);
  }, [todayRecords]);

  const totalPrescribed = (profile.morningDose || 20) + (profile.nightDose || 20);

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto px-4 pt-3 pb-24 space-y-4">
      {/* Top Informational Badge & Page Header */}
      <div className="flex flex-col gap-1 pt-1">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e1e0ff] text-[#07006c]">
            <span className="material-symbols-outlined text-[15px]">medication_liquid</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Clinical Pharmacodynamics</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#3d4947] font-semibold">
            Protocol Rx {profile.protocolRx || '#84920'}
          </span>
        </div>
        <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-[22px] font-bold text-[#0b1c30] mt-1 leading-snug">
          Insulin Pharmacokinetics &amp; Prescribed Profiles
        </h1>
        <p className="text-[12px] text-[#3d4947] leading-relaxed">
          Dual-phase subcutaneous absorption model, real-time active IOB computation, and calibrated clinical safety margins.
        </p>
      </div>

      {/* Interactive Dual-Phase PK Decay Simulation Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#e5eeff] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#00685f]/10 flex items-center justify-center text-[#00685f]">
              <span className="material-symbols-outlined text-[20px]">show_chart</span>
            </div>
            <div>
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[15px] text-[#0b1c30] block leading-tight">
                Mixtard 30 Dynamic PK Curve
              </span>
              <span className="text-[11px] text-[#3d4947]">Dual-phase subcutaneous kinetic model (30/70)</span>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-[#eff4ff] px-2 py-1 rounded-full">
            <span className={`w-2 h-2 rounded-full ${iobResult.totalIob > 0.05 ? 'bg-[#00685f] animate-ping' : 'bg-[#6d7a77]'}`} />
            <span className="text-[11px] text-[#00685f] font-bold">
              {latestDose && iobResult.totalIob > 0.05 ? `T+${elapsedHours.toFixed(1)}h` : 'Standby'}
            </span>
          </div>
        </div>

        {/* The PK Chart Container with SVG Rendering */}
        <div className="relative w-full h-44 bg-[#eff4ff] rounded-2xl p-2.5 flex flex-col justify-between overflow-hidden border border-[#e5eeff]">
          {/* Background Guide Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between p-3 opacity-20 pointer-events-none">
            <div className="w-full h-px bg-[#6d7a77]" />
            <div className="w-full h-px bg-[#6d7a77]" />
            <div className="w-full h-px bg-[#6d7a77]" />
          </div>

          {/* Live Interactive Indicator Overlay */}
          <div className="absolute top-2 right-3 flex items-center gap-3 z-10">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#6063ee]" />
              <span className="text-[10px] text-[#3d4947] font-semibold">Rapid (30%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#00685f]" />
              <span className="text-[10px] text-[#3d4947] font-semibold">Isophane (70%)</span>
            </div>
          </div>

          {/* Curves SVG */}
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 340 120">
            <defs>
              <linearGradient id="rapidGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#6063ee" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#6063ee" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="nphGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#008378" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#008378" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Rapid Soluble Component: Fast peak (~2h) then sharp clearance by 6h */}
            <path d="M 10 110 Q 30 18 55 18 T 115 110" fill="url(#rapidGradient)" />
            <path
              d="M 10 110 Q 30 18 55 18 T 115 110"
              fill="none"
              stroke="#6063ee"
              strokeLinecap="round"
              strokeWidth="2.5"
            />

            {/* Intermediate Isophane (NPH) Component: Broad gradual rise, plateau 4-8h, duration to 18h */}
            <path
              d="M 10 110 C 50 100 85 42 145 42 C 210 42 270 95 330 110 L 330 110 L 10 110 Z"
              fill="url(#nphGradient)"
            />
            <path
              d="M 10 110 C 50 100 85 42 145 42 C 210 42 270 95 330 110"
              fill="none"
              stroke="#008378"
              strokeLinecap="round"
              strokeWidth="2.5"
            />

            {/* Current Elapsed Time Marker */}
            {iobResult.totalIob > 0.02 && (
              <>
                <line stroke="#ba1a1a" strokeDasharray="3,3" strokeWidth="1.5" x1={markerX} x2={markerX} y1="10" y2="115" />
                <circle cx={markerX} cy="50" fill="#ba1a1a" r="4.5" />
              </>
            )}
          </svg>

          {/* Time Axis */}
          <div className="flex justify-between items-center px-1 text-[10px] text-[#3d4947] font-semibold">
            <span>0h (Inj)</span>
            <span>2h (Peak 1)</span>
            <span>6h (Active)</span>
            <span>12h</span>
            <span>18h (Tail)</span>
          </div>
        </div>

        {/* Active State readout summary */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-[#eff4ff] rounded-2xl p-3 flex items-center justify-between border border-[#e5eeff]">
            <div>
              <span className="text-[10px] text-[#3d4947] block font-medium">Total Active IOB</span>
              <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[18px] text-[#00685f] font-extrabold">
                {iobResult.totalIob.toFixed(2)} <span className="text-[12px] font-normal text-[#3d4947]">units</span>
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#008378] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[18px]">water_drop</span>
            </div>
          </div>

          <div className="bg-[#eff4ff] rounded-2xl p-3 flex items-center justify-between border border-[#e5eeff]">
            <div>
              <span className="text-[10px] text-[#3d4947] block font-medium">Pred. Clearance</span>
              <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[18px] text-[#0b1c30] font-extrabold">
                {clearanceText}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#dce9ff] text-[#00685f] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[18px]">timer</span>
            </div>
          </div>
        </div>
      </div>

      {/* Prescription Pharmacotherapy Regimen Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#4648d4] text-[20px]">prescriptions</span>
          <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-bold text-[#0b1c30]">
            Active Insulin Regimens
          </h2>
        </div>
        <span className="text-[11px] text-[#006947] bg-[#006947]/10 px-2.5 py-0.5 rounded-full font-bold">
          2 Primary Active
        </span>
      </div>

      {/* Card 1: Mixtard 30 */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#e5eeff] flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00685f]/10 text-[#00685f] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[24px]">vaccines</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-bold text-[#0b1c30]">
                  Mixtard® 30
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#89f5e7] text-[#00201d] font-bold">
                  Premixed
                </span>
              </div>
              <span className="text-[11px] text-[#3d4947]">30% Soluble Neutral / 70% Isophane Human</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[#3d4947] block font-medium">Daily Target / Logged</span>
            <span className="text-[14px] text-[#00685f] font-bold">
              {totalUnitsLoggedToday > 0 ? `${totalUnitsLoggedToday}u logged` : `${totalPrescribed} units Rx`}
            </span>
          </div>
        </div>

        {/* Administration Timing Breakdown (Dynamically derived from real logged records) */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Morning Dose */}
          <div className="bg-[#eff4ff] rounded-2xl p-2.5 flex flex-col gap-1 border border-[#e5eeff]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[#0b1c30]">
                <span className="material-symbols-outlined text-[16px] text-[#00685f]">wb_twilight</span>
                <span className="text-[12px] font-bold">Morning Dose</span>
              </div>
              {morningRecord ? (
                <span className="text-[10px] text-[#006947] bg-[#006947]/10 px-1.5 py-0.5 rounded font-bold">
                  Injected
                </span>
              ) : (
                <span className="text-[10px] text-[#3d4947] bg-[#eff4ff] border border-[#dce9ff] px-1.5 py-0.5 rounded font-bold">
                  Upcoming
                </span>
              )}
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[18px] font-bold text-[#0b1c30]">
                {morningRecord ? morningRecord.doseUnits : (profile.morningDose || 20)}{' '}
                <span className="text-[11px] font-normal text-[#3d4947]">u</span>
              </span>
              <span className="text-[11px] text-[#3d4947]">
                {morningRecord
                  ? `${formatTimeOnly(morningRecord.timestamp)} (Breakfast)`
                  : '7:30 AM (Breakfast)'}
              </span>
            </div>
            <span className="text-[10px] font-medium mt-0.5">
              {morningRecord ? (
                morningResidual > 0.05 ? (
                  <span className="text-[#00685f] font-semibold">
                    Current residual: ~{morningResidual.toFixed(1)}u active
                  </span>
                ) : (
                  <span className="text-[#006947] font-semibold">Dose cleared</span>
                )
              ) : (
                <span className="text-[#3d4947]">Pending morning log</span>
              )}
            </span>
          </div>

          {/* Night / Dinner Dose */}
          <div className="bg-[#eff4ff] rounded-2xl p-2.5 flex flex-col gap-1 border border-[#e5eeff]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[#0b1c30]">
                <span className="material-symbols-outlined text-[16px] text-[#4648d4]">dark_mode</span>
                <span className="text-[12px] font-bold">Night Dose</span>
              </div>
              {nightRecord ? (
                <span className="text-[10px] text-[#006947] bg-[#006947]/10 px-1.5 py-0.5 rounded font-bold">
                  Injected
                </span>
              ) : (
                <span className="text-[10px] text-[#3d4947] bg-[#d3e4fe] px-1.5 py-0.5 rounded font-bold">
                  Upcoming
                </span>
              )}
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[18px] font-bold text-[#0b1c30]">
                {nightRecord ? nightRecord.doseUnits : (profile.nightDose || 20)}{' '}
                <span className="text-[11px] font-normal text-[#3d4947]">u</span>
              </span>
              <span className="text-[11px] text-[#3d4947]">
                {nightRecord
                  ? `${formatTimeOnly(nightRecord.timestamp)} (Dinner)`
                  : '8:00 PM (Dinner)'}
              </span>
            </div>
            <span className="text-[10px] font-medium mt-0.5">
              {nightRecord ? (
                nightResidual > 0.05 ? (
                  <span className="text-[#00685f] font-semibold">
                    Current residual: ~{nightResidual.toFixed(1)}u active
                  </span>
                ) : (
                  <span className="text-[#006947] font-semibold">Dose cleared</span>
                )
              ) : (
                <span className="text-[#3d4947]">Pre-meal verification req.</span>
              )}
            </span>
          </div>
        </div>

        {/* Detailed PK Metrics Grid */}
        <div className="bg-[#eff4ff]/60 rounded-2xl p-3 grid grid-cols-3 gap-2 text-center border border-[#e5eeff]">
          <div>
            <span className="text-[10px] text-[#3d4947] block font-medium">Onset Action</span>
            <span className="text-[13px] text-[#0b1c30] font-bold">30 mins</span>
          </div>
          <div>
            <span className="text-[10px] text-[#3d4947] block font-medium">Dual Peaks</span>
            <span className="text-[13px] text-[#0b1c30] font-bold">2 - 8 hrs</span>
          </div>
          <div>
            <span className="text-[10px] text-[#3d4947] block font-medium">Duration</span>
            <span className="text-[13px] text-[#0b1c30] font-bold">12 - 24 hrs</span>
          </div>
        </div>
      </div>

      {/* Card 2: Actrapid */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#e5eeff] flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4648d4]/10 text-[#4648d4] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[24px]">bolt</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-bold text-[#0b1c30]">
                  Actrapid®
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e1e0ff] text-[#07006c] font-bold">
                  Fast-Acting
                </span>
              </div>
              <span className="text-[11px] text-[#3d4947]">Regular Human Insulin (Short-acting)</span>
            </div>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#eff4ff] text-[#0b1c30] font-semibold">
            PRN / As Needed
          </span>
        </div>

        <div className="bg-[#eff4ff] rounded-2xl p-3 flex items-center justify-between border border-[#e5eeff]">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#4648d4] text-[20px]">restaurant</span>
            <div>
              <span className="text-[12px] text-[#0b1c30] font-bold block">
                Prandial Bolus &amp; Glycemic Correction
              </span>
              <span className="text-[11px] text-[#3d4947]">
                Administer 30 mins before unscheduled high-carb meals or for glucose &gt; 180 mg/dL
              </span>
            </div>
          </div>
        </div>

        {/* Actrapid Reference Metrics Grid */}
        <div className="bg-[#eff4ff]/60 rounded-2xl p-3 grid grid-cols-3 gap-2 text-center border border-[#e5eeff]">
          <div>
            <span className="text-[10px] text-[#3d4947] block font-medium">Onset</span>
            <span className="text-[13px] text-[#4648d4] font-bold">30 mins</span>
          </div>
          <div>
            <span className="text-[10px] text-[#3d4947] block font-medium">Peak Activity</span>
            <span className="text-[13px] text-[#4648d4] font-bold">1.5 - 3.5 hrs</span>
          </div>
          <div>
            <span className="text-[10px] text-[#3d4947] block font-medium">Total Window</span>
            <span className="text-[13px] text-[#4648d4] font-bold">7 - 8 hrs</span>
          </div>
        </div>
      </div>

      {/* Card 3: Basal Insulin Profile Toggle (Degludec / Glargine) */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#e5eeff] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#eff4ff] text-[#3d4947] flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">timelapse</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[15px] font-bold text-[#0b1c30]">
                  Long-Acting Basal Mode
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#3d4947] font-semibold">
                  {basalActive ? 'Active' : 'Standby'}
                </span>
              </div>
              <span className="text-[11px] text-[#3d4947]">Degludec (Tresiba) / Glargine (Lantus) profile</span>
            </div>
          </div>

          {/* Interactive Toggle Switch */}
          <button
            onClick={() => setBasalActive(!basalActive)}
            className={`w-12 h-7 rounded-full p-1 flex items-center transition-colors cursor-pointer ${
              basalActive ? 'bg-[#00685f]' : 'bg-[#d3e4fe]'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                basalActive ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Expanded info block when toggling alternate protocol */}
        {basalActive && (
          <div className="bg-[#eff4ff] rounded-2xl p-3 text-[12px] text-[#3d4947] border border-[#e5eeff] space-y-1">
            <div className="flex items-center gap-1.5 text-[#00685f] font-bold">
              <span className="material-symbols-outlined text-[16px]">info</span>
              <span>Secondary Basal Profile Specs</span>
            </div>
            <p className="leading-relaxed">
              Ultra-long pharmacokinetic flatline profile (~42h half-life for Degludec). Currently suppressed while patient is stabilized on Mixtard 30 b.i.d.
            </p>
          </div>
        )}
      </div>

      {/* Treatment Parameters Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#e5eeff] flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#006947]/10 text-[#006947] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
            </div>
            <div>
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[15px] text-[#0b1c30] block leading-tight">
                Treatment Parameters &amp; Ratios
              </span>
              <span className="text-[11px] text-[#3d4947]">
                Personal Protocol • {profile.personalNotes || 'Active Self-Care Rules'}
              </span>
            </div>
          </div>
          <button
            onClick={onOpenParameterModal}
            className="w-8 h-8 rounded-full bg-[#eff4ff] hover:bg-[#dce9ff] flex items-center justify-center text-[#3d4947] cursor-pointer"
            title="Edit Parameters"
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
          </button>
        </div>

        {/* Treatment Parameter Rows */}
        <div className="flex flex-col gap-2">
          {/* Target Glucose */}
          <div className="flex items-center justify-between p-2.5 bg-[#eff4ff] rounded-2xl border border-[#e5eeff]">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px] text-[#006947]">my_location</span>
              <div>
                <span className="text-[12px] text-[#0b1c30] block font-bold">Target Blood Glucose</span>
                <span className="text-[10px] text-[#3d4947]">Physiological target set point</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] text-[#006947] font-bold">
                {profile.targetGlucose} <span className="text-[11px] font-normal text-[#3d4947]">mg/dL</span>
              </span>
              <span className="text-[10px] text-[#3d4947] block">
                Range: {profile.targetRangeMin} - {profile.targetRangeMax}
              </span>
            </div>
          </div>

          {/* ISF */}
          <div className="flex items-center justify-between p-2.5 bg-[#eff4ff] rounded-2xl border border-[#e5eeff]">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px] text-[#00685f]">straighten</span>
              <div>
                <span className="text-[12px] text-[#0b1c30] block font-bold">Sensitivity Factor (ISF)</span>
                <span className="text-[10px] text-[#3d4947]">Correction potency per unit</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] text-[#00685f] font-bold">
                1u : {profile.insulinSensitivityFactor} <span className="text-[11px] font-normal text-[#3d4947]">mg/dL</span>
              </span>
              <span className="text-[10px] text-[#3d4947] block">
                1 unit drops {profile.insulinSensitivityFactor} mg/dL
              </span>
            </div>
          </div>

          {/* ICR */}
          <div className="flex items-center justify-between p-2.5 bg-[#eff4ff] rounded-2xl border border-[#e5eeff]">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px] text-[#4648d4]">lunch_dining</span>
              <div>
                <span className="text-[12px] text-[#0b1c30] block font-bold">Insulin-to-Carb Ratio (ICR)</span>
                <span className="text-[10px] text-[#3d4947]">Carbohydrate coverage rule</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] text-[#4648d4] font-bold">
                1u : {profile.insulinToCarbRatio}g <span className="text-[11px] font-normal text-[#3d4947]">carbs</span>
              </span>
              <span className="text-[10px] text-[#3d4947] block">Prandial dosing ratio</span>
            </div>
          </div>

          {/* DIA & Hypo Safety Threshold in 2 Columns */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-[#eff4ff] rounded-2xl border border-[#e5eeff]">
              <div className="flex items-center gap-1.5 text-[#3d4947] mb-1">
                <span className="material-symbols-outlined text-[16px] text-[#0b1c30]">hourglass_bottom</span>
                <span className="text-[11px] font-bold text-[#0b1c30]">Active Duration (DIA)</span>
              </div>
              <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[18px] text-[#0b1c30] font-bold">
                {profile.activeDurationHours} <span className="text-[11px] font-normal text-[#3d4947]">hours</span>
              </span>
              <span className="text-[10px] text-[#3d4947] block mt-0.5">Stacking prevention</span>
            </div>

            <div className="p-2.5 bg-[#ffdad6]/60 rounded-2xl border border-[#ba1a1a]/20">
              <div className="flex items-center gap-1.5 text-[#ba1a1a] mb-1">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                <span className="text-[11px] font-bold uppercase">Hypo Limit</span>
              </div>
              <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[18px] text-[#ba1a1a] font-bold">
                &lt; {profile.hypoLimit} <span className="text-[11px] font-normal text-[#ba1a1a]">mg/dL</span>
              </span>
              <span className="text-[10px] text-[#93000a] block mt-0.5 font-medium">Triggers 15g Rule</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
