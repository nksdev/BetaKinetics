const fs = require('fs');
let code = fs.readFileSync('src/components/EditParametersModal.tsx', 'utf8');

// Replace the button rendering for slots to include a dose input if assigned
code = code.replace(
  /return \(\n\s*<button[\s\S]*?<\/button>\n\s*\);/g,
  `const regimenDose = insulinRegimen.find(r => r.insulinId === insId && r.slot === slot.id);
                          return (
                            <div key={slot.id} className={\`p-1.5 px-2 rounded-xl text-[11px] font-medium flex flex-col transition-all \${
                                isAssigned
                                  ? 'bg-[#00685f]/10 border border-[#00685f]/30 shadow-2xs'
                                  : 'bg-white text-[#3d4947] hover:bg-[#dce9ff] border border-[#dce9ff]'
                              }\`}>
                              <button
                                type="button"
                                onClick={() => handleToggleSlotForInsulin(insId, slot.id)}
                                className="flex items-center justify-between text-left w-full cursor-pointer"
                              >
                                <div className="truncate">
                                  <span className={\`block font-semibold leading-tight \${isAssigned ? 'text-[#00685f]' : ''}\`}>{slot.shortLabel}</span>
                                  <span className={\`text-[9px] block leading-none mt-0.5 \${isAssigned ? 'text-[#00685f]/80' : 'text-[#3d4947]'}\`}>
                                    {slot.timeHint}
                                  </span>
                                </div>
                                <span className={\`material-symbols-outlined text-[14px] flex-shrink-0 ml-1 \${isAssigned ? 'text-[#00685f]' : ''}\`}>
                                  {isAssigned ? 'check_circle' : 'add_circle'}
                                </span>
                              </button>
                              {isAssigned && (
                                <div className="mt-2 flex items-center gap-1 border-t border-[#00685f]/20 pt-1.5">
                                  <label className="text-[9px] text-[#00685f] font-bold">Dose (u):</label>
                                  <input 
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    className="w-full h-6 px-1.5 rounded-md bg-white border border-[#00685f]/30 text-[#00685f] text-[11px] font-bold"
                                    value={regimenDose?.doseUnits || ''}
                                    onChange={(e) => handleUpdateRegimenDose(insId, slot.id, Number(e.target.value))}
                                  />
                                </div>
                              )}
                            </div>
                          );`
);

fs.writeFileSync('src/components/EditParametersModal.tsx', code);
