export const SURVEY_KEY = 'piqoSurveyV1';
const DAY = 86400000;
export function recordCompletion(state = {}, searchId, now = Date.now()) {
  const recent = Array.isArray(state.recent) ? state.recent : [];
  if (!searchId || recent.includes(searchId)) return state;
  const day = new Date(now).toLocaleDateString('en-CA');
  return { ...state, count: Math.min(5, (state.count || 0) + 1),
    days: [...new Set([...(state.days || []), day])].slice(-3), recent: [...recent, searchId].slice(-50) };
}
export function isSurveyDue(state = {}, now = Date.now()) {
  return !state.answered && state.count >= 5 && state.days?.length >= 3 && (state.invites || 0) < 2
    && (!state.lastInvite || now - state.lastInvite >= 14 * DAY);
}
export function createSurvey({ storage, version, endpoint, fetcher = fetch, now = Date.now, id = () => crypto.randomUUID() }) {
  let serial = Promise.resolve();
  const locked = task => { const p = serial.catch(() => {}).then(task); serial = p; return p; };
  const read = async () => (await storage.get(SURVEY_KEY))[SURVEY_KEY] || {};
  return {
    complete(searchId) { return locked(async () => { const state = recordCompletion(await read(), searchId, now()); await storage.set({ [SURVEY_KEY]: state }); }); },
    claim() { return locked(async () => {
      const state = await read();
      if (!isSurveyDue(state, now())) return null;
      const next = { ...state, invites: (state.invites || 0) + 1, lastInvite: now(), pendingId: state.pendingResponse?.survey_id || id() };
      await storage.set({ [SURVEY_KEY]: next });
      return next.pendingId;
    }); },
    submit(payload) { return locked(async () => {
      const state = await read();
      if (state.answered || !state.pendingId || state.pendingId !== payload.survey_id || !['yes', 'no'].includes(payload.answer)
        || typeof payload.reason !== 'string' || payload.reason.length > 1000) return { success: false };
      // Freeze the first attempt so retries cannot change a previously accepted answer.
      const response = state.pendingResponse || { schema_version: 1, survey_id: state.pendingId, answer: payload.answer,
        reason: payload.reason.trim(), extension_version: version, occurred_at: new Date(now()).toISOString() };
      await storage.set({ [SURVEY_KEY]: { ...state, pendingResponse: response } });
      try {
        const result = await fetcher(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response), credentials: 'omit', signal: AbortSignal.timeout(8000) });
        if (!result.ok || (await result.json()).survey_id !== state.pendingId) return { success: false };
        await storage.set({ [SURVEY_KEY]: { ...state, pendingId: null, pendingResponse: null, answered: true } });
        return { success: true };
      } catch { return { success: false }; }
    }); },
  };
}
