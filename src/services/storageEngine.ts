import { GlucoseRecord, InsulinRecord, PatientProfile, PatientBackupData } from '../types';
import { getDefaultSchedulesForInsulins, getRecommendedDiaForInsulin } from '../data/insulinDatabase';

const STORAGE_KEYS = {
  PROFILE: 'betakinetics_patient_profile',
  PROFILES_LIST: 'betakinetics_profiles_list',
  IS_LOGGED_IN: 'betakinetics_is_logged_in',
  GLUCOSE: 'betakinetics_glucose_records',
  INSULIN: 'betakinetics_insulin_records',
  STORAGE_DAYS_USED: 'betakinetics_storage_days_used'
};

export const DEMO_PROFILES: PatientProfile[] = [];

export const DEFAULT_PROFILE: PatientProfile = {
  id: 'profile_default',
  name: '',
  age: 28,
  weightKg: 70,
  heightCm: 170,
  weightGoal: 'maintain',
  diabetesType: 'Type 1 Diabetes (T1D)',
  monitoringMethod: 'Manual Fingerstick BGM',
  careMode: 'Self-Managed T1D',
  protocolRx: 'Self-Care Protocol',
  targetGlucose: 110,
  targetRangeMin: 70,
  targetRangeMax: 180,
  insulinSensitivityFactor: 40, // 1u drops 40 mg/dL
  insulinToCarbRatio: 10, // 1u covers 10g carbs
  activeDurationHours: 4.0,
  autoDiaEnabled: true,
  hypoLimit: 70,
  activeInsulinIds: [],
  insulinSchedules: [],
  setupCompleted: false,
  avatarColor: '#00685f'
};

/**
 * 90-Day Rolling Buffer Purge:
 * Removes any record older than 90 days from the current local time.
 */
function pruneRecordsOlderThan90Days<T extends { timestamp: string }>(records: T[]): T[] {
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  const now = new Date().getTime();
  return records.filter(r => {
    const t = new Date(r.timestamp).getTime();
    return now - t <= ninetyDaysMs;
  });
}

export function loadAllProfiles(): PatientProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILES_LIST);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(p => p !== null && p !== undefined);
      }
    }
  } catch (e) {
    console.error('Error loading profiles list', e);
  }

  // If no profiles list exists yet, check if single legacy profile was stored
  try {
    const legacyRaw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (legacyRaw) {
      const legacy: PatientProfile = JSON.parse(legacyRaw);
      if (legacy && legacy.name && legacy.setupCompleted) {
        const migrated: PatientProfile = {
          ...legacy,
          id: legacy.id || `profile_${Date.now()}`,
          avatarColor: legacy.avatarColor || '#00685f',
          lastLoginAt: legacy.lastLoginAt || new Date().toISOString()
        };
        const initialList = [migrated, DEMO_PROFILES[1]];
        saveAllProfiles(initialList);
        return initialList;
      }
    }
  } catch (e) {
    console.error('Error checking legacy profile', e);
  }

  // Fallback to default demo profiles
  saveAllProfiles(DEMO_PROFILES);
  return DEMO_PROFILES;
}

export function saveAllProfiles(profiles: PatientProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILES_LIST, JSON.stringify(profiles));
  } catch (e) {
    console.error('Error saving profiles list', e);
  }
}

export function getIsLoggedIn(): boolean {
  try {
    const status = localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN);
    if (status !== null) {
      return status === 'true';
    }
  } catch (e) {
    console.error('Error reading login status', e);
  }
  // If never set before, check if a completed profile exists; otherwise false
  const prof = getStoredProfile();
  const initial = !!prof.setupCompleted && !!prof.name;
  setIsLoggedIn(initial);
  return initial;
}

export function setIsLoggedIn(loggedIn: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, loggedIn ? 'true' : 'false');
  } catch (e) {
    console.error('Error saving login status', e);
  }
}

export function logoutUser(): void {
  setIsLoggedIn(false);
}

export function getActiveProfileId(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) return parsed.id;
    }
  } catch {
    // fallback
  }
  return 'profile_default';
}

export function getProfileGlucoseStorageKey(profileId?: string): string {
  const pId = profileId || getActiveProfileId();
  return `${STORAGE_KEYS.GLUCOSE}_${pId}`;
}

export function getProfileInsulinStorageKey(profileId?: string): string {
  const pId = profileId || getActiveProfileId();
  return `${STORAGE_KEYS.INSULIN}_${pId}`;
}

