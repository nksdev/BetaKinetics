const fs = require('fs');
let code = fs.readFileSync('src/components/EditParametersModal.tsx', 'utf8');

const brokenBlockRegex = /const regimenDose = insulinRegimen\.find\(r => r\.insulinId === insId && r\.slot === slot\.id\);\s*return \(\s*<div key=\{slot\.id\}[\s\S]*?onChange=\{\(e\) => handleUpdateRegimenDose\(insId, slot\.id, Number\(e\.target\.value\)\)\}\s*\/>\s*<\/div>\s*\)\}\s*<\/div>\s*\);/m;

code = code.replace(brokenBlockRegex, `return (
                    <button
                      key={ins.id}
                      type="button"
                      onClick={() => handleToggleInsulinInRegimen(ins.id)}
                      className={\`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer \${
                        isSelected
                          ? 'bg-[#00685f] text-white shadow-2xs'
                          : 'bg-[#eff4ff] text-[#3d4947] hover:bg-[#e5eeff]'
                      }\`}
                    >
                      <span>{ins.name}</span>
                      <span className="text-[9px] opacity-80">({insDia}h)</span>
                      {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
                    </button>
                  );`);

fs.writeFileSync('src/components/EditParametersModal.tsx', code);
