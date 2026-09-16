import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav, TabKey } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { LogAndDoseView } from './components/LogAndDoseView';
import { AnalyticsView } from './components/AnalyticsView';
import { InsulinIobView } from './components/InsulinIobView';
import { ProfileRxView } from './components/ProfileRxView';
import { AboutGuideView } from './components/AboutGuideView';
import { MealPlannerView } from './components/MealPlannerView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { LoginScreen } from './components/LoginScreen';
import { ChatbotSetupModal } from './components/ChatbotSetupModal';
import { EditParametersModal } from './components/EditParametersModal';
import { AgpExportModal } from './components/AgpExportModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { GlucoseRecord, InsulinRecord, PatientProfile, RoutineSlot } from './types';
import {
  loadGlucoseRecords,
  loadInsulinRecords,
  loadPatientProfile,
  loadAllProfiles,
  saveGlucoseRecord,
  saveInsulinRecord,
  deleteInsulinRecord,
  savePatientProfile,
  switchActiveProfile,
  deleteProfile,
  getIsLoggedIn,
  logoutUser,
  clearAllRecords,
  requestPersistentStoragePermission
} from './services/storageEngine';
import { INSULIN_DATABASE } from './data/insulinDatabase';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [profile, setProfile] = useState<PatientProfile>(loadPatientProfile());
  const [allProfiles, setAllProfiles] = useState<PatientProfile[]>(loadAllProfiles());
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(getIsLoggedIn());
  const [showLoginScreen, setShowLoginScreen] = useState<boolean>(!getIsLoggedIn() || !loadPatientProfile().setupCompleted);

  const [glucoseRecords, setGlucoseRecords] = useState<GlucoseRecord[]>([]);
  const [insulinRecords, setInsulinRecords] = useState<InsulinRecord[]>([]);

  // Log & Dose View submodes
  const [logSubmode, setLogSubmode] = useState<'calc' | 'quick'>('calc');
  const [selectedSlotForLog, setSelectedSlotForLog] = useState<RoutineSlot>('before_dinner');

  // Modals
  const [showChatbotSetup, setShowChatbotSetup] = useState(false);
  const [showEditParameters, setShowEditParameters] = useState(false);
  const [showAgpExport, setShowAgpExport] = useState(false);
  const [showBackupRestore, setShowBackupRestore] = useState(false);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // Initialize data on mount and request persistent storage
  useEffect(() => {
    refreshData();
    requestPersistentStoragePermission().then(granted => {
      console.log('Persistent Storage Granted:', granted);
    });
  }, []);

  // Listen for PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
      }
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const handleDismissInstall = () => {
    setShowInstallPrompt(false);
  };

  const refreshData = (profileId?: string) => {
    const currentProf = loadPatientProfile();
    const targetId = profileId || currentProf.id;
    setProfile(currentProf);
    setAllProfiles(loadAllProfiles());
    setGlucoseRecords(loadGlucoseRecords(targetId));
    setInsulinRecords(loadInsulinRecords(targetId));
    setIsLoggedIn(getIsLoggedIn());
  };

  const handleLoginComplete = (updatedProfile: PatientProfile) => {
    savePatientProfile(updatedProfile);
    setProfile(updatedProfile);
    setAllProfiles(loadAllProfiles());
    setIsLoggedIn(true);
    refreshData(updatedProfile.id);
    setShowLoginScreen(false);
  };

  const handleSelectProfile = (profileId: string) => {
    const updated = switchActiveProfile(profileId);
    if (updated) {
      setProfile(updated);
      setAllProfiles(loadAllProfiles());
      setIsLoggedIn(true);
      setShowLoginScreen(false);
      refreshData(updated.id);
    }
  };

  const handleDeleteProfile = (profileId: string) => {
    const updatedList = deleteProfile(profileId);
    setAllProfiles(updatedList);
    const activeProf = loadPatientProfile();
    setProfile(activeProf);
    refreshData(activeProf.id);
    setIsLoggedIn(getIsLoggedIn());
  };

  const handleLogout = () => {
    logoutUser();
    setIsLoggedIn(false);
    setShowLoginScreen(true);
  };

  const handleNavigate = (tab: TabKey, submode: 'calc' | 'quick' = 'calc') => {
    setActiveTab(tab);
    setLogSubmode(submode);
  };

  const handleSlotClick = (slot: string) => {
    setSelectedSlotForLog(slot as RoutineSlot);
    setActiveTab('log-and-dose');
    setLogSubmode('calc');
  };

  const handleSaveGlucoseAndDose = (
    glucoseVal: number,
    slot: RoutineSlot,
    carbs: number,
    insulinId: string,
    dose: number,
    priorDoseToSave?: {
      insulinId: string;
      doseUnits: number;
      hoursAgo: number;
      slot: RoutineSlot;
      notes?: string;
    },
    deliveryDevice?: 'pen_whole' | 'pen_half' | 'syringe',
    injectionSite?: string
  ) => {
    const timestamp = new Date().toISOString();

    // 0. If prior dose is provided, save it with historical timestamp
    if (priorDoseToSave && priorDoseToSave.doseUnits > 0) {
      const priorInsObj = INSULIN_DATABASE.find(i => i.id === priorDoseToSave.insulinId) || INSULIN_DATABASE[2];
      const priorTimestamp = new Date(Date.now() - priorDoseToSave.hoursAgo * 3600000).toISOString();
      const priorRecord: InsulinRecord = {
        id: `ins_prior_${Date.now()}`,
        insulinId: priorInsObj.id,
        insulinName: priorInsObj.name,
        category: priorInsObj.category,
        doseUnits: priorDoseToSave.doseUnits,
        timestamp: priorTimestamp,
        context: priorDoseToSave.slot,
        slot: priorDoseToSave.slot,
        notes: priorDoseToSave.notes || `Prior dose taken ${priorDoseToSave.hoursAgo}h ago (accounted in dose adjustment)`
      };
      saveInsulinRecord(priorRecord, profile.id);
    }

    // 1. Save Glucose Record
    const gRecord: GlucoseRecord = {
      id: `glc_${Date.now()}`,
      value: glucoseVal,
      timestamp,
      slot,
      carbs: carbs > 0 ? carbs : undefined,
      notes: `Logged via Smart Advisor (${slot})`
    };
    saveGlucoseRecord(gRecord, profile.id);

    // 2. Save Insulin Record if dose > 0
    if (dose > 0) {
      const insObj = INSULIN_DATABASE.find(i => i.id === insulinId) || INSULIN_DATABASE[2];
      const iRecord: InsulinRecord = {
        id: `ins_${Date.now() + 1}`,
        insulinId: insObj.id,
        insulinName: insObj.name,
        category: insObj.category,
        doseUnits: dose,
        timestamp,
        context: slot,
        slot,
        notes: `Advisor dose: ${dose}u (${carbs}g carbs coverage + correction, ISF 1:${profile.insulinSensitivityFactor})`,
        deliveryDevice,
        injectionSite
      };
      saveInsulinRecord(iRecord, profile.id);
    }

    refreshData(profile.id);
  };

  const handleDeleteInsulinRecord = (recordId: string) => {
    deleteInsulinRecord(recordId, profile.id);
    refreshData(profile.id);
  };

  const handleSaveQuickInsulin = (
    insulinId: string,
    dose: number,
    slot: RoutineSlot,
    timeIso: string,
    notes?: string,
    deliveryDevice?: 'pen_whole' | 'pen_half' | 'syringe',
    injectionSite?: string
  ) => {
    const insObj = INSULIN_DATABASE.find(i => i.id === insulinId) || INSULIN_DATABASE[4];
    const iRecord: InsulinRecord = {
      id: `ins_${Date.now()}`,
      insulinId: insObj.id,
      insulinName: insObj.name,
      category: insObj.category,
      doseUnits: dose,
      timestamp: timeIso || new Date().toISOString(),
      context: slot,
      slot,
      notes: notes || `Direct administration (${slot})`,
      deliveryDevice,
      injectionSite
    };
    saveInsulinRecord(iRecord, profile.id);
    refreshData(profile.id);
  };

  const handleSaveProfile = (newProfile: PatientProfile) => {
    savePatientProfile(newProfile);
    setProfile(newProfile);
    setAllProfiles(loadAllProfiles());
    refreshData(newProfile.id);
  };

  const handleClearAll = () => {
    clearAllRecords(profile.id);
    refreshData(profile.id);
  };

  // Show Login / Profile selection screen when logged out or when explicitly triggered
  if (!isLoggedIn || showLoginScreen || !profile.setupCompleted) {
    return (
      <LoginScreen
        initialProfile={profile}
        profilesList={allProfiles}
        onLoginComplete={handleLoginComplete}
        onSelectProfile={handleSelectProfile}
        onDeleteProfile={handleDeleteProfile}
        onCancel={isLoggedIn && profile.setupCompleted ? () => setShowLoginScreen(false) : undefined}
        onRestoreBackupSuccess={() => {
          refreshData();
          setShowLoginScreen(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-['Inter',sans-serif] antialiased">
      {/* PWA Offline / Online Connectivity Indicator */}
      <OfflineIndicator />

      {/* Top Header with live status, avatar menu, and logout */}
      <Header
        activeTab={activeTab}
        profile={profile}
        onOpenProfile={() => setActiveTab('profile-rx')}
        onOpenAbout={() => setActiveTab('about')}
        onOpenSetup={() => setShowChatbotSetup(true)}
        onOpenBackupRestore={() => setShowBackupRestore(true)}
        onSwitchUser={() => setShowLoginScreen(true)}
        onLogout={handleLogout}
      />

      {/* PWA Install Banner */}
      {showInstallPrompt && (
        <div className="fixed top-16 left-0 right-0 z-40 px-4 py-2 bg-gradient-to-r from-[#00685f] to-[#005049] shadow-md flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 text-white">
            <span className="material-symbols-outlined text-[24px]">app_shortcut</span>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold">Install BetaKinetics App</span>
              <span className="text-[10px] text-white/80">Add to home screen for offline access</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDismissInstall}
              className="px-2 py-1.5 text-white/80 hover:text-white text-[12px] font-semibold transition-colors cursor-pointer"
            >
              Later
            </button>
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-white text-[#00685f] hover:bg-[#eff4ff] rounded-xl text-[12px] font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              Install
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="pt-20 pb-4 min-h-[calc(100vh-64px)]">
        {activeTab === 'dashboard' && (
          <DashboardView
            profile={profile}
            glucoseRecords={glucoseRecords}
            insulinRecords={insulinRecords}
            onNavigate={handleNavigate}
            onSlotClick={handleSlotClick}
            onClearData={handleClearAll}
            onOpenParameterModal={() => setShowEditParameters(true)}
          />
        )}

        {activeTab === 'log-and-dose' && (
          <LogAndDoseView
            profile={profile}
            glucoseRecords={glucoseRecords}
            insulinRecords={insulinRecords}
            initialMode={logSubmode}
            initialSlot={selectedSlotForLog}
            onSaveGlucoseAndDose={handleSaveGlucoseAndDose}
            onSaveQuickInsulin={handleSaveQuickInsulin}
            onDeleteInsulinRecord={handleDeleteInsulinRecord}
            onOpenParameterModal={() => setShowEditParameters(true)}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            profile={profile}
            glucoseRecords={glucoseRecords}
            onOpenAgpExport={() => setShowAgpExport(true)}
            onOpenBackupRestore={() => setShowBackupRestore(true)}
          />
        )}

        {activeTab === 'insulin-iob' && (
          <InsulinIobView
            profile={profile}
            insulinRecords={insulinRecords}
            onOpenParameterModal={() => setShowEditParameters(true)}
          />
        )}

        {activeTab === 'profile-rx' && (
          <ProfileRxView
            profile={profile}
            glucoseCount={glucoseRecords.length}
            insulinCount={insulinRecords.length}
            onOpenSetupChatbot={() => setShowChatbotSetup(true)}
            onOpenParameterModal={() => setShowEditParameters(true)}
            onOpenBackupRestore={() => setShowBackupRestore(true)}
            onOpenLoginScreen={() => setShowLoginScreen(true)}
            onLogout={handleLogout}
            onClearAll={handleClearAll}
          />
        )}

        {activeTab === 'meal-plan' && (
          <MealPlannerView
            profile={profile}
            onOpenParameterModal={() => setShowEditParameters(true)}
          />
        )}

        {activeTab === 'about' && (
          <AboutGuideView
            onStartDosing={() => setActiveTab('log-and-dose')}
            onOpenSettings={() => setShowEditParameters(true)}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Modals */}
      <ChatbotSetupModal
        currentProfile={profile}
        isOpen={showChatbotSetup}
        onClose={() => setShowChatbotSetup(false)}
        onSaveProfile={handleSaveProfile}
      />

      <EditParametersModal
        profile={profile}
        isOpen={showEditParameters}
        onClose={() => setShowEditParameters(false)}
        onSave={handleSaveProfile}
      />

      <AgpExportModal
        profile={profile}
        glucoseRecords={glucoseRecords}
        isOpen={showAgpExport}
        onClose={() => setShowAgpExport(false)}
      />

      <BackupRestoreModal
        profile={profile}
        isOpen={showBackupRestore}
        onClose={() => setShowBackupRestore(false)}
        onDataRestored={refreshData}
      />
    </div>
  );
}