export function getStoredProfile(): PatientProfile {
  let profile: PatientProfile | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.name) profile = parsed;
    }
  } catch (e) {
    console.error('Error reading profile from storage', e);
  }
  if (!profile) {
    const all = loadAllProfiles();
    if (all.length > 0) {
      profile = all[0];
    } else {
      profile = DEFAULT_PROFILE;
    }
  }

  const activeInsulinIds = Array.isArray(profile.activeInsulinIds)
    ? profile.activeInsulinIds
    : [];

  const schedules = (profile.insulinSchedules && profile.insulinSchedules.length > 0)
    ? profile.insulinSchedules
    : (activeInsulinIds.length > 0 ? getDefaultSchedulesForInsulins(activeInsulinIds) : []);

  const autoDiaEnabled = profile.autoDiaEnabled !== false;
  let activeDuration = profile.activeDurationHours;
  if (autoDiaEnabled && activeInsulinIds.length > 0) {
    const primaryId = activeInsulinIds[0];
    activeDuration = getRecommendedDiaForInsulin(primaryId);
  }

  return {
    ...profile,
    targetGlucose: profile.targetGlucose || 110,
    targetRangeMin: profile.targetRangeMin || 70,
    targetRangeMax: profile.targetRangeMax || 180,
    insulinSensitivityFactor: profile.insulinSensitivityFactor || 40,
    insulinToCarbRatio: profile.insulinToCarbRatio || 10,
    activeDurationHours: activeDuration || 4.0,
    autoDiaEnabled,
    activeInsulinIds,
    insulinSchedules: schedules
  };
}

export function saveStoredProfile(profile: PatientProfile): void {
  try {
    const ensuredId = profile.id || `profile_${Date.now()}`;
    const completeProfile: PatientProfile = {
      ...profile,
      id: ensuredId,
      lastLoginAt: new Date().toISOString(),
      avatarColor: profile.avatarColor || '#00685f'
    };

    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(completeProfile));

    // Also update in profiles list
    const all = loadAllProfiles();
    const index = all.findIndex(p => p.id === ensuredId || p.name === completeProfile.name);
    let updatedList: PatientProfile[];
    if (index >= 0) {
      updatedList = [...all];
      updatedList[index] = completeProfile;
    } else {
      updatedList = [completeProfile, ...all];
    }
    saveAllProfiles(updatedList);
    setIsLoggedIn(true);
  } catch (e) {
    console.error('Error saving profile', e);
  }
}

export function switchActiveProfile(profileId: string): PatientProfile | null {
  const all = loadAllProfiles();
  const found = all.find(p => p.id === profileId);
  if (found) {
    const updated = {
      ...found,
      lastLoginAt: new Date().toISOString()
    };
    saveStoredProfile(updated);
    setIsLoggedIn(true);
    return updated;
  }
  return null;
}

export function deleteProfile(profileId: string): PatientProfile[] {
  const all = loadAllProfiles();
  const updated = all.filter(p => p.id !== profileId);
  saveAllProfiles(updated);

  // Clean up profile specific records
  try {
    localStorage.removeItem(getProfileGlucoseStorageKey(profileId));
    localStorage.removeItem(getProfileInsulinStorageKey(profileId));
  } catch {
    // ignore
  }

  const active = getStoredProfile();
  if (active.id === profileId) {
    if (updated.length > 0) {
      saveStoredProfile(updated[0]);
    } else {
      saveStoredProfile(DEFAULT_PROFILE);
      setIsLoggedIn(false);
    }
  }
  return updated;
}

export function getStoredGlucoseRecords(profileId?: string): GlucoseRecord[] {
  const targetId = profileId || getActiveProfileId();
  const key = getProfileGlucoseStorageKey(targetId);

  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const records: GlucoseRecord[] = JSON.parse(raw);
      if (Array.isArray(records)) {
        return pruneRecordsOlderThan90Days(records.filter(r => r !== null && r !== undefined));
      }
    }
  } catch (e) {
    console.error('Error reading glucose records for profile', targetId, e);
  }

  return [];
}

export function saveStoredGlucoseRecord(record: GlucoseRecord, profileId?: string): void {
  const targetId = profileId || getActiveProfileId();
  const key = getProfileGlucoseStorageKey(targetId);
  const existing = getStoredGlucoseRecords(targetId);
  const index = existing.findIndex(r => r.id === record.id);
  let updated: GlucoseRecord[];
  if (index >= 0) {
    updated = [...existing];
    updated[index] = record;
  } else {
    updated = [record, ...existing];
  }
  updated.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const pruned = pruneRecordsOlderThan90Days(updated);
  localStorage.setItem(key, JSON.stringify(pruned));
}

export function deleteStoredGlucoseRecord(id: string, profileId?: string): void {
  const targetId = profileId || getActiveProfileId();
  const key = getProfileGlucoseStorageKey(targetId);
  const existing = getStoredGlucoseRecords(targetId);
  const updated = existing.filter(r => r.id !== id);
  localStorage.setItem(key, JSON.stringify(updated));
}

