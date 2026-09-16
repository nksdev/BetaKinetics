import React from 'react';
import { GlucoseRecord, PatientProfile } from '../types';
import { calculatePeriodAnalysis } from '../services/analysisEngine';

interface AgpExportModalProps {
  profile: PatientProfile;
  glucoseRecords?: GlucoseRecord[];
  isOpen: boolean;
  onClose: () => void;
}

export const AgpExportModal: React.FC<AgpExportModalProps> = ({
  profile,
  glucoseRecords = [],
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const hasData = glucoseRecords.length > 0;
  const analysis = calculatePeriodAnalysis(glucoseRecords, 90, '90-Day Rolling');

  // Compute 24h curve points
  const points = glucoseRecords
    .map(r => {
      const d = new Date(r.timestamp);
      const minutes = d.getHours() * 60 + d.getMinutes();
      const x = Math.max(10, Math.min(310, (minutes / 1440) * 320));
      let y: number;
      if (r.value >= 180) {
        y = 30 - ((Math.min(r.value, 280) - 180) / 100) * 20;
      } else if (r.value <= 70) {
        y = 75 + ((70 - Math.max(r.value, 40)) / 30) * 18;
      } else {
        y = 75 - ((r.value - 70) / 110) * 45;
      }
      y = Math.max(10, Math.min(92, y));
      return { ...r, x, y };
    })
    .sort((a, b) => a.x - b.x);

  const curvePath =
    points.length > 1
      ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
      : '';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 print:p-0 print:static print:bg-white">
      <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:rounded-none">
        {/* Modal Top Actions (hidden on print) */}
        <div className="p-4 bg-[#eff4ff] border-b border-[#e5eeff] flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00685f] text-[22px]">picture_as_pdf</span>
            <div>
              <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[16px] text-[#0b1c30]">
                Ambulatory Glucose Profile (AGP)
              </h3>
              <p className="text-[11px] text-[#3d4947]">International Standard Clinical Consensus Report</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-full bg-[#00685f] text-white text-[12px] font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white text-[#3d4947] hover:bg-[#e5eeff] flex items-center justify-center cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Printable AGP Report Document */}
        <div className="p-6 overflow-y-auto space-y-5 print:p-4 text-[#0b1c30]">
          {/* Header Banner */}
          <div className="flex items-start justify-between border-b pb-4 border-[#e5eeff]">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-[22px] font-extrabold text-[#00685f]">
                  AGP REPORT
                </h1>
                <span className="text-[11px] px-2 py-0.5 rounded bg-[#eff4ff] text-[#00685f] font-bold uppercase">
                  Continuous Glucose Monitoring
                </span>
              </div>
              <p className="text-[12px] text-[#3d4947]">International Consensus on Time in Range (TIR)</p>
            </div>
            <div className="text-right text-[12px]">
              <span className="font-bold block text-[#0b1c30]">{profile.name}</span>
              <span className="text-[#3d4947]">Age: {profile.age} • Type 1 Diabetes</span>
              <span className="text-[#3d4947] block">Rx {profile.protocolRx || '#84920'}</span>
            </div>
          </div>

          {/* Core Benchmark Statistics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#eff4ff] border border-[#e5eeff]">
              <span className="text-[10px] text-[#3d4947] block font-bold uppercase">Time in Range (70-180)</span>
              <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[26px] font-extrabold text-[#006947]">
                {hasData ? `${analysis.tirPercent}%` : '—%'}
              </span>
              <span className="text-[10px] text-[#006947] block font-semibold">Consensus Goal: &gt; 70%</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#eff4ff] border border-[#e5eeff]">
              <span className="text-[10px] text-[#3d4947] block font-bold uppercase">Mean Glucose</span>
              <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[26px] font-extrabold text-[#0b1c30]">
                {hasData ? analysis.avgGlucose : '—'}
              </span>
              <span className="text-[10px] text-[#3d4947] block font-semibold">mg/dL</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#eff4ff] border border-[#e5eeff]">
              <span className="text-[10px] text-[#3d4947] block font-bold uppercase">Estimated GMI</span>
              <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[26px] font-extrabold text-[#4648d4]">
                {hasData ? `${analysis.gmi || analysis.projectedA1c}%` : '—%'}
              </span>
              <span className="text-[10px] text-[#4648d4] block font-semibold">Projected HbA1c</span>
            </div>
          </div>

          {/* Time In Range Detailed Consensus Breakout */}
          <div className="space-y-2">
            <h4 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[14px]">
              Time in Ranges (Clinical Target Breakdown)
            </h4>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex items-center justify-between">
                <span>Very High (&gt; 250 mg/dL)</span>
                <span className="font-bold">
                  {hasData ? `${analysis.veryHighPercent ?? 0}% (Goal < 5%)` : '—% (Goal < 5%)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>High (181–250 mg/dL)</span>
                <span className="font-bold">
                  {hasData
                    ? `${Math.max(0, analysis.hyperPercent - (analysis.veryHighPercent || 0))}%`
                    : '—%'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#006947]">
                <span className="font-semibold">Target Range (70–180 mg/dL)</span>
                <span className="font-bold">
                  {hasData ? `${analysis.tirPercent}% (Goal > 70%)` : '—% (Goal > 70%)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Low (54–69 mg/dL)</span>
                <span className="font-bold text-[#ba1a1a]">
                  {hasData
                    ? `${Math.max(0, analysis.hypoPercent - (analysis.veryLowPercent || 0))}% (Goal < 4%)`
                    : '—% (Goal < 4%)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Very Low (&lt; 54 mg/dL)</span>
                <span className="font-bold text-[#ba1a1a]">
                  {hasData ? `${analysis.veryLowPercent ?? 0}% (Goal < 1%)` : '—% (Goal < 1%)'}
                </span>
              </div>
            </div>
          </div>

          {/* AGP Percentile Modal Dispersion Graph */}
          <div className="p-4 rounded-2xl bg-[#eff4ff] border border-[#e5eeff] space-y-2">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-bold text-[#0b1c30]">24-Hour Modal Profile (Median &amp; IQR)</span>
              <span className="text-[11px] text-[#3d4947]">Target safe zone 70-180 shaded</span>
            </div>
            <div className="h-32 w-full bg-white rounded-xl p-2 relative">
              <svg className="w-full h-full" viewBox="0 0 320 100" preserveAspectRatio="none">
                {/* Target Range Band 70-180 */}
                <rect x="0" y="30" width="320" height="45" fill="#e8f5e9" opacity="0.8" />
                <line x1="0" y1="30" x2="320" y2="30" stroke="#81c784" strokeDasharray="3 3" />
                <line x1="0" y1="75" x2="320" y2="75" stroke="#81c784" strokeDasharray="3 3" />
                {/* Real Modal Curve */}
                {curvePath && (
                  <path
                    d={curvePath}
                    fill="none"
                    stroke="#00685f"
                    strokeWidth="3"
                  />
                )}
                {/* Real Dots */}
                {points.map((p, i) => (
                  <circle
                    key={p.id || i}
                    cx={p.x}
                    cy={p.y}
                    r="3.5"
                    fill={p.value < 70 ? '#ba1a1a' : p.value > 180 ? '#4648d4' : '#006947'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                ))}
              </svg>

              {!hasData && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-white/75 backdrop-blur-2xs rounded-xl">
                  <span className="text-[12px] font-bold text-[#0b1c30]">No Telemetry Logs</span>
                  <p className="text-[10px] text-[#3d4947] mt-0.5">
                    Log blood glucose tests to generate your 24-hour ambulatory glucose curve.
                  </p>
                </div>
              )}

              <div className="flex justify-between text-[9px] text-[#3d4947] mt-1 font-medium">
                <span>12 AM</span>
                <span>4 AM</span>
                <span>8 AM</span>
                <span>12 PM</span>
                <span>4 PM</span>
                <span>8 PM</span>
                <span>12 AM</span>
              </div>
            </div>
          </div>

          {/* Report Footer */}
          <div className="pt-4 border-t border-[#e5eeff] flex items-center justify-between text-[11px] text-[#3d4947]">
            <div>
              <span>Monitored by: <strong>{profile.name}</strong></span>
              <div className="text-[10px]">{profile.diabetesType} • Personal AGP Report</div>
            </div>
            <div className="text-right">
              <span>Generated: {new Date().toLocaleDateString()}</span>
              <div className="text-[10px]">BetaKinetics Decision Support System</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
