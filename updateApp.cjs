const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// import MealPlannerView
code = code.replace(
  /import \{ AboutGuideView \} from '\.\/components\/AboutGuideView';/m,
  `import { AboutGuideView } from './components/AboutGuideView';\nimport { MealPlannerView } from './components/MealPlannerView';`
);

// add meal-plan view block
code = code.replace(
  /\{activeTab === 'about' && \(/m,
  `{activeTab === 'meal-plan' && (
          <MealPlannerView
            profile={profile}
            onOpenParameterModal={() => setShowEditParameters(true)}
          />
        )}

        {activeTab === 'about' && (`
);

fs.writeFileSync('src/App.tsx', code);
