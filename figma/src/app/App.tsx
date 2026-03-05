import React, {
  useState,
  useRef,
  useEffect,
  UIEvent,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Camera,
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

// Sub-component: Bottom Sheet Container
const BottomSheet = ({
  isOpen,
  onClose,
  title,
  children,
  onConfirm,
}: any) => {
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
const WheelPickerColumn = ({
  options,
  value,
  onChange,
  label,
}: any) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 44; // px

  useEffect(() => {
    if (containerRef.current) {
      const index = options.findIndex(
        (o: any) => o.value === value,
      );
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
      {/* Selection Highlight */}
      <div className="absolute top-1/2 left-0 right-0 h-[44px] -mt-[22px] bg-gray-50 pointer-events-none rounded-md mx-2" />

      {/* Scroll Container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto snap-y snap-mandatory relative z-10 no-scrollbar"
        onScroll={handleScroll}
        style={{ scrollBehavior: "smooth" }}
      >
        <div style={{ height: 88 }} />{" "}
        {/* Padding top: 2 items */}
        {options.map((opt: any) => (
          <div
            key={opt.value}
            className={`h-[44px] flex items-center justify-center snap-center transition-colors duration-200 ${opt.value === value ? "text-gray-900 font-medium text-[17px]" : "text-gray-400 text-[15px]"}`}
          >
            {opt.label}
            {label}
          </div>
        ))}
        <div style={{ height: 88 }} /> {/* Padding bottom */}
      </div>

      {/* Fading Edges */}
      <div className="absolute top-0 left-0 right-0 h-[88px] bg-gradient-to-b from-white to-transparent pointer-events-none z-20" />
      <div className="absolute bottom-0 left-0 right-0 h-[88px] bg-gradient-to-t from-white to-transparent pointer-events-none z-20" />
    </div>
  );
};

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAvatarChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setFormData({ ...formData, avatar: url });
    }
  };

  // Temp state for Birthday Picker
  const [tempDate, setTempDate] = useState({
    year: 2024,
    month: 1,
    day: 1,
  });
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

  // Temp state for Weight Picker
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
    toast.success("验证通过，进入下一步");
  };

  return (
    <div className="min-h-screen bg-[#f5f6f9] text-gray-800 font-sans pb-28">
      <Toaster position="top-center" />
      {/* Inject custom CSS for scrollbar hiding */}
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
        <button className="p-2 -ml-2 text-gray-800 active:opacity-70 transition-opacity">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[17px] font-medium text-gray-900">
          基本信息
        </h1>
        <div className="w-10"></div>{" "}
        {/* Spacer for centering */}
      </header>

      <main className="px-4 py-2 space-y-4 max-w-md mx-auto">
        {/* Progress Top Bar */}
        <div className="flex justify-center items-center space-x-2 py-2 mb-2">
          <div className="flex items-center space-x-1.5">
            <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-[12px] font-medium shadow-sm">
              1
            </div>
            <span className="text-[12px] text-orange-500 font-medium">
              基本信息
            </span>
          </div>
          <div className="w-8 h-[1px] bg-gray-300"></div>
          <div className="flex items-center space-x-1.5 opacity-50">
            <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[12px] font-medium">
              2
            </div>
            <span className="text-[12px] text-gray-500 font-medium">
              健康需求
            </span>
          </div>
        </div>

        {/* Info Card 0: Avatar */}
        <div
          className="bg-white rounded-2xl px-5 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.02)] cursor-pointer active:bg-gray-50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="py-3 flex items-center justify-between">
            <span className="text-gray-900 text-[15px] min-w-[70px]">
              头像
            </span>
            <div className="flex-1 flex items-center justify-end">
              {formData.avatar ? (
                <img
                  src={formData.avatar}
                  alt="头像"
                  className="w-[48px] h-[48px] rounded-full object-cover shadow-sm"
                />
              ) : (
                <div className="w-[48px] h-[48px] rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                  <Camera size={20} />
                </div>
              )}
              <ChevronRight
                size={18}
                className="text-gray-400 ml-1"
              />
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            className="hidden"
            accept="image/*"
          />
        </div>

        {/* Info Card 1: Text Fields */}
        <div className="bg-white rounded-2xl px-5 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          {/* Name Row */}
          <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
            <span className="text-gray-900 text-[15px] min-w-[70px]">
              名字<span className="text-red-500 ml-1">*</span>
            </span>
            <input
              type="text"
              placeholder="请填写猫咪名字"
              className="flex-1 text-right outline-none text-[15px] text-gray-900 placeholder-gray-300 bg-transparent"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
            />
          </div>

          {/* Breed Row */}
          <div
            className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0 active:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => setActivePicker("breed")}
          >
            <span className="text-gray-900 text-[15px] min-w-[70px]">
              品种<span className="text-red-500 ml-1">*</span>
            </span>
            <div className="flex-1 flex items-center justify-end text-[15px]">
              {formData.breed ? (
                <span className="text-gray-900">
                  {formData.breed}
                </span>
              ) : (
                <span className="text-gray-300">
                  请选择品种
                </span>
              )}
              <ChevronRight
                size={18}
                className="text-gray-400 ml-1"
              />
            </div>
          </div>
        </div>

        {/* Info Card 2: Selectable Fields */}
        <div className="bg-white rounded-2xl px-5 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          {/* Birthday Row */}
          <div
            className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0 active:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => setActivePicker("birthday")}
          >
            <span className="text-gray-900 text-[15px] min-w-[70px]">
              出生日期
              <span className="text-red-500 ml-1">*</span>
            </span>
            <div className="flex-1 flex items-center justify-end text-[15px]">
              <span
                className={
                  formData.birthYear
                    ? "text-gray-900"
                    : "text-gray-300"
                }
              >
                {formData.birthYear
                  ? `${formData.birthYear}年${formData.birthMonth}月${formData.birthDay}日`
                  : "请选择出生日期"}
              </span>
              <ChevronRight
                size={18}
                className="text-gray-400 ml-1"
              />
            </div>
          </div>

          {/* Weight Row */}
          <div
            className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0 active:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => setActivePicker("weight")}
          >
            <span className="text-gray-900 text-[15px] min-w-[70px]">
              体重<span className="text-red-500 ml-1">*</span>
            </span>
            <div className="flex-1 flex items-center justify-end text-[15px]">
              <span
                className={
                  formData.weight !== null
                    ? "text-gray-900"
                    : "text-gray-300"
                }
              >
                {formData.weight !== null
                  ? `${formData.weight.toFixed(1)} kg`
                  : "请选择体重"}
              </span>
              <ChevronRight
                size={18}
                className="text-gray-400 ml-1"
              />
            </div>
          </div>

          {/* Gender Row */}
          <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
            <span className="text-gray-900 text-[15px] min-w-[70px]">
              性别<span className="text-red-500 ml-1">*</span>
            </span>
            <div className="flex items-center justify-end space-x-6 flex-1">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <input
                    type="radio"
                    name="gender"
                    className="peer sr-only"
                    checked={formData.gender === "male"}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        gender: "male",
                      })
                    }
                  />
                  <div className="w-5 h-5 rounded-full border border-gray-300 peer-checked:border-orange-500 peer-checked:border-[6px] transition-all duration-200 bg-white"></div>
                </div>
                <span className="text-[15px] text-gray-800">
                  公猫
                </span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer group">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <input
                    type="radio"
                    name="gender"
                    className="peer sr-only"
                    checked={formData.gender === "female"}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        gender: "female",
                      })
                    }
                  />
                  <div className="w-5 h-5 rounded-full border border-gray-300 peer-checked:border-orange-500 peer-checked:border-[6px] transition-all duration-200 bg-white"></div>
                </div>
                <span className="text-[15px] text-gray-800">
                  母猫
                </span>
              </label>
            </div>
          </div>

          {/* Neuter Row */}
          <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
            <div className="flex flex-col min-w-[70px]">
              <span className="text-gray-900 text-[15px]">
                绝育状态
                <span className="text-red-500 ml-1">*</span>
              </span>
              <span className="text-[11px] text-gray-400 mt-0.5">
                影响热量需求
              </span>
            </div>
            <div className="flex items-center justify-end space-x-6 flex-1">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <input
                    type="radio"
                    name="neutered"
                    className="peer sr-only"
                    checked={formData.neutered === true}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        neutered: true,
                      })
                    }
                  />
                  <div className="w-5 h-5 rounded-full border border-gray-300 peer-checked:border-orange-500 peer-checked:border-[6px] transition-all duration-200 bg-white"></div>
                </div>
                <span className="text-[15px] text-gray-800">
                  已绝育
                </span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer group">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <input
                    type="radio"
                    name="neutered"
                    className="peer sr-only"
                    checked={formData.neutered === false}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        neutered: false,
                      })
                    }
                  />
                  <div className="w-5 h-5 rounded-full border border-gray-300 peer-checked:border-orange-500 peer-checked:border-[6px] transition-all duration-200 bg-white"></div>
                </div>
                <span className="text-[15px] text-gray-800">
                  未绝育
                </span>
              </label>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Action Area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 z-10">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleNext}
            className={`w-full font-medium text-[16px] py-3.5 rounded-full transition-all flex items-center justify-center ${isValid ? "bg-orange-500 text-white shadow-[0_4px_14px_rgba(249,115,22,0.3)] hover:bg-orange-600 active:scale-[0.98]" : "bg-orange-300 text-white/90 cursor-not-allowed"}`}
          >
            下一步：选择健康需求
            <ChevronRight
              size={18}
              className="ml-1 opacity-80"
            />
          </button>
        </div>
      </div>

      {/* --- Modals / Pickers --- */}

      {/* Breed Picker */}
      <BottomSheet
        isOpen={activePicker === "breed"}
        onClose={() => setActivePicker("none")}
        title="选择品种"
      >
        <div className="p-4 pt-2 pb-8">
          <div className="relative mb-5">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="搜索品种，例如：英短、橘猫..."
              className="w-full bg-gray-100 rounded-full py-2.5 pl-10 pr-4 text-[15px] outline-none text-gray-900 placeholder-gray-400 focus:bg-gray-200 transition-colors"
            />
          </div>
          <div className="flex flex-wrap gap-2.5">
            {commonBreeds.map((b) => (
              <button
                key={b}
                className={`px-4 py-2.5 rounded-full text-[14px] transition-all duration-200 border ${formData.breed === b ? "bg-orange-50 border-orange-500 text-orange-600 font-medium shadow-sm" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                onClick={() => {
                  setFormData({ ...formData, breed: b });
                  setActivePicker("none");
                }}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>

      {/* Birthday Picker */}
      <BottomSheet
        isOpen={activePicker === "birthday"}
        onClose={() => setActivePicker("none")}
        onConfirm={handleConfirmBirthday}
        title="选择出生日期"
      >
        <div className="flex px-4 py-2 pb-8">
          <WheelPickerColumn
            options={Array.from({ length: 30 }, (_, i) => ({
              value: 2026 - i,
              label: `${2026 - i}`,
            }))}
            value={tempDate.year}
            onChange={(v: number) =>
              setTempDate({ ...tempDate, year: v })
            }
            label="年"
          />
          <WheelPickerColumn
            options={Array.from({ length: 12 }, (_, i) => ({
              value: i + 1,
              label: `${i + 1}`,
            }))}
            value={tempDate.month}
            onChange={(v: number) =>
              setTempDate({ ...tempDate, month: v })
            }
            label="月"
          />
          <WheelPickerColumn
            options={Array.from(
              {
                length: new Date(
                  tempDate.year,
                  tempDate.month,
                  0,
                ).getDate(),
              },
              (_, i) => ({ value: i + 1, label: `${i + 1}` }),
            )}
            value={tempDate.day}
            onChange={(v: number) => {
              const maxDays = new Date(
                tempDate.year,
                tempDate.month,
                0,
              ).getDate();
              setTempDate({
                ...tempDate,
                day: Math.min(v, maxDays),
              });
            }}
            label="日"
          />
        </div>
      </BottomSheet>

      {/* Weight Picker */}
      <BottomSheet
        isOpen={activePicker === "weight"}
        onClose={() => setActivePicker("none")}
        onConfirm={handleConfirmWeight}
        title="选择体重"
      >
        <div className="py-8 px-4 pb-12 flex flex-col items-center">
          <div className="flex items-baseline mb-10">
            <input
              type="number"
              className="text-[44px] font-bold text-gray-900 w-32 text-center bg-transparent outline-none border-b-2 border-orange-200 focus:border-orange-500 transition-colors pb-1"
              value={tempWeight}
              onChange={(e) => {
                let val = parseFloat(e.target.value);
                if (!isNaN(val)) setTempWeight(val);
              }}
              step="0.1"
            />
            <span className="text-[18px] text-gray-500 ml-2 font-medium">
              kg
            </span>
          </div>

          <div className="w-full px-4">
            <input
              type="range"
              min="0.5"
              max="30"
              step="0.1"
              value={tempWeight}
              onChange={(e) =>
                setTempWeight(parseFloat(e.target.value))
              }
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
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