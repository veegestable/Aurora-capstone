import { useState } from 'react'

type PillKey = 'days' | 'checkins' | 'streak'

type Props = {
  daysLogged: number
  periodDays: number
  checkIns: number
  bestStreak: number
  /** Third-person copy for counselor student profile (mobile parity). */
  audience?: 'student' | 'counselor'
}

export function JournalPeriodMetricPills({
  daysLogged,
  periodDays,
  checkIns,
  bestStreak,
  audience = 'student',
}: Props) {
  const [activePill, setActivePill] = useState<PillKey | null>(null)

  const pills: { key: PillKey; label: string; value: string }[] = [
    { key: 'days', label: 'Days logged', value: `${daysLogged}/${periodDays}` },
    { key: 'checkins', label: 'Check-ins', value: String(checkIns) },
    { key: 'streak', label: 'Best streak', value: String(bestStreak) },
  ]

  const explainer =
    activePill === 'days'
      ? audience === 'counselor'
        ? `This student logged on ${daysLogged} of the last ${periodDays} days.`
        : `${daysLogged} out of ${periodDays} days had at least one mood check-in.`
      : activePill === 'checkins'
        ? audience === 'counselor'
          ? `${checkIns} mood check-in${checkIns === 1 ? '' : 's'} in the last ${periodDays} days.`
          : `You logged ${checkIns} mood entries in the last ${periodDays} days.`
        : activePill === 'streak'
          ? audience === 'counselor'
            ? `Longest consecutive logging streak in this window: ${bestStreak} day${bestStreak === 1 ? '' : 's'}.`
            : `Your longest check-in streak in the last ${periodDays} days was ${bestStreak} day${bestStreak === 1 ? '' : 's'}.`
          : null

  return (
    <div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {pills.map((pill) => {
          const active = activePill === pill.key
          return (
            <button
              key={pill.key}
              type="button"
              onClick={() => setActivePill((prev) => (prev === pill.key ? null : pill.key))}
              className={`min-w-[113px] shrink-0 rounded-[18px] border px-3.5 py-3 text-left transition-all cursor-pointer ${
                active
                  ? 'border-aurora-blue bg-[rgba(45,107,255,0.18)] shadow-[0_6px_10px_rgba(45,107,255,0.28)]'
                  : 'border-white/10 bg-[rgba(15,24,64,0.88)] shadow-[0_6px_8px_rgba(0,0,0,0.18)]'
              }`}
            >
              <p className="text-[10px] font-extrabold tracking-wide text-[#9AA9C8] uppercase">
                {pill.label}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-white tabular-nums">{pill.value}</p>
            </button>
          )
        })}
      </div>
      {explainer ? (
        <div className="mt-3 rounded-xl border border-aurora-blue/30 bg-[rgba(45,107,255,0.12)] px-3 py-2.5">
          <p className="text-xs leading-relaxed text-[#C1CEE9]">{explainer}</p>
        </div>
      ) : null}
    </div>
  )
}
