import type { ImageSourcePropType } from "react-native";
import { canonicalMoodKey } from "./moodColors";

const MOOD_ICON_BY_CANONICAL: Record<
  "joy" | "sadness" | "anger" | "surprise" | "neutral",
  ImageSourcePropType
> = {
  joy: require("../assets/moodIcon/happy.png"),
  sadness: require("../assets/moodIcon/sad.png"),
  anger: require("../assets/moodIcon/angry.png"),
  surprise: require("../assets/moodIcon/surprise.png"),
  neutral: require("../assets/moodIcon/neutral.png"),
};

/** PNG for Aurora's five mood families (`joy` → happy icon, etc.). */
export function getMoodIconSource(raw: string): ImageSourcePropType {
  const key = canonicalMoodKey(raw);
  if (key in MOOD_ICON_BY_CANONICAL) {
    return MOOD_ICON_BY_CANONICAL[key as keyof typeof MOOD_ICON_BY_CANONICAL];
  }
  return MOOD_ICON_BY_CANONICAL.neutral;
}
