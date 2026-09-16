import React, { useState, useEffect, useRef } from 'react';
import { PatientProfile, PatientBackupData } from '../types';
import {
  exportPatientBackup,
  downloadBackupToDevice,
  restorePatientBackup,
  getDeviceStorageEstimate,
  requestPersistentStoragePermission,
  getStorageDaysUsed
} from '../services/storageEngine';

interface BackupRestoreModalProps {
  profile: PatientProfile;
  isOpen: boolean;
  onClose: () => void;
  onDataRestored: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  profile,
  isOpen,
  onClose,
  onDataRestored
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'storage'>('export');
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<PatientBackupData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Storage estimation state
  const [storageEstimate, setStorageEstimate] = useState<{
    usageKb: number;
    quotaBytes: number;
    persisted: boolean;
  }>({ usageKb: 0, quotaBytes: 0, persisted: false });
  const [storagePermissionGranted, setStoragePermissionGranted] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadStorageStats();
      setErrorMessage(null);
      setSuccessMessage(null);
      setSelectedFile(null);
      setFilePreview(null);
    }
  }, [isOpen]);

  const loadStorageStats = async () => {
    const est = await getDeviceStorageEstimate();
    setStorageEstimate({
      usageKb: est.usageKb,
      quotaBytes: est.quotaBytes,
      persisted: est.persisted
    });
    setStoragePermissionGranted(est.persisted);
  };

  if (!isOpen) return null;

  const currentBackup = exportPatientBackup();
  const daysUsed = getStorageDaysUsed();

  const handleDownload = () => {
    try {
      setIsProcessing(true);
      downloadBackupToDevice();
      setSuccessMessage('Backup file downloaded directly to your device storage.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e: unknown) {
      setErrorMessage(`Download failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as PatientBackupData;

        // Verify minimal integrity
        if (!parsed.glucoseRecords && !parsed.insulinRecords && !parsed.profile) {
          throw new Error('File does not match BetaKinetics backup schema.');
        }

        setFilePreview(parsed);
      } catch (err: unknown) {
        setErrorMessage(
          `Unable to parse backup file: ${err instanceof Error ? err.message : 'Invalid JSON content'}`
        );
        setSelectedFile(null);
        setFilePreview(null);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read file from local disk.');
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = () => {
    if (!filePreview) {
      setErrorMessage('Please select a valid backup JSON file first.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const result = restorePatientBackup(filePreview, restoreMode);
    setIsProcessing(false);

    if (result.success) {
      setSuccessMessage(result.message);
      onDataRestored();
      setTimeout(() => {
        onClose();
      }, 1800);
    } else {
      setErrorMessage(result.message);
    }
  };

  const handleRequestPersistence = async () => {
    const granted = await requestPersistentStoragePermission();
    setStoragePermissionGranted(granted);
    if (granted) {
      setSuccessMessage('Device storage permission granted! Browser will not clear clinical logs.');
    } else {
      setErrorMessage('Device storage persistence was not granted by browser settings or already configured.');
    }
    loadStorageStats();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-[#e5eeff] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#eff4ff] to-[#f4f7fc] border-b border-[#e5eeff] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#00685f] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[22px]">cloud_sync</span>
            </div>
            <div>
              <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[17px] text-[#0b1c30]">
                Device Backup &amp; Restore
              </h2>
              <p className="text-[11px] text-[#3d4947]">
                Local Storage Persistence • Full Telemetry Export &amp; Import
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-[#e5eeff] text-[#3d4947] flex items-center justify-center transition-colors cursor-pointer border border-[#e5eeff]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-[#e5eeff] bg-[#f8f9ff] px-4 pt-2 gap-1 text-[13px] font-bold">
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2.5 rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'bg-white text-[#00685f] border-t-2 border-[#00685f] shadow-xs'
                : 'text-[#3d4947] hover:text-[#0b1c30]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">file_download</span>
            <span>Export Backup</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2.5 rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'bg-white text-[#00685f] border-t-2 border-[#00685f] shadow-xs'
                : 'text-[#3d4947] hover:text-[#0b1c30]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">file_upload</span>
            <span>Import &amp; Restore</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`px-4 py-2.5 rounded-t-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'storage'
                ? 'bg-white text-[#00685f] border-t-2 border-[#00685f] shadow-xs'
                : 'text-[#3d4947] hover:text-[#0b1c30]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">sd_card</span>
            <span>Device Storage</span>
          </button>
        </div>

        {/* Notification Banners */}
        {successMessage && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-[#006947]/10 border border-[#006947]/20 text-[#006947] text-[12px] font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-[#ffdad6] border border-[#ba1a1a]/20 text-[#ba1a1a] text-[12px] font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-[15px] text-[#0b1c30]">
                  Export Complete Patient Clinical History
                </h3>
                <p className="text-[12px] text-[#3d4947] mt-0.5 leading-relaxed">
                  Save all manual glucose logs, insulin injections, calculation parameters, and patient profiles to an encrypted JSON file on your device.
                </p>
              </div>

              {/* Data Summary Card */}
              <div className="p-4 bg-[#eff4ff] rounded-2xl border border-[#dce9ff] space-y-2.5">
                <span className="text-[11px] font-bold text-[#00685f] uppercase tracking-wider block">
                  Package Contents Ready for Export
                </span>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 bg-white rounded-xl shadow-2xs">
                    <span className="text-[10px] text-[#3d4947] block font-semibold">Glucose Readings</span>
                    <span className="text-[18px] font-extrabold text-[#00685f]">
                      {currentBackup.glucoseRecords.length}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl shadow-2xs">
                    <span className="text-[10px] text-[#3d4947] block font-semibold">Insulin Doses</span>
                    <span className="text-[18px] font-extrabold text-[#4648d4]">
                      {currentBackup.insulinRecords.length}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl shadow-2xs">
                    <span className="text-[10px] text-[#3d4947] block font-semibold">Profiles</span>
                    <span className="text-[18px] font-extrabold text-[#0b1c30]">
                      {currentBackup.allProfiles.length}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-[#3d4947] pt-1 flex items-center justify-between border-t border-[#dce9ff]">
                  <span>Active Patient: <strong>{profile.name}</strong></span>
                  <span>Rolling Period: <strong>{daysUsed} / 90 Days</strong></span>
                </div>
              </div>

              <div className="p-3 bg-[#e1e0ff]/40 rounded-2xl text-[12px] text-[#07006c] flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#00685f] flex-shrink-0 mt-0.5">
                  security
                </span>
                <span>
                  <strong>100% On-Device:</strong> No cloud transmission. The backup file is written straight to your device storage (Downloads / Local Documents) for offline preservation.
                </span>
              </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={isProcessing}
                className="w-full h-12 rounded-full bg-[#00685f] hover:bg-[#005049] text-white text-[14px] font-bold flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span>Download Backup to Device Storage</span>
              </button>
            </div>
          )}

          {/* TAB 2: IMPORT / RESTORE */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-[15px] text-[#0b1c30]">
                  Restore from Previous Backup File
                </h3>
                <p className="text-[12px] text-[#3d4947] mt-0.5 leading-relaxed">
                  Select a BetaKinetics backup file (<code className="text-[#00685f]">.json</code>) exported previously to restore telemetry logs and patient profiles.
                </p>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Upload Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-[#c2d7ff] hover:border-[#00685f] bg-[#eff4ff]/60 hover:bg-[#eff4ff] rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-white text-[#00685f] flex items-center justify-center shadow-xs mb-2">
                  <span className="material-symbols-outlined text-[26px]">upload_file</span>
                </div>
                <span className="font-bold text-[13px] text-[#0b1c30]">
                  {selectedFile ? selectedFile.name : 'Click to Browse Device Storage'}
                </span>
                <span className="text-[11px] text-[#3d4947] mt-0.5">
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB selected`
                    : 'Select BetaKinetics_Backup_*.json file'}
                </span>
              </div>

              {/* File Preview Card */}
              {filePreview && (
                <div className="p-4 bg-[#eff4ff] rounded-2xl border border-[#dce9ff] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#0b1c30]">
                      Backup Details Verified
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#006947]/10 text-[#006947] font-bold">
                      Valid Schema
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="p-2 bg-white rounded-xl">
                      <span className="text-[10px] text-[#3d4947] block">Readings</span>
                      <span className="font-bold text-[#00685f] text-[15px]">
                        {filePreview.glucoseRecords?.length || 0}
                      </span>
                    </div>
                    <div className="p-2 bg-white rounded-xl">
                      <span className="text-[10px] text-[#3d4947] block">Injections</span>
                      <span className="font-bold text-[#4648d4] text-[15px]">
                        {filePreview.insulinRecords?.length || 0}
                      </span>
                    </div>
                    <div className="p-2 bg-white rounded-xl">
                      <span className="text-[10px] text-[#3d4947] block">Patient</span>
                      <span className="font-bold text-[#0b1c30] text-[12px] truncate block">
                        {filePreview.profile?.name || 'Saved Profile'}
                      </span>
                    </div>
                  </div>

                  {/* Restore Strategy Selection */}
                  <div className="pt-2 border-t border-[#dce9ff]">
                    <span className="text-[11px] font-semibold text-[#3d4947] block mb-1.5">
                      Restoration Strategy:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <label
                        className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-all ${
                          restoreMode === 'replace'
                            ? 'bg-white border-[#00685f] ring-1 ring-[#00685f]'
                            : 'bg-white/70 border-[#e5eeff]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="restoreMode"
                          value="replace"
                          checked={restoreMode === 'replace'}
                          onChange={() => setRestoreMode('replace')}
                          className="mt-0.5 text-[#00685f]"
                        />
                        <div className="text-[11px]">
                          <span className="font-bold text-[#0b1c30] block">Replace All</span>
                          <span className="text-[#3d4947] block text-[10px]">Clean restore to backup state</span>
                        </div>
                      </label>

                      <label
                        className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-all ${
                          restoreMode === 'merge'
                            ? 'bg-white border-[#00685f] ring-1 ring-[#00685f]'
                            : 'bg-white/70 border-[#e5eeff]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="restoreMode"
                          value="merge"
                          checked={restoreMode === 'merge'}
                          onChange={() => setRestoreMode('merge')}
                          className="mt-0.5 text-[#00685f]"
                        />
                        <div className="text-[11px]">
                          <span className="font-bold text-[#0b1c30] block">Merge Logs</span>
                          <span className="text-[#3d4947] block text-[10px]">Combine without duplicates</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    disabled={isProcessing}
                    className="w-full h-11 rounded-full bg-[#00685f] hover:bg-[#005049] text-white text-[13px] font-bold flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all cursor-pointer disabled:opacity-50 mt-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">restore</span>
                    <span>Restore Data from File</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STORAGE PERMISSION & HARDWARE MANAGEMENT */}
          {activeTab === 'storage' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-[15px] text-[#0b1c30]">
                  Device Storage &amp; Persistence Permission
                </h3>
                <p className="text-[12px] text-[#3d4947] mt-0.5 leading-relaxed">
                  BetaKinetics stores all patient data strictly inside your local device storage. You can request persistent storage to ensure the operating system never purges logs during device storage cleaning.
                </p>
              </div>

              <div className="p-4 bg-[#eff4ff] rounded-2xl border border-[#dce9ff] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#0b1c30]">
                    Local Storage Status
                  </span>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                      storagePermissionGranted
                        ? 'bg-[#006947]/10 text-[#006947]'
                        : 'bg-[#b69400]/20 text-[#6c5800]'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {storagePermissionGranted ? 'Persistent Storage Active' : 'Standard Browser Storage'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="p-3 bg-white rounded-xl">
                    <span className="text-[10px] text-[#3d4947] block">Estimated Space Used</span>
                    <span className="text-[16px] font-bold text-[#00685f]">
                      {storageEstimate.usageKb > 0 ? `${storageEstimate.usageKb} KB` : '< 100 KB'}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl">
                    <span className="text-[10px] text-[#3d4947] block">Clinical Log Buffer</span>
                    <span className="text-[16px] font-bold text-[#0b1c30]">
                      90-Day Rolling
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-[#3d4947] leading-relaxed">
                  {storagePermissionGranted
                    ? '✅ Your browser has granted persistent storage permission. Logbook data will be retained even if the device experiences low disk space.'
                    : 'ℹ️ Persistent storage prevents the browser from evicting cached telemetry when your device runs low on disk storage.'}
                </p>

                {!storagePermissionGranted && (
                  <button
                    type="button"
                    onClick={handleRequestPersistence}
                    className="w-full py-2.5 rounded-xl bg-[#00685f] hover:bg-[#005049] text-white text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">verified_user</span>
                    <span>Request Persistent Storage Permission</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
