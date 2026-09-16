import React, { useState } from 'react';
import { PatientProfile } from '../types';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
}

interface ChatbotSetupModalProps {
  currentProfile: PatientProfile;
  isOpen: boolean;
  onClose: () => void;
  onSaveProfile: (newProfile: PatientProfile) => void;
}

export const ChatbotSetupModal: React.FC<ChatbotSetupModalProps> = ({
  currentProfile,
  isOpen,
  onClose,
  onSaveProfile
}) => {
  const [step, setStep] = useState<number>(0);
  const [draft, setDraft] = useState<Partial<PatientProfile>>({
    name: currentProfile.name || 'Alex Mercer',
    age: currentProfile.age || 28,
    weightKg: currentProfile.weightKg || 72,
    diabetesType: 'Type 1 Diabetes',
    monitoringMethod: currentProfile.monitoringMethod || 'Manual Fingerstick BGM',
    bgmDevice: currentProfile.bgmDevice || 'Manual Fingerstick BGM',
    primaryInsulin: currentProfile.primaryInsulin || 'Mixtard 30',
    morningDose: currentProfile.morningDose || 20,
    nightDose: currentProfile.nightDose || 20,
    targetGlucose: currentProfile.targetGlucose || 110,
    insulinSensitivityFactor: currentProfile.insulinSensitivityFactor || 40,
    insulinToCarbRatio: currentProfile.insulinToCarbRatio || 10,
    activeDurationHours: currentProfile.activeDurationHours || 4.5,
    hypoLimit: currentProfile.hypoLimit || 70,
    careMode: 'Self-Managed T1D'
  });

  const [inputVal, setInputVal] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'bot',
      text: 'Hello, I am your BetaKinetics Setup Assistant. I will guide you step-by-step through configuring your Type 1 Diabetes profile and personal target parameters. What is your age and weight in kg?',
      timestamp: 'Just now'
    }
  ]);

  if (!isOpen) return null;

  const stepsMeta = [
    {
      prompt: 'What is your age and weight (kg)?',
      example: 'e.g. 28, 72kg',
      process: (val: string) => {
        const nums = val.match(/\d+/g);
        if (!nums || nums.length < 2) {
          return { error: 'Please provide both age and weight in kg (e.g. 28, 72)' };
        }
        setDraft(prev => ({ ...prev, age: parseInt(nums[0]), weightKg: parseInt(nums[1]) }));
        return {
          reply: `Recorded: Age ${nums[0]} years, Weight ${nums[1]} kg. Next: Can you confirm you have Type 1 Diabetes?`
        };
      }
    },
    {
      prompt: 'Confirm Diabetes type (Type 1 Diabetes)',
      example: 'Type 1',
      process: (val: string) => {
        if (!val.toLowerCase().includes('type 1') && !val.toLowerCase().includes('t1d') && !val.toLowerCase().includes('yes')) {
          return { error: 'This decision-support engine is strictly calibrated for Type 1 Diabetes. Please confirm Type 1.' };
        }
        setDraft(prev => ({ ...prev, diabetesType: 'Type 1 Diabetes' }));
        return {
          reply: 'Confirmed Type 1 Diabetes. How do you check your blood glucose? (e.g. Manual Fingerstick BGM, Accu-Chek, OneTouch, Contour Next)'
        };
      }
    },
    {
      prompt: 'Blood glucose testing method',
      example: 'Manual Fingerstick BGM',
      process: (val: string) => {
        if (!val.trim()) return { error: 'Please enter your testing method (e.g. Manual Fingerstick BGM)' };
        setDraft(prev => ({ ...prev, monitoringMethod: val.trim(), bgmDevice: val.trim() }));
        return {
          reply: `Testing recorded as ${val.trim()}. What primary insulin do you currently take? (e.g. Mixtard 30, Actrapid, Novorapid, Lantus)`
        };
      }
    },
    {
      prompt: 'Primary prescribed insulin formulation',
      example: 'Mixtard 30',
      process: (val: string) => {
        if (!val.trim()) return { error: 'Please enter your insulin formulation.' };
        setDraft(prev => ({ ...prev, primaryInsulin: val.trim() }));
        return {
          reply: `Prescribed: ${val.trim()}. What is your scheduled insulin dose? (e.g., Morning 20 units, Night 20 units)`
        };
      }
    },
    {
      prompt: 'Insulin schedule & normal doses',
      example: 'Morning 20u, Night 20u',
      process: (val: string) => {
        const nums = val.match(/\d+/g);
        const morning = nums && nums[0] ? parseInt(nums[0]) : 20;
        const night = nums && nums[1] ? parseInt(nums[1]) : 20;
        setDraft(prev => ({ ...prev, morningDose: morning, nightDose: night }));
        return {
          reply: `Recorded regimen: ${morning}u Morning, ${night}u Night. Now for clinical safety parameters: What is your clinician-configured Target Blood Glucose? (e.g. 110 mg/dL)`
        };
      }
    },
    {
      prompt: 'Target Blood Glucose (mg/dL)',
      example: '110',
      process: (val: string) => {
        const num = parseInt(val);
        if (isNaN(num) || num < 70 || num > 200) {
          return { error: 'Target glucose must be a valid number between 70 and 200 mg/dL. The system cannot guess missing parameters.' };
        }
        setDraft(prev => ({ ...prev, targetGlucose: num }));
        return {
          reply: `Target Blood Glucose set to ${num} mg/dL. What is your target Insulin Sensitivity Factor (ISF)? (How many mg/dL does 1 unit drop your glucose? e.g. 40)`
        };
      }
    },
    {
      prompt: 'Insulin Sensitivity Factor (ISF in mg/dL per unit)',
      example: '40',
      process: (val: string) => {
        const num = parseInt(val);
        if (isNaN(num) || num <= 5 || num > 250) {
          return { error: 'ISF must be between 5 and 250 mg/dL per unit. Missing ISF halts calculation safety.' };
        }
        setDraft(prev => ({ ...prev, insulinSensitivityFactor: num }));
        return {
          reply: `ISF set to 1u : ${num} mg/dL. What is your Insulin-to-Carb Ratio (ICR)? (How many grams of carbs does 1 unit cover? e.g. 10)`
        };
      }
    },
    {
      prompt: 'Insulin-to-Carb Ratio (ICR in grams per unit)',
      example: '10',
      process: (val: string) => {
        const num = parseInt(val);
        if (isNaN(num) || num <= 1 || num > 100) {
          return { error: 'ICR must be a valid ratio between 1 and 100g per unit.' };
        }
        setDraft(prev => ({ ...prev, insulinToCarbRatio: num }));
        return {
          reply: `ICR set to 1u : ${num}g carbs. What is your Active Insulin Duration (DIA) in hours? (e.g. 4.5)`
        };
      }
    },
    {
      prompt: 'Active Insulin Duration (DIA in hours)',
      example: '4.5',
      process: (val: string) => {
        const num = parseFloat(val);
        if (isNaN(num) || num < 2 || num > 8) {
          return { error: 'DIA must be between 2 and 8 hours to calculate anti-stacking IOB decay safely.' };
        }
        setDraft(prev => ({ ...prev, activeDurationHours: num }));
        return {
          reply: `Active Insulin Duration set to ${num} hours. Finally, what is your hypoglycemia safety limit? (e.g. 70 mg/dL)`
        };
      }
    },
    {
      prompt: 'Hypoglycemia safety limit (mg/dL)',
      example: '70',
      process: (val: string) => {
        const num = parseInt(val);
        if (isNaN(num) || num < 50 || num > 90) {
          return { error: 'Hypo limit must be between 50 and 90 mg/dL (standard is 70 mg/dL).' };
        }
        setDraft(prev => ({ ...prev, hypoLimit: num }));
        return {
          reply: `Safety configuration complete! All required parameters verified. You can now save your profile to local storage.`
        };
      }
    }
  ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userText = inputVal.trim();
    setInputVal('');

    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: 'Just now'
    };

    setMessages(prev => [...prev, userMsg]);

    const currentStepConfig = stepsMeta[step];
    if (currentStepConfig) {
      const result = currentStepConfig.process(userText);
      if ('error' in result && result.error) {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'bot',
            text: `⚠️ Safety Check: ${result.error}`,
            timestamp: 'Just now'
          }
        ]);
      } else {
        setStep(prev => prev + 1);
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'bot',
            text: ('reply' in result ? result.reply : undefined) || 'Step verified.',
            timestamp: 'Just now'
          }
        ]);
      }
    }
  };

  const handleCompleteAndSave = () => {
    onSaveProfile({
      ...currentProfile,
      ...draft
    } as PatientProfile);
    onClose();
  };

  const isCompleted = step >= stepsMeta.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#eff4ff] border-b border-[#e5eeff] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#00685f] text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">smart_toy</span>
            </div>
            <div>
              <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[15px] text-[#0b1c30]">
                Step 1: Patient Setup Assistant
              </h3>
              <p className="text-[11px] text-[#3d4947]">
                Step {Math.min(step + 1, stepsMeta.length)} of {stepsMeta.length} • Strict Clinical Safety
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white text-[#3d4947] hover:bg-[#e5eeff] flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Message Flow */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-[13px] leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#00685f] text-white rounded-br-none'
                    : 'bg-[#eff4ff] text-[#0b1c30] rounded-bl-none border border-[#e5eeff]'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isCompleted && (
            <div className="p-4 bg-[#006947]/10 rounded-2xl border border-[#006947]/20 space-y-2">
              <div className="flex items-center gap-2 text-[#006947] font-bold text-[13px]">
                <span className="material-symbols-outlined text-[20px]">verified</span>
                <span>Profile Parameters Fully Calibrated</span>
              </div>
              <p className="text-[12px] text-[#3d4947]">
                Ready to commit: Target {draft.targetGlucose} mg/dL, ISF 1:{draft.insulinSensitivityFactor}, ICR 1:{draft.insulinToCarbRatio}g, DIA {draft.activeDurationHours}h.
              </p>
              <button
                onClick={handleCompleteAndSave}
                className="w-full py-2.5 rounded-full bg-[#00685f] hover:bg-[#005049] text-white font-bold text-[13px] shadow-sm cursor-pointer"
              >
                Save &amp; Activate Clinical Protocol
              </button>
            </div>
          )}
        </div>

        {/* Input Bar */}
        {!isCompleted ? (
          <form onSubmit={handleSend} className="p-3 bg-[#eff4ff] border-t border-[#e5eeff] flex gap-2">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={stepsMeta[step]?.example || 'Type your response...'}
              className="flex-1 px-4 py-2.5 rounded-full bg-white border border-[#e5eeff] text-[#0b1c30] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#00685f]"
              autoFocus
            />
            <button
              type="submit"
              className="w-10 h-10 rounded-full bg-[#00685f] text-white flex items-center justify-center cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </form>
        ) : (
          <div className="p-3 bg-[#eff4ff] border-t border-[#e5eeff] flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-white text-[#3d4947] text-[12px] font-semibold border border-[#e5eeff] cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
