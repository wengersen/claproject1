'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ProgressSteps } from '@/components/ui/ProgressSteps'
import { Button } from '@/components/ui/Button'
import { BreedSelector } from '@/components/recommend/BreedSelector'
import { HealthTagGrid } from '@/components/recommend/HealthTagGrid'
import { LoadingState } from '@/components/recommend/LoadingState'
import { AuthNav } from '@/components/auth/AuthNav'
import { inferLifeStage, type HealthTag, type CatProfile } from '@/types/cat'
import { generateResultId } from '@/lib/formatters'

// ─── 类型 ────────────────────────────────────────────────
interface FormState {
  name: string
  breed: string
  ageMonths: string
  weightKg: string
  gender: 'male' | 'female' | ''
  neutered: boolean | null
}

interface LastCatSession extends FormState {
  healthTags: HealthTag[]
  customInput: string
}

const LAST_CAT_KEY = 'lastCatSession'

const STEPS = [
  { label: '基本信息' },
  { label: '健康需求' },
  { label: '生成中' },
]

// ─── 工具函数 ────────────────────────────────────────────
function formatAge(ageMonths: string): string {
  const m = parseInt(ageMonths)
  if (!m) return ''
  if (m < 12) return `${m}个月`
  return `${Math.round(m / 12)}岁`
}

function readSession(): LastCatSession | null {
  try {
    const raw = localStorage.getItem(LAST_CAT_KEY)
    if (!raw) return null
    const parsed: LastCatSession = JSON.parse(raw)
    return parsed.name && parsed.breed ? parsed : null
  } catch {
    return null
  }
}

function writeSession(patch: Partial<LastCatSession>) {
  try {
    const existing = readSession() ?? ({} as LastCatSession)
    localStorage.setItem(LAST_CAT_KEY, JSON.stringify({ ...existing, ...patch }))
  } catch { /* ignore */ }
}

