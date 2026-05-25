import { AppText as Text } from "../common/AppText";
/**
 * College picker + per-program roster charts (students + special population).
 */

import { useState } from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { AURORA } from "../../constants/aurora-colors";
import { COLLEGES, getCollegeName, type CollegeCode } from "../../constants/colleges";
import type { CollegeRosterCountsSnapshot } from "../../utils/admin/collegeRosterCounts";
import { AdminCollegeCountBarChart } from "./AdminCollegeCountBarChart";

const DEFAULT_COLLEGE: CollegeCode = "CCS";

type Props = {
  roster: CollegeRosterCountsSnapshot;
};

export function AdminCollegeProgramAnalytics({ roster }: Props) {
  const [selectedCollege, setSelectedCollege] =
    useState<CollegeCode>(DEFAULT_COLLEGE);

  const programRoster = roster.programByCollege[selectedCollege];
  const collegeName = getCollegeName(selectedCollege);

  return (
    <View style={{ marginTop: 4 }}>
      <Text style={styles.section}>Roster by program</Text>
      <Text style={styles.hint}>
        Choose a college to see degree-program counts for that unit only.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {COLLEGES.map((row) => {
          const active = selectedCollege === row.code;
          const total = roster.programByCollege[row.code]?.totalInCollege ?? 0;
          return (
            <TouchableOpacity
              key={row.code}
              onPress={() => setSelectedCollege(row.code)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${row.code}, ${total} students`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {row.code}
                {total > 0 ? ` (${total})` : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* <Text style={styles.collegeTitle}>
        {selectedCollege} — {collegeName}
      </Text>
      <Text style={styles.hint}>
        {programRoster.totalInCollege} student(s) in this college
        {programRoster.totalSpecialInCollege > 0
          ? ` · ${programRoster.totalSpecialInCollege} in special population`
          : ""}
        . Scroll charts for longer program lists.
      </Text> */}

      <AdminCollegeCountBarChart
        title="Students per program"
        caption=''
        points={programRoster.studentsByProgram}
        barColor={AURORA.green}
        xSlot={64}
        emptyHint={`No students assigned to ${selectedCollege} yet.`}
      />
      <AdminCollegeCountBarChart
        title="Special population per program"
        caption=''
        points={programRoster.specialPopulationByProgram}
        barColor={AURORA.purple}
        xSlot={64}
        emptyHint="No special population students in this college yet."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    color: AURORA.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  hint: {
    color: AURORA.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  chipRow: {
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AURORA.border,
    backgroundColor: AURORA.card,
  },
  chipActive: {
    borderColor: "rgba(45,107,255,0.55)",
    backgroundColor: "rgba(45,107,255,0.14)",
  },
  chipText: {
    color: AURORA.textSec,
    fontSize: 13,
    fontWeight: "700",
  },
  chipTextActive: {
    color: AURORA.blue,
  },
  collegeTitle: {
    color: AURORA.textPrimary,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
});
