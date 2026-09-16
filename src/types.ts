export type RoutineSlot =
  | 'before_breakfast'
  | 'after_breakfast'
  | 'before_lunch'
  | 'after_lunch'
  | 'before_dinner'
  | 'after_dinner'
  | 'manual';

export type InsulinCategory =
  | 'rapid'
  | 'regular'
  | 'intermediate'
  | 'long'
  | 'premixed';

export interface InsulinProfile {
  id: string;
  name: string;
  brandName: string;
  category: InsulinCategory;
  onsetMinutes: number;
  peakMinHours: number;
  peakMaxHours: number;
  effectiveDurationHours: number;
  maxDurationHours: number;
  concentration: string; // e.g., 'U-100'
  source: string;
  description: string;
  biphasicRatio?: {
    rapid: number; // e.g. 0.30
    intermediate: number; // e.g. 0.70
  };
}

export type InsulinTimingSlot =
  | 'before_breakfast'
  | 'after_breakfast'
  | 'before_lunch'
  | 'after_lunch'
  | 'before_dinner'
  | 'after_dinner'
  | 'bedtime'
  | 'manual';

export interface InsulinScheduleItem {
  insulinId: string;
  slots: string[]; // e.g. ['before_breakfast', 'before_lunch', 'before_dinner']
  customNotes?: string;
}

export interface InsulinRegimenDose {
  id: string;
  insulinId: string;
  slot: RoutineSlot;
  doseUnits: number;
}

export interface PatientProfile {
  id?: string;
  name: string;
  age: number;
  gender?: 'male' | 'female' | 'other';
  weightKg: number;
  heightCm?: number;
  weightGoal?: 'lose' | 'maintain' | 'gain';
  weightGoalRatePercent?: number;
  diabetesType: string;
  monitoringMethod: string; // e.g., 'Manual Fingerstick Glucometer (BGM)'
  careMode?: string; // e.g., 'Self-Managed T1D'
  clinicianName?: string;
  protocolRx?: string;
  personalNotes?: string;
  diagnosedYear?: number;
  bgmDevice?: string; // e.g., 'Accu-Chek Guide', 'OneTouch Verio'
  cgmDevice?: string; // Legacy fallback
  targetGlucose: number; // e.g., 110 mg/dL
  targetRangeMin: number; // 70
  targetRangeMax: number; // 180
  insulinSensitivityFactor: number; // ISF: 1u drops BG by X mg/dL (e.g., 40)
  insulinToCarbRatio: number;
  prescribedBasalDose?: number;
  defaultDeliveryDevice?: 'pen_whole' | 'pen_half' | 'syringe';
  activeDurationHours: number; // DIA (e.g., 4.0 or 6.0)
  autoDiaEnabled?: boolean; // Automatically adjust DIA according to selected insulin
  hypoLimit: number; // 70 mg/dL
  activeInsulinIds: string[]; // ['actrapid', 'mixtard_30']
  insulinSchedules?: InsulinScheduleItem[]; // Individual timing schedules for each insulin
  insulinRegimen?: InsulinRegimenDose[]; // Specific doses for specific slots
  setupCompleted: boolean;
  avatarColor?: string;
  lastLoginAt?: string;
}

export interface GlucoseRecord {
  id: string;
  timestamp: string; // ISO string
  value: number; // mg/dL
  slot: RoutineSlot;
  notes?: string;
  carbs?: number;
  carbsGrams?: number;
  trendRate?: string; // e.g., '+4 / 15m'
  dayIndex?: number; // 1, 2, 3 for 3-day benchmark
}

export interface InsulinRecord {
  id: string;
  timestamp: string; // ISO string
  insulinId: string;
  insulinName: string;
  doseUnits: number;
  context: RoutineSlot | 'bedtime' | 'correction';
  slot?: RoutineSlot;
  category?: InsulinCategory;
  notes?: string;
  dayIndex?: number;
  deliveryDevice?: 'pen_whole' | 'pen_half' | 'syringe';
  injectionSite?: string;
}

export interface IobCalculationResult {
  totalIob: number;
  estimatedClearanceHours: number;
  projectedBgDrop?: number;
  breakdown: {
    insulinName: string;
    remainingUnits: number;
    doseUnits: number;
    hoursAgo: number;
    category: InsulinCategory;
    clearanceHoursRemaining?: number;
  }[];
}

export interface DoseCalculationResult {
  currentGlucose: number;
  targetGlucose: number;
  excessGlucose: number;
  isf: number;
  correctionUnits: number;
  negativeCorrectionUnits?: number;
  carbsGrams: number;
  icr: number;
  carbCoverageUnits: number;
  grossRequiredUnits: number;
  iobDeductionUnits: number;
  netRecommendedUnits: number;
  roundedPenUnits: number;
  roundedWholeUnits?: number;
  projectedGlucose?: number;
  isProjectedHypo?: boolean;
  projectedBgDrop?: number;
  preBolusMinutes?: number;
  preBolusAdvice?: string;
  calculationMethod?: 'dynamic' | 'fixed_basal' | 'fixed_premixed' | 'fixed_intermediate';
  isSlidingScale?: boolean;
  slidingScaleUnits?: number;
  isHypoAlert: boolean;
  isHyperAlert: boolean;
  safetyPassed: boolean;
  safetyMessage: string;
  missingParameters: string[];
  physiologicalCheck?: {
    estimatedTdd: number;
    expectedIsf: number;
    expectedIcr: number;
    notes?: string;
  };
}

export interface SlotAnalysis {
  slot: RoutineSlot;
  label: string;
  icon: string;
  avgValue: number;
  inRange: boolean;
  statusText: string;
  patternAlert: boolean;
  patternMessage?: string;
  dayValues: { day1: number; day2: number; day3: number };
  diffVsBasal?: number;
}

export interface PatientBackupData {
  app: string;
  version: string;
  exportedAt: string;
  profile: PatientProfile;
  allProfiles: PatientProfile[];
  glucoseRecords: GlucoseRecord[];
  insulinRecords: InsulinRecord[];
  summary: {
    totalGlucose: number;
    totalInsulin: number;
    profilesCount: number;
  };
}

export interface PeriodAnalysis {
  label: string;
  periodDays: number;
  totalReadings: number;
  avgGlucose: number;
  minGlucose: number;
  maxGlucose: number;
  sd?: number;
  cv?: number;
  gmi?: number;
  tirPercent: number; // 70-180
  hypoPercent: number; // <70
  hyperPercent: number; // >180
  veryLowPercent?: number; // <54
  lowPercent?: number; // 54-69
  inRangePercent?: number; // 70-180
  highPercent?: number; // 181-250
  veryHighPercent?: number; // >250
  projectedA1c?: number;
  day1Avg?: number;
  day2Avg?: number;
  day3Avg?: number;
}