export function getStoredInsulinRecords(profileId?: string): InsulinRecord[] {
  const targetId = profileId || getActiveProfileId();
  const key = getProfileInsulinStorageKey(targetId);

  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const records: InsulinRecord[] = JSON.parse(raw);
      if (Array.isArray(records)) {
        return pruneRecordsOlderThan90Days(records.filter(r => r !== null && r !== undefined));
      }
    }
  } catch (e) {
    console.error('Error reading insulin records for profile', targetId, e);
  }

  // For any other profile, return clean empty array!
  return [];
}

export function saveStoredInsulinRecord(record: InsulinRecord, profileId?: string): void {
  const targetId = profileId || getActiveProfileId();
  const key = getProfileInsulinStorageKey(targetId);
  const existing = getStoredInsulinRecords(targetId);
  const updated = [record, ...existing];
  updated.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const pruned = pruneRecordsOlderThan90Days(updated);
  localStorage.setItem(key, JSON.stringify(pruned));
}

export function deleteStoredInsulinRecord(id: string, profileId?: string): void {
  const targetId = profileId || getActiveProfileId();
  const key = getProfileInsulinStorageKey(targetId);
  const existing = getStoredInsulinRecords(targetId);
  const updated = existing.filter(r => r.id !== id);
  localStorage.setItem(key, JSON.stringify(updated));
}

export function getStorageDaysUsed(profileId?: string): number {
  const records = getStoredGlucoseRecords(profileId);
  if (records.length === 0) return 0;
  const timestamps = records.map(r => new Date(r.timestamp).getTime());
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps, Date.now());
  const diffDays = Math.ceil((maxTime - minTime) / (1000 * 60 * 60 * 24));
  return Math.min(90, Math.max(1, diffDays));
}

export function clearAllRecords(profileId?: string): void {
  const targetId = profileId || getActiveProfileId();
  localStorage.setItem(getProfileGlucoseStorageKey(targetId), JSON.stringify([]));
  localStorage.setItem(getProfileInsulinStorageKey(targetId), JSON.stringify([]));
}

/**
 * Export full patient clinical dataset as a structured backup package.
 * Can be saved to device disk or exported for clinical handover.
 */
export function exportPatientBackup(): PatientBackupData {
  const profile = getStoredProfile();
  const allProfiles = loadAllProfiles();
  const glucoseRecords = getStoredGlucoseRecords();
  const insulinRecords = getStoredInsulinRecords();

  const backup: PatientBackupData = {
    app: 'BetaKinetics T1D',
    version: '2.4.0',
    exportedAt: new Date().toISOString(),
    profile,
    allProfiles,
    glucoseRecords,
    insulinRecords,
    summary: {
      totalGlucose: glucoseRecords.length,
      totalInsulin: insulinRecords.length,
      profilesCount: allProfiles.length
    }
  };

  return backup;
}

/**
 * Downloads the backup package to device local storage as a timestamped JSON file.
 */
