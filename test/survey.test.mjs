import assert from 'node:assert/strict';
import { createSurvey, SURVEY_KEY } from '../survey.js';

const store = { piqoSurveyV1: { answered: true, invites: 2 } };
const requests = [];
let offline = true;
const options = {
  storage: {
    async get(key) { return structuredClone({ [key]: store[key] }); },
    async set(values) { Object.assign(store, structuredClone(values)); },
  },
  version: '1.1.0',
  endpoint: 'http://127.0.0.1/surveys',
  fetcher: async (_, request) => {
    const payload = JSON.parse(request.body);
    requests.push(payload);
    if (offline) throw new Error('offline');
    return { ok: true, json: async () => ({ survey_id: payload.survey_id }) };
  },
};

const survey = createSurvey(options);
const [first, reopened] = await Promise.all([survey.claim('first'), survey.claim('first')]);
assert.ok(first.survey_id);
assert.equal(first.survey_id, reopened.survey_id);
const second = await survey.claim('second');
assert.notEqual(first.survey_id, second.survey_id);
const vote = { survey_id: first.survey_id, answer: 'no', reason: 'کند بود' };
assert.equal((await survey.submit('second', vote)).success, false);
assert.equal((await survey.submit('first', vote)).success, false);
await survey.dismiss('second', second.survey_id);
assert.equal(await survey.claim('second'), null);

const restarted = createSurvey(options);
assert.deepEqual((await restarted.claim('first')).pending, requests[0]);
const third = await restarted.claim('third');
assert.ok(third.survey_id);
offline = false;
assert.equal((await restarted.submit('first', { ...vote, answer: 'yes' })).success, true);
assert.deepEqual(requests[0], requests[1]);
assert.equal(await restarted.claim('first'), null);
assert.equal((await restarted.submit('third', { survey_id: third.survey_id, answer: 'yes', reason: '' })).success, true);
assert.equal(Object.hasOwn(requests[2], 'searchId'), false);
assert.equal(store[SURVEY_KEY].third.closed, true);
assert.ok((await restarted.claim('fourth')).survey_id);
console.log('Survey: one vote per search, legacy state ignored, independent dismissal, and durable retry passed');
