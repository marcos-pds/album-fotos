// Preferências de interface locais: nunca armazenar senha ou token aqui.
export const PROFILE_OPTIONS = ['Rayssa.Lima', 'Marcos.Paulo'] as const;
export type ProfileOption = typeof PROFILE_OPTIONS[number];

export const REMEMBERED_ACCOUNTS_KEY = 'album-rm:remembered-accounts:v1';

export type RememberedAccounts = {
  lastProfile: string;
  emails: Record<string, string>;
};

const emptyPrefs = (): RememberedAccounts => ({ lastProfile: '', emails: {} });

export function readRememberedAccounts(store?: Pick<Storage, 'getItem'>): RememberedAccounts {
  if (!store) return emptyPrefs();
  try {
    const raw = store.getItem(REMEMBERED_ACCOUNTS_KEY);
    if (!raw) return emptyPrefs();
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return emptyPrefs();
    const data = saved as Record<string, unknown>;
    const emails: Record<string, string> = {};
    if (data.emails && typeof data.emails === 'object') {
      for (const alias of PROFILE_OPTIONS) {
        const email = (data.emails as Record<string, unknown>)[alias];
        if (typeof email === 'string' && email.length <= 254 && email.includes('@')) {
          emails[alias] = email;
        }
      }
    }
    return { lastProfile: PROFILE_OPTIONS.some(alias => alias === data.lastProfile) ? String(data.lastProfile) : '', emails };
  } catch { return emptyPrefs(); }
}

export function writeRememberedAccount(
  store: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | undefined,
  alias: string, email: string, remember: boolean
): void {
  if (!store || !PROFILE_OPTIONS.some(option => option === alias)) return;
  try {
    const prefs = readRememberedAccounts(store);
    if (remember) {
      prefs.lastProfile = alias;
      prefs.emails[alias] = email.trim().toLowerCase();
    } else {
      delete prefs.emails[alias];
      if (prefs.lastProfile === alias) prefs.lastProfile = '';
    }
    if (!Object.keys(prefs.emails).length) store.removeItem(REMEMBERED_ACCOUNTS_KEY);
    else store.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(prefs));
  } catch { /* storage may be unavailable: authentication still works */ }
}

export function getAvailableStorage(): Storage | undefined {
  try { return typeof window === 'undefined' ? undefined : window.localStorage; }
  catch { return undefined; }
}
