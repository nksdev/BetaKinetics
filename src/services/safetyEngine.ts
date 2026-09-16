import { PatientProfile } from '../types';

export interface SafetyCheckResult {
  safe: boolean;
  alertLevel: 'none' | 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  actionRecommendation?: string;
}

/**
 * Runs multi-tiered clinical safety verification checks on proposed glucose & insulin conditions.
 */
export function evaluateSafetyEngine(
  currentGlucose: number,
  carbs: number,
  activeIob: number,
  profile: PatientProfile,
  recentBolusMinutesAgo?: number,
  projectedGlucose?: number
): SafetyCheckResult {
  const hypoLimit = profile.hypoLimit || 70;

  // 1. Critical Level 2 Severe Hypoglycemia (< 54 mg/dL)
  if (currentGlucose < 54) {
    return {
      safe: false,
      alertLevel: 'critical',
      title: 'CRITICAL: Severe Hypoglycemia (<54 mg/dL)',
      message: `Emergency: Blood glucose is ${currentGlucose} mg/dL. Immediate rapid-acting carbohydrate administration is vital. Do NOT inject any insulin.`,
      actionRecommendation:
        'Administer 20–30g of fast-acting carbohydrates immediately (oral glucose gel, full-sugar beverage). Ensure glucagon is on standby. Recheck capillary blood glucose in 15 minutes.'
    };
  }

  // 2. Level 1 Hypoglycemia (< 70 mg/dL)
  if (currentGlucose < hypoLimit) {
    return {
      safe: false,
      alertLevel: 'critical',
      title: 'Hypoglycemia Alert (<70 mg/dL)',
      message: `Current blood glucose of ${currentGlucose} mg/dL is below safe threshold. Corrective insulin is strictly blocked.`,
      actionRecommendation:
        'Follow the clinical 15-15 Rule: Consume 15g fast-acting simple carbohydrates (4oz fruit juice or 3–4 glucose tablets), wait 15 minutes, and re-test fingerstick before any further insulin.'
    };
  }

  // 3. Predictive Hypoglycemia Guard (Projected BG < 70 from active IOB)
  if (projectedGlucose !== undefined && projectedGlucose < hypoLimit && currentGlucose >= hypoLimit) {
    return {
      safe: false,
      alertLevel: 'warning',
      title: 'Predicted Hypoglycemia Risk',
      message: `Circulating active insulin (${activeIob.toFixed(1)}u) is projected to drop your glucose to ~${projectedGlucose} mg/dL without carb intake.`,
      actionRecommendation:
        'Dosing algorithm has automatically deducted active IOB to prevent delayed hypoglycemic crash. Consider a small carbohydrate snack if not consuming a meal.'
    };
  }

  // 4. Extreme Hyperglycemia / Ketone Warning (>= 300 mg/dL)
  if (currentGlucose >= 300) {
    return {
      safe: true,
      alertLevel: 'warning',
      title: 'Severe Hyperglycemia Check (≥300 mg/dL)',
      message: `Blood glucose is significantly elevated (${currentGlucose} mg/dL).`,
      actionRecommendation:
        'Verify with capillary fingerstick. Hydrate aggressively with 500 mL water. Check blood/urine ketones immediately. If ketones are moderate/high, follow medical sick-day protocol.'
    };
  }

  // 5. Significant Hyperglycemia (>= 250 mg/dL)
  if (currentGlucose >= 250) {
    return {
      safe: true,
      alertLevel: 'info',
      title: 'Elevated Hyperglycemia (≥250 mg/dL)',
      message: `Blood glucose is elevated at ${currentGlucose} mg/dL.`,
      actionRecommendation: 'Ensure adequate hydration with water. Re-test 2 hours post-bolus to confirm glycemic drop.'
    };
  }

  // 6. Stacking Hazard: High IOB with zero meal carbs
  if (activeIob > 3.0 && carbs === 0) {
    return {
      safe: true,
      alertLevel: 'warning',
      title: 'High Active Insulin-On-Board Notice',
      message: `${activeIob.toFixed(1)} units of active insulin still present in circulation. Anti-stacking protection will deduct this from recommended correction.`,
      actionRecommendation: 'Allow previous bolus sufficient time to complete pharmacodynamic action before taking more insulin.'
    };
  }

  // 7. Recent Bolus within 60 minutes
  if (recentBolusMinutesAgo !== undefined && recentBolusMinutesAgo < 60 && recentBolusMinutesAgo >= 0) {
    return {
      safe: true,
      alertLevel: 'info',
      title: 'Recent Bolus Administered',
      message: `An insulin dose was logged ${recentBolusMinutesAgo} minutes ago. Most subcutaneous insulin has not reached peak pharmacodynamic action yet.`,
      actionRecommendation: 'Exercise caution before taking additional boluses to avoid delayed hypoglycemia.'
    };
  }

  // Nominal safety clearance
  return {
    safe: true,
    alertLevel: 'none',
    title: 'Safety Engine Protection Passed',
    message: 'Anti-stacking algorithm verified. Active IOB deducted to avert delayed hypoglycemic overshoot.'
  };
}
