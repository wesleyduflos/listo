const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
  'auth/wrong-password': 'E-mail ou mot de passe incorrect.',
  'auth/user-not-found': 'E-mail ou mot de passe incorrect.',
  'auth/invalid-email': 'Adresse e-mail invalide.',
  'auth/missing-password': 'Saisissez votre mot de passe.',
  'auth/email-already-in-use': 'Un compte existe déjà avec cette adresse. Connectez-vous.',
  'auth/weak-password': 'Mot de passe trop court : 6 caractères minimum.',
  'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
  'auth/user-disabled': 'Ce compte est désactivé.',
  'auth/operation-not-allowed': 'Ce mode de connexion n’est pas activé dans Firebase.',
  'auth/network-request-failed': 'Connexion impossible hors ligne.',
  'auth/account-exists-with-different-credential':
    'Cette adresse est déjà liée à un autre mode de connexion.',
};

/** Popup dismissals are not errors worth showing. */
const SILENT = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

export function authErrorMessage(e: unknown): string | null {
  const code = (e as { code?: string })?.code ?? '';
  if (SILENT.has(code)) return null;
  return MESSAGES[code] ?? 'La connexion a échoué. Réessayez.';
}
