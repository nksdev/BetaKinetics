const fs = require('fs');
let code = fs.readFileSync('src/components/EditParametersModal.tsx', 'utf8');

// We need to add state for `insulinRegimen`
code = code.replace(
  /const \[schedules, setSchedules\].*?\n[\s\S]*?\}\);/m,
  `const [schedules, setSchedules] = useState<InsulinScheduleItem[]>(() => {
    if (profile.insulinSchedules && profile.insulinSchedules.length > 0) {
      return profile.insulinSchedules;
    }
    const initialIds = profile.activeInsulinIds && profile.activeInsulinIds.length > 0
      ? profile.activeInsulinIds
      : ['actrapid', 'mixtard_30'];
    return getDefaultSchedulesForInsulins(initialIds);
  });

  const [insulinRegimen, setInsulinRegimen] = useState<any[]>(profile.insulinRegimen || []);
  `
);

// handleToggleSlotForInsulin
code = code.replace(
  /const handleToggleSlotForInsulin = [\s\S]*?\}\);/m,
  `const handleToggleSlotForInsulin = (insulinId: string, slotId: string) => {
    setSchedules(prev => {
      const existing = prev.find(s => s.insulinId === insulinId);
      if (!existing) {
        return [...prev, { insulinId, slots: [slotId] }];
      }
      const hasSlot = existing.slots.includes(slotId);
      const updatedSlots = hasSlot
        ? existing.slots.filter(s => s !== slotId)
        : [...existing.slots, slotId];
      return prev.map(s => (s.insulinId === insulinId ? { ...s, slots: updatedSlots } : s));
    });
    
    // Also manage regimen array
    setInsulinRegimen(prev => {
      const existing = prev.find(r => r.insulinId === insulinId && r.slot === slotId);
      if (existing) {
        return prev.filter(r => r.id !== existing.id);
      } else {
        return [...prev, { id: \`\${insulinId}_\${slotId}\`, insulinId, slot: slotId as any, doseUnits: 0 }];
      }
    });
  };

  const handleUpdateRegimenDose = (insulinId: string, slotId: string, dose: number) => {
    setInsulinRegimen(prev => 
      prev.map(r => r.insulinId === insulinId && r.slot === slotId ? { ...r, doseUnits: dose } : r)
    );
  };`
);

// inside handleSubmit
code = code.replace(
  /activeInsulinIds,\n\s*insulinSchedules: schedules/m,
  `activeInsulinIds,
      insulinSchedules: schedules,
      insulinRegimen: insulinRegimen`
);

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
