'use client'

import { useState, useEffect, useRef, UIEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ProgressSteps } from '@/components/ui/ProgressSteps'
import { Button } from '@/components/ui/Button'
import { HealthTagGrid } from '@/components/recommend/HealthTagGrid'
import { LoadingState } from '@/components/recommend/LoadingState'
import { AuthNav } from '@/components/auth/AuthNav'
import { inferLifeStage, type HealthTag, type CatProfile } from '@/types/cat'
import { generateResultId, calcAgeMonthsFromBirthday, formatAgeFromBirthday } from '@/lib/formatters'
import { hydrateSlimResult, getProductById } from '@/lib/productMap'
import type { SlimRecommendResult, SlimProductRecommendation } from '@/lib/productMap'
import type { ProductRecommendation } from '@/types/cat'
import type { ConflictItem } from '@/lib/conflictDetector'
import { HEALTH_TAG_CONFIG } from '@/types/cat'
import { ProductCard } from '@/components/result/ProductCard'
import { getPets } from '@/lib/petLocalStore'
import { generateInputHash, getCachedResultId, saveCacheMapping } from '@/lib/recommendLocalCache'
import type { Pet } from '@/types/pet'

// ─── BottomSheet：iOS 风格底部弹出层 ─────────────────────────────────
function BottomSheet({
  isOpen,
  onClose,
  title,
  onConfirm,
  children,
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  onConfirm?: () => void
  children: React.ReactNode
}) {
  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <>
      {/* 遮罩 */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      {/* 面板 */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 transition-transform duration-300 flex flex-col ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '80vh', paddingBottom: 'env(safe-area-inset-bottom, 1rem)' }}
      >
        {/* 顶栏：取消 / 标题 / 确定 */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="text-[15px] text-gray-500 px-2 py-1 active:opacity-70 transition-opacity"
          >
            取消
          </button>
          <h3 className="text-[16px] font-medium text-gray-900">{title}</h3>
          <button
            onClick={onConfirm ?? onClose}
            className="text-[15px] text-[#E8721A] font-medium px-2 py-1 active:opacity-70 transition-opacity"
          >
            确定
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  )
}