export function downloadBackupToDevice(filename?: string): void {
  const backup = exportPatientBackup();
  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dateSlug = new Date().toISOString().split('T')[0];
  const patientSlug = (backup.profile.name || 'Patient').replace(/\s+/g, '_');
  const finalFilename = filename || `BetaKinetics_Backup_${patientSlug}_${dateSlug}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates and restores a previously exported patient backup JSON.
 */
export function restorePatientBackup(
  imported: unknown,
  mode: 'replace' | 'merge' = 'replace'
): { success: boolean; message: string; restoredStats?: { glucose: number; insulin: number; profiles: number } } {
  try {
    if (!imported || typeof imported !== 'object') {
      return { success: false, message: 'Invalid backup file: Not a valid JSON object.' };
    }

    const data = imported as Partial<PatientBackupData>;

    // Basic schema check
    if (!Array.isArray(data.glucoseRecords) && !Array.isArray(data.insulinRecords) && !data.profile) {
      return { success: false, message: 'Invalid backup schema: Missing patient glucose, insulin, or profile records.' };
    }

    const importedGlucose: GlucoseRecord[] = Array.isArray(data.glucoseRecords) ? data.glucoseRecords : [];
    const importedInsulin: InsulinRecord[] = Array.isArray(data.insulinRecords) ? data.insulinRecords : [];
    const importedProfile: PatientProfile | undefined = data.profile;
    const importedProfilesList: PatientProfile[] = Array.isArray(data.allProfiles) ? data.allProfiles : [];

    if (mode === 'replace') {
      // Direct replacement
      const cleanGlucose = pruneRecordsOlderThan90Days(importedGlucose);
      const cleanInsulin = pruneRecordsOlderThan90Days(importedInsulin);

      const targetId = (importedProfile && importedProfile.id) ? importedProfile.id : getActiveProfileId();

      localStorage.setItem(getProfileGlucoseStorageKey(targetId), JSON.stringify(cleanGlucose));
      localStorage.setItem(getProfileInsulinStorageKey(targetId), JSON.stringify(cleanInsulin));

      if (importedProfile && importedProfile.name) {
        localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(importedProfile));
      }

      if (importedProfilesList.length > 0) {
        saveAllProfiles(importedProfilesList);
      } else if (importedProfile) {
        saveAllProfiles([importedProfile]);
      }

      setIsLoggedIn(true);

      return {
        success: true,
        message: `Successfully restored ${cleanGlucose.length} glucose logs, ${cleanInsulin.length} insulin logs, and profile for "${importedProfile?.name || 'User'}".`,
        restoredStats: {
          glucose: cleanGlucose.length,
          insulin: cleanInsulin.length,
          profiles: importedProfilesList.length || 1
        }
      };
    } else {
      // Merge mode: deduplicate by id
      const targetId = (importedProfile && importedProfile.id) ? importedProfile.id : getActiveProfileId();
      const existingG = getStoredGlucoseRecords(targetId);
      const existingI = getStoredInsulinRecords(targetId);

      const gMap = new Map<string, GlucoseRecord>();
      existingG.forEach(g => gMap.set(g.id, g));
      importedGlucose.forEach(g => gMap.set(g.id, g));

      const iMap = new Map<string, InsulinRecord>();
      existingI.forEach(i => iMap.set(i.id, i));
      importedInsulin.forEach(i => iMap.set(i.id, i));

      const mergedG = pruneRecordsOlderThan90Days(Array.from(gMap.values()));
      const mergedI = pruneRecordsOlderThan90Days(Array.from(iMap.values()));

      localStorage.setItem(getProfileGlucoseStorageKey(targetId), JSON.stringify(mergedG));
      localStorage.setItem(getProfileInsulinStorageKey(targetId), JSON.stringify(mergedI));

      if (importedProfilesList.length > 0) {
        const existingProfiles = loadAllProfiles();
        const pMap = new Map<string, PatientProfile>();
        existingProfiles.forEach(p => pMap.set(p.id || p.name, p));
        importedProfilesList.forEach(p => pMap.set(p.id || p.name, p));
        saveAllProfiles(Array.from(pMap.values()));
      }

      return {
        success: true,
        message: `Merged data: Total ${mergedG.length} glucose logs and ${mergedI.length} insulin logs now stored.`,
        restoredStats: {
          glucose: mergedG.length,
          insulin: mergedI.length,
          profiles: loadAllProfiles().length
        }
      };
    }
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Backup restoration failed: ${errMessage}` };
  }
}

/**
 * Reads device storage estimate if supported by browser/device.
 */
export async function getDeviceStorageEstimate(): Promise<{
  usageBytes: number;
  quotaBytes: number;
  usageKb: number;
  persisted: boolean;
}> {
  let usageBytes = 0;
  let quotaBytes = 0;
  let persisted = false;

  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      usageBytes = estimate.usage || 0;
      quotaBytes = estimate.quota || 0;
    }
    if (navigator.storage && navigator.storage.persisted) {
      persisted = await navigator.storage.persisted();
    }
  } catch {
    // Fallback: estimate localStorage size
    let totalLen = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        totalLen += (localStorage.getItem(k) || '').length * 2;
      }
    }
    usageBytes = totalLen;
    quotaBytes = 5 * 1024 * 1024; // approx 5MB default for localStorage
  }

  return {
    usageBytes,
    quotaBytes,
    usageKb: Math.round(usageBytes / 1024),
    persisted
  };
}

/**
 * Requests persistent storage permission from the browser / device to prevent OS eviction.
 */
export async function requestPersistentStoragePermission(): Promise<boolean> {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      return isPersisted;
    }
  } catch (e) {
    console.warn('Storage persistence request not supported', e);
  }
  return false;
}

// Aliases for unified interface
export const loadPatientProfile = getStoredProfile;
export const savePatientProfile = saveStoredProfile;
export const loadGlucoseRecords = getStoredGlucoseRecords;
export const saveGlucoseRecord = saveStoredGlucoseRecord;
export const deleteGlucoseRecord = deleteStoredGlucoseRecord;
export const loadInsulinRecords = getStoredInsulinRecords;
export const saveInsulinRecord = saveStoredInsulinRecord;
export const deleteInsulinRecord = deleteStoredInsulinRecord;
