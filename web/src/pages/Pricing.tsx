import { Link } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';

export default function Pricing() {
  const plans = [
    {
      name: '免费体验',
      price: '¥0',
      period: '',
      desc: '每天赠送免费次数',
      features: ['每天 1 次免费生成', '基础配音音色', '竖屏视频', '720P 画质'],
      cta: '免费开始',
      highlight: false,
    },
    {
      name: '标准版',
      price: '¥29',
      period: '/月',
      desc: '适合个人创作者',
      features: ['每月 50 条视频', '全部 8 种音色', '竖屏/横屏/方屏', '1080P 画质', '优先生成队列', '历史记录保存 30 天'],
      cta: '升级标准版',
      highlight: true,
    },
    {
      name: '专业版',
      price: '¥99',
      period: '/月',
      desc: '适合团队和工作室',
      features: ['不限次数生成', '全部音色 + 语速调节', '所有分辨率', '1080P 画质', '最高优先级', '永久保存', 'API 接入（开发者）', '专属客服'],
      cta: '升级专业版',
      highlight: false,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-3">简单透明的定价</h1>
        <p className="text-dark-400">选择适合你的方案，随时可以升级或降级</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl p-8 border ${
              plan.highlight
                ? 'border-primary-500 bg-primary-500/5 ring-1 ring-primary-500/20'
                : 'border-dark-700 bg-dark-800'
            }`}
          >
            {plan.highlight && (
              <div className="inline-flex items-center gap-1 bg-primary-500/20 text-primary-400 text-xs px-3 py-1 rounded-full mb-4">
                <Sparkles className="w-3 h-3" /> 最受欢迎
              </div>
            )}
            <h3 className="text-xl font-bold">{plan.name}</h3>
            <p className="text-dark-400 text-sm mt-1 mb-4">{plan.desc}</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">{plan.price}</span>
              <span className="text-dark-400">{plan.period}</span>
            </div>
            <ul className="space-y-3 mb-8">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                  <span className="text-dark-300">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/create"
              className={`block text-center py-3 rounded-xl font-medium transition ${
                plan.highlight
                  ? 'bg-primary-600 hover:bg-primary-700 text-white'
                  : 'border border-dark-600 hover:border-dark-500 text-dark-300 hover:text-white'
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="mt-20 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">常见问题</h2>
        <div className="space-y-4">
          {[
            { q: '免费次数每天会重置吗？', a: '是的，每天 0 点重置免费次数。' },
            { q: '生成的视频有水印吗？', a: '付费用户生成的视频无水印，免费用户会有小水印。' },
            { q: '可以随时取消订阅吗？', a: '可以，取消后当月剩余天数仍可正常使用。' },
            { q: '支持哪些支付方式？', a: '支持微信支付、支付宝。' },
            { q: '能开发票吗？', a: '专业版用户支持开具电子发票。' },
          ].map(({ q, a }) => (
            <div key={q} className="bg-dark-800 rounded-xl p-5 border border-dark-700">
              <h3 className="font-medium mb-2">{q}</h3>
              <p className="text-dark-400 text-sm">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
