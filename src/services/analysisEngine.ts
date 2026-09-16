import { GlucoseRecord, PeriodAnalysis } from '../types';

/**
 * Calculates comprehensive international consensus glycemic analytics for the given period.
 * Adheres to ATTD (Advanced Technologies & Treatments for Diabetes) and ADA 2024 Standards of Care:
 * - GMI (Glucose Management Indicator, Bergenstal et al. 2018)
 * - ADAG eA1c (Nathan et al. 2008)
 * - Standard Deviation (SD) & Coefficient of Variation (CV %, clinical benchmark <= 36%)
 * - 5-Tier Time in Ranges (Very Low <54, Low 54-69, Target 70-180, High 181-250, Very High >250)
 */
export function calculatePeriodAnalysis(
  records: GlucoseRecord[],
  periodDays: number,
  label: string
): PeriodAnalysis {
  const now = new Date().getTime();
  const cutoffTime = now - periodDays * 24 * 60 * 60 * 1000;

  // Filter records within period
  const periodRecords = records.filter(r => {
    const t = new Date(r.timestamp).getTime();
    return t >= cutoffTime;
  });

  if (periodRecords.length === 0) {
    return {
      label,
      periodDays,
      totalReadings: 0,
      avgGlucose: 0,
      minGlucose: 0,
      maxGlucose: 0,
      sd: 0,
      cv: 0,
      gmi: 0,
      tirPercent: 0,
      hypoPercent: 0,
      hyperPercent: 0,
      veryLowPercent: 0,
      lowPercent: 0,
      inRangePercent: 0,
      highPercent: 0,
      veryHighPercent: 0,
      projectedA1c: 0
    };
  }

  const values = periodRecords.map(r => r.value);
  const totalReadings = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const avgGlucose = Math.round(sum / totalReadings);
  const minGlucose = Math.min(...values);
  const maxGlucose = Math.max(...values);

  // 1. Standard Deviation (SD)
  const variance =
    totalReadings > 1
      ? values.reduce((acc, val) => acc + Math.pow(val - avgGlucose, 2), 0) / (totalReadings - 1)
      : 0;
  const sd = Math.round(Math.sqrt(variance) * 10) / 10;

  // 2. Coefficient of Variation (CV %) = (SD / Mean) * 100
  // ADA & ATTD Consensus: CV <= 36% denotes stable glycemic control; >36% indicates high variability
  const cv = avgGlucose > 0 ? Math.round((sd / avgGlucose) * 1000) / 10 : 0;

  // 3. Glucose Management Indicator (GMI %) - Bergenstal et al. Diabetes Care 2018
  // Formula: GMI (%) = 3.31 + (0.02392 * mean glucose in mg/dL)
  const gmi = Math.round((3.31 + 0.02392 * avgGlucose) * 10) / 10;

  // 4. Standard ADAG formula: HbA1c = (eAG + 46.7) / 28.7
  const projectedA1c = Math.round(((avgGlucose + 46.7) / 28.7) * 10) / 10;

  // 5. 5-Tier ATTD Time in Range Breakdown
  const veryLowCount = values.filter(v => v < 54).length;
  const lowCount = values.filter(v => v >= 54 && v < 70).length;
  const inRangeCount = values.filter(v => v >= 70 && v <= 180).length;
  const highCount = values.filter(v => v > 180 && v <= 250).length;
  const veryHighCount = values.filter(v => v > 250).length;

  const veryLowPercent = Math.round((veryLowCount / totalReadings) * 1000) / 10;
  const lowPercent = Math.round((lowCount / totalReadings) * 1000) / 10;
  const hypoPercent = Math.round(((veryLowCount + lowCount) / totalReadings) * 1000) / 10;
  const tirPercent = Math.round((inRangeCount / totalReadings) * 1000) / 10;
  const highPercent = Math.round((highCount / totalReadings) * 1000) / 10;
  const veryHighPercent = Math.round((veryHighCount / totalReadings) * 1000) / 10;
  const hyperPercent = Math.round(((highCount + veryHighCount) / totalReadings) * 1000) / 10;

  // For 3-Day Focus, calculate Day 1, Day 2, Day 3 individual averages
  let day1Avg: number | undefined;
  let day2Avg: number | undefined;
  let day3Avg: number | undefined;

  if (periodDays === 3) {
    const d1Vals = periodRecords.filter(r => r.dayIndex === 1).map(r => r.value);
    const d2Vals = periodRecords.filter(r => r.dayIndex === 2).map(r => r.value);
    const d3Vals = periodRecords.filter(r => r.dayIndex === 3).map(r => r.value);

    day1Avg = d1Vals.length > 0 ? Math.round(d1Vals.reduce((a, b) => a + b, 0) / d1Vals.length) : undefined;
    day2Avg = d2Vals.length > 0 ? Math.round(d2Vals.reduce((a, b) => a + b, 0) / d2Vals.length) : undefined;
    day3Avg = d3Vals.length > 0 ? Math.round(d3Vals.reduce((a, b) => a + b, 0) / d3Vals.length) : undefined;
  }

  return {
    label,
    periodDays,
    totalReadings,
    avgGlucose,
    minGlucose,
    maxGlucose,
    sd,
    cv,
    gmi,
    tirPercent,
    hypoPercent,
    hyperPercent,
    veryLowPercent,
    lowPercent,
    inRangePercent: tirPercent,
    highPercent,
    veryHighPercent,
    projectedA1c,
    day1Avg,
    day2Avg,
    day3Avg
  };
}
