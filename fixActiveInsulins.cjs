const fs = require('fs');
let code = fs.readFileSync('src/components/LogAndDoseView.tsx', 'utf8');

const importRegex = /import \{ INSULIN_DATABASE, getRecommendedDiaForInsulin, getInsulinProfileById \} from '\.\.\/data\/insulinDatabase';/m;
code = code.replace(importRegex, `import { INSULIN_DATABASE, getRecommendedDiaForInsulin, getInsulinProfileById, InsulinProfile } from '../data/insulinDatabase';`);

const profileDestructureRegex = /const \{ profile, glucoseRecords, insulinRecords, onSaveGlucoseAndDose, onSaveQuickInsulin \} = props;/m;
code = code.replace(profileDestructureRegex, `const { profile, glucoseRecords, insulinRecords, onSaveGlucoseAndDose, onSaveQuickInsulin } = props;

  const activeInsulins = useMemo(() => {
    if (profile.activeInsulinIds && profile.activeInsulinIds.length > 0) {
      return profile.activeInsulinIds.map(id => getInsulinProfileById(id)).filter(Boolean) as typeof INSULIN_DATABASE;
    }
    return INSULIN_DATABASE;
  }, [profile.activeInsulinIds]);`);

// Now replace all INSULIN_DATABASE.map(ins => { ... }) with activeInsulins.map(ins => { ... }) in the UI rendering
code = code.replace(/\{INSULIN_DATABASE\.map\(ins => \{/g, `{activeInsulins.map(ins => {`);

fs.writeFileSync('src/components/LogAndDoseView.tsx', code);
