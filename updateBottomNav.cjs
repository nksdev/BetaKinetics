const fs = require('fs');
let code = fs.readFileSync('src/components/BottomNav.tsx', 'utf8');

code = code.replace(
  /export type TabKey = 'dashboard' \| 'log-and-dose' \| 'analytics' \| 'insulin-iob' \| 'profile-rx' \| 'about';/m,
  `export type TabKey = 'dashboard' | 'log-and-dose' | 'analytics' | 'insulin-iob' | 'meal-plan' | 'profile-rx' | 'about';`
);

// We'll replace 'about' in the bottom nav with 'meal-plan' but keep 'about' as an accessible tab from Profile header.
code = code.replace(
  /\{ key: 'about', label: 'About', icon: 'info' \}/m,
  `{ key: 'meal-plan', label: 'Diet', icon: 'restaurant_menu' }`
);

// Add max-w to handle 6 tabs if we replace about, it stays 6 tabs.
// Just to be safe, change max-w-[72px] to max-w-[64px]
code = code.replace(/max-w-\[72px\]/g, 'max-w-[64px]');

fs.writeFileSync('src/components/BottomNav.tsx', code);
