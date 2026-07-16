import type { Profile, SupervisorPermission } from "../types/firestore";

/** true si le superviseur a le droit `key`. Absent/null = tout autorisé (rétrocompatible avec les comptes déjà créés). */
export function hasPermission(profile: Pick<Profile, "permissions"> | null | undefined, key: SupervisorPermission): boolean {
  return profile?.permissions?.[key] ?? true;
}

export const SUPERVISOR_PERMISSION_GROUPS: { title: string; items: { key: SupervisorPermission; label: string }[] }[] = [
  {
    title: "Bénéficiaire",
    items: [
      { key: "beneficiary_create", label: "Enregistrer un bénéficiaire" },
      { key: "beneficiary_edit", label: "Modifier un bénéficiaire (statut KYC)" },
      { key: "beneficiary_deactivate", label: "Désactiver un bénéficiaire" },
    ],
  },
  {
    title: "Groupe",
    items: [
      { key: "group_create", label: "Créer un groupe" },
      { key: "group_edit", label: "Modifier un groupe" },
      { key: "group_delete", label: "Supprimer un groupe" },
    ],
  },
  {
    title: "Cotisation",
    items: [{ key: "contribution_collect", label: "Collecter une cotisation" }],
  },
  {
    title: "Consultation",
    items: [
      { key: "view_beneficiaries", label: "Voir la liste des bénéficiaires" },
      { key: "view_totals", label: "Voir les totaux cotisés" },
      { key: "view_groups", label: "Voir les groupes" },
    ],
  },
];
