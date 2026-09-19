export const getTabStateKey = tabId => `tabState:${tabId}`;

export class TabSearchRegistry {
  constructor() {
    this.versions = new Map();
  }

  begin(tabId) {
    const requestId = (this.versions.get(tabId) || 0) + 1;
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
