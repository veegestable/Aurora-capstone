// Firebase-based schedule service for Aurora
import { firestoreService } from "./firebase-firestore.service";
import { auth } from "./firebase";

export interface ScheduleData {
  title?: string;
  event_type: "exam" | "deadline" | "meeting" | "other";
  event_date: string;
  description?: string;
}

export const scheduleService = {
  async createSchedule(_userId: string, data: ScheduleData) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      console.log("🔥 Creating schedule for user:", user.uid);

      const schedule = await firestoreService.createSchedule(
        {
          title: data.title || "",
          description: data.description || "",
          event_date: new Date(data.event_date),
          event_type: data.event_type,
        },
        user.uid,
      );

      console.log("✅ Schedule created successfully");
      return {
        id: schedule.id,
        title: data.title || "",
        description: data.description || "",
        event_date: data.event_date,
        event_type: data.event_type,
      };
    } catch (error) {
      console.error("❌ Error creating schedule:", error);
      throw error;
    }
  },

  async getSchedules(_userId?: string, startDate?: string, endDate?: string) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      console.log("🔥 Fetching schedules for user:", user.uid);

      const startDateObj = startDate ? new Date(startDate) : undefined;
      const endDateObj = endDate ? new Date(endDate) : undefined;

      const schedules = await firestoreService.getSchedules(
        user.uid,
        startDateObj,
        endDateObj,
      );

      // Convert schedules to expected format
      const formattedSchedules = schedules.map((schedule: any) => ({
        id: schedule.id,
        title: schedule.title || "",
        description: schedule.description || "",
        event_date:
          schedule.event_date instanceof Date
            ? schedule.event_date.toISOString()
            : new Date(schedule.event_date.toDate()).toISOString(),
        event_type: schedule.event_type,
      }));

      console.log(
        "✅ Schedules fetched:",
        formattedSchedules.length,
        "entries",
      );
      return formattedSchedules;
    } catch (error) {
      console.error("❌ Error fetching schedules:", error);
      throw error;
    }
  },

  async updateSchedule(scheduleId: string, data: Partial<ScheduleData>) {
    try {
      console.log("🔥 Updating schedule:", scheduleId);

      const updateData: any = { ...data };
      if (data.event_date) {
        updateData.event_date = new Date(data.event_date);
      }

      await firestoreService.updateSchedule(scheduleId, updateData);

      console.log("✅ Schedule updated successfully");
      return {
        id: scheduleId,
        ...data,
      };
    } catch (error) {
      console.error("❌ Error updating schedule:", error);
      throw error;
    }
  },

  async deleteSchedule(scheduleId: string) {
    try {
      console.log("🔥 Deleting schedule:", scheduleId);

      await firestoreService.deleteSchedule(scheduleId);

      console.log("✅ Schedule deleted successfully");
      return { message: "Schedule deleted successfully" };
    } catch (error) {
      console.error("❌ Error deleting schedule:", error);
      throw error;
    }
  },
};
