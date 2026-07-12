/** Lit un texte à voix haute en français — no-op silencieux si l'API n'est pas supportée. */
export function speak(text: string): void {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  } catch {
    // API présente mais indisponible sur cet appareil — on ignore.
  }
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
