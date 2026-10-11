export interface ChartBar {
  label: string
  value: number
  hint: string
}

export default function BarChart({ bars, height = 180 }: { bars: ChartBar[]; height?: number }) {
  const max = Math.max(1, ...bars.map((b) => b.value))
  const labelEvery = Math.max(1, Math.ceil(bars.length / 7))

  if (bars.length === 0) {
    return <div className="grid h-40 place-items-center text-sm text-slate-400">لا توجد بيانات بعد</div>
  }

  return (
    <div>
      <div className="flex items-end gap-1" style={{ height }}>
        {bars.map((b, i) => (
          <div
            key={`${b.label}-${i}`}
            className="group relative flex h-full flex-1 flex-col justify-end"
            title={b.hint}
          >
            <div
              className="w-full origin-bottom rounded-t-md shadow-md shadow-indigo-500/20 transition-all duration-300 group-hover:brightness-110"
              style={{
                height: `${Math.max(3, (b.value / max) * 100)}%`,
                backgroundImage: 'linear-gradient(180deg, #9681f8 0%, #8663f1 45%, #ac3aed 100%)',
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1 text-[10px] text-slate-400">
        {bars.map((b, i) => (
          <div key={`label-${b.label}-${i}`} className="flex-1 text-center">
            {i % labelEvery === 0 ? b.label.slice(5) : ''}
          </div>
        ))}
      </div>
    </div>
  )
}
