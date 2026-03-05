import React, { useState, useRef, useEffect, UIEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Camera,
  Droplets,
  Scale,
  Leaf,
  Sparkles,
  Bone,
  Target,
  Shield,
  Dumbbell,
  HeartPulse,
  Baby,
  Sun,
  Bell,
  Check
} from "lucide-react";
import { Toaster, toast } from "sonner";
import exampleImage from "figma:asset/a51e537b5d3f840e68e630f7c2d13e19c0b5031f.png";

const commonBreeds = [
  "英国短毛猫",
  "布偶猫",
  "橘猫 (田园猫)",
  "美国短毛猫",
  "暹罗猫",
  "加菲猫",
  "金吉拉",
  "狮子猫",
  "缅因猫",
  "其他",
];

const healthNeedsList = [
  { id: 'urinary', label: '泌尿道健康', desc: '减少泌尿结石风险，促进饮水', icon: Droplets, color: 'text-blue-500' },
  { id: 'weight_management', label: '体重管理', desc: '控制卡路里，保持健康体型', icon: Scale, color: 'text-orange-500' },
  { id: 'digestion', label: '消化敏感', desc: '温和配方，减少肠胃不适', icon: Leaf, color: 'text-green-500' },
  { id: 'coat', label: '皮毛养护', desc: 'Omega-3 丰富，亮泽毛发', icon: Sparkles, color: 'text-yellow-500' },
  { id: 'joints', label: '关节健康', desc: '适合中老年猫，支持关节灵活', icon: Bone, color: 'text-slate-400' },
  { id: 'picky', label: '挑食猫咪', desc: '口味多样，提升进食意愿', icon: Target, color: 'text-red-500' },
  { id: 'allergy', label: '过敏体质', desc: '有限食材，降低过敏风险', icon: Shield, color: 'text-rose-400' },
  { id: 'weight_gain', label: '增重/营养', desc: '高蛋白高热量，适合偏瘦/术后猫', icon: Dumbbell, color: 'text-orange-600' },
  { id: 'senior', label: '老年猫护理', desc: '低磷易消化，支持老年健康', icon: HeartPulse, color: 'text-purple-500' },
  { id: 'kitten', label: '幼猫发育', desc: '高蛋白高热量，促进健康成长', icon: Baby, color: 'text-cyan-500' },
  { id: 'daily', label: '日常均衡', desc: '无特殊需求，全面营养均衡', icon: Sun, color: 'text-yellow-600' },
];

