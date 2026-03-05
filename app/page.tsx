import Link from 'next/link'
import { AuthNav } from '@/components/auth/AuthNav'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FFF8F3]">
      {/* 导航栏 */}
      <nav className="sticky top-0 z-50 bg-[#FFF8F3]/80 backdrop-blur-md border-b border-[#E8E6E1]">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 lg:px-16 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-[18px] text-[#1A1815]">
            <span className="text-2xl">🐾</span>
            <span>NutraPaw</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="#features"
              className="hidden md:block text-[14px] text-[#78746C] hover:text-[#E8721A] transition-colors px-3 py-2 rounded-lg"
            >
              了解更多
            </Link>
            <AuthNav />
            <Link
              href="/recommend"
              className="bg-[#E8721A] text-white px-5 py-2.5 rounded-xl text-[14px] font-semibold shadow-warm hover:bg-[#C45C0A] hover:-translate-y-px transition-all duration-150"
            >
              开始推荐
            </Link>
          </div>
        </div>
      </nav>

      {/* Bento Grid */}
      <section className="max-w-[1280px] mx-auto px-4 md:px-8 lg:px-16 py-10 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-5">

          {/* Item A：Hero 主卡片 */}
          <div className="lg:col-span-7 lg:row-span-2 min-h-[380px] bg-[#E8721A] rounded-3xl p-8 relative overflow-hidden flex flex-col justify-end">
            {/* 装饰背景 */}
            <div className="absolute top-0 right-0 text-[180px] opacity-10 leading-none select-none pointer-events-none translate-x-8 -translate-y-4">
              🐱
            </div>
            <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-white text-[12px] font-medium">
              AI 驱动 · 科学营养
            </div>

            {/* 内容 */}
            <div className="relative z-10">
              <h1 className="text-[36px] md:text-[44px] font-bold text-white leading-[1.15] tracking-tight mb-4">
                为你的猫，<br />
                定制专属营养方案
              </h1>
              <p className="text-[15px] text-white/80 mb-7 max-w-md leading-relaxed">
                基于品种、年龄、体重和健康状态，AI 为你精选最适合的猫粮和罐头。
                告别小红书刷帖焦虑，3 分钟获取专属推荐。
              </p>
              <Link
                href="/recommend"
                className="inline-flex items-center gap-2 bg-white text-[#E8721A] px-6 py-3.5 rounded-xl text-[16px] font-semibold hover:bg-[#FFF8F3] transition-colors shadow-lg"
              >
                立即为我的猫推荐
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Item B：数据卡 */}
          <div className="lg:col-span-3 min-h-[180px] bg-white border border-[#E8E6E1] rounded-2xl p-6 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="text-[48px] font-bold font-mono text-[#E8721A] leading-none">50+</div>
            <div>
              <div className="text-[16px] font-semibold text-[#2E2B27]">精选猫粮产品</div>
              <div className="text-[13px] text-[#78746C] mt-1">国产 + 进口主流品牌，人工筛选质量可信赖</div>
            </div>
          </div>

          {/* Item C：特性卡 */}
          <div className="lg:col-span-2 min-h-[180px] bg-[#F4F3F0] rounded-2xl p-6 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="text-4xl">🛡️</div>
            <div>
              <div className="text-[15px] font-semibold text-[#2E2B27]">科学依据</div>
              <div className="text-[12px] text-[#78746C] mt-1">成分数据来自官方配方，减少 AI 幻觉</div>
            </div>
          </div>

          {/* Item D：特性卡 */}
          <div className="lg:col-span-2 min-h-[180px] bg-[#FFF8F3] border border-[#FFD9B5] rounded-2xl p-6 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="text-4xl">🌿</div>
            <div>
              <div className="text-[15px] font-semibold text-[#2E2B27]">无广告推荐</div>
              <div className="text-[12px] text-[#78746C] mt-1">不接受品牌付费排名，推荐结果中立客观</div>
            </div>
          </div>

          {/* Item E：流程说明卡 */}
          <div className="lg:col-span-5 min-h-[180px] bg-white border border-[#E8E6E1] rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="text-[13px] font-semibold uppercase tracking-wide text-[#A8A49C] mb-4">
              简单三步
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-3">
              {[
                { icon: '📋', title: '填写信息', desc: '品种、年龄、体重' },
                { icon: '🏷️', title: '选择需求', desc: '泌尿道、减重等' },
                { icon: '✨', title: '获取方案', desc: 'AI 生成专属推荐' },
              ].map((step, i) => (
                <div key={i} className="flex flex-row sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                  <div className="text-3xl">{step.icon}</div>
                  <div className="text-[14px] font-semibold text-[#2E2B27]">{step.title}</div>
                  <div className="text-[11px] text-[#A8A49C]">{step.desc}</div>
                  {i < 2 && (
                    <div className="absolute hidden lg:block text-[#D1CEC7] text-xl">→</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Item F：品牌信任带 */}
          <div id="features" className="lg:col-span-12 bg-[#F4F3F0] rounded-2xl p-5">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <span className="text-[13px] font-semibold text-[#A8A49C] uppercase tracking-wide shrink-0">
                已收录品牌
              </span>
              <div className="flex flex-wrap gap-3">
                {['希尔斯', '皇家', '冠能 Pro Plan', '渴望 Orijen', '爱肯拿 Acana', '法迪纳 Farmina', '卫仕', '比乐', '麦富迪'].map((brand) => (
                  <span key={brand} className="text-[13px] text-[#A8A49C] bg-white px-3 py-1.5 rounded-lg border border-[#E8E6E1]">
                    {brand}
                  </span>
                ))}
                <span className="text-[13px] text-[#A8A49C]">等 50+ 品牌</span>
              </div>
            </div>
          </div>

          {/* Item G：用户场景卡 */}
          <div className="lg:col-span-7 min-h-[220px] bg-white border border-[#E8E6E1] rounded-2xl p-7 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="text-[60px] text-[#FFD9B5] leading-none mb-4">&ldquo;</div>
            <blockquote className="text-[16px] text-[#4A4641] leading-relaxed mb-5 -mt-4">
              我家猫刚确诊尿结石，在小红书刷了三天帖子还是不知道该买什么。用 NutraPaw 三分钟就拿到了专门针对泌尿道问题的推荐，还解释了为什么。
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#FFD9B5] rounded-full flex items-center justify-center text-lg">🐱</div>
              <div>
                <div className="text-[14px] font-semibold text-[#2E2B27]">橘子妈妈</div>
                <div className="text-[12px] text-[#A8A49C]">英国短毛猫主人 · 3年</div>
              </div>
            </div>
          </div>

          {/* Item H：黑色 CTA 卡 */}
          <div className="lg:col-span-5 min-h-[220px] bg-[#1A1815] rounded-2xl p-7 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div>
              <h3 className="text-[22px] font-bold text-white leading-tight">
                3 分钟，获取<br />
                <span className="text-[#FFB87A]">你家猫的专属食谱</span>
              </h3>
              <p className="text-[13px] text-[#78746C] mt-3">免费使用，无需注册</p>
            </div>
            <Link
              href="/recommend"
              className="inline-flex items-center justify-center gap-2 bg-[#E8721A] text-white px-6 py-3.5 rounded-xl text-[15px] font-semibold shadow-warm hover:bg-[#C45C0A] transition-all duration-150"
            >
              开始免费推荐 ✨
            </Link>
          </div>

        </div>
      </section>

      {/* 页脚 */}
      <footer className="border-t border-[#E8E6E1] mt-16 py-8">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 lg:px-16 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-[#A8A49C] text-[13px]">
            <span>🐾</span>
            <span>NutraPaw — 猫咪营养顾问</span>
          </div>
          <p className="text-[12px] text-[#A8A49C] text-center md:text-right max-w-md">
            本站推荐仅供参考，不构成兽医建议。处方粮须在兽医指导下使用。
          </p>
        </div>
      </footer>
    </div>
  )
}
