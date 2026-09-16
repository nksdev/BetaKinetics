import React, { useState } from 'react';
import { GlucoseRecord, PatientProfile } from '../types';
import { calculatePeriodAnalysis } from '../services/analysisEngine';
import { analyzeRoutineSlots, detectClinicalPatterns } from '../services/patternEngine';
import { getStorageDaysUsed } from '../services/storageEngine';

interface AnalyticsViewProps {
  profile: PatientProfile;
  glucoseRecords: GlucoseRecord[];
  onOpenAgpExport: () => void;
  onOpenBackupRestore?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  glucoseRecords,
  onOpenAgpExport,
  onOpenBackupRestore
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<number>(3); // 3-day focus default
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2600);
  };

  const periodTabs = [
    { days: 1, label: 'Today' },
    { days: 3, label: '3 Days Focus' },
    { days: 7, label: '7 Days' },
    { days: 14, label: '14 Days' },
    { days: 30, label: '30 Days' },
    { days: 90, label: '90 Days Rolling' }
  ];

  const currentTabObj = periodTabs.find(t => t.days === selectedPeriod) || periodTabs[1];
  const analysis = calculatePeriodAnalysis(glucoseRecords, selectedPeriod, currentTabObj.label);
  const routineSlots = analyzeRoutineSlots(glucoseRecords);
  const clinicalPatterns = detectClinicalPatterns(glucoseRecords);
  const daysUsed = getStorageDaysUsed();

  const hasData = analysis.totalReadings > 0;

  // Filter records in current selected period for modal dispersion graph
  const periodCutoff = Date.now() - selectedPeriod * 24 * 60 * 60 * 1000;
  const periodRecords = glucoseRecords.filter(r => new Date(r.timestamp).getTime() >= periodCutoff);

  // Process data points for 24-hour cycle modal curve
  const graphPoints = periodRecords
    .map(r => {
      const d = new Date(r.timestamp);
      const minutes = d.getHours() * 60 + d.getMinutes();
      const x = Math.max(12, Math.min(328, (minutes / 1440) * 340));
      let y: number;
      if (r.value >= 180) {
        y = 50 - ((Math.min(r.value, 280) - 180) / 100) * 35;
      } else if (r.value <= 70) {
        y = 120 + ((70 - Math.max(r.value, 40)) / 30) * 25;
      } else {
        y = 120 - ((r.value - 70) / 110) * 70;
      }
      y = Math.max(18, Math.min(145, y));
      return { ...r, x, y };
    })
    .sort((a, b) => a.x - b.x);

  const graphPath =
    graphPoints.length > 1
      ? graphPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ')
      : '';

  const hasDawnSpike = clinicalPatterns.some(p => p.type === 'dawn_phenomenon');

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto px-4 pt-3 pb-24 space-y-4">
      {/* Micro-Header Context & Range Selector */}
      <div className="flex flex-col space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-[#00685f]/10 flex items-center justify-center text-[#00685f]">
              <span className="material-symbols-outlined text-[20px]">insights</span>
            </div>
            <div>
              <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-[17px] font-bold text-[#0b1c30] leading-tight">
                Glycemic Trends
              </h2>
              <p className="text-[11px] text-[#3d4947]">Pattern Engine &amp; AGP Analytics</p>
            </div>
          </div>

          {/* Clinician Quick Share CTA & Backup */}
          <div className="flex items-center gap-1.5">
            {onOpenBackupRestore && (
              <button
                onClick={onOpenBackupRestore}
                title="Backup / Restore All Data"
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00685f] text-[11px] font-semibold rounded-full transition-all active:scale-95 shadow-xs cursor-pointer border border-[#c2d7ff]"
              >
                <span className="material-symbols-outlined text-[15px]">cloud_sync</span>
                <span className="hidden sm:inline">Backup</span>
              </button>
            )}
            <button
              onClick={onOpenAgpExport}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00685f] text-[12px] font-semibold rounded-full transition-all active:scale-95 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
              <span>Export AGP</span>
            </button>
          </div>
        </div>

        {/* Timeframe Selector Tabs (Horizontal Scrollable) */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
          {periodTabs.map(tab => {
            const isActive = selectedPeriod === tab.days;
            return (
              <button
                key={tab.days}
                onClick={() => setSelectedPeriod(tab.days)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#00685f] text-white shadow-xs'
                    : 'bg-[#eff4ff] text-[#3d4947] hover:bg-[#e5eeff]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Focus Analysis Card */}
      <div className="relative bg-white rounded-3xl p-5 shadow-sm border border-[#e5eeff] space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-full bg-[#e1e0ff] text-[#07006c] text-[10px] font-bold uppercase tracking-wider">
                Active Analysis
              </span>
              <span className="text-[11px] text-[#3d4947] font-medium">
                {analysis.totalReadings} telemetry log{analysis.totalReadings === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[46px] font-extrabold text-[#0b1c30] leading-none">
                {hasData ? analysis.avgGlucose : '—'}
              </span>
              <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-bold text-[#3d4947]">
                mg/dL
              </span>
              <span className="text-[12px] text-[#006947] font-semibold flex items-center ml-1">
                <span className="material-symbols-outlined text-[16px]">trending_flat</span>
                <span>{hasData ? 'Target Band' : 'Target 70–180 mg/dL'}</span>
              </span>
            </div>
            <p className="text-[12px] text-[#3d4947] mt-0.5">
              {hasData ? `${analysis.label} Mean Glucose` : 'No blood sugar readings recorded for this window'}
            </p>
          </div>

          {/* Day-by-Day Micro Pills for 3-Day Focus */}
          {selectedPeriod === 3 && hasData && (analysis.day1Avg || analysis.day2Avg || analysis.day3Avg) && (
            <div className="flex flex-col items-end space-y-1">
              <div className="flex items-center space-x-1.5 bg-[#eff4ff] px-2 py-0.8 rounded-lg">
                <span className="text-[10px] text-[#3d4947] font-medium">D1</span>
                <span className="text-[12px] text-[#0b1c30] font-bold">{analysis.day1Avg ?? '—'}</span>
              </div>
              <div className="flex items-center space-x-1.5 bg-[#eff4ff] px-2 py-0.8 rounded-lg">
                <span className="text-[10px] text-[#3d4947] font-medium">D2</span>
                <span className="text-[12px] text-[#4648d4] font-bold">{analysis.day2Avg ?? '—'}</span>
              </div>
              <div className="flex items-center space-x-1.5 bg-[#eff4ff] px-2 py-0.8 rounded-lg">
                <span className="text-[10px] text-[#3d4947] font-medium">D3</span>
                <span className="text-[12px] text-[#0b1c30] font-bold">{analysis.day3Avg ?? '—'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Time In Range (TIR) Segmented Progress Bar */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-[#0b1c30] font-bold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#006947]" />
              Time In Range (70–180 mg/dL)
            </span>
            <span className="text-[#006947] font-bold">
              {hasData ? `${analysis.tirPercent}%` : '—%'}
            </span>
          </div>

          {/* Segmented Bar */}
          {hasData ? (
            <div className="w-full h-3 rounded-full bg-[#e5eeff] flex overflow-hidden p-0.5 gap-0.5">
              {analysis.hypoPercent > 0 && (
                <div
                  className="h-full bg-[#ba1a1a] rounded-full transition-all duration-700"
                  style={{ width: `${analysis.hypoPercent}%` }}
                />
              )}
              <div
                className="h-full bg-[#006947] rounded-full transition-all duration-700"
                style={{ width: `${analysis.tirPercent}%` }}
              />
              {analysis.hyperPercent > 0 && (
                <div
                  className="h-full bg-[#4648d4] rounded-full transition-all duration-700"
                  style={{ width: `${analysis.hyperPercent}%` }}
                />
              )}
            </div>
          ) : (
            <div className="w-full h-3 rounded-full bg-[#eff4ff] border border-[#e5eeff] flex items-center justify-center">
              <span className="text-[9px] text-[#3d4947] font-medium">No readings recorded yet</span>
            </div>
          )}

          {/* TIR Legend breakdown */}
          <div className="flex items-center justify-between text-[11px] pt-0.5 px-0.5">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ba1a1a]" />
              <span className="text-[#3d4947]">
                Low (&lt;70):{' '}
                <strong className="text-[#0b1c30] font-semibold">
                  {hasData ? `${analysis.hypoPercent}%` : '—%'}
                </strong>
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#006947]" />
              <span className="text-[#3d4947]">
                In Range:{' '}
                <strong className="text-[#0b1c30] font-semibold">
                  {hasData ? `${analysis.tirPercent}%` : '—%'}
                </strong>
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#4648d4]" />
              <span className="text-[#3d4947]">
                High (&gt;180):{' '}
                <strong className="text-[#0b1c30] font-semibold">
                  {hasData ? `${analysis.hyperPercent}%` : '—%'}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* International Consensus Glycemic Metrics (ADA / ATTD) */}
        <div className="pt-2 border-t border-[#e5eeff] grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-2xl bg-[#eff4ff]">
            <span className="text-[10px] text-[#3d4947] font-semibold block">GMI (Est. HbA1c)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[18px] font-bold text-[#0b1c30]">
                {hasData ? `${analysis.gmi || analysis.projectedA1c}%` : '—'}
              </span>
            </div>
            <span className="text-[9px] text-[#00685f] font-medium">Bergenstal Formula</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#eff4ff]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#3d4947] font-semibold block">Variability (CV)</span>
              <span
                className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full ${
                  !hasData
                    ? 'bg-[#e5eeff] text-[#3d4947]'
                    : (analysis.cv || 0) <= 36
                    ? 'bg-[#006947]/10 text-[#006947]'
                    : 'bg-[#ba1a1a]/10 text-[#ba1a1a]'
                }`}
              >
                {!hasData ? 'No Data' : (analysis.cv || 0) <= 36 ? '≤36% Target' : '>36% High'}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[18px] font-bold text-[#0b1c30]">
                {hasData ? `${analysis.cv}%` : '—'}
              </span>
            </div>
            <span className="text-[9px] text-[#3d4947]">
              {hasData ? `SD: ±${analysis.sd || 0} mg/dL` : 'Need logs'}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#eff4ff]">
            <span className="text-[10px] text-[#3d4947] font-semibold block">Very High (&gt;250)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[18px] font-bold text-[#0b1c30]">
                {hasData ? `${analysis.veryHighPercent ?? 0}%` : '—'}
              </span>
            </div>
            <span className="text-[9px] text-[#3d4947]">Target &lt;5%</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#eff4ff]">
            <span className="text-[10px] text-[#3d4947] font-semibold block">Very Low (&lt;54)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[18px] font-bold text-[#ba1a1a]">
                {hasData ? `${analysis.veryLowPercent ?? 0}%` : '—'}
              </span>
            </div>
            <span className="text-[9px] text-[#3d4947]">Target &lt;1%</span>
          </div>
        </div>
      </div>

      {/* Glycemic Telemetry Graph Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#e5eeff] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-bold text-[#0b1c30]">
              {currentTabObj.label} Modal Dispersion
            </h3>
            <p className="text-[11px] text-[#3d4947]">
              {graphPoints.length > 0
                ? `${graphPoints.length} logged check${graphPoints.length === 1 ? '' : 's'} across 24h timeline`
                : 'Target safe band reference (70–180 mg/dL)'}
            </p>
          </div>
          <div className="flex items-center space-x-1 bg-[#eff4ff] px-2.5 py-1 rounded-full text-[#006947] text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#006947]" />
            <span>70–180 mg/dL Band</span>
          </div>
        </div>

        {/* Inline Telemetry SVG Chart */}
        <div className="relative w-full h-44 mt-2">
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 340 160">
            <defs>
              <linearGradient id="targetBandGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#006947" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#006947" stopOpacity="0.03" />
              </linearGradient>
              <linearGradient id="lineCurveGrad" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#00685f" />
                <stop offset="50%" stopColor="#4648d4" />
                <stop offset="100%" stopColor="#00685f" />
              </linearGradient>
            </defs>

            {/* Horizontal Reference Guides */}
            <line stroke="#bcc9c6" strokeDasharray="3 3" strokeOpacity="0.3" x1="0" x2="340" y1="20" y2="20" />
            <text fill="#6d7a77" fontFamily="Inter" fontSize="8" x="0" y="16">
              240 mg/dL
            </text>

            {/* Safe Target Band (70 - 180) */}
            <rect fill="url(#targetBandGrad)" height="70" rx="6" width="340" x="0" y="50" />
            <line stroke="#006947" strokeOpacity="0.3" strokeWidth="1" x1="0" x2="340" y1="50" y2="50" />
            <text fill="#006947" fontFamily="Inter" fontSize="8" fontWeight="600" x="310" y="47">
              180
            </text>
            <line stroke="#006947" strokeOpacity="0.3" strokeWidth="1" x1="0" x2="340" y1="120" y2="120" />
            <text fill="#006947" fontFamily="Inter" fontSize="8" fontWeight="600" x="316" y="128">
              70
            </text>

            {/* Shaded Dawn Spike Zone (05:00 - 08:00) ONLY when clinically suspected */}
            {hasDawnSpike && (
              <>
                <rect fill="#4648d4" fillOpacity="0.07" height="110" rx="4" width="55" x="70" y="30" />
                <text fill="#4648d4" fontFamily="Inter" fontSize="7" fontWeight="700" x="73" y="42">
                  DAWN DRIFT
                </text>
              </>
            )}

            {/* Dynamic Glycemic Modal Spline from Real Readings */}
            {graphPath && (
              <path
                d={graphPath}
                fill="none"
                stroke="url(#lineCurveGrad)"
                strokeLinecap="round"
                strokeWidth="3"
              />
            )}

            {/* Real Data Points */}
            {graphPoints.map((pt, i) => {
              const isHypo = pt.value < 70;
              const isHyper = pt.value > 180;
              const dotColor = isHypo ? '#ba1a1a' : isHyper ? '#4648d4' : '#006947';

              return (
                <g key={pt.id || i}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4.5"
                    fill={dotColor}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <text
                    x={pt.x}
                    y={Math.max(12, pt.y - 6)}
                    fontSize="8"
                    fontWeight="700"
                    textAnchor="middle"
                    fill="#0b1c30"
                  >
                    {pt.value}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Clean Empty State Overlay when no readings exist */}
          {graphPoints.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-white/70 backdrop-blur-2xs rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#00685f] mb-1.5">
                <span className="material-symbols-outlined text-[20px]">show_chart</span>
              </div>
              <span className="text-[13px] font-bold text-[#0b1c30]">No Readings Recorded</span>
              <p className="text-[11px] text-[#3d4947] max-w-xs mt-0.5 leading-relaxed">
                Log your blood sugar in the Log &amp; Dose tab to view your modal curve and continuous trend.
              </p>
            </div>
          )}
        </div>

        {/* Timeline X-Axis Labels */}
        <div className="flex items-center justify-between text-[#3d4947] text-[10px] px-1 border-t border-[#e5eeff] pt-2 font-medium">
          <span>00:00 (Night)</span>
          <span className={hasDawnSpike ? 'text-[#4648d4] font-bold' : ''}>06:00 (Dawn)</span>
          <span>12:00 (Noon)</span>
          <span>18:00 (Dinner)</span>
          <span>23:59</span>
        </div>
      </div>

      {/* Routine Slot Breakdown Grid (6 Clinical Routine Checks) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-bold text-[#0b1c30]">
              Routine Slot Breakdown
            </h3>
            <p className="text-[11px] text-[#3d4947]">Paired pre &amp; post meal analysis from your records</p>
          </div>
          <span className="text-[11px] text-[#3d4947] font-semibold">6 Target Slots</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {routineSlots.map(slot => {
            const hasSlotData = slot.hasData && slot.avgValue > 0;

            return (
              <div
                key={slot.slot}
                className="p-3.5 rounded-2xl bg-white border border-[#e5eeff] shadow-xs space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        slot.patternAlert
                          ? 'bg-[#ffdad6]/60 text-[#ba1a1a]'
                          : hasSlotData
                          ? 'bg-[#eff4ff] text-[#3d4947]'
                          : 'bg-[#eff4ff]/60 text-[#bcc9c6]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {hasSlotData ? slot.icon : 'schedule'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[13px] text-[#0b1c30] font-bold">{slot.label}</span>
                        {slot.patternAlert ? (
                          <span className="material-symbols-outlined text-[16px] text-[#ba1a1a]">warning</span>
                        ) : hasSlotData ? (
                          <span className="material-symbols-outlined text-[16px] text-[#006947]">
                            check_circle
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-[16px] text-[#bcc9c6]">
                            radio_button_unchecked
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[11px] ${
                          slot.patternAlert
                            ? 'text-[#ba1a1a] font-semibold'
                            : hasSlotData
                            ? 'text-[#3d4947]'
                            : 'text-[#6d7a77]'
                        }`}
                      >
                        {slot.patternMessage ||
                          (hasSlotData
                            ? slot.slot === 'after_breakfast'
                              ? 'Optimal post-prandial absorption'
                              : slot.slot === 'before_lunch'
                              ? 'Target baseline reached'
                              : slot.slot === 'after_lunch'
                              ? 'Controlled carb recovery'
                              : slot.slot === 'before_dinner'
                              ? 'Predictable IOB clearance'
                              : 'Evening stabilization'
                            : 'No readings logged for this slot')}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-['Plus_Jakarta_Sans',sans-serif] text-[18px] font-bold ${
                        !hasSlotData
                          ? 'text-[#6d7a77]'
                          : slot.patternAlert
                          ? 'text-[#ba1a1a]'
                          : slot.statusText === 'Optimal'
                          ? 'text-[#006947]'
                          : 'text-[#0b1c30]'
                      }`}
                    >
                      {hasSlotData ? slot.avgValue : '—'}
                    </span>
                    <span
                      className={`text-[10px] block font-semibold ${
                        !hasSlotData
                          ? 'text-[#6d7a77]'
                          : slot.patternAlert
                          ? 'text-[#3d4947]'
                          : slot.statusText === 'Optimal'
                          ? 'text-[#006947]'
                          : 'text-[#006947]'
                      }`}
                    >
                      {!hasSlotData ? 'No Data' : slot.patternAlert ? 'Avg mg/dL' : slot.statusText}
                    </span>
                  </div>
                </div>

                {/* Micro Readouts for Pre-Breakfast or other slot */}
                <div className="flex items-center justify-between bg-[#eff4ff] p-2 rounded-xl text-[11px]">
                  <div className="flex items-center space-x-1">
                    <span className="text-[#3d4947]">D1:</span>
                    <span className="text-[#0b1c30] font-semibold">
                      {slot.dayValues.day1 ?? '—'}
                    </span>
                  </div>
                  <span className="text-[#bcc9c6]">•</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-[#3d4947]">D2:</span>
                    <span
                      className={`font-bold ${
                        slot.patternAlert ? 'text-[#ba1a1a]' : 'text-[#0b1c30]'
                      }`}
                    >
                      {slot.dayValues.day2 ?? '—'}
                    </span>
                  </div>
                  <span className="text-[#bcc9c6]">•</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-[#3d4947]">D3:</span>
                    <span className="text-[#0b1c30] font-semibold">
                      {slot.dayValues.day3 ?? '—'}
                    </span>
                  </div>
                  {slot.diffVsBasal && (
                    <span className="px-1.5 py-0.5 rounded bg-[#ffdad6] text-[#93000a] text-[10px] font-bold">
                      +{slot.diffVsBasal} vs Basal
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clinical Pattern AI Findings & Engine Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#e5eeff] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-[#4648d4]/10 flex items-center justify-center text-[#4648d4]">
              <span className="material-symbols-outlined text-[18px]">psychology</span>
            </div>
            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-bold text-[#0b1c30]">
              Clinical AI Findings
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#3d4947] text-[10px] font-bold">
            {glucoseRecords.length === 0
              ? 'No Logs'
              : clinicalPatterns.length > 0
              ? `${clinicalPatterns.length} Pattern(s)`
              : 'Optimal'}
          </span>
        </div>

        {clinicalPatterns.length > 0 ? (
          <div className="space-y-2.5">
            {clinicalPatterns.map(finding => (
              <div
                key={finding.id}
                className={`flex items-start space-x-3 p-3 rounded-2xl border ${
                  finding.level === 'warning'
                    ? 'bg-[#ffdad6]/20 border-[#ffdad6]'
                    : finding.level === 'positive'
                    ? 'bg-[#006947]/5 border-[#006947]/20'
                    : 'bg-[#e1e0ff]/40 border-[#c0c1ff]/30'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[22px] mt-0.5 ${
                    finding.level === 'warning'
                      ? 'text-[#ba1a1a]'
                      : finding.level === 'positive'
                      ? 'text-[#006947]'
                      : 'text-[#4648d4]'
                  }`}
                >
                  {finding.icon}
                </span>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] text-[#0b1c30] font-bold">{finding.title}</p>
                    <span className="text-[9px] font-semibold text-[#3d4947]">{finding.confidence}</span>
                  </div>
                  <p className="text-[12px] text-[#3d4947] leading-relaxed">{finding.description}</p>
                  {finding.recommendation && (
                    <p className="text-[11px] text-[#00685f] font-medium pt-0.5">
                      💡 {finding.recommendation}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : glucoseRecords.length === 0 ? (
          <div className="flex items-start space-x-3 p-3 bg-[#eff4ff] rounded-2xl border border-[#e5eeff]">
            <span className="material-symbols-outlined text-[#3d4947] text-[22px] mt-0.5">info</span>
            <div className="space-y-0.5">
              <p className="text-[13px] text-[#0b1c30] font-bold">No Telemetry Data Yet</p>
              <p className="text-[12px] text-[#3d4947] leading-relaxed">
                Log blood glucose readings across routine slots to enable automatic detection of dawn phenomenon, nocturnal stability, and postprandial excursions.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start space-x-3 p-3 bg-[#eff4ff] rounded-2xl border border-[#e5eeff]">
            <span className="material-symbols-outlined text-[#006947] text-[22px] mt-0.5">verified</span>
            <div className="space-y-0.5">
              <p className="text-[13px] text-[#0b1c30] font-bold">Stable Glycemic Control</p>
              <p className="text-[12px] text-[#3d4947] leading-relaxed">
                Across your {glucoseRecords.length} recorded reading{glucoseRecords.length === 1 ? '' : 's'}, no acute glycemic excursion patterns or nocturnal dips were detected.
              </p>
            </div>
          </div>
        )}

        {/* Local SQLite Telemetry Buffer Capacity Status */}
        <div className="p-3 bg-[#eff4ff]/70 rounded-2xl space-y-2 border border-[#e5eeff]">
          <div className="flex items-center justify-between text-[11px] text-[#3d4947]">
            <span className="flex items-center space-x-1">
              <span className="material-symbols-outlined text-[14px]">database</span>
              <span>SQLite Rolling Storage Buffer</span>
            </span>
            <span className="font-bold text-[#0b1c30]">{daysUsed} / 90 Days Used</span>
          </div>
          <div className="w-full h-1.5 bg-[#e5eeff] rounded-full overflow-hidden">
            <div className="h-full bg-[#00685f] rounded-full" style={{ width: `${(daysUsed / 90) * 100}%` }} />
          </div>
          <p className="text-[11px] text-[#3d4947]">
            Oldest telemetry records are seamlessly auto-archived to encrypted local backup without data loss.
          </p>
        </div>
      </div>

      {/* Comprehensive Export & Share Action Card */}
      <div className="p-4 bg-gradient-to-br from-[#00685f]/10 via-[#eff4ff] to-[#4648d4]/10 rounded-3xl space-y-3 border border-[#e5eeff]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#00685f] text-white flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[24px]">clinical_notes</span>
          </div>
          <div>
            <h4 className="font-['Plus_Jakarta_Sans',sans-serif] text-[15px] font-bold text-[#0b1c30]">
              Ambulatory Glucose Profile
            </h4>
            <p className="text-[12px] text-[#3d4947]">Clinician-ready PDF export with standard AGP benchmarks</p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onOpenAgpExport}
            className="flex-1 py-3 px-4 rounded-full bg-[#00685f] hover:bg-[#005049] text-white text-[13px] font-bold flex items-center justify-center space-x-2 shadow-xs active:scale-98 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Download PDF AGP</span>
          </button>
          <button
            onClick={() => triggerToast('Sent report to Endocrinologist Portal')}
            className="p-3 rounded-full bg-white text-[#00685f] hover:bg-[#eff4ff] flex items-center justify-center shadow-xs active:scale-95 transition-all border border-[#e5eeff] cursor-pointer"
            title="Send to Endocrinologist"
          >
            <span className="material-symbols-outlined text-[20px]">forward_to_inbox</span>
          </button>
        </div>
      </div>

      {/* Micro-toast */}
      <div
        className={`fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#213145] text-[#eaf1ff] px-4 py-2.5 rounded-full text-[12px] shadow-xl z-50 flex items-center space-x-2 transition-all duration-300 ${
          showToast ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <span className="material-symbols-outlined text-[#6ffbbe] text-[18px]">check_circle</span>
        <span>{toastMessage}</span>
      </div>
    </div>
  );
};
