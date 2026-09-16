import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
  variant?: 'compact' | 'banner' | 'default';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false, variant = 'default', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, don't show the install CTA
  if (isInstalled) {
    return null;
  }

  const isCompact = compact || variant === 'compact';
  const isBanner = variant === 'banner';

  const buttonClasses = isBanner
    ? "w-full h-11 rounded-2xl bg-[#00685f] text-white text-[12px] font-bold shadow-xs hover:bg-[#005049] transition-all cursor-pointer flex items-center justify-center gap-1.5"
    : `flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00685f] hover:bg-[#005049] text-white text-[11px] font-bold shadow-xs transition-all active:scale-95 cursor-pointer ${isCompact ? 'text-[10px] px-2 py-1' : ''}`;

  const iosButtonClasses = isBanner
    ? "w-full h-11 rounded-2xl border border-[#00685f]/30 bg-white hover:bg-[#eff4ff] text-[#00685f] text-[12px] font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
    : `flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#00685f]/30 bg-white hover:bg-[#eff4ff] text-[#00685f] text-[11px] font-bold shadow-xs transition-all active:scale-95 cursor-pointer ${isCompact ? 'text-[10px] px-2 py-1' : ''}`;

  return (
    <>
      {isInstallable && (
        <button
          type="button"
          onClick={install}
          className={className || buttonClasses}
          title="Install BetaKinetics T1D as a native desktop or mobile app"
        >
          <span className="material-symbols-outlined text-[15px]">install_mobile</span>
          <span>{isCompact ? 'Install' : 'Install App'}</span>
        </button>
      )}

      {isIOS && !isInstallable && (
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={className || iosButtonClasses}
          title="Install on iPhone / iPad"
        >
          <span className="material-symbols-outlined text-[15px]">ios_share</span>
          <span>{isCompact ? 'Add to Home' : 'Install on iOS'}</span>
        </button>
      )}

      {/* iOS Installation Instruction Sheet */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-[#e5eeff] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#eff4ff] text-[#00685f] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">phone_iphone</span>
                </div>
                <h3 className="text-[16px] font-bold text-[#0b1c30] font-['Plus_Jakarta_Sans',sans-serif]">
                  Install on iOS / Safari
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-8 h-8 rounded-full bg-[#eff4ff] text-[#3d4947] flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-[12px] text-[#3d4947] leading-relaxed">
              To install <strong>BetaKinetics T1D</strong> as a full-screen, standalone app on your iPhone or iPad:
            </p>

            <div className="flex flex-col gap-2.5 text-[12px] text-[#0b1c30]">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#eff4ff]">
                <div className="w-7 h-7 rounded-full bg-white text-[#00685f] font-bold flex items-center justify-center text-[12px] shadow-xs flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  Tap the <strong className="text-[#00685f]">Share</strong> button (<span className="material-symbols-outlined text-[14px] align-middle">ios_share</span>) in Safari’s toolbar.
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#eff4ff]">
                <div className="w-7 h-7 rounded-full bg-white text-[#00685f] font-bold flex items-center justify-center text-[12px] shadow-xs flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  Scroll down and select <strong className="text-[#00685f]">Add to Home Screen</strong> (<span className="material-symbols-outlined text-[14px] align-middle">add_box</span>).
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#eff4ff]">
                <div className="w-7 h-7 rounded-full bg-white text-[#00685f] font-bold flex items-center justify-center text-[12px] shadow-xs flex-shrink-0">
                  3
                </div>
                <div className="flex-1">
                  Tap <strong className="text-[#00685f]">Add</strong> in the top-right corner. BetaKinetics is now installed on your device!
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full h-11 rounded-full bg-[#00685f] text-white text-[12px] font-bold shadow-xs hover:bg-[#005049] transition-all cursor-pointer mt-1"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
