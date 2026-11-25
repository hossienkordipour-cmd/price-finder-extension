export const SURVEY_KEY = 'piqoSurveyV2';

export function createSurvey({ storage, version, endpoint, fetcher = fetch, now = Date.now, id = () => crypto.randomUUID() }) {
  let serial = Promise.resolve();
  const locked = task => {
    const result = serial.catch(() => {}).then(task);
    serial = result;
    return result;
  };
  const read = async () => (await storage.get(SURVEY_KEY))[SURVEY_KEY] || {};
  const save = (records, searchId, record) => storage.set({
    [SURVEY_KEY]: Object.fromEntries([...Object.entries(records).filter(([key]) => key !== searchId), [searchId, record]].slice(-100)),
  });
  const submitting = new Map();

  return {
    claim(searchId) {
      return locked(async () => {
        if (!searchId) return null;
        const records = await read();
        const record = Object.hasOwn(records, searchId) ? records[searchId] : null;
        if (record?.closed) return null;
        if (record) return { survey_id: record.id, pending: record.response };
        const surveyId = id();
        await save(records, searchId, { id: surveyId });
        return { survey_id: surveyId };
      });
    },
    dismiss(searchId, surveyId) {
      return locked(async () => {
        const records = await read();
        if (records[searchId]?.id === surveyId) await save(records, searchId, { id: surveyId, closed: true });
      });
    },
    submit(searchId, payload) {
      if (!['yes', 'no'].includes(payload.answer) || typeof payload.reason !== 'string' || payload.reason.length > 1000) {
        return Promise.resolve({ success: false });
      }
      if (submitting.has(payload.survey_id)) return submitting.get(payload.survey_id);
      const request = (async () => {
        try {
          const response = await locked(async () => {
            const records = await read();
            const record = records[searchId];
            if (!record?.id || record.id !== payload.survey_id || record.closed) return null;
            if (record.response) return record.response;
            const data = { schema_version: 1, survey_id: record.id, answer: payload.answer,
              reason: payload.reason.trim(), extension_version: version, occurred_at: new Date(now()).toISOString() };
            await save(records, searchId, { ...record, response: data });
            return data;
          });
          if (!response) return { success: false };
          const result = await fetcher(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response), credentials: 'omit', signal: AbortSignal.timeout(8000) });
          if (!result.ok || (await result.json()).survey_id !== response.survey_id) return { success: false };
          await locked(async () => {
            const records = await read();
            if (records[searchId]?.id === response.survey_id) {
              await save(records, searchId, { id: response.survey_id, closed: true });
            }
          });
          return { success: true };
        } catch {
          return { success: false };
        }
      })().finally(() => submitting.delete(payload.survey_id));
      submitting.set(payload.survey_id, request);
      return request;
    },
  };
}
