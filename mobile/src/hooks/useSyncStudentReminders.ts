import { useEffect } from "react";
import {
  clearDailyCheckInReminder,
  clearWellnessRoutineReminders,
  scheduleDailyCheckInReminder,
  scheduleWellnessRoutineReminders,
} from "../services/push-notifications.service";
import { useUserDaySettings } from "../stores/UserDaySettingsContext";

export function useSyncStudentReminders(opts?: {
  onPermissionDenied?: () => void;
}): void {
  const {
    reminderHour,
    reminderMinute,
    remindersEnabled,
    mealSchedule,
    usualWakeTime,
    usualBathTime,
    loading: settingsLoading,
  } = useUserDaySettings();

  const onPermissionDenied = opts?.onPermissionDenied;

  useEffect(() => {
    if (settingsLoading) return;
    const run = async () => {
      if (!remindersEnabled) {
        await clearDailyCheckInReminder();
        await clearWellnessRoutineReminders();
        return;
      }
      const [checkInOk, routineOk] = await Promise.all([
        scheduleDailyCheckInReminder(reminderHour, reminderMinute),
        scheduleWellnessRoutineReminders({
          usualWakeTime,
          usualBathTime,
          mealSchedule,
        }),
      ]);
      if ((!checkInOk || !routineOk) && onPermissionDenied) {
        onPermissionDenied();
      }
    };
    void run();
  }, [
    remindersEnabled,
    reminderHour,
    reminderMinute,
    usualWakeTime,
    usualBathTime,
    mealSchedule,
    settingsLoading,
    onPermissionDenied,
  ]);
}
