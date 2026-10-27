import Link from 'next/link'

const plans = [
  ['Starter', '1.2% daily ROI', '30 days', '₦50k – ₦499k', 'A measured first step for building an investing habit.'],
  ['Gold', '1.8% daily ROI', '60 days', '₦500k – ₦4.9m', 'A balanced plan for steady, intentional growth.'],
  ['Diamond', '2.4% daily ROI', '90 days', '₦5m – ₦25m', 'A private wealth option for larger portfolios.'],
]

export default function PlansPage() {
  return <main className="min-h-screen bg-[#f4f8f3] px-5 py-8 text-[#101d1a] sm:px-8"><div className="mx-auto max-w-6xl"><Link href="/" className="font-bold text-[#0b4537]">Madallion fund</Link><div className="mt-20 max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#65a85c]">Full plan table</p><h1 className="mt-3 text-5xl font-semibold tracking-[-.06em] text-[#0b4537]">Choose your pace of growth.</h1><p className="mt-5 text-lg leading-8 text-[#60716b]">Every plan is designed around a clear timeline, a defined target, and transparent expectations.</p></div><div className="mt-12 grid gap-5 lg:grid-cols-3">{plans.map(([name, roi, duration, range, copy]) => <article key={name} className="glass-panel rounded-3xl p-7"><p className="text-sm font-semibold text-[#65a85c]">{name}</p><h2 className="mt-8 text-3xl font-semibold text-[#0b4537]">{roi}</h2><p className="mt-3 text-sm leading-6 text-[#708079]">{copy}</p><dl className="mt-8 space-y-4 border-t border-[#dfe8e2] pt-6 text-sm"><div className="flex justify-between"><dt className="text-[#829088]">Duration</dt><dd className="font-semibold text-[#0b4537]">{duration}</dd></div><div className="flex justify-between"><dt className="text-[#829088]">Range</dt><dd className="font-semibold text-[#0b4537]">{range}</dd></div></dl><Link href="/register" className="mt-8 block rounded-xl bg-[#0b4537] py-3 text-center text-sm font-semibold text-white">Start with {name}</Link></article>)}</div><p className="mt-10 text-xs leading-5 text-[#829088]">Returns shown are illustrative targets, not guarantees. Investment involves risk and capital may be at risk.</p></div></main>
}
