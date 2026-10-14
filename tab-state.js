export const getTabStateKey = tabId => `tabState:${tabId}`;

export class TabSearchRegistry {
  constructor() {
    this.versions = new Map();
  }

  begin(tabId, storedVersion = 0) {
    const requestId = Math.max(this.versions.get(tabId) || 0, Number.isSafeInteger(storedVersion) ? storedVersion : 0) + 1;
    this.versions.set(tabId, requestId);
    return requestId;
  }

  isCurrent(tabId, requestId) {
    return this.versions.get(tabId) === requestId;
  }

  clear(tabId) {
    this.versions.delete(tabId);
  }
}

export function getPageKey(value) {
  try {
    const url = new URL(value);
    const tracking = new Set(['gclid','dclid','fbclid','msclkid','ttclid','twclid','_ga','_gl','referrer','affiliate','affiliate_id','aff_id','mc_cid','mc_eid']);
    for (const key of [...url.searchParams.keys()]) if (key.toLowerCase().startsWith('utm_') || tracking.has(key.toLowerCase())) url.searchParams.delete(key);
    url.searchParams.sort();
    if (!/^#(?:!\/|\/)/.test(url.hash)) url.hash = '';
    return url.toString();
  } catch { return null; }
}