// ─── WheelPickerColumn：iOS 滚轮选择列 ───────────────────────────────
function WheelPickerColumn({
  options,
  value,
  onChange,
  unit,
}: {
  options: { value: number; label: string }[]
  value: number
  onChange: (v: number) => void
  unit?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemHeight = 44

  useEffect(() => {
    if (containerRef.current) {
      const idx = options.findIndex((o) => o.value === value)
      if (idx !== -1) {
        containerRef.current.scrollTop = idx * itemHeight
      }
    }
  }, [value, options])

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop
    const idx = Math.round(top / itemHeight)
    if (options[idx] && options[idx].value !== value) {
      onChange(options[idx].value)
    }
  }

  return (
    <div className="relative flex-1 h-[220px] overflow-hidden bg-white">
      {/* 选中高亮条 */}
      <div className="absolute top-1/2 left-0 right-0 h-[44px] -mt-[22px] bg-gray-50 pointer-events-none rounded-md mx-2" />
      {/* 滚动容器 */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto snap-y snap-mandatory relative z-10"
        onScroll={handleScroll}
        style={{ scrollBehavior: 'smooth', msOverflowStyle: 'none', scrollbarWidth: 'none' }}
      >
        <div style={{ height: 88 }} />
        {options.map((opt) => (
          <div
            key={opt.value}
            className={`h-[44px] flex items-center justify-center snap-center transition-colors duration-200 ${
              opt.value === value
                ? 'text-gray-900 font-semibold text-[17px]'
                : 'text-gray-400 text-[15px]'
            }`}
          >
            {opt.label}{unit}
          </div>
        ))}
        <div style={{ height: 88 }} />
      </div>
      {/* 顶部渐变遮罩 */}
      <div className="absolute top-0 left-0 right-0 h-[88px] bg-gradient-to-b from-white to-transparent pointer-events-none z-20" />
      {/* 底部渐变遮罩 */}
      <div className="absolute bottom-0 left-0 right-0 h-[88px] bg-gradient-to-t from-white to-transparent pointer-events-none z-20" />
    </div>
  )
}

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

  // 冲突纠偏状态（SSE conflicts 事件接收后更新）
  const [streamConflicts, setStreamConflicts] = useState<ConflictItem[]>([])

  // Phase3: 增量渲染状态
  const [streamedDryItems, setStreamedDryItems] = useState<ProductRecommendation[]>([])
  const [streamedWetItems, setStreamedWetItems] = useState<ProductRecommendation[]>([])
  const [streamDone, setStreamDone] = useState(false)

  // 将 SlimProductRecommendation hydrate 为完整 ProductRecommendation
  function hydrateOneItem(slim: SlimProductRecommendation): ProductRecommendation | null {
    const product = getProductById(slim.productId)
    if (!product) return null
    return {
      product,
      rank: slim.rank,
      reason: product.reason,
      highlights: slim.highlights,
      warnings: slim.warnings,
      feedingGuide: slim.feedingGuide,
    }
  }

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
    setStreamedDryItems([])
    setStreamedWetItems([])
    setStreamDone(false)
    setStreamConflicts([])

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
      let itemCount = 0  // 用于进度计数（避免 state 闭包问题）

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
              } else if (currentEvent === 'conflicts') {
                // 冲突纠偏事件：立即展示提示
                setStreamConflicts(data.conflicts ?? [])
              } else if (currentEvent === 'dry-item') {
                // Phase3: 收到单条主粮推荐，hydrate 后增量渲染
                const slim = data as SlimProductRecommendation
                const full = hydrateOneItem(slim)
                if (full) {
                  setStreamedDryItems(prev => [...prev, full])
                  itemCount++
                  // 仅内部计数，不更新进度文案（界面始终显示轮播文案）
                }
              } else if (currentEvent === 'wet-item') {
                // Phase3: 收到单条罐头推荐，hydrate 后增量渲染
                const slim = data as SlimProductRecommendation
                const full = hydrateOneItem(slim)
                if (full) {
                  setStreamedWetItems(prev => [...prev, full])
                  itemCount++
                  // 仅内部计数，不更新进度文案（界面始终显示轮播文案）
                }
              } else if (currentEvent === 'result') {
                // Phase3: 收到最终完整结果，存储 + 跳转
                const slimResult = data as SlimRecommendResult
                const fullResult = hydrateSlimResult(slimResult)
                const resultId = generateResultId()
                // 注入 id 字段，确保后端保存接口校验通过
                fullResult.id = resultId
                localStorage.setItem(`result_${resultId}`, JSON.stringify(fullResult))
                saveCacheMapping(inputHash, resultId)
                setStreamDone(true)
                // 短暂延迟让用户看到完整结果后跳转
                setTimeout(() => router.push(`/result/${resultId}`), 1500)
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

  // ─── Step 1：BottomSheet 弹出状态 ───────────────────
  const [activePicker, setActivePicker] = useState<'none' | 'breed' | 'birthday' | 'weight'>('none')

  // 生日：临时状态（滚轮确认前不写入 form）
  const today = new Date()
  const [tempDate, setTempDate] = useState({ year: today.getFullYear() - 2, month: 1, day: 1 })
  useEffect(() => {
    if (activePicker === 'birthday' && form.birthday) {
      const p = form.birthday.split('-')
      setTempDate({ year: parseInt(p[0]), month: parseInt(p[1]), day: parseInt(p[2]) })
    } else if (activePicker === 'birthday') {
      setTempDate({ year: today.getFullYear() - 2, month: 1, day: 1 })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePicker])

  const handleConfirmBirthday = () => {
    const { year, month, day } = tempDate
    // 不允许超过今天
    const selected = new Date(year, month - 1, day)
    const clamped = selected > today ? today : selected
    const y = clamped.getFullYear()
    const m = clamped.getMonth() + 1
    const d = clamped.getDate()
    updateForm('birthday', `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`)
    setActivePicker('none')
  }

  // 生日滚轮：限制未来日期
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1
  const currentDay = today.getDate()
  const yearOptions = Array.from({ length: 20 }, (_, i) => ({ value: currentYear - i, label: `${currentYear - i}` }))
  const maxMonth = tempDate.year === currentYear ? currentMonth : 12
  const monthOptions = Array.from({ length: maxMonth }, (_, i) => ({ value: i + 1, label: `${i + 1}` }))
  const daysInMonth = new Date(tempDate.year, tempDate.month, 0).getDate()
  const maxDay = tempDate.year === currentYear && tempDate.month === currentMonth ? currentDay : daysInMonth
  const dayOptions = Array.from({ length: maxDay }, (_, i) => ({ value: i + 1, label: `${i + 1}` }))

  // 体重：临时状态（string 支持空态，允许用户完全删除后重新输入）
  const [tempWeight, setTempWeight] = useState<string>('')
  useEffect(() => {
    if (activePicker === 'weight') {
      setTempWeight(form.weightKg ? parseFloat(form.weightKg).toFixed(1) : '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePicker])
  const handleConfirmWeight = () => {
    const parsed = parseFloat(tempWeight)
    if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 30) {
      updateForm('weightKg', parsed.toFixed(1))
    }
    // 全部删除（空态）则不写入，保留上次值或保持为空
    setActivePicker('none')
  }
  // slider 显示用：空态回退到 5 作为拖动初始点
  const tempWeightNum = parseFloat(tempWeight)
  const sliderValue = isNaN(tempWeightNum) ? 5 : Math.min(20, Math.max(0, tempWeightNum))

  // 品种搜索
  const [breedSearch, setBreedSearch] = useState('')
  const COMMON_BREEDS = ['英国短毛猫','布偶猫','橘猫（田园猫）','美国短毛猫','暹罗猫','加菲猫','金吉拉','狮子猫','缅因猫','苏格兰折耳猫','波斯猫','孟加拉猫','其他']
  const filteredBreeds = breedSearch
    ? COMMON_BREEDS.filter(b => b.includes(breedSearch))
    : COMMON_BREEDS

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
        <div className="max-w-[640px] mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 text-[#E8721A] font-bold text-[18px] shrink-0">
            🐾 NutraPaw
          </Link>
          {/* 步骤条居中，flex-1 撑满中间空间 */}
          <div className="flex-1 flex justify-center overflow-hidden">
            {step > 0 && <ProgressSteps steps={STEPS} currentStep={step} />}
          </div>
          {/* 登录区固定右侧，shrink-0 防止被压缩 */}
          <div className="shrink-0">
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
              <h1 className="text-[22px] md:text-[28px] font-bold text-[#1A1815]">
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

        {/* ── Step 1：基本信息（Figma 卡片式布局）── */}
        {!initializing && step === 1 && (
          <div className="animate-slide-up pb-28">
            {/* 返回链接 */}
            {(lastSession || savedPets.length > 0) && (
              <button
                type="button"
                onClick={() => setStep(0)}
                className="flex items-center gap-1.5 text-[13px] text-[#A8A49C] hover:text-[#E8721A] transition-colors mb-5"
              >
                ← 返回已有猫咪档案
              </button>
            )}

            <div className="mb-6">
              <h1 className="text-[22px] md:text-[24px] font-bold text-[#1A1815]">填写猫咪基本信息</h1>
              <p className="text-[14px] text-[#78746C] mt-1">信息越准确，推荐越精准</p>
            </div>

            {/* ── 卡片一：名字 ── */}
            <div className="bg-white rounded-2xl px-5 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.04)] mb-3">
              <div className="flex items-center justify-between py-4">
                <span className="text-[15px] text-gray-700 font-medium min-w-[70px]">
                  名字 <span className="text-[#E8721A]">*</span>
                </span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="请填写猫咪名字"
                  maxLength={20}
                  style={{ fontSize: '16px' }}
                  className="flex-1 text-right outline-none text-[15px] text-gray-900 placeholder:text-gray-300 bg-transparent"
                />
              </div>
            </div>

            {/* ── 卡片二：品种 + 生日 + 体重 ── */}
            <div className="bg-white rounded-2xl px-5 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.04)] mb-3">
              {/* 品种 */}
              <button
                type="button"
                onClick={() => setActivePicker('breed')}
                className="w-full flex items-center justify-between py-4 border-b border-gray-100 active:bg-gray-50 transition-colors"
              >
                <span className="text-[15px] text-gray-700 font-medium min-w-[70px] text-left">
                  品种 <span className="text-[#E8721A]">*</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[15px] ${form.breed ? 'text-gray-900' : 'text-gray-300'}`}>
                    {form.breed || '请选择品种'}
                  </span>
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {/* 出生日期 */}
              <button
                type="button"
                onClick={() => setActivePicker('birthday')}
                className="w-full flex items-center justify-between py-4 border-b border-gray-100 active:bg-gray-50 transition-colors"
              >
                <span className="text-[15px] text-gray-700 font-medium min-w-[70px] text-left">
                  出生日期 <span className="text-[#E8721A]">*</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[15px] ${form.birthday ? 'text-gray-900' : 'text-gray-300'}`}>
                    {form.birthday
                      ? `${form.birthday.split('-')[0]}年${parseInt(form.birthday.split('-')[1])}月${parseInt(form.birthday.split('-')[2])}日`
                      : '请选择出生日期'}
                  </span>
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
              {form.birthday && (
                <p className="text-[12px] text-[#78746C] pb-2 pl-0">📅 {formatAgeFromBirthday(form.birthday)}</p>
              )}

              {/* 体重 */}
              <button
                type="button"
                onClick={() => setActivePicker('weight')}
                className="w-full flex items-center justify-between py-4 active:bg-gray-50 transition-colors"
              >
                <span className="text-[15px] text-gray-700 font-medium min-w-[70px] text-left">
                  体重 <span className="text-[#E8721A]">*</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[15px] ${form.weightKg ? 'text-gray-900' : 'text-gray-300'}`}>
                    {form.weightKg ? `${parseFloat(form.weightKg).toFixed(1)} kg` : '请选择体重'}
                  </span>
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>

            {/* ── 卡片三：性别 + 绝育状态 ── */}
            <div className="bg-white rounded-2xl px-5 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.04)] mb-3">
              {/* 性别 */}
              <div className="flex items-center justify-between py-4 border-b border-gray-100">
                <span className="text-[15px] text-gray-700 font-medium min-w-[70px]">
                  性别 <span className="text-[#E8721A]">*</span>
                </span>
                <div className="flex items-center gap-6">
                  {([{ value: 'male', label: '公猫' }, { value: 'female', label: '母猫' }] as const).map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => updateForm('gender', value)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 shrink-0 ${
                          form.gender === value
                            ? 'border-[#E8721A] bg-[#E8721A]'
                            : 'border-gray-300 bg-white'
                        }`}
                        aria-label={label}
                      >
                        {form.gender === value && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </button>
                      <span className="text-[15px] text-gray-800">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 绝育状态 */}
              <div className="flex items-center justify-between py-4">
                <div className="min-w-[70px]">
                  <div className="text-[15px] text-gray-700 font-medium">
                    绝育状态 <span className="text-[#E8721A]">*</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">影响热量需求</div>
                </div>
                <div className="flex items-center gap-6">
                  {([{ value: true, label: '已绝育' }, { value: false, label: '未绝育' }] as const).map(({ value, label }) => (
                    <label key={String(value)} className="flex items-center gap-2 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => updateForm('neutered', value)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 shrink-0 ${
                          form.neutered === value
                            ? 'border-[#E8721A] bg-[#E8721A]'
                            : 'border-gray-300 bg-white'
                        }`}
                        aria-label={label}
                      >
                        {form.neutered === value && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </button>
                      <span className="text-[15px] text-gray-800">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* ── 底部固定按钮 ── */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 z-30">
              <div className="max-w-[640px] mx-auto">
                <button
                  type="button"
                  onClick={step1Valid ? goToStep2 : undefined}
                  className={`w-full font-medium text-[16px] py-3.5 rounded-full transition-all flex items-center justify-center gap-1 ${
                    step1Valid
                      ? 'bg-[#E8721A] text-white shadow-[0_4px_14px_rgba(232,114,26,0.35)] active:scale-[0.98]'
                      : 'bg-[#E8721A]/40 text-white cursor-not-allowed'
                  }`}
                >
                  下一步：选择健康需求
                  <svg className="w-4 h-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1 BottomSheets ── */}

        {/* 品种选择 BottomSheet */}
        <BottomSheet
          isOpen={activePicker === 'breed'}
          onClose={() => { setActivePicker('none'); setBreedSearch('') }}
          title="选择品种"
        >
          <div className="p-4 pt-3 pb-8">
            {/* 搜索框 */}
            <div className="relative mb-4">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={breedSearch}
                onChange={(e) => setBreedSearch(e.target.value)}
                placeholder="搜索品种，例如：英短、橘猫..."
                style={{ fontSize: '16px' }}
                className="w-full bg-gray-100 rounded-full py-2.5 pl-10 pr-4 outline-none text-gray-900 placeholder:text-gray-400 focus:bg-gray-200 transition-colors"
              />
            </div>
            {/* 品种标签 */}
            <div className="flex flex-wrap gap-2.5">
              {filteredBreeds.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    updateForm('breed', b)
                    setActivePicker('none')
                    setBreedSearch('')
                  }}
                  className={`px-4 py-2.5 rounded-full text-[14px] transition-all duration-200 border ${
                    form.breed === b
                      ? 'bg-orange-50 border-[#E8721A] text-[#E8721A] font-medium shadow-sm'
                      : 'bg-white border-gray-200 text-gray-700 active:bg-gray-50'
                  }`}
                >
                  {b}
                </button>
              ))}
              {filteredBreeds.length === 0 && (
                <p className="text-[14px] text-gray-400 py-4 w-full text-center">未找到匹配品种</p>
              )}
            </div>
          </div>
        </BottomSheet>

        {/* 生日 WheelPicker BottomSheet */}
        <BottomSheet
          isOpen={activePicker === 'birthday'}
          onClose={() => setActivePicker('none')}
          onConfirm={handleConfirmBirthday}
          title="选择出生日期"
        >
          <div className="flex px-4 py-2 pb-6">
            <WheelPickerColumn
              options={yearOptions}
              value={tempDate.year}
              onChange={(v) => setTempDate((d) => ({ ...d, year: v, month: Math.min(d.month, v === currentYear ? currentMonth : 12) }))}
              unit="年"
            />
            <WheelPickerColumn
              options={monthOptions}
              value={tempDate.month}
              onChange={(v) => setTempDate((d) => ({ ...d, month: v }))}
              unit="月"
            />
            <WheelPickerColumn
              options={dayOptions}
              value={tempDate.day}
              onChange={(v) => setTempDate((d) => ({ ...d, day: v }))}
              unit="日"
            />
          </div>
        </BottomSheet>

        {/* 体重 BottomSheet */}
        <BottomSheet
          isOpen={activePicker === 'weight'}
          onClose={() => setActivePicker('none')}
          onConfirm={handleConfirmWeight}
          title="选择体重"
        >
          <div className="py-8 px-6 pb-10 flex flex-col items-center">
            {/* 大数字输入 */}
            <div className="flex items-baseline mb-10">
              <input
                type="number"
                value={tempWeight}
                onChange={(e) => {
                  // 允许空态：用户删除全部时保持空字符串，方便重新输入
                  const raw = e.target.value
                  if (raw === '' || raw === '-') {
                    setTempWeight('')
                    return
                  }
                  const v = parseFloat(raw)
                  if (!isNaN(v)) {
                    setTempWeight(String(Math.min(20, Math.max(0, v))))
                  }
                }}
                step="0.1"
                min="0"
                max="20"
                placeholder="--"
                style={{ fontSize: '44px', fontWeight: 700 }}
                className="w-32 text-center bg-transparent outline-none border-b-2 border-orange-200 focus:border-[#E8721A] transition-colors pb-1 text-gray-900 placeholder:text-gray-300"
              />
              <span className="text-[18px] text-gray-500 ml-2 font-medium">kg</span>
            </div>
            {/* Range Slider */}
            <div className="w-full px-2">
              <input
                type="range"
                min="0"
                max="20"
                step="0.1"
                value={sliderValue}
                onChange={(e) => setTempWeight(e.target.value)}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#E8721A]"
                style={{
                  background: `linear-gradient(to right, #E8721A ${(sliderValue / 20) * 100}%, #e5e7eb ${(sliderValue / 20) * 100}%)`
                }}
              />
              <div className="flex justify-between text-[12px] text-gray-400 mt-3 font-medium">
                <span>0</span>
                <span>5 kg</span>
                <span>10 kg</span>
                <span>15 kg</span>
                <span>20 kg</span>
              </div>
            </div>
          </div>
        </BottomSheet>

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
              <h1 className="text-[22px] md:text-[28px] font-bold text-[#1A1815]">
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

            {/* 已选摘要卡（始终显示，对齐 Figma） */}
            <div className="bg-white border border-orange-100 rounded-xl p-4">
              <div className="text-[13px] text-gray-600 mb-3">已选择 {healthTags.length} 项需求：</div>
              {healthTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {healthTags.map((tag) => (
                    <span key={tag} className="px-3 py-1.5 bg-white border border-orange-200 text-orange-600 rounded-full text-[12px] font-medium">
                      {HEALTH_TAG_CONFIG[tag]?.label ?? tag}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-[13px] text-gray-400 italic">尚未选择任何需求</div>
              )}
            </div>

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

        {/* ── Step 3：Loading + 增量渲染 ── */}
        {!initializing && step === 3 && (
          <div className="space-y-6">
            <LoadingState catName={form.name || '你的猫'} streamProgress={streamProgress} />

            {/* 冲突纠偏提示：SSE conflicts 事件到达后立即显示 */}
            {streamConflicts.length > 0 && (
              <div className="animate-slide-up space-y-3">
                {streamConflicts.map((conflict, idx) => (
                  <div key={idx} className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                    <div className="flex gap-3">
                      <span className="text-blue-500 text-xl shrink-0">🔍</span>
                      <div>
                        <p className="text-[14px] font-semibold text-blue-800 mb-1">营养方案已为您调整</p>
                        <p className="text-[13px] text-blue-700 leading-relaxed">{conflict.message}</p>
                        {conflict.correctedTag && (
                          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                            <span className="text-[12px] text-blue-600 bg-blue-100 line-through px-2.5 py-1 rounded-full">
                              {HEALTH_TAG_CONFIG[conflict.originalTag]?.emoji} {HEALTH_TAG_CONFIG[conflict.originalTag]?.label}
                            </span>
                            <span className="text-blue-400 text-[12px]">→</span>
                            <span className="text-[12px] text-blue-800 bg-blue-200 font-medium px-2.5 py-1 rounded-full">
                              {HEALTH_TAG_CONFIG[conflict.correctedTag]?.emoji} {HEALTH_TAG_CONFIG[conflict.correctedTag]?.label}
                            </span>
                          </div>
                        )}
                        {!conflict.correctedTag && (
                          <div className="mt-2.5">
                            <span className="text-[12px] text-blue-600 bg-blue-100 line-through px-2.5 py-1 rounded-full">
                              {HEALTH_TAG_CONFIG[conflict.originalTag]?.emoji} {HEALTH_TAG_CONFIG[conflict.originalTag]?.label}（已移除）
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Phase3: 增量渲染已到达的推荐卡片 */}
            {streamedDryItems.length > 0 && (
              <div className="animate-slide-up space-y-3">
                <h3 className="text-[15px] font-semibold text-[#1A1815] flex items-center gap-2">
                  🥣 主粮推荐
                  <span className="text-[12px] font-normal text-[#A8A49C]">已找到 {streamedDryItems.length} 款</span>
                </h3>
                {streamedDryItems.map((item, idx) => (
                  <div key={item.product.id || idx} className="animate-slide-up">
                    <ProductCard recommendation={item} isTop={idx === 0} />
                  </div>
                ))}
              </div>
            )}

            {streamedWetItems.length > 0 && (
              <div className="animate-slide-up space-y-3">
                <h3 className="text-[15px] font-semibold text-[#1A1815] flex items-center gap-2">
                  🥫 湿粮/罐头推荐
                  <span className="text-[12px] font-normal text-[#A8A49C]">已找到 {streamedWetItems.length} 款</span>
                </h3>
                {streamedWetItems.map((item, idx) => (
                  <div key={item.product.id || idx} className="animate-slide-up">
                    <ProductCard recommendation={item} isTop={idx === 0} />
                  </div>
                ))}
              </div>
            )}

            {/* 全部完成提示 */}
            {streamDone && (
              <div className="animate-slide-up text-center py-4">
                <p className="text-[14px] text-[#78746C]">✅ 推荐生成完毕，正在跳转完整结果页...</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
