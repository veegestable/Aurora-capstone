import AsyncStorage from "@react-native-async-storage/async-storage";

const key = (userId: string) => `aurora.v1.counselorHomeTour.completed:${userId}`;

export async function isCounselorHomeTourCompleted(
  userId: string,
): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(key(userId));
    return v === "1";
  } catch {
    return false;
  }
}

export async function markCounselorHomeTourCompleted(
  userId: string,
): Promise<void> {
  await AsyncStorage.setItem(key(userId), "1");
}
