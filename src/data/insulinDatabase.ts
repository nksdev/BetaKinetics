import { InsulinProfile } from '../types';

export const INSULIN_DATABASE: InsulinProfile[] = [
  {
    id: 'mixtard_30',
    name: 'Mixtard® 30',
    brandName: 'Novo Nordisk Mixtard 30',
    category: 'premixed',
    onsetMinutes: 30,
    peakMinHours: 2,
    peakMaxHours: 8,
    effectiveDurationHours: 16,
    maxDurationHours: 24,
    concentration: 'U-100 (100 units/mL)',
    source: 'Novo Nordisk Prescribing Information & British National Formulary (BNF)',
    description: 'Biphasic human insulin: 30% rapid soluble human insulin + 70% isophane (NPH) crystalline suspension.',
    biphasicRatio: {
      rapid: 0.30,
      intermediate: 0.70
    }
  },
  {
    id: 'actrapid',
    name: 'Actrapid®',
    brandName: 'Novo Nordisk Actrapid',
    category: 'regular',
    onsetMinutes: 30,
    peakMinHours: 1.5,
    peakMaxHours: 3.5,
    effectiveDurationHours: 6,
    maxDurationHours: 8,
    concentration: 'U-100 (100 units/mL)',
    source: 'Novo Nordisk Summary of Product Characteristics (SmPC)',
    description: 'Regular fast-acting neutral soluble human insulin for prandial boluses and acute correction.'
  },
  {
    id: 'lispro',
    name: 'Humalog® / Lispro',
    brandName: 'Eli Lilly Humalog',
    category: 'rapid',
    onsetMinutes: 15,
    peakMinHours: 1.0,
    peakMaxHours: 2.0,
    effectiveDurationHours: 4,
    maxDurationHours: 5,
    concentration: 'U-100 / U-200',
    source: 'Eli Lilly FDA Prescribing Information',
    description: 'Rapid-acting insulin analogue with rapid subcutaneous absorption and sharper peak.'
  },
  {
    id: 'aspart',
    name: 'NovoLog® / Novorapid',
    brandName: 'Novo Nordisk NovoLog',
    category: 'rapid',
    onsetMinutes: 15,
    peakMinHours: 1.0,
    peakMaxHours: 2.5,
    effectiveDurationHours: 4,
    maxDurationHours: 5,
    concentration: 'U-100',
    source: 'Novo Nordisk Pharmacokinetics Study Data',
    description: 'Rapid-acting analogue for immediate mealtime carbohydrate coverage.'
  },
  {
    id: 'glulisine',
    name: 'Apidra® / Glulisine',
    brandName: 'Sanofi-Aventis Apidra',
    category: 'rapid',
    onsetMinutes: 15,
    peakMinHours: 1.0,
    peakMaxHours: 2.0,
    effectiveDurationHours: 4,
    maxDurationHours: 5,
    concentration: 'U-100',
    source: 'Sanofi Product Monograph',
    description: 'Rapid-acting recombinant insulin analogue.'
  },
  {
    id: 'nph',
    name: 'NPH / Insulatard®',
    brandName: 'Novo Nordisk Insulatard',
    category: 'intermediate',
    onsetMinutes: 90,
    peakMinHours: 4,
    peakMaxHours: 10,
    effectiveDurationHours: 14,
    maxDurationHours: 18,
    concentration: 'U-100',
    source: 'Clinical Pharmacology Reference',
    description: 'Intermediate-acting isophane insulin suspension with cloudy appearance.'
  },
  {
    id: 'glargine',
    name: 'Lantus® / Glargine',
    brandName: 'Sanofi Lantus',
    category: 'long',
    onsetMinutes: 90,
    peakMinHours: 0, // Peakless
    peakMaxHours: 0,
    effectiveDurationHours: 20,
    maxDurationHours: 24,
    concentration: 'U-100',
    source: 'Sanofi FDA Documentation',
    description: 'Long-acting basal analogue with relatively flat 24-hour pharmacokinetic profile.'
  },
  {
    id: 'degludec',
    name: 'Tresiba® / Degludec',
    brandName: 'Novo Nordisk Tresiba',
    category: 'long',
    onsetMinutes: 60,
    peakMinHours: 0,
    peakMaxHours: 0,
    effectiveDurationHours: 36,
    maxDurationHours: 42,
    concentration: 'U-100 / U-200',
    source: 'Novo Nordisk Clinical Trial Database',
    description: 'Ultra-long basal insulin forming soluble multi-hexamer depots in subcutaneous tissue.'
  }
];

