const fs = require('fs');
let code = fs.readFileSync('src/components/LogAndDoseView.tsx', 'utf8');

const regex = /const \[mode, setMode\] = useState<'calc' \| 'quick'>\(initialMode\);/m;

code = code.replace(regex, `const activeInsulins = useMemo(() => {
    if (profile.activeInsulinIds && profile.activeInsulinIds.length > 0) {
      return profile.activeInsulinIds.map(id => getInsulinProfileById(id)).filter(Boolean) as typeof INSULIN_DATABASE;
    }
    return INSULIN_DATABASE;
  }, [profile.activeInsulinIds]);

  const [mode, setMode] = useState<'calc' | 'quick'>(initialMode);`);

fs.writeFileSync('src/components/LogAndDoseView.tsx', code);
