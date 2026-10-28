// Separate from card rendering so progress updates cannot reset a response.
(() => {
  const box = document.getElementById('piqo-survey');
  if (!box) return;
  const form = box.querySelector('form'), status = box.querySelector('[role="status"]');
  const submit = box.querySelector('button[type="submit"]');
  let surveyId = null, busy = false, frozen = null, pending = false;
  // CSS-hidden iframes still report visibilityState="visible". Intersection
  // observes clipping through the embedding page, so a hidden panel uses no invite.
  let panelVisible = window.parent === window;
  const activity = () => { if (panelVisible && document.visibilityState === 'visible') void chrome.runtime.sendMessage({type:'USAGE_ACTIVE'}).catch(() => {}); };
  setInterval(activity,60000);
  new IntersectionObserver(entries => {
    panelVisible = entries.some(entry => entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0);
    if (panelVisible) activity();
    if (panelVisible && pending) void window.piqoOfferSurvey();
  }).observe(document.documentElement);
  window.piqoOfferSurvey = async () => {
    pending = true;
    if (surveyId || busy || !panelVisible || document.visibilityState !== 'visible') return;
    busy = true;
    try {
      const result = await chrome.runtime.sendMessage({ type: 'SURVEY_CLAIM' });
      if (result?.survey_id) { surveyId = result.survey_id; box.hidden = false; }
    } catch { /* Search remains usable. */ } finally { busy = false; }
  };
  document.addEventListener('visibilitychange', () => { activity(); if (pending) void window.piqoOfferSurvey(); });
  box.querySelector('[data-dismiss]').addEventListener('click', () => { box.hidden = true; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !surveyId || !form.reportValidity()) return;
    const data = new FormData(form);
    frozen ||= { survey_id: surveyId, answer: data.get('answer'), reason: String(data.get('reason') || '') };
    form.querySelector('fieldset').disabled = true;
    form.querySelector('textarea').readOnly = true;
    busy = true; submit.disabled = true; status.textContent = 'در حال ارسال…';
    try {
      const response = await chrome.runtime.sendMessage({ type: 'SURVEY_SUBMIT', payload: frozen });
      if (!response?.success) throw new Error('not accepted');
      form.hidden = true;
      box.querySelector('[data-dismiss]').textContent = 'بستن';
      status.textContent = 'ممنون! نظرت ثبت شد.';
    } catch { status.textContent = 'ثبت نظرت تأیید نشد. همان نظر را دوباره ارسال کن.'; submit.textContent = 'ارسال دوباره'; }
    finally { busy = false; submit.disabled = false; }
  });
})();
