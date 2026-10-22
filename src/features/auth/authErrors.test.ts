import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './authErrors';

describe('authErrorMessage', () => {
  it('translates Firebase auth errors', () => {
    expect(authErrorMessage({ code: 'auth/invalid-credential' })).toBe(
      'E-mail ou mot de passe incorrect.',
    );
    expect(authErrorMessage({ code: 'auth/weak-password' })).toMatch(/6 caractères/);
    expect(authErrorMessage({ code: 'auth/whatever' })).toBe('La connexion a échoué. Réessayez.');
  });

  it('stays silent when the user closes the popup', () => {
    expect(authErrorMessage({ code: 'auth/popup-closed-by-user' })).toBeNull();
  });
});
