// Salva somente qual apelido foi escolhido. Nunca guarda e-mail ou senha.
export const PROFILE_OPTIONS = ['Rayssa.Lima', 'Marcos.Paulo'] as const;
export type ProfileOption = typeof PROFILE_OPTIONS[number];

export const REMEMBERED_PROFILE_KEY = 'album-rm:profile:v2';
const LEGACY_ACCOUNTS_KEY = 'album-rm:remembered-accounts:v1';

export function isProfileOption(value: unknown): value is ProfileOption {
  return typeof value === 'string' && PROFILE_OPTIONS.some(profile => profile === value);
}

export function readRememberedProfile(store?: Pick<Storage,'getItem'>): string {
  if (!store) return '';
  try {
    const value = store.getItem(REMEMBERED_PROFILE_KEY);
    if (isProfileOption(value)) return value;
    // Existing devices may have the previous preference format.
    const legacy = store.getItem(LEGACY_ACCOUNTS_KEY);
    if (!legacy) return '';
    const prefs = JSON.parse(legacy) as { lastProfile?: unknown };
    return isProfileOption(prefs.lastProfile) ? prefs.lastProfile : '';
  } catch { return ''; }
}

export function writeRememberedProfile(
  store: Pick<Storage,'setItem'|'removeItem'> | undefined,
  alias: string,
  remember: boolean
): void {
  if (!store) return;
  try {
    // Remove the old preference which contained e-mails for each device.
    store.removeItem(LEGACY_ACCOUNTS_KEY);
    if (remember && isProfileOption(alias)) store.setItem(REMEMBERED_PROFILE_KEY, alias);
    else store.removeItem(REMEMBERED_PROFILE_KEY);
  } catch { /* private mode / restricted storage must not break sign-in */ }
}

export function getAvailableStorage(): Storage | undefined {
  try { return typeof window === 'undefined' ? undefined : window.localStorage; }
  catch { return undefined; }
}