// ─── 主组件 ──────────────────────────────────────────────
export default function RecommendPage() {
  const router = useRouter()

  // step: 0=猫咪选择, 1=基本信息, 2=健康需求, 3=生成中
  const [step, setStep] = useState(1)
  const [step2From, setStep2From] = useState<'step0' | 'step1'>('step1')
  const [initializing, setInitializing] = useState(true)
  const [lastSession, setLastSession] = useState<LastCatSession | null>(null)
  const [hadHistoryHealth, setHadHistoryHealth] = useState(false)

  const [form, setForm] = useState<FormState>({
    name: '', breed: '', ageMonths: '', weightKg: '', gender: '', neutered: null,
  })
  const [healthTags, setHealthTags] = useState<HealthTag[]>([])
  const [customInput, setCustomInput] = useState('')
  const [error, setError] = useState('')

  // 初始化：读取历史档案
  useEffect(() => {
    const session = readSession()
    if (session) {
      setLastSession(session)
      setStep(0)
    }
    setInitializing(false)
  }, [])

  function updateForm(field: keyof FormState, value: FormState[keyof FormState]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Step 0 → Step 2：继续使用历史档案
  function continueWithLast() {
    if (!lastSession) return
    setForm({
      name: lastSession.name,
      breed: lastSession.breed,
      ageMonths: lastSession.ageMonths,
      weightKg: lastSession.weightKg,
      gender: lastSession.gender,
      neutered: lastSession.neutered,
    })
    const hasPrevHealth = lastSession.healthTags?.length > 0
    setHadHistoryHealth(hasPrevHealth)
    setHealthTags(lastSession.healthTags ?? [])
    setCustomInput(lastSession.customInput ?? '')
    setStep2From('step0')
    setStep(2)
  }

  // Step 0 → Step 1：添加新猫咪
  function startNewCat() {
    setForm({ name: '', breed: '', ageMonths: '', weightKg: '', gender: '', neutered: null })
    setHealthTags([])
    setCustomInput('')
    setHadHistoryHealth(false)
    setStep2From('step1')
    setStep(1)
  }

  // Step 1 → Step 2：保存猫咪信息
  function goToStep2() {
    writeSession({ ...form })  // 保留已有 healthTags/customInput
    setHadHistoryHealth(false)
    setStep2From('step1')
    setStep(2)
  }

  // Step 2 返回
  function goBack() {
    setStep(step2From === 'step0' ? 0 : 1)
  }

  // 验证
  const step1Valid =
    form.name.trim() !== '' &&
    form.breed !== '' &&
    form.ageMonths !== '' &&
    form.weightKg !== '' &&
    form.gender !== '' &&
    form.neutered !== null

  const step2Valid = healthTags.length > 0

  // 提交推荐
  async function handleSubmit() {
    // 提交前追加健康需求到 localStorage
    writeSession({ healthTags, customInput })

    setStep(3)
    setError('')

    const ageMonths = parseInt(form.ageMonths)
    const catProfile: CatProfile = {
      name: form.name.trim(),
      breed: form.breed,
      ageMonths,
      ageStage: inferLifeStage(ageMonths),
      weightKg: parseFloat(form.weightKg),
      gender: form.gender as 'male' | 'female',
      neutered: form.neutered as boolean,
    }

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catProfile, healthTags, customInput }),
      })
      if (!res.ok) throw new Error(`推荐服务暂时不可用（${res.status}）`)

      const result = await res.json()
      const resultId = generateResultId()
      localStorage.setItem(`result_${resultId}`, JSON.stringify(result))
      router.push(`/result/${resultId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请重试')
      setStep(2)
    }
  }

  // ─── 猫咪信息摘要（Step 2 顶部只读卡）────────────────
  const catSummary = [
    form.breed,
    formatAge(form.ageMonths),
    form.weightKg ? `${form.weightKg}kg` : '',
    form.gender === 'male' ? '公猫' : form.gender === 'female' ? '母猫' : '',
    form.neutered === true ? '已绝育' : form.neutered === false ? '未绝育' : '',
  ].filter(Boolean).join(' · ')

  return (
    <div className="min-h-screen bg-[#FFF8F3]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-[#FFF8F3]/90 backdrop-blur-md border-b border-[#E8E6E1]">
        <div className="max-w-[640px] mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#E8721A] font-bold text-[18px]">
            🐾 NutraPaw
          </Link>
          <div className="flex items-center gap-3">
            {step > 0 && <ProgressSteps steps={STEPS} currentStep={step} />}
            <AuthNav />
          </div>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-10">

        {/* 初始化占位 */}
        {initializing && (
          <div className="flex items-center justify-center py-24">
            <div className="text-4xl animate-paw-pulse">🐾</div>
          </div>
        )}

        {/* ── Step 0：猫咪快捷选择 ── */}
        {!initializing && step === 0 && lastSession && (
          <div className="animate-slide-up space-y-5">
            <div>
              <h1 className="text-[28px] font-bold text-[#1A1815]">继续上次的推荐？</h1>
              <p className="text-[14px] text-[#78746C] mt-2">选择已有档案，直接跳到健康需求选择</p>
            </div>

            {/* 历史猫咪卡片 */}
            <button
              type="button"
              onClick={continueWithLast}
              className="w-full bg-white border-2 border-[#E8E6E1] hover:border-[#E8721A] hover:bg-[#FFF8F3] rounded-2xl p-6 text-left transition-all duration-150 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#FFD9B5] rounded-full flex items-center justify-center text-2xl shrink-0">
                  🐱
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[18px] font-bold text-[#1A1815] group-hover:text-[#E8721A] transition-colors">
                    {lastSession.name}
                  </p>
                  <p className="text-[13px] text-[#78746C] mt-0.5 truncate">
                    {[
                      lastSession.breed,
                      formatAge(lastSession.ageMonths),
                      lastSession.weightKg ? `${lastSession.weightKg}kg` : '',
                      lastSession.gender === 'male' ? '公猫' : lastSession.gender === 'female' ? '母猫' : '',
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="text-[14px] font-medium text-[#E8721A] shrink-0 group-hover:translate-x-1 transition-transform">
                  继续使用 →
                </span>
              </div>
            </button>

            {/* 添加新猫咪 */}
            <button
              type="button"
              onClick={startNewCat}
              className="w-full border-2 border-dashed border-[#E8E6E1] hover:border-[#FFB87A] hover:bg-[#FFF8F3] rounded-2xl p-5 text-center text-[15px] text-[#78746C] hover:text-[#E8721A] transition-all duration-150"
            >
              + 为新猫咪生成推荐
            </button>
          </div>
        )}

        {/* ── Step 1：基本信息 ── */}
        {!initializing && step === 1 && (
          <div className="animate-slide-up space-y-8">
            {/* 有历史档案时显示返回链接 */}
            {lastSession && (
              <button
                type="button"
                onClick={() => setStep(0)}
                className="flex items-center gap-1.5 text-[13px] text-[#A8A49C] hover:text-[#E8721A] transition-colors -mb-2"
              >
                ← 返回已有猫咪档案
              </button>
            )}

            <div>
              <h1 className="text-[28px] font-bold text-[#1A1815]">告诉我们，你的猫叫什么？</h1>
              <p className="text-[14px] text-[#78746C] mt-2">信息越准确，推荐越精准</p>
            </div>

            {/* 猫咪名字 */}
            <div>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="例如：奶茶、橘墩、球球"
                maxLength={20}
                className={[
                  'w-full text-center text-[28px] font-bold bg-white border-2 rounded-xl px-6 py-4',
                  'placeholder:text-[#D1CEC7] placeholder:font-normal placeholder:text-[22px]',
                  'outline-none transition-all duration-200',
                  form.name
                    ? 'border-[#E8721A] ring-4 ring-[#E8721A]/10'
                    : 'border-[#E8E6E1] focus:border-[#E8721A] focus:ring-4 focus:ring-[#E8721A]/10',
                ].join(' ')}
              />
            </div>

            {/* 品种 */}
            <BreedSelector value={form.breed} onChange={(v) => updateForm('breed', v)} />

            {/* 年龄 + 体重 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#78746C] mb-2">年龄</label>
                <select
                  value={form.ageMonths}
                  onChange={(e) => updateForm('ageMonths', e.target.value)}
                  className={[
                    'w-full bg-white border-2 rounded-xl px-4 py-3 text-[15px] outline-none transition-all duration-200 appearance-none cursor-pointer',
                    form.ageMonths
                      ? 'border-[#E8721A] text-[#2E2B27]'
                      : 'border-[#E8E6E1] text-[#A8A49C] focus:border-[#E8721A] focus:ring-4 focus:ring-[#E8721A]/10',
                  ].join(' ')}
                >
                  <option value="">选择年龄</option>
                  <optgroup label="幼猫（0-12月）">
                    <option value="2">2个月</option>
                    <option value="3">3个月</option>
                    <option value="4">4个月</option>
                    <option value="6">6个月</option>
                    <option value="9">9个月</option>
                    <option value="11">11个月</option>
                  </optgroup>
                  <optgroup label="成猫（1-7岁）">
                    <option value="12">1岁</option>
                    <option value="24">2岁</option>
                    <option value="36">3岁</option>
                    <option value="48">4岁</option>
                    <option value="60">5岁</option>
                    <option value="72">6岁</option>
                    <option value="80">7岁</option>
                  </optgroup>
                  <optgroup label="老年猫（7岁以上）">
                    <option value="96">8岁</option>
                    <option value="108">9岁</option>
                    <option value="120">10岁</option>
                    <option value="132">11岁</option>
                    <option value="144">12岁+</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#78746C] mb-2">体重（kg）</label>
                <input
                  type="number"
                  value={form.weightKg}
                  onChange={(e) => updateForm('weightKg', e.target.value)}
                  placeholder="例如：4.5"
                  min={0.1} max={20} step={0.1}
                  className={[
                    'w-full bg-white border-2 rounded-xl px-4 py-3 text-[15px] outline-none transition-all duration-200',
                    form.weightKg
                      ? 'border-[#E8721A] ring-4 ring-[#E8721A]/10'
                      : 'border-[#E8E6E1] focus:border-[#E8721A] focus:ring-4 focus:ring-[#E8721A]/10',
                  ].join(' ')}
                />
              </div>
            </div>

            {/* 性别 */}
            <div>
              <label className="block text-[13px] font-medium text-[#78746C] mb-2">性别</label>
              <div className="grid grid-cols-2 gap-3">
                {[{ value: 'male', label: '公猫', icon: '♂' }, { value: 'female', label: '母猫', icon: '♀' }].map(({ value, label, icon }) => (
                  <button key={value} type="button" onClick={() => updateForm('gender', value as 'male' | 'female')}
                    className={['relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-150',
                      form.gender === value ? 'border-[#E8721A] bg-[#FFF8F3]' : 'border-[#E8E6E1] bg-white hover:border-[#FFB87A] hover:bg-[#FFF8F3]'].join(' ')}>
                    {form.gender === value && <span className="absolute top-1 right-2 text-[#E8721A] text-[11px] font-bold">✓</span>}
                    <span className={`text-2xl ${form.gender === value ? 'text-[#E8721A]' : 'text-[#A8A49C]'}`}>{icon}</span>
                    <span className={`font-medium text-[15px] ${form.gender === value ? 'text-[#E8721A]' : 'text-[#2E2B27]'}`}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 绝育状态 */}
            <div>
              <label className="block text-[13px] font-medium text-[#78746C] mb-2">
                绝育状态<span className="text-[11px] text-[#A8A49C] ml-2">（影响热量需求）</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[{ value: true, label: '已绝育', desc: '热量需求较低' }, { value: false, label: '未绝育', desc: '热量需求正常' }].map(({ value, label, desc }) => (
                  <button key={String(value)} type="button" onClick={() => updateForm('neutered', value)}
                    className={['relative p-4 rounded-xl border-2 transition-all duration-150 text-left',
                      form.neutered === value ? 'border-[#E8721A] bg-[#FFF8F3]' : 'border-[#E8E6E1] bg-white hover:border-[#FFB87A] hover:bg-[#FFF8F3]'].join(' ')}>
                    {form.neutered === value && <span className="absolute top-1 right-2 text-[#E8721A] text-[11px] font-bold">✓</span>}
                    <div className={`font-medium text-[15px] ${form.neutered === value ? 'text-[#E8721A]' : 'text-[#2E2B27]'}`}>{label}</div>
                    <div className="text-[11px] text-[#A8A49C] mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <Button variant="primary" size="lg" fullWidth disabled={!step1Valid} onClick={goToStep2}>
              下一步：选择健康需求 →
            </Button>
          </div>
        )}

        {/* ── Step 2：健康需求 ── */}
        {!initializing && step === 2 && (
          <div className="animate-slide-up space-y-8">
            {/* 猫咪信息摘要卡（只读） */}
            <div className="bg-[#FFF8F3] border border-[#FFD9B5] rounded-xl px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FFD9B5] rounded-full flex items-center justify-center text-xl shrink-0">🐱</div>
              <div>
                <p className="text-[15px] font-semibold text-[#1A1815]">{form.name}</p>
                <p className="text-[12px] text-[#78746C] mt-0.5">{catSummary}</p>
              </div>
            </div>

            <div>
              <h1 className="text-[28px] font-bold text-[#1A1815]">
                {form.name || '它'}有哪些健康需求？
              </h1>
              <p className="text-[14px] text-[#78746C] mt-2">可多选，选"日常均衡"代表无特殊需求</p>
            </div>

            {/* 历史健康需求提示（仅来自 Step 0 且有历史数据时显示） */}
            {step2From === 'step0' && hadHistoryHealth && (
              <div className="bg-[#FFF8F3] border border-[#FFD9B5] rounded-xl px-5 py-3 flex items-start gap-2.5">
                <span className="text-base mt-0.5">🔔</span>
                <p className="text-[13px] text-[#78746C] leading-relaxed">
                  已加载上次的健康需求，请确认是否有变化
                </p>
              </div>
            )}

            <HealthTagGrid selected={healthTags} onChange={setHealthTags} />

            {/* 自定义输入 */}
            <div>
              <label className="block text-[13px] font-medium text-[#78746C] mb-2">
                其他需求或症状描述
                <span className="text-[11px] text-[#A8A49C] ml-2">（选填）</span>
              </label>
              <textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="例如：最近总是呕吐、喝水很少、便秘、不爱吃干粮..."
                rows={3}
                className={[
                  'w-full bg-white border-2 rounded-xl px-4 py-3 text-[15px] outline-none transition-all duration-200 resize-y placeholder:text-[#D1CEC7]',
                  customInput
                    ? 'border-[#E8721A] ring-4 ring-[#E8721A]/10'
                    : 'border-[#E8E6E1] focus:border-[#E8721A] focus:ring-4 focus:ring-[#E8721A]/10',
                ].join(' ')}
              />
            </div>

            {/* 已选摘要 */}
            {healthTags.length > 0 && (
              <div className="bg-[#FFF8F3] rounded-xl p-4 border border-[#FFD9B5]">
                <p className="text-[13px] text-[#78746C] mb-2">已选择 {healthTags.length} 项需求：</p>
                <div className="flex flex-wrap gap-2">
                  {healthTags.map((tag) => (
                    <span key={tag} className="bg-white border border-[#FFB87A] text-[#9A4208] rounded-full px-3 py-1 text-[12px]">
                      {tag === 'urinary' ? '泌尿道健康' :
                       tag === 'weight' ? '体重管理' :
                       tag === 'digest' ? '消化敏感' :
                       tag === 'skin' ? '皮毛养护' :
                       tag === 'joint' ? '关节健康' :
                       tag === 'picky' ? '挑食猫咪' :
                       tag === 'allergy' ? '过敏体质' :
                       tag === 'nutrition' ? '增重/营养' :
                       tag === 'senior' ? '老年猫护理' :
                       tag === 'kitten' ? '幼猫发育' : '日常均衡'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-[14px] text-red-600">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" size="lg" onClick={goBack} className="w-1/3">
                ← 返回
              </Button>
              <Button variant="primary" size="lg" fullWidth disabled={!step2Valid} onClick={handleSubmit} className="flex-1">
                ✨ 为我生成专属方案
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3：Loading ── */}
        {!initializing && step === 3 && <LoadingState catName={form.name || '你的猫'} />}
      </main>
    </div>
  )
}
