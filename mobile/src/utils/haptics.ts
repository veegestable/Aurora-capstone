import * as Haptics from 'expo-haptics';

const styleMap = { light: Haptics.ImpactFeedbackStyle.Light, medium: Haptics.ImpactFeedbackStyle.Medium, heavy: Haptics.ImpactFeedbackStyle.Heavy };

export function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  try {
    Haptics.impactAsync(styleMap[style]);
  } catch {
    // Haptics not supported (e.g. web/simulator)
  }
}

export function triggerHapticSuccess() {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Haptics not supported
  }
}

export function triggerHapticSelection() {
  try {
    Haptics.selectionAsync();
  } catch {
    // Haptics not supported
  }
}