// Sub-component: Bottom Sheet Container
const BottomSheet = ({ isOpen, onClose, title, children, onConfirm }: any) => {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 transition-transform duration-300 transform pb-safe flex flex-col ${isOpen ? "translate-y-0" : "translate-y-full"}`}
        style={{ maxHeight: "80vh" }}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="text-[15px] text-gray-500 px-2 py-1 active:opacity-70 transition-opacity"
          >
            取消
          </button>
          <h3 className="text-[16px] font-medium text-gray-900">
            {title}
          </h3>
          <button
            onClick={onConfirm || onClose}
            className="text-[15px] text-orange-500 font-medium px-2 py-1 active:opacity-70 transition-opacity"
          >
            确定
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
};

// Sub-component: Wheel Picker Column (For Date Picker)
const WheelPickerColumn = ({ options, value, onChange, label }: any) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 44; // px

  useEffect(() => {
    if (containerRef.current) {
      const index = options.findIndex((o: any) => o.value === value);
      if (index !== -1) {
        containerRef.current.scrollTop = index * itemHeight;
      }
    }
  }, [value, options]);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    const index = Math.round(top / itemHeight);
    if (options[index] && options[index].value !== value) {
      onChange(options[index].value);
    }
  };

  return (
    <div className="relative flex-1 h-[220px] overflow-hidden bg-white">
      <div className="absolute top-1/2 left-0 right-0 h-[44px] -mt-[22px] bg-gray-50 pointer-events-none rounded-md mx-2" />
      <div
        ref={containerRef}
        className="h-full overflow-y-auto snap-y snap-mandatory relative z-10 no-scrollbar"
        onScroll={handleScroll}
        style={{ scrollBehavior: "smooth" }}
      >
        <div style={{ height: 88 }} />
        {options.map((opt: any) => (
          <div
            key={opt.value}
            className={`h-[44px] flex items-center justify-center snap-center transition-colors duration-200 ${opt.value === value ? "text-gray-900 font-medium text-[17px]" : "text-gray-400 text-[15px]"}`}
          >
            {opt.label}
            {label}
          </div>
        ))}
        <div style={{ height: 88 }} />
      </div>
      <div className="absolute top-0 left-0 right-0 h-[88px] bg-gradient-to-b from-white to-transparent pointer-events-none z-20" />
      <div className="absolute bottom-0 left-0 right-0 h-[88px] bg-gradient-to-t from-white to-transparent pointer-events-none z-20" />
    </div>
  );
};

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>(['weight_gain', 'weight_management', 'joints']);
  const [otherNeeds, setOtherNeeds] = useState('');

  const [formData, setFormData] = useState({
    avatar: exampleImage,
    name: "",
    breed: "",
    birthYear: null as number | null,
    birthMonth: null as number | null,
    birthDay: null as number | null,
    weight: null as number | null,
    gender: null as string | null,
    neutered: null as boolean | null,
  });

  const [activePicker, setActivePicker] = useState<
    "none" | "birthday" | "weight" | "breed"
  >("none");

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setFormData({ ...formData, avatar: url });
    }
  };

  // Temp states
  const [tempDate, setTempDate] = useState({ year: 2024, month: 1, day: 1 });
  useEffect(() => {
    if (activePicker === "birthday") {
      setTempDate({
        year: formData.birthYear || 2024,
        month: formData.birthMonth || 1,
        day: formData.birthDay || 1,
      });
    }
  }, [activePicker, formData]);

  const handleConfirmBirthday = () => {
    setFormData({
      ...formData,
      birthYear: tempDate.year,
      birthMonth: tempDate.month,
      birthDay: tempDate.day,
    });
    setActivePicker("none");
  };

  const [tempWeight, setTempWeight] = useState(4.5);
  useEffect(() => {
    if (activePicker === "weight") {
      setTempWeight(formData.weight || 4.5);
    }
  }, [activePicker, formData]);

  const handleConfirmWeight = () => {
    setFormData({ ...formData, weight: tempWeight });
    setActivePicker("none");
  };

  const getMissingFields = () => {
    const missing = [];
    if (!formData.name.trim()) missing.push("名字");
    if (!formData.breed) missing.push("品种");
    if (!formData.birthYear) missing.push("出生日期");
    if (!formData.weight) missing.push("体重");
    if (!formData.gender) missing.push("性别");
    if (formData.neutered === null) missing.push("绝育状态");
    return missing;
  };

  const missingFields = getMissingFields();
  const isValid = missingFields.length === 0;

  const handleNext = () => {
    if (!isValid) {
      toast.error(`请补充必填项：${missingFields.join("、")}`);
      return;
    }
    setStep(2);
    window.scrollTo(0, 0);
  };

  const toggleNeed = (id: string) => {
    if (id === 'daily') {
      setSelectedNeeds(selectedNeeds.includes('daily') ? [] : ['daily']);
      return;
    }
    let newNeeds = selectedNeeds.filter(n => n !== 'daily');
    if (newNeeds.includes(id)) {
      newNeeds = newNeeds.filter(n => n !== id);
    } else {
      newNeeds.push(id);
    }
    setSelectedNeeds(newNeeds);
  };

  const currentYear = new Date().getFullYear();
  const age = formData.birthYear ? currentYear - formData.birthYear : 0;
  const ageStr = age > 0 ? `${age}岁` : '不满1岁';
  const getNeedLabel = (id: string) => healthNeedsList.find(n => n.id === id)?.label || id;

  return (
    <div className="min-h-screen bg-[#f5f6f9] text-gray-800 font-sans pb-28">
      <Toaster position="top-center" />
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 1rem); }
      `,
        }}
      />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#f5f6f9] sticky top-0 z-10">
        <button 
          onClick={() => step === 2 ? setStep(1) : null}
          className={`p-2 -ml-2 text-gray-800 active:opacity-70 transition-opacity ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[17px] font-medium text-gray-900">
          {step === 1 ? '基本信息' : '健康需求'}
        </h1>
        <div className="w-10"></div>
      </header>

      <main className={`px-4 py-2 max-w-md mx-auto ${step === 2 ? 'pb-10' : 'space-y-4'}`}>
        {/* Progress Top Bar */}
        <div className="flex justify-center items-center space-x-2 py-2 mb-2">
          <div 
            className={`flex items-center space-x-1.5 ${step === 2 ? 'opacity-100 cursor-pointer active:opacity-70' : ''}`} 
            onClick={() => step === 2 && setStep(1)}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-medium ${step === 2 ? 'bg-orange-50 text-orange-500 border border-orange-500' : 'bg-orange-500 text-white shadow-sm'}`}>
              {step === 2 ? <Check size={14} /> : '1'}
            </div>
            <span className={`text-[12px] font-medium ${step === 2 ? 'text-gray-900' : 'text-orange-500'}`}>基本信息</span>
          </div>
          <div className={`w-8 h-[1px] ${step === 2 ? 'bg-orange-300' : 'bg-gray-300'}`}></div>
          <div className={`flex items-center space-x-1.5 ${step === 1 ? 'opacity-50' : 'opacity-100'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-medium ${step === 2 ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-200 text-gray-500'}`}>2</div>
            <span className={`text-[12px] font-medium ${step === 2 ? 'text-orange-500' : 'text-gray-500'}`}>健康需求</span>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            {/* Info Card 0: Avatar */}
            <div
              className="bg-white rounded-2xl px-5 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.02)] cursor-pointer active:bg-gray-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="py-3 flex items-center justify-between">
                <span className="text-gray-900 text-[15px] min-w-[70px]">头像</span>
                <div className="flex-1 flex items-center justify-end">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="头像" className="w-[48px] h-[48px] rounded-full object-cover shadow-sm" />
                  ) : (
                    <div className="w-[48px] h-[48px] rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                      <Camera size={20} />
                    </div>
                  )}
                  <ChevronRight size={18} className="text-gray-400 ml-1" />
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
            </div>

            {/* Info Card 1: Text Fields */}
            <div className="bg-white rounded-2xl px-5 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                <span className="text-gray-900 text-[15px] min-w-[70px]">名字<span className="text-red-500 ml-1">*</span></span>
                <input
                  type="text"
                  placeholder="请填写猫咪名字"
                  className="flex-1 text-right outline-none text-[15px] text-gray-900 placeholder-gray-300 bg-transparent"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0 active:bg-gray-50 transition-colors cursor-pointer" onClick={() => setActivePicker("breed")}>
                <span className="text-gray-900 text-[15px] min-w-[70px]">品种<span className="text-red-500 ml-1">*</span></span>
                <div className="flex-1 flex items-center justify-end text-[15px]">
                  {formData.breed ? <span className="text-gray-900">{formData.breed}</span> : <span className="text-gray-300">请选择品种</span>}
                  <ChevronRight size={18} className="text-gray-400 ml-1" />
                </div>
              </div>
            </div>

            {/* Info Card 2: Selectable Fields */}
            <div className="bg-white rounded-2xl px-5 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0 active:bg-gray-50 transition-colors cursor-pointer" onClick={() => setActivePicker("birthday")}>
                <span className="text-gray-900 text-[15px] min-w-[70px]">出生日期<span className="text-red-500 ml-1">*</span></span>
                <div className="flex-1 flex items-center justify-end text-[15px]">
                  <span className={formData.birthYear ? "text-gray-900" : "text-gray-300"}>
                    {formData.birthYear ? `${formData.birthYear}年${formData.birthMonth}月${formData.birthDay}日` : "请选择出生日期"}
                  </span>
                  <ChevronRight size={18} className="text-gray-400 ml-1" />
                </div>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0 active:bg-gray-50 transition-colors cursor-pointer" onClick={() => setActivePicker("weight")}>
                <span className="text-gray-900 text-[15px] min-w-[70px]">体重<span className="text-red-500 ml-1">*</span></span>
                <div className="flex-1 flex items-center justify-end text-[15px]">
                  <span className={formData.weight !== null ? "text-gray-900" : "text-gray-300"}>
                    {formData.weight !== null ? `${formData.weight.toFixed(1)} kg` : "请选择体重"}
                  </span>
                  <ChevronRight size={18} className="text-gray-400 ml-1" />
                </div>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                <span className="text-gray-900 text-[15px] min-w-[70px]">性别<span className="text-red-500 ml-1">*</span></span>
                <div className="flex items-center justify-end space-x-6 flex-1">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-5 h-5">
                      <input type="radio" name="gender" className="peer sr-only" checked={formData.gender === "male"} onChange={() => setFormData({ ...formData, gender: "male" })} />
                      <div className="w-5 h-5 rounded-full border border-gray-300 peer-checked:border-orange-500 peer-checked:border-[6px] transition-all duration-200 bg-white"></div>
                    </div>
                    <span className="text-[15px] text-gray-800">公猫</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-5 h-5">
                      <input type="radio" name="gender" className="peer sr-only" checked={formData.gender === "female"} onChange={() => setFormData({ ...formData, gender: "female" })} />
                      <div className="w-5 h-5 rounded-full border border-gray-300 peer-checked:border-orange-500 peer-checked:border-[6px] transition-all duration-200 bg-white"></div>
                    </div>
                    <span className="text-[15px] text-gray-800">母猫</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                <div className="flex flex-col min-w-[70px]">
                  <span className="text-gray-900 text-[15px]">绝育状态<span className="text-red-500 ml-1">*</span></span>
                  <span className="text-[11px] text-gray-400 mt-0.5">影响热量需求</span>
                </div>
                <div className="flex items-center justify-end space-x-6 flex-1">
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-5 h-5">
                      <input type="radio" name="neutered" className="peer sr-only" checked={formData.neutered === true} onChange={() => setFormData({ ...formData, neutered: true })} />
                      <div className="w-5 h-5 rounded-full border border-gray-300 peer-checked:border-orange-500 peer-checked:border-[6px] transition-all duration-200 bg-white"></div>
                    </div>
                    <span className="text-[15px] text-gray-800">已绝育</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-5 h-5">
                      <input type="radio" name="neutered" className="peer sr-only" checked={formData.neutered === false} onChange={() => setFormData({ ...formData, neutered: false })} />
                      <div className="w-5 h-5 rounded-full border border-gray-300 peer-checked:border-orange-500 peer-checked:border-[6px] transition-all duration-200 bg-white"></div>
                    </div>
                    <span className="text-[15px] text-gray-800">未绝育</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 mt-4">
            {/* Cat Summary Card */}
            <div className="bg-orange-50 rounded-2xl p-4 flex items-center space-x-3.5 border border-orange-100/50 shadow-sm">
              <img src={formData.avatar || exampleImage} alt="头像" className="w-[48px] h-[48px] rounded-full object-cover shadow-sm border border-white" />
              <div>
                <h3 className="font-bold text-[16px] text-gray-900">{formData.name || '猫咪'}</h3>
                <p className="text-[12px] text-gray-500 mt-1">
                  {formData.breed || '未知品种'} · {ageStr} · {formData.weight ? `${formData.weight}kg` : '未知体重'} · {formData.gender === 'male' ? '公猫' : formData.gender === 'female' ? '母猫' : '未知性别'} · {formData.neutered === true ? '已绝育' : formData.neutered === false ? '未绝育' : '未知状态'}
                </p>
              </div>
            </div>

            {/* Title */}
            <div>
              <h2 className="text-[20px] font-bold text-gray-900 leading-tight">{formData.name || '猫咪'}有哪些健康需求？</h2>
              <p className="text-[13px] text-gray-500 mt-1.5">可多选，选"日常均衡"代表无特殊需求</p>
            </div>

            {/* Alert Banner */}
            <div className="bg-amber-50/80 rounded-xl p-3 flex items-center space-x-2 text-amber-700 text-[13px] border border-amber-100">
              <Bell size={16} className="shrink-0" />
              <span>已加载上次的健康需求，请确认是否有变化</span>
            </div>

            {/* Needs Grid */}
            <div className="grid grid-cols-2 gap-3">
              {healthNeedsList.map(need => {
                const isSelected = selectedNeeds.includes(need.id);
                const Icon = need.icon;
                return (
                  <div 
                    key={need.id}
                    onClick={() => toggleNeed(need.id)} 
                    className={`relative rounded-xl p-3.5 border transition-all cursor-pointer ${isSelected ? 'border-orange-500 bg-orange-50/50 shadow-[0_2px_10px_rgba(249,115,22,0.08)]' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                  >
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-[22px] h-[22px] bg-orange-500 rounded-full flex items-center justify-center shadow-sm">
                        <Check size={14} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm mb-2 ${isSelected ? 'border border-orange-100' : 'border border-gray-100'}`}>
                      <Icon size={18} className={need.color} />
                    </div>
                    <h4 className={`font-medium text-[14px] mt-1 ${isSelected ? 'text-orange-900' : 'text-gray-900'}`}>{need.label}</h4>
                    <p className="text-[11px] text-gray-500 mt-1 leading-[1.4] line-clamp-2">{need.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Text Area */}
            <div className="pt-2">
              <h3 className="text-[14px] font-medium text-gray-900 mb-2.5">其他需求或症状描述 <span className="text-gray-400 font-normal text-[12px] ml-1">(选填)</span></h3>
              <textarea 
                value={otherNeeds}
                onChange={(e) => setOtherNeeds(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all min-h-[100px] resize-none placeholder-gray-400" 
                placeholder="例如：最近总是呕吐、喝水很少、便秘、不爱吃干粮..."
              />
            </div>

            {/* Selected Summary Card */}
            <div className="bg-white border border-orange-100 rounded-xl p-4 mt-2">
              <div className="text-[13px] text-gray-600 mb-3">已选择 {selectedNeeds.length} 项需求：</div>
              {selectedNeeds.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedNeeds.map(id => (
                    <span key={id} className="px-3 py-1.5 bg-white border border-orange-200 text-orange-600 rounded-full text-[12px] font-medium">
                      {getNeedLabel(id)}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-[13px] text-gray-400 italic">尚未选择任何需求</div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Action Area */}
      {step === 1 ? (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 z-10">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleNext}
              className={`w-full font-medium text-[16px] py-3.5 rounded-full transition-all flex items-center justify-center ${isValid ? "bg-orange-500 text-white shadow-[0_4px_14px_rgba(249,115,22,0.3)] hover:bg-orange-600 active:scale-[0.98]" : "bg-orange-300 text-white/90 cursor-not-allowed"}`}
            >
              下一步：选择健康需求
              <ChevronRight size={18} className="ml-1 opacity-80" />
            </button>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 z-10">
          <div className="max-w-md mx-auto flex space-x-3">
            <button 
              onClick={() => { setStep(1); window.scrollTo(0,0); }}
              className="w-[120px] bg-white text-gray-700 font-medium text-[16px] py-3.5 rounded-full border border-gray-200 active:bg-gray-50 transition-colors flex justify-center items-center shrink-0"
            >
              &larr; 返回
            </button>
            <button 
              onClick={() => toast.success('专属方案正在生成中...')}
              className="flex-1 bg-orange-500 text-white font-medium text-[16px] py-3.5 rounded-full shadow-[0_4px_14px_rgba(249,115,22,0.3)] hover:bg-orange-600 active:scale-[0.98] transition-all flex items-center justify-center"
            >
              <Sparkles size={18} className="mr-1.5" />
              为我生成专属方案
            </button>
          </div>
        </div>
      )}

      {/* --- Modals / Pickers --- */}

      <BottomSheet isOpen={activePicker === "breed"} onClose={() => setActivePicker("none")} title="选择品种">
        <div className="p-4 pt-2 pb-8">
          <div className="relative mb-5">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="搜索品种，例如：英短、橘猫..." className="w-full bg-gray-100 rounded-full py-2.5 pl-10 pr-4 text-[15px] outline-none text-gray-900 placeholder-gray-400 focus:bg-gray-200 transition-colors" />
          </div>
          <div className="flex flex-wrap gap-2.5">
            {commonBreeds.map((b) => (
              <button key={b} className={`px-4 py-2.5 rounded-full text-[14px] transition-all duration-200 border ${formData.breed === b ? "bg-orange-50 border-orange-500 text-orange-600 font-medium shadow-sm" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`} onClick={() => { setFormData({ ...formData, breed: b }); setActivePicker("none"); }}>
                {b}
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={activePicker === "birthday"} onClose={() => setActivePicker("none")} onConfirm={handleConfirmBirthday} title="选择出生日期">
        <div className="flex px-4 py-2 pb-8">
          <WheelPickerColumn options={Array.from({ length: 30 }, (_, i) => ({ value: 2026 - i, label: `${2026 - i}` }))} value={tempDate.year} onChange={(v: number) => setTempDate({ ...tempDate, year: v })} label="年" />
          <WheelPickerColumn options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}` }))} value={tempDate.month} onChange={(v: number) => setTempDate({ ...tempDate, month: v })} label="月" />
          <WheelPickerColumn options={Array.from({ length: new Date(tempDate.year, tempDate.month, 0).getDate() }, (_, i) => ({ value: i + 1, label: `${i + 1}` }))} value={tempDate.day} onChange={(v: number) => { const maxDays = new Date(tempDate.year, tempDate.month, 0).getDate(); setTempDate({ ...tempDate, day: Math.min(v, maxDays) }); }} label="日" />
        </div>
      </BottomSheet>

      <BottomSheet isOpen={activePicker === "weight"} onClose={() => setActivePicker("none")} onConfirm={handleConfirmWeight} title="选择体重">
        <div className="py-8 px-4 pb-12 flex flex-col items-center">
          <div className="flex items-baseline mb-10">
            <input type="number" className="text-[44px] font-bold text-gray-900 w-32 text-center bg-transparent outline-none border-b-2 border-orange-200 focus:border-orange-500 transition-colors pb-1" value={tempWeight} onChange={(e) => { let val = parseFloat(e.target.value); if (!isNaN(val)) setTempWeight(val); }} step="0.1" />
            <span className="text-[18px] text-gray-500 ml-2 font-medium">kg</span>
          </div>
          <div className="w-full px-4">
            <input type="range" min="0.5" max="30" step="0.1" value={tempWeight} onChange={(e) => setTempWeight(parseFloat(e.target.value)) } className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
            <div className="flex justify-between text-[12px] text-gray-400 mt-3 font-medium">
              <span>0.5 kg</span>
              <span>15 kg</span>
              <span>30 kg</span>
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}