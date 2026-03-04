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
import { generateResultId, calcAgeMonthsFromBirthday, formatAgeFromBirthday } from '@/lib/formatters'
import { getPets } from '@/lib/petLocalStore'
import { generateInputHash, getCachedResultId, saveCacheMapping } from '@/lib/recommendLocalCache'
import type { Pet } from '@/types/pet'

// ─── 类型 ────────────────────────────────────────────────
interface FormState {
  name: string
  breed: string
  birthday: string
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
function readSession(): LastCatSession | null {
  try {
    const raw = localStorage.getItem(LAST_CAT_KEY)
    if (!raw) return null
    const parsed: LastCatSession = JSON.parse(raw)
    // 旧 session 用 ageMonths 字段，丢弃不迁移
    if (!parsed.birthday) return null
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
  const [savedPets, setSavedPets] = useState<Pet[]>([])
  const [hadHistoryHealth, setHadHistoryHealth] = useState(false)

  const [form, setForm] = useState<FormState>({
    name: '', breed: '', birthday: '', weightKg: '', gender: '', neutered: null,
  })
  const [healthTags, setHealthTags] = useState<HealthTag[]>([])
  const [customInput, setCustomInput] = useState('')
  const [error, setError] = useState('')

  // 初始化：读取历史档案（lastCatSession）+ 已登录用户的完整宠物列表
  useEffect(() => {
    const session = readSession()
    if (session) {
      setLastSession(session)
      setStep(0)
    }
    // 登录用户：读取 nutrapaw_pets_${username} 完整列表（可能有多只猫）
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const { username } = JSON.parse(userStr) as { username: string }
        const pets = getPets(username)
        if (pets.length > 0) {
          setSavedPets(pets)
          setStep(0)  // 有宠物档案就显示 Step 0 选择界面
        }
      } catch { /* ignore */ }
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
      birthday: lastSession.birthday,
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

  // Step 0 → Step 2：从宠物档案选择一只猫（直接到健康需求）
  function selectSavedPet(pet: Pet) {
    setForm({
      name: pet.name,
      breed: pet.breed,
      birthday: pet.birthday,
      weightKg: String(pet.weightKg),
      gender: pet.gender,
      neutered: pet.neutered,
    })
    // 若 lastCatSession 对应同一只猫，恢复上次的健康需求
    const lastSess = readSession()
    if (lastSess?.name === pet.name) {
      const hasPrevHealth = (lastSess.healthTags?.length ?? 0) > 0
      setHadHistoryHealth(hasPrevHealth)
      setHealthTags(lastSess.healthTags ?? [])
      setCustomInput(lastSess.customInput ?? '')
    } else {
      setHadHistoryHealth(false)
      setHealthTags([])
      setCustomInput('')
    }
    setStep2From('step0')
    setStep(2)
  }

  // Step 0 → Step 1：添加新猫咪
  function startNewCat() {
    setForm({ name: '', breed: '', birthday: '', weightKg: '', gender: '', neutered: null })
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
    form.birthday !== '' &&
    form.weightKg !== '' &&
    form.gender !== '' &&
    form.neutered !== null

  const step2Valid = healthTags.length > 0

  // SSE 进度状态
  const [streamProgress, setStreamProgress] = useState('')

  // 提交推荐（SSE 流式版）
  async function handleSubmit() {
    // 提交前追加健康需求到 localStorage
    writeSession({ healthTags, customInput })

    setError('')

    const weightKg = parseFloat(form.weightKg)
    if (isNaN(weightKg) || weightKg < 0.5 || weightKg > 20) {
      setError('请输入有效的体重（0.5 ~ 20 kg）')
      return
    }

    const catProfile: CatProfile = {
      name: form.name.trim(),
      breed: form.breed,
      birthday: form.birthday,
      ageStage: inferLifeStage(calcAgeMonthsFromBirthday(form.birthday)),
      weightKg,
      gender: form.gender as 'male' | 'female',
      neutered: form.neutered as boolean,
    }

    // 客户端缓存检查：输入完全一致时直接跳转上次结果
    const inputHash = generateInputHash({
      breed: catProfile.breed,
      birthday: catProfile.birthday,
      weightKg: catProfile.weightKg,
      gender: catProfile.gender,
      neutered: catProfile.neutered,
      healthTags,
      customInput,
    })

    const cachedResultId = getCachedResultId(inputHash)
    if (cachedResultId) {
      router.push(`/result/${cachedResultId}`)
      return
    }

    // 未命中缓存，调用 SSE 流式 API
    setStep(3)
    setStreamProgress('正在连接...')

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catProfile, healthTags, customInput }),
      })
      if (!res.ok) throw new Error(`推荐服务暂时不可用（${res.status}）`)
      if (!res.body) throw new Error('服务不支持流式响应')

      // ── SSE 流读取 ──────────────────────────────────────
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // 按行解析 SSE 格式
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''  // 最后一段可能不完整，留着下次拼接

        let currentEvent = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            try {
              const data = JSON.parse(dataStr)

              if (currentEvent === 'progress') {
                setStreamProgress(data.message ?? '')
              } else if (currentEvent === 'result') {
                // 收到完整推荐结果，存储并跳转
                const resultId = generateResultId()
                localStorage.setItem(`result_${resultId}`, JSON.stringify(data))
                saveCacheMapping(inputHash, resultId)
                router.push(`/result/${resultId}`)
                return
              } else if (currentEvent === 'error') {
                throw new Error(data.message ?? '生成失败，请重试')
              }
            } catch (parseErr) {
              // JSON 解析失败（可能是事件名解析错误），忽略该行
              if (currentEvent === 'error' || currentEvent === 'result') {
                console.error('[SSE parse error]', parseErr, dataStr)
              }
            }
          } else if (line === '') {
            // 空行 = SSE 事件结束，重置事件名
            currentEvent = ''
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请重试')
      setStreamProgress('')
      setStep(2)
    }
  }

  // ─── 猫咪信息摘要（Step 2 顶部只读卡）────────────────
  const catSummary = [
    form.breed,
    form.birthday ? formatAgeFromBirthday(form.birthday) : '',
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
        {!initializing && step === 0 && (savedPets.length > 0 || lastSession) && (
          <div className="animate-slide-up space-y-5">
            <div>
              <h1 className="text-[28px] font-bold text-[#1A1815]">
                {savedPets.length > 0 ? '为哪只猫咪生成推荐？' : '继续上次的推荐？'}
              </h1>
              <p className="text-[14px] text-[#78746C] mt-2">选择已有档案，直接跳到健康需求选择</p>
            </div>

            {/* 已登录且有宠物档案：显示全部猫咪卡片 */}
            {savedPets.length > 0 ? (
              <div className="space-y-3">
                {savedPets.map((pet) => (
                  <button
                    key={pet.id}
                    type="button"
                    onClick={() => selectSavedPet(pet)}
                    className="w-full bg-white border-2 border-[#E8E6E1] hover:border-[#E8721A] hover:bg-[#FFF8F3] rounded-2xl p-6 text-left transition-all duration-150 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-[#FFD9B5] rounded-full flex items-center justify-center text-2xl shrink-0">
                        🐱
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[18px] font-bold text-[#1A1815] group-hover:text-[#E8721A] transition-colors">
                          {pet.name}
                        </p>
                        <p className="text-[13px] text-[#78746C] mt-0.5 truncate">
                          {[
                            pet.breed,
                            formatAgeFromBirthday(pet.birthday),
                            `${pet.weightKg}kg`,
                            pet.gender === 'male' ? '公猫' : '母猫',
                          ].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <span className="text-[14px] font-medium text-[#E8721A] shrink-0 group-hover:translate-x-1 transition-transform">
                        选择 →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : lastSession ? (
              /* 未登录或无档案：显示原有单猫 lastSession 卡片 */
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
                        lastSession.birthday ? formatAgeFromBirthday(lastSession.birthday) : '',
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
            ) : null}

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
            {/* 有历史档案或宠物档案时显示返回链接 */}
            {(lastSession || savedPets.length > 0) && (
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

            {/* 生日 + 体重 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#78746C] mb-2">生日</label>
                <input
                  type="date"
                  value={form.birthday}
                  onChange={(e) => updateForm('birthday', e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  min="2006-01-01"
                  className={[
                    'w-full bg-white border-2 rounded-xl px-4 py-3 text-[15px] outline-none transition-all duration-200',
                    form.birthday
                      ? 'border-[#E8721A] ring-4 ring-[#E8721A]/10 text-[#2E2B27]'
                      : 'border-[#E8E6E1] focus:border-[#E8721A] focus:ring-4 focus:ring-[#E8721A]/10 text-[#A8A49C]',
                  ].join(' ')}
                />
                {form.birthday && (
                  <p className="text-[12px] text-[#78746C] mt-1.5">
                    当前：{formatAgeFromBirthday(form.birthday)}
                  </p>
                )}
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
        {!initializing && step === 3 && (
          <LoadingState catName={form.name || '你的猫'} streamProgress={streamProgress} />
        )}
      </main>
    </div>
  )
}
