/** Vibration courte de confirmation — no-op silencieux si l'appareil/navigateur ne supporte pas l'API. */
export function vibrate(pattern: number | number[] = 15): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Certains navigateurs (iOS Safari) n'exposent pas l'API — on ignore.
  }
}
