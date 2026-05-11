import AsyncStorage from "@react-native-async-storage/async-storage";

const key = (userId: string) => `aurora.v1.studentHomeTour.completed:${userId}`;

export async function isStudentHomeTourCompleted(
  userId: string,
): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(key(userId));
    return v === "1";
  } catch {
    return false;
  }
}

export async function markStudentHomeTourCompleted(
  userId: string,
): Promise<void> {
  await AsyncStorage.setItem(key(userId), "1");
}
