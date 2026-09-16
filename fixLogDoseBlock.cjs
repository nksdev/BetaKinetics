const fs = require('fs');
let code = fs.readFileSync('src/components/LogAndDoseView.tsx', 'utf8');

const regex = /\{\(!doseResult\.calculationMethod \|\| doseResult\.calculationMethod === 'dynamic'\) \? \([\s\S]*?\{doseResult\.isSlidingScale && doseResult\.slidingScaleUnits !== undefined && \([\s\S]*?<\/div>\s*\)\}\s*<\/>\s*\)\}/m;

const replacement = `{(!doseResult.calculationMethod || doseResult.calculationMethod === 'dynamic') ? (
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
                )}`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/components/LogAndDoseView.tsx', code);
