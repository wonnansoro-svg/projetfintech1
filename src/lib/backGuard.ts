import { useEffect, useRef } from "react";

/**
 * Piège le bouton retour (physique/geste mobile) tant que `active` est vrai :
 * pousse une entrée d'historique et déclenche `onBack` sur popstate au lieu de
 * laisser le navigateur/l'app quitter l'écran courant. Si l'écran ou la modale
 * se ferme via l'UI (pas via le bouton retour), l'entrée poussée est consommée
 * pour éviter un double retour la fois suivante.
 */
export function useBackGuard(active: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!active) return;
    let consumedByPopstate = false;
    window.history.pushState({ coopavecGuard: true }, "");
    const handler = () => { consumedByPopstate = true; onBackRef.current(); };
    window.addEventListener("popstate", handler);
    return () => {
      window.removeEventListener("popstate", handler);
      if (!consumedByPopstate) window.history.back();
    };
  }, [active]);
}
