import React from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AboutGuideViewProps {
  onNavigateToTab?: (tab: 'dashboard' | 'log-and-dose' | 'analytics' | 'insulin-iob' | 'profile-rx') => void;
  onOpenParameterModal?: () => void;
}

export const AboutGuideView: React.FC<AboutGuideViewProps> = ({
  onNavigateToTab,
  onOpenParameterModal
}) => {
  const { isInstalled } = usePWAInstall();

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto pb-28 px-4 pt-3 gap-4">
      {/* CREATOR & BRAND HERO CARD */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-[#00685f] via-[#008378] to-[#4648d4] text-white shadow-lg relative overflow-hidden">
        {/* Background decorative marks */}
        <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
          <span className="material-symbols-outlined text-[160px]">favorite</span>
        </div>

        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-xs">
                <span className="material-symbols-outlined text-[24px]">water_drop</span>
              </div>
              <div>
                <h1 className="font-['Plus_Jakarta_Sans',sans-serif] text-[20px] font-extrabold tracking-tight leading-none">
                  BetaKinetics T1D
                </h1>
                <span className="text-[11px] text-white/85 font-semibold tracking-wide uppercase">
                  Precision Pharmacokinetic Decision Support
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-extrabold uppercase tracking-wider">
              v1 PWA
            </span>
          </div>

          <p className="text-[12px] text-white/90 leading-relaxed pt-1">
            An advanced clinical bolus calculator and rolling ambulatory glucose profiling system designed for Type 1 Diabetes and insulin-requiring patients, powered by continuous Mudaliar exponential pharmacokinetics.
          </p>

          {/* Creator Attribution Section */}
          <div className="mt-2 pt-3 border-t border-white/20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-white/75 font-bold block">
                  Created &amp; Engineered By
                </span>
                <span className="font-['Plus_Jakarta_Sans',sans-serif] text-[16px] font-bold text-white block">
                  Naman Kumar Sonker
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-white/20 text-[11px] font-medium text-white/90">
                Lead Developer
              </span>
            </div>

            {/* Social Links with Official Logos */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              {/* Instagram */}
              <a
                href="https://www.instagram.com/namanmic/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white text-[12px] font-bold shadow-xs border border-white/15"
              >
                {/* Instagram Vector Icon */}
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[9px] text-white/70">Instagram</span>
                  <span className="truncate">@namanmic</span>
                </div>
              </a>

              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/in/namanmic/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white text-[12px] font-bold shadow-xs border border-white/15"
              >
                {/* LinkedIn Vector Icon */}
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[9px] text-white/70">LinkedIn</span>
                  <span className="truncate">namanmic</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* CROSS-PLATFORM PWA INSTALLATION CARD */}
      <div className="p-4 rounded-3xl bg-white border border-[#e5eeff] shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#eff4ff] text-[#00685f] flex items-center justify-center">
              <span className="material-symbols-outlined text-[19px]">install_mobile</span>
            </div>
            <div>
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[15px] text-[#0b1c30] block leading-tight">
                Cross-Platform App Install (PWA)
              </span>
              <span className="text-[11px] text-[#3d4947]">
                {isInstalled ? 'App is currently installed and running standalone' : 'Install on Android, iOS, Windows or Mac'}
              </span>
            </div>
          </div>
          <PWAInstallButton compact />
        </div>

        <p className="text-[12px] text-[#3d4947] leading-relaxed">
          BetaKinetics is a certified Progressive Web App. You can install it directly to your home screen or desktop launcher without an app store, giving you offline-first medical calculations, instant launching, and zero latency.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
          <div className="p-2 rounded-xl bg-[#eff4ff] flex items-center gap-1.5 font-semibold text-[#00685f]">
            <span className="material-symbols-outlined text-[15px]">wifi_off</span>
            <span>100% Offline Ready</span>
          </div>
          <div className="p-2 rounded-xl bg-[#eff4ff] flex items-center gap-1.5 font-semibold text-[#00685f]">
            <span className="material-symbols-outlined text-[15px]">security</span>
            <span>Local Encrypted Data</span>
          </div>
          <div className="p-2 rounded-xl bg-[#eff4ff] flex items-center gap-1.5 font-semibold text-[#00685f]">
            <span className="material-symbols-outlined text-[15px]">speed</span>
            <span>Instant PK Engine</span>
          </div>
          <div className="p-2 rounded-xl bg-[#eff4ff] flex items-center gap-1.5 font-semibold text-[#00685f]">
            <span className="material-symbols-outlined text-[15px]">devices</span>
            <span>Android / iOS / Desktop</span>
          </div>
        </div>
      </div>

      {/* HOW TO USE THIS APP (STEP-BY-STEP WORKFLOW) */}
      <div className="p-4 rounded-3xl bg-white border border-[#e5eeff] shadow-sm flex flex-col gap-3.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#00685f] text-white flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
          </div>
          <div>
            <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[16px] text-[#0b1c30] leading-tight">
              How to Use BetaKinetics T1D
            </h2>
            <span className="text-[11px] text-[#3d4947]">
              8 Simple Steps for Accurate Dosing &amp; Glucose Management
            </span>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {/* Step 1 */}
          <div className="p-3 rounded-2xl bg-[#eff4ff] border border-[#dce9ff] flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-[#00685f] text-white font-bold text-[13px] flex items-center justify-center flex-shrink-0 mt-0.5">
              1
            </div>
            <div className="flex-1">
              <span className="font-bold text-[13px] text-[#0b1c30] block">
                Configure Your Prescription Parameters
              </span>
              <p className="text-[11px] text-[#3d4947] mt-0.5 leading-relaxed">
                Go to <strong>Profile &amp; Rx</strong> and tap <strong>Edit Parameters</strong>. Input your physician-prescribed <strong>Insulin Sensitivity Factor (ISF)</strong> (e.g. 1u : 40 mg/dL), <strong>Insulin-to-Carb Ratio (ICR)</strong> (e.g. 1u : 10g), <strong>Target Blood Glucose</strong> (e.g. 110 mg/dL), and select your active insulin regimen (Actrapid, Novorapid, Humalog, Fiasp, Mixtard, etc.).
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-3 rounded-2xl bg-[#eff4ff] border border-[#dce9ff] flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-[#00685f] text-white font-bold text-[13px] flex items-center justify-center flex-shrink-0 mt-0.5">
              2
            </div>
            <div className="flex-1">
              <span className="font-bold text-[13px] text-[#0b1c30] block">
                Input Blood Glucose &amp; Meal Carbohydrates
              </span>
              <p className="text-[11px] text-[#3d4947] mt-0.5 leading-relaxed">
                In <strong>Log &amp; Dose</strong>, you can <strong>directly type</strong> your fingerstick/sensor glucose reading (e.g. 215 mg/dL) or meal carbohydrates (e.g. 45g) into the input fields, or use the convenient step buttons.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-3 rounded-2xl bg-[#eff4ff] border border-[#dce9ff] flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-[#4648d4] text-white font-bold text-[13px] flex items-center justify-center flex-shrink-0 mt-0.5">
              3
            </div>
            <div className="flex-1">
              <span className="font-bold text-[13px] text-[#0b1c30] block">
                Account for Prior Insulin (Pre-App Injections)
              </span>
              <p className="text-[11px] text-[#3d4947] mt-0.5 leading-relaxed">
                If you injected insulin before opening the app, toggle <strong>"Account Prior Dose"</strong>. Specify how many units were taken and when (e.g. 1.5h ago). The Mudaliar exponential model computes how much has cleared and how much remains active in your bloodstream.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-3 rounded-2xl bg-[#eff4ff] border border-[#dce9ff] flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-[#00685f] text-white font-bold text-[13px] flex items-center justify-center flex-shrink-0 mt-0.5">
              4
            </div>
            <div className="flex-1">
              <span className="font-bold text-[13px] text-[#0b1c30] block">
                Review the Clinical Dose Matrix
              </span>
              <p className="text-[11px] text-[#3d4947] mt-0.5 leading-relaxed">
                Inspect the transparent calculation breakdown:
                <br />• <strong>Carb Coverage</strong> = Meal Carbs / ICR
                <br />• <strong>Correction Bolus</strong> = (Current BG - Target BG) / ISF
                <br />• <strong>Active IOB Deduction</strong> = Mudaliar continuous clearance subtraction
                <br />• <strong>Net Recommended Dose</strong> = Gross Required - Active IOB
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="p-3 rounded-2xl bg-[#eff4ff] border border-[#dce9ff] flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-[#00685f] text-white font-bold text-[13px] flex items-center justify-center flex-shrink-0 mt-0.5">
              5
            </div>
            <div className="flex-1">
              <span className="font-bold text-[13px] text-[#0b1c30] block">
                Adjust Final Dose with Real-Time Glycemic Projection
              </span>
              <p className="text-[11px] text-[#3d4947] mt-0.5 leading-relaxed">
                Need to tailor the dose for planned exercise or illness? Directly type or step the <strong>Adjust Final Pen Dose</strong> field. The app immediately displays your <strong>Projected BG at Clearance</strong> (flagging any hypoglycemia risks) before you inject and commit to the log.
              </p>
            </div>
          </div>

          {/* Step 6 */}
          <div className="p-3 rounded-2xl bg-[#eff4ff] border border-[#dce9ff] flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-[#00685f] text-white font-bold text-[13px] flex items-center justify-center flex-shrink-0 mt-0.5">
              6
            </div>
            <div className="flex-1">
              <span className="font-bold text-[13px] text-[#0b1c30] block">
                Review Analytics &amp; Export AGP Clinical Reports
              </span>
              <p className="text-[11px] text-[#3d4947] mt-0.5 leading-relaxed">
                Visit the <strong>Analytics</strong> tab to review rolling 7, 14, 30, and 90-day Ambulatory Glucose Profile (AGP) metrics, Time in Range (TIR 70–180 mg/dL), Glucose Management Indicator (estimated A1c), and export PDF reports for your endocrinologist.
              </p>
            </div>
          </div>

          {/* Step 7 */}
          <div className="p-3 rounded-2xl bg-[#eff4ff] border border-[#dce9ff] flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-[#00685f] text-white font-bold text-[13px] flex items-center justify-center flex-shrink-0 mt-0.5">
              7
            </div>
            <div className="flex-1">
              <span className="font-bold text-[13px] text-[#0b1c30] block">
                3-Day Auto-Titration (Dose Adjustment)
              </span>
              <p className="text-[11px] text-[#3d4947] mt-0.5 leading-relaxed">
                Enter your <strong>Doctor Prescribed Basal Dose</strong> in your Profile Parameters. Then log your blood sugar for at least <strong>3 consecutive days</strong>. The dashboard will display a <strong>Prescribed Dose Adjustment</strong> card recommending whether to increase (+) or decrease (-) your base dose (typically by 10%) based on clinical targets.
              </p>
            </div>
          </div>

          {/* Step 8 */}
          <div className="p-3 rounded-2xl bg-[#eff4ff] border border-[#dce9ff] flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-[#00685f] text-white font-bold text-[13px] flex items-center justify-center flex-shrink-0 mt-0.5">
              8
            </div>
            <div className="flex-1">
              <span className="font-bold text-[13px] text-[#0b1c30] block">
                Injection Site & Delivery Device Tracking
              </span>
              <p className="text-[11px] text-[#3d4947] mt-0.5 leading-relaxed">
                When logging insulin, select your <strong>Injection Site</strong> (e.g. Abdomen, Left Arm) to help rotate injection areas and avoid lipohypertrophy. Specify your <strong>Delivery Device</strong> (Pen 1u, Pen 0.5u, Syringe) and the calculator will automatically round the recommended dose precisely to match your physical device constraints.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* WHAT MAKES GLUCOSENSE DIFFERENT FROM OTHER APPS */}
      <div className="p-4 rounded-3xl bg-white border border-[#e5eeff] shadow-sm flex flex-col gap-3.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#4648d4] text-white flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[18px]">difference</span>
          </div>
          <div>
            <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[16px] text-[#0b1c30] leading-tight">
              What Makes This App Different?
            </h2>
            <span className="text-[11px] text-[#3d4947]">
              Overcoming the Limitations of Generic Diabetes Trackers
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 pt-1">
          {/* Difference 1 */}
          <div className="p-3.5 rounded-2xl bg-[#f8f9ff] border border-[#e5eeff] flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[#00685f]">
              <span className="material-symbols-outlined text-[18px]">timeline</span>
              <span className="font-bold text-[13px] text-[#0b1c30]">
                1. Scientific Exponential Pharmacokinetics (vs. Flat Linear Decay)
              </span>
            </div>
            <p className="text-[12px] text-[#3d4947] leading-relaxed">
              Most commercial diabetes apps use a crude straight line (e.g. -25% per hour) to estimate remaining insulin. In real human biology, subcutaneous insulin absorption follows an S-shaped curve with a delay (lag phase), peak plasma concentration, and prolonged exponential tail. BetaKinetics implements the peer-reviewed continuous <strong>Mudaliar / Walsh exponential model</strong>, accurately reflecting true active units in circulation.
            </p>
          </div>

          {/* Difference 2 */}
          <div className="p-3.5 rounded-2xl bg-[#f8f9ff] border border-[#e5eeff] flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[#00685f]">
              <span className="material-symbols-outlined text-[18px]">medication</span>
              <span className="font-bold text-[13px] text-[#0b1c30]">
                2. Multi-Formulation Dynamic DIA (vs. Rigid 4-Hour Assumption)
              </span>
            </div>
            <p className="text-[12px] text-[#3d4947] leading-relaxed">
              Standard bolus wizards assume everyone uses rapid analogs lasting 4.0 hours. However, millions of patients use regular human insulins (Actrapid, Humulin R: 6h), ultra-fast analogs (Fiasp, Lyumjev: 3.5h), or biphasic premixes (Mixtard 30: 14h biphasic peak). BetaKinetics auto-calibrates the pharmacokinetics according to the specific formulation injected.
            </p>
          </div>

          {/* Difference 3 */}
          <div className="p-3.5 rounded-2xl bg-[#f8f9ff] border border-[#e5eeff] flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[#4648d4]">
              <span className="material-symbols-outlined text-[18px]">history_toggle_off</span>
              <span className="font-bold text-[13px] text-[#0b1c30]">
                3. Pre-App Historical Dose Accounting
              </span>
            </div>
            <p className="text-[12px] text-[#3d4947] leading-relaxed">
              If a patient took an unscheduled injection or took their morning dose before downloading or opening the app, other tools fail or require complex manual workarounds. BetaKinetics provides a dedicated historical decay engine to back-calculate remaining IOB from any previous dose and adjust the current recommendation accordingly.
            </p>
          </div>

          {/* Difference 4 */}
          <div className="p-3.5 rounded-2xl bg-[#f8f9ff] border border-[#e5eeff] flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[#00685f]">
              <span className="material-symbols-outlined text-[18px]">swap_vert</span>
              <span className="font-bold text-[13px] text-[#0b1c30]">
                4. Safe Negative Pre-Meal Delta Offset
              </span>
            </div>
            <p className="text-[12px] text-[#3d4947] leading-relaxed">
              When pre-meal glucose is below target (e.g. 85 mg/dL with a target of 110 mg/dL), naive calculators still give full carb coverage. BetaKinetics calculates a safe negative delta reduction to subtract from carb units, shielding against immediate post-meal hypoglycemia.
            </p>
          </div>

          {/* Difference 5 */}
          <div className="p-3.5 rounded-2xl bg-[#f8f9ff] border border-[#e5eeff] flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[#00685f]">
              <span className="material-symbols-outlined text-[18px]">tune</span>
              <span className="font-bold text-[13px] text-[#0b1c30]">
                5. Interactive User Dose Fine-Tuning
              </span>
            </div>
            <p className="text-[12px] text-[#3d4947] leading-relaxed">
              Unlike black-box calculators that force an inflexible number, BetaKinetics allows the user to dial their dose up or down for contextual factors (e.g. upcoming cardio exercise, fever, high-fat meal delay) while displaying a real-time recalculated glycemic projection.
            </p>
          </div>
        </div>
      </div>

      {/* HOW GLUCOSENSE SOLVES CRITICAL T1D PROBLEMS */}
      <div className="p-4 rounded-3xl bg-white border border-[#e5eeff] shadow-sm flex flex-col gap-3.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#006947] text-white flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[18px]">health_and_safety</span>
          </div>
          <div>
            <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[16px] text-[#0b1c30] leading-tight">
              Solving Real Diabetes Challenges
            </h2>
            <span className="text-[11px] text-[#3d4947]">
              Clinical Safety &amp; Hypoglycemia Prevention
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-1 text-[12px]">
          <div className="p-3 rounded-2xl bg-[#006947]/5 border border-[#006947]/20 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#006947] text-[20px] flex-shrink-0 mt-0.5">
              shield
            </span>
            <div>
              <strong className="text-[#006947] font-bold block">Eliminating "Insulin Stacking"</strong>
              <p className="text-[#3d4947] mt-0.5 leading-relaxed">
                Stacking occurs when a patient corrects high blood glucose while prior boluses are still active, resulting in sudden severe hypoglycemia hours later. BetaKinetics monitors every active unit and continuously deducts it from any correction bolus.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#006947]/5 border border-[#006947]/20 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#006947] text-[20px] flex-shrink-0 mt-0.5">
              lock
            </span>
            <div>
              <strong className="text-[#006947] font-bold block">Privacy-First Offline Autonomy</strong>
              <p className="text-[#3d4947] mt-0.5 leading-relaxed">
                Medical data belongs to the patient. BetaKinetics stores all patient profiles, historical fingersticks, and insulin logs locally in structured, durable SQLite / browser storage. No mandatory cloud servers, no account tracking, and 100% offline availability during flights, outdoors, or network outages.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#006947]/5 border border-[#006947]/20 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#006947] text-[20px] flex-shrink-0 mt-0.5">
              verified
            </span>
            <div>
              <strong className="text-[#006947] font-bold block">Accessible to Multiple Daily Injection (MDI) Pen Users</strong>
              <p className="text-[#3d4947] mt-0.5 leading-relaxed">
                While automated insulin pumps possess built-in bolus computers, over 65% of insulin users globally rely on standard insulin pens and manual syringes. BetaKinetics brings pump-grade mathematical bolus advisor algorithms directly to pen users on their mobile phone or PC.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK JUMP CTAs */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        {onNavigateToTab && (
          <button
            type="button"
            onClick={() => onNavigateToTab('log-and-dose')}
            className="p-3 rounded-2xl bg-[#00685f] hover:bg-[#005049] text-white text-[12px] font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">calculate</span>
            <span>Open Dose Advisor</span>
          </button>
        )}

        {onOpenParameterModal && (
          <button
            type="button"
            onClick={onOpenParameterModal}
            className="p-3 rounded-2xl bg-white border border-[#c0c1ff] hover:bg-[#eff4ff] text-[#00685f] text-[12px] font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            <span>Configure Ratios</span>
          </button>
        )}
      </div>

      {/* FOOTER METADATA & DISCLAIMER */}
      <div className="p-4 rounded-3xl bg-[#eff4ff] border border-[#e5eeff] text-center text-[11px] text-[#3d4947] flex flex-col gap-2">
        <p className="font-semibold text-[#0b1c30]">
          BetaKinetics T1D • Clinical Decision Support System v1
        </p>
        <p>
          Authored by <strong>Naman Kumar Sonker</strong> (@namanmic).
          <br />
          Dedicated to empowering Type 1 Diabetes and insulin-dependent patients worldwide with precision pharmacokinetics.
        </p>
        <p className="text-[10px] text-[#6d7a77] border-t border-[#dce9ff] pt-2">
          <strong>Medical Notice:</strong> BetaKinetics provides mathematical decision support for educational and self-management reference based on user-entered treatment ratios. Always cross-verify with your physician's written protocol.
        </p>
      </div>
    </div>
  );
};
