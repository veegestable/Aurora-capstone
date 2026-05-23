import { useState } from 'react'
import { COLLEGES, type CollegeCode, getCollegeName } from '../../constants/colleges'
import type { CollegeRosterCountsSnapshot } from '../../utils/admin/collegeRosterCounts'
import { CollegeCountBarChart } from './CollegeCountBarChart'

const DEFAULT_COLLEGE: CollegeCode = 'CCS'

type Props = {
  roster: CollegeRosterCountsSnapshot
}

export function CollegeProgramAnalytics({ roster }: Props) {
  const [selectedCollege, setSelectedCollege] = useState<CollegeCode>(DEFAULT_COLLEGE)
  const programRoster = roster.programByCollege[selectedCollege]
  const collegeName = getCollegeName(selectedCollege)

  return (
    <div className="space-y-3 pt-2">
      <div>
        <h3 className="text-base font-extrabold text-white">Roster by program</h3>
        <p className="text-xs text-aurora-text-sec mt-1">
          Choose a college to see degree-program counts for that unit only.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {COLLEGES.map((row) => {
          const active = selectedCollege === row.code
          const total = roster.programByCollege[row.code]?.totalInCollege ?? 0
          return (
            <button
              key={row.code}
              type="button"
              onClick={() => setSelectedCollege(row.code)}
              className={`px-3 py-1.5 rounded-full text-sm font-bold border transition-colors cursor-pointer ${
                active
                  ? 'border-aurora-blue/55 bg-aurora-blue/15 text-aurora-blue'
                  : 'border-aurora-border bg-aurora-card text-aurora-text-sec hover:border-aurora-border-light hover:text-white'
              }`}
            >
              {row.code}
              {total > 0 ? ` (${total})` : ''}
            </button>
          )
        })}
      </div>

      <p className="text-sm font-bold text-white">
        {selectedCollege} — {collegeName}
      </p>
      <p className="text-xs text-aurora-text-sec -mt-1">
        {programRoster.totalInCollege} student(s) in this college
        {programRoster.totalSpecialInCollege > 0
          ? ` · ${programRoster.totalSpecialInCollege} in special population`
          : ''}
        . Hover bars for full program names where truncated.
      </p>

      <CollegeCountBarChart
        title="Students per program"
        caption={`Active student accounts in ${selectedCollege} grouped by degree program.`}
        points={programRoster.studentsByProgram}
        barClassName="bg-aurora-green"
        minWidth={Math.max(520, programRoster.studentsByProgram.length * 56)}
        emptyHint={`No students assigned to ${selectedCollege} yet.`}
      />
      <CollegeCountBarChart
        title="Special population per program"
        caption={`Guidance session consent (journal access) within ${selectedCollege}.`}
        points={programRoster.specialPopulationByProgram}
        barClassName="bg-aurora-purple"
        minWidth={Math.max(520, programRoster.specialPopulationByProgram.length * 56)}
        emptyHint="No special population students in this college yet."
      />
    </div>
  )
}
