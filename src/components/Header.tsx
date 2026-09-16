import React, { useState, useRef, useEffect } from 'react';
import { PatientProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeTab: string;
  profile: PatientProfile;
  onOpenProfile: () => void;
  onOpenSetup: () => void;
  onOpenAbout?: () => void;
  onOpenBackupRestore?: () => void;
  onSwitchUser?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  profile,
  onOpenProfile,
  onOpenAbout,
  onOpenBackupRestore,
  onSwitchUser,
  onLogout
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const getTabSubtitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'log-and-dose':
        return 'Log & Dose';
      case 'analytics':
        return 'Analytics';
      case 'insulin-iob':
        return 'Insulin IOB';
      case 'profile-rx':
        return 'Profile & Rx';
      case 'about':
        return 'About & Guide';
      default:
        return 'Self-Care';
    }
  };

  const displayName = profile.name || 'My T1D';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="fixed top-0 w-full z-40 pt-safe bg-[#f8f9ff]/90 backdrop-blur-xl border-b border-[#e5eeff] shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      <div className="h-18 px-4 max-w-lg mx-auto flex items-center justify-between gap-3">
        {/* Brand and manual BGM tag */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Logo icon */}
          <div className="w-8 h-8 rounded-full bg-[#00685f] text-white flex items-center justify-center shadow-sm flex-shrink-0">
            <span className="material-symbols-outlined text-[19px]">water_drop</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[17px] text-[#0b1c30] tracking-tight">
                BetaKinetics
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-[#e1e0ff] text-[#07006c] text-[10px] font-bold tracking-wider uppercase">
                T1D
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#006947]"></span>
              <span className="text-[11px] text-[#006947] font-medium truncate">
                Manual Logbook • Fingerstick
              </span>
            </div>
          </div>
        </div>

        {/* View Indicator & Profile / Logout Controls */}
        <div className="flex items-center gap-2 flex-shrink-0 relative" ref={menuRef}>
          {/* PWA Install Button in Header */}
          <PWAInstallButton variant="compact" />

          <div className="hidden sm:flex flex-col items-end pr-1 text-right">
            <span className="text-[12px] font-semibold text-[#0b1c30]">{getTabSubtitle()}</span>
            <span className="text-[10px] text-[#00685f] font-medium truncate max-w-[110px]">{displayName}</span>
          </div>

          {/* Quick Logout Button */}
          {onLogout && (
            <button
              onClick={() => {
                onLogout();
              }}
              title={`Log Out (${displayName})`}
              className="h-8 px-2 sm:px-2.5 rounded-full bg-[#ffdad6]/70 hover:bg-[#ffdad6] text-[#ba1a1a] flex items-center gap-1 text-[11px] font-bold transition-colors cursor-pointer border border-[#ba1a1a]/20"
            >
              <span className="material-symbols-outlined text-[15px]">logout</span>
              <span className="hidden sm:inline">Log Out</span>
            </button>
          )}

          {/* Switch Profile Button */}
          {onSwitchUser && (
            <button
              onClick={onSwitchUser}
              title="Switch Profile / Accounts"
              className="w-8 h-8 rounded-full bg-[#eff4ff] hover:bg-[#dce9ff] text-[#3d4947] hover:text-[#00685f] flex items-center justify-center text-[12px] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">switch_account</span>
            </button>
          )}

          {/* Avatar Button triggers dropdown */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            title={`${displayName} - Account & Profile Menu`}
            className="relative p-0.5 rounded-full bg-[#00685f] hover:ring-2 hover:ring-[#00685f] transition-all cursor-pointer text-white flex items-center justify-center w-8 h-8 font-bold text-[13px]"
          >
            <span>{initial}</span>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#006947] border-2 border-white rounded-full"></span>
          </button>

          {/* Profile Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-11 w-64 bg-white rounded-2xl shadow-xl border border-[#e5eeff] p-3 space-y-2 z-50 text-left animate-in fade-in zoom-in-95 duration-100">
              <div className="p-2.5 bg-[#eff4ff] rounded-xl flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-[15px] flex-shrink-0"
                  style={{ backgroundColor: profile.avatarColor || '#00685f' }}
                >
                  {initial}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[13px] text-[#0b1c30] truncate">{displayName}</div>
                  <div className="text-[11px] text-[#3d4947] truncate">{profile.diabetesType}</div>
                  <div className="text-[10px] text-[#00685f] font-semibold">{profile.age} yrs • {profile.weightKg} kg</div>
                </div>
              </div>

              <div className="space-y-1 pt-1 text-[12px] font-semibold text-[#0b1c30]">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenProfile();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#eff4ff] text-left transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#00685f]">account_circle</span>
                  <span>View Full Profile &amp; Rx</span>
                </button>

                {onSwitchUser && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onSwitchUser();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#eff4ff] text-left transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#4648d4]">switch_account</span>
                    <span>Switch / Manage Profiles</span>
                  </button>
                )}

                {onOpenBackupRestore && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onOpenBackupRestore();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#eff4ff] text-left transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#00685f]">cloud_sync</span>
                    <span>Backup &amp; Restore Data</span>
                  </button>
                )}

                {onOpenAbout && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onOpenAbout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#eff4ff] text-left transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#4648d4]">info</span>
                    <span>About &amp; Usage Guide</span>
                  </button>
                )}

                {onLogout && (
                  <div className="pt-1 border-t border-[#e5eeff]">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#ffdad6] text-[#ba1a1a] text-left transition-colors cursor-pointer font-bold"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      <span>Log Out of Profile</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
