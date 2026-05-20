import { Link } from 'react-router-dom';
import { Sparkles, Mic, Type, Download, Zap, Shield, Globe } from 'lucide-react';

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-500/10 text-primary-400 px-4 py-1.5 rounded-full text-sm mb-6">
          <Sparkles className="w-4 h-4" />
          AI 驱动 · 3 步出片
        </div>
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
          输入选题，<br />
          <span className="text-primary-500">一键生成短视频</span>
        </h1>
        <p className="text-dark-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
          AI 自动写脚本、配音、加字幕，帮你批量生产小红书、抖音、公众号视频内容。
          告别繁琐剪辑，每天轻松产出 10+ 条优质短视频。
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/create" className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3.5 rounded-xl text-lg font-medium transition shadow-lg shadow-primary-600/20">
            免费试用
          </Link>
          <Link to="/pricing" className="border border-dark-600 hover:border-dark-500 text-dark-300 px-8 py-3.5 rounded-xl text-lg transition">
            查看定价
          </Link>
        </div>
        <p className="text-dark-500 text-sm mt-4">新用户赠送 3 次免费生成</p>
      </section>

      {/* Steps */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">3 步生成短视频</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '01', icon: Sparkles, title: '输入选题', desc: '输入你想做的视频主题，AI 自动生成专业脚本，也可以自己编辑修改' },
            { step: '02', icon: Mic, title: '选择配音', desc: '8 种专业音色可选，男女声、播音腔、甜美风、霸气风，一键试听' },
            { step: '03', icon: Download, title: '生成下载', desc: 'AI 自动配音、生成字幕、合成视频，直接下载到手机发布' },
          ].map((item) => (
            <div key={item.step} className="bg-dark-800 rounded-2xl p-8 border border-dark-700 hover:border-dark-600 transition">
              <div className="text-primary-500 text-sm font-mono mb-4">STEP {item.step}</div>
              <item.icon className="w-10 h-10 text-primary-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">{item.title}</h3>
              <p className="text-dark-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">为什么选择我们</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Zap, title: '极速生成', desc: '1 分钟内完成脚本到成片，批量生产不在话下' },
            { icon: Mic, title: '真人级配音', desc: '8 种 AI 音色，听不出是机器生成的' },
            { icon: Type, title: '自动字幕', desc: '精准逐字字幕，自动匹配语音节奏' },
            { icon: Globe, title: '多平台适配', desc: '竖屏/横屏/方屏，适配抖音、B站、小红书' },
            { icon: Shield, title: '数据安全', desc: '你的内容只属于你，不会被用于训练' },
            { icon: Sparkles, title: '持续更新', desc: 'AI 生图、视频转绘等新功能持续上线中' },
          ].map((f) => (
            <div key={f.title} className="flex gap-4 p-6 rounded-xl bg-dark-800/50">
              <f.icon className="w-6 h-6 text-primary-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold mb-1">{f.title}</h3>
                <p className="text-dark-400 text-sm">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-gradient-to-r from-primary-600/20 to-purple-600/20 rounded-3xl p-12 border border-primary-500/20">
          <h2 className="text-3xl font-bold mb-4">立即开始创作</h2>
          <p className="text-dark-400 mb-8">注册即送 3 次免费生成，无需绑定信用卡</p>
          <Link to="/create" className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3.5 rounded-xl text-lg font-medium transition inline-block">
            免费创建第一条视频
          </Link>
        </div>
      </section>
    </div>
  );
}
