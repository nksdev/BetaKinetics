const fs = require('fs');

let code = fs.readFileSync('src/components/LogAndDoseView.tsx', 'utf8');

const regex = /\{\/\* Step-by-Step Breakdown Rows \*\/\}[\s\S]*?\{\/\* Pre-Bolus Timing Advisory Card \*\/\}/m;

const replacement = `
              {/* Step-by-Step Breakdown Rows */}
              <div className="flex flex-col gap-2 rounded-2xl bg-[#eff4ff] p-3 text-[12px]">
                {(!doseResult.calculationMethod || doseResult.calculationMethod === 'dynamic') ? (
                  <>
                    {/* Target Base */}
                    <div className="flex items-center justify-between text-[#3d4947]">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-[#006947]">my_location</span>
                        Target Glucose Base
                      </span>
                      <span className="font-semibold text-[#0b1c30]">{profile.targetGlucose} mg/dL</span>
                    </div>

                    {/* Excess / Below Target Delta */}
                    {currentGlucose >= profile.targetGlucose ? (
                      <div className="flex items-center justify-between text-[#3d4947]">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px] text-[#ba1a1a]">trending_up</span>
                          Excess Over Target ({currentGlucose} - {profile.targetGlucose})
                        </span>
                        <span className="font-semibold text-[#ba1a1a]">
                          +{Math.max(0, currentGlucose - profile.targetGlucose)} mg/dL
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[#3d4947]">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px] text-[#00685f]">trending_down</span>
                          Pre-meal Below Target ({currentGlucose} - {profile.targetGlucose})
                        </span>
                        <span className="font-semibold text-[#00685f]">
                          {currentGlucose - profile.targetGlucose} mg/dL
                        </span>
                      </div>
                    )}

                    {/* Correction Dose */}
                    {doseResult.correctionUnits > 0 && (
                      <div className="flex items-center justify-between text-[#3d4947]">
                        <span>Correction Dose (Excess / {profile.insulinSensitivityFactor})</span>
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
                        {(doseResult.netRecommendedUnits - (doseResult.slidingScaleUnits || 0)).toFixed(2)} Units
                      </span>
                    </div>

                    {/* Sliding Scale (if applicable) */}
                    {doseResult.isSlidingScale && doseResult.slidingScaleUnits !== undefined && (
                      <div className="flex items-center justify-between text-[#ba1a1a]">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">trending_up</span>
                          High BG Sliding Scale Addition
                        </span>
                        <span className="font-semibold">
                          +{doseResult.slidingScaleUnits.toFixed(2)} Units
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
`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/components/LogAndDoseView.tsx', code);