export function getInsulinProfileById(id: string): InsulinProfile | undefined {
  return INSULIN_DATABASE.find(item => item.id === id);
}

/**
 * Returns the recommended Active Insulin Duration (DIA hours) based on pharmacokinetics.
 * Rapid analogues (Lispro, Aspart, Glulisine): 4.0 hours
 * Regular human insulin (Actrapid): 6.0 hours
 * Premixed biphasic (Mixtard 30): 6.0 hours (prandial phase)
 * Intermediate (NPH): 14.0 hours
 * Long-acting basal (Lantus / Glargine): 24.0 hours
 * Ultra-long basal (Degludec): 36.0 hours
 */
export function getRecommendedDiaForInsulin(insulinId: string): number {
  const profile = getInsulinProfileById(insulinId);
  if (!profile) return 4.0;
  if (profile.category === 'rapid') return 4.0;
  if (profile.category === 'regular') return 6.0;
  if (profile.category === 'premixed') return 6.0;
  if (profile.category === 'intermediate') return 14.0;
  if (profile.category === 'long') {
    return profile.effectiveDurationHours >= 36 ? 36.0 : 24.0;
  }
  return profile.effectiveDurationHours || 4.0;
}

export interface TimingSlotOption {
  id: string;
  label: string;
  shortLabel: string;
  timeHint: string;
}

export const TIMING_SLOT_OPTIONS: TimingSlotOption[] = [
  { id: 'before_breakfast', label: 'Before Breakfast', shortLabel: 'Breakfast', timeHint: 'Morning dose' },
  { id: 'after_breakfast', label: 'After Breakfast', shortLabel: 'Post-Bfast', timeHint: '+2h check' },
  { id: 'before_lunch', label: 'Before Lunch', shortLabel: 'Lunch', timeHint: 'Midday meal' },
  { id: 'after_lunch', label: 'After Lunch', shortLabel: 'Post-Lunch', timeHint: '+2h check' },
  { id: 'before_dinner', label: 'Before Dinner', shortLabel: 'Dinner', timeHint: 'Evening meal' },
  { id: 'after_dinner', label: 'After Dinner', shortLabel: 'Post-Dinner', timeHint: '+2h check' },
  { id: 'bedtime', label: 'Bedtime', shortLabel: 'Bedtime', timeHint: 'Night-time basal' },
  { id: 'manual', label: 'Correction / As Needed', shortLabel: 'Correction', timeHint: 'Acute check' }
];

/**
 * Creates intelligent default schedule assignments for each selected insulin.
 * Rapid/Regular: Before Breakfast, Before Lunch, Before Dinner
 * Basal / Long: Bedtime / Before Dinner
 * Premix: Before Breakfast, Before Dinner
 */
export function getDefaultSchedulesForInsulins(insulinIds: string[]): { insulinId: string; slots: string[] }[] {
  return insulinIds.map((id, index) => {
    const profile = getInsulinProfileById(id);
    if (!profile) {
      return { insulinId: id, slots: ['before_breakfast', 'before_lunch', 'before_dinner'] };
    }

    if (profile.category === 'rapid' || profile.category === 'regular') {
      return {
        insulinId: id,
        slots: ['before_breakfast', 'before_lunch', 'before_dinner']
      };
    }

    if (profile.category === 'long' || profile.category === 'intermediate') {
      return {
        insulinId: id,
        slots: ['bedtime']
      };
    }

    if (profile.category === 'premixed') {
      return {
        insulinId: id,
        slots: ['before_breakfast', 'before_dinner']
      };
    }

    // Fallback if two insulins: 1st rapid, 2nd basal
    if (index === 0) {
      return { insulinId: id, slots: ['before_breakfast', 'before_lunch', 'before_dinner'] };
    } else {
      return { insulinId: id, slots: ['bedtime'] };
    }
  });
}

