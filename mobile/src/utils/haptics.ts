import * as Haptics from "expo-haptics";

/** Light tap for frequent, low-stakes toggles (like, save, chip select). */
export function hapticTap(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Confirms a completed action (booking confirmed, verification approved). */
export function hapticSuccess(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Signals a rejection/failure the user should notice (verification rejected, request failed). */
export function hapticError(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}

/** Medium tap for a deliberate, slightly heavier action (cancel, delete, submit). */
export function hapticImpact(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}
