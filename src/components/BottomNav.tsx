import React from 'react';

export type TabKey = 'dashboard' | 'log-and-dose' | 'analytics' | 'insulin-iob' | 'meal-plan' | 'profile-rx' | 'about';

interface BottomNavProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const navItems: { key: TabKey; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Home', icon: 'monitor_heart' },
    { key: 'log-and-dose', label: 'Log & Dose', icon: 'calculate' },
    { key: 'analytics', label: 'Analytics', icon: 'insights' },
    { key: 'insulin-iob', label: 'IOB Curve', icon: 'vaccines' },
    { key: 'profile-rx', label: 'Profile', icon: 'tune' },
    { key: 'meal-plan', label: 'Diet', icon: 'restaurant_menu' }
  ];

  return (
    <nav className="fixed bottom-0 w-full z-40 pb-safe bg-[#ffffff]/95 backdrop-blur-xl border-t border-[#e5eeff] shadow-[0_-2px_12px_rgba(11,28,48,0.06)]">
      <div className="flex items-center justify-around h-16 px-0.5 max-w-lg mx-auto">
        {navItems.map(item => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelectTab(item.key)}
              className={`flex flex-col items-center justify-center flex-1 min-w-0 max-w-[64px] h-12 py-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-[#00685f] font-bold scale-102'
                  : 'text-[#3d4947] hover:text-[#0b1c30]'
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              <span
                className={`text-[10px] leading-tight mt-0.5 tracking-tight truncate max-w-full px-0.5 ${
                  isActive ? 'font-bold text-[#00685f]' : 'font-medium text-[#3d4947]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
