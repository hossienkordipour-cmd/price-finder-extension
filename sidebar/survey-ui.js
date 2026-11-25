(() => {
  const box = document.getElementById('piqo-survey');
  if (!box) return;
  const form = box.querySelector('form');
  const status = box.querySelector('[role="status"]');
  const heading = box.querySelector('.survey-heading');
  const title = box.querySelector('#survey-title');
  const votes = box.querySelector('.survey-votes');
  const submit = form.querySelector('button[type="submit"]');
  const reason = form.querySelector('textarea');
  const followUp = box.querySelector('#survey-follow-up');
  const reasonOptions = form.querySelector('fieldset');
  const customReason = box.querySelector('#survey-custom-reason');
  const options = [...reasonOptions.querySelectorAll('input')];
  const optionText = option => option?.nextElementSibling.textContent.trim() || '';
  const yes = box.querySelector('[data-vote="yes"]');
  const no = box.querySelector('[data-vote="no"]');
  const dismiss = box.querySelector('[data-dismiss]');
  let current = null;
  let closeTimer;
  let panelVisible = window.parent === window;

  const activity = () => {
    if (panelVisible && document.visibilityState === 'visible') {
      void chrome.runtime.sendMessage({ type: 'USAGE_ACTIVE' }).catch(() => {});
    }
  };
  setInterval(activity, 60000);

  function render(entry) {
    const { payload, busy, sent, failed } = entry;
    const negative = entry.choice === 'no';
    const locked = Boolean(payload);
    box.toggleAttribute('data-sent', Boolean(sent));
    title.hidden = votes.hidden = Boolean(sent);
    if (sent && status.parentElement !== heading) heading.insertBefore(status, dismiss);
    if (!sent && status.parentElement === heading) form.after(status);
    yes.disabled = no.disabled = locked;
    dismiss.hidden = !entry.choice;
    dismiss.disabled = busy;
    yes.setAttribute('aria-pressed', String(entry.choice === 'yes'));
    no.setAttribute('aria-pressed', String(negative));
    no.setAttribute('aria-expanded', String(negative && !sent));
    followUp.hidden = !negative;
    form.hidden = sent || (!negative && !failed);
    customReason.hidden = !options.some(option => option.value === 'other' && option.checked);
    reasonOptions.disabled = locked;
    reason.readOnly = locked;
    submit.disabled = busy;
    submit.textContent = failed ? 'تلاش دوباره' : 'ثبت نظر';
    status.textContent = sent ? 'ممنون، نظرت ثبت شد.' : busy ? 'در حال ارسال…' :
      failed ? 'ثبت نظرت تأیید نشد. دوباره تلاش کن.' : '';
  }

  async function offer() {
    const entry = current;
    if (!entry || entry.claimed || entry.claiming || !panelVisible || document.visibilityState !== 'visible' || document.body.classList.contains('guide-view-open')) return;
    entry.claiming = true;
    try {
      const result = await chrome.runtime.sendMessage({ type: 'SURVEY_CLAIM', searchId: entry.searchId, tabId: entry.tabId });
      if (current !== entry) return;
      entry.claimed = true;
      if (!result?.survey_id) return;
      entry.id = result.survey_id;
      entry.payload = result.pending;
      entry.choice = result.pending?.answer;
      entry.failed = Boolean(result.pending);
      const savedReason = result.pending?.reason || '';
      form.reset();
      for (const option of options) {
        const available = option.value !== 'empty' || !entry.hasResults;
        option.closest('label').hidden = !available;
        option.disabled = !available;
      }
      const savedOption = options.find(option => !option.disabled && optionText(option) === savedReason);
      if (savedOption) savedOption.checked = true;
      else if (savedReason) {
        const other = options.find(option => option.value === 'other');
        other.checked = true;
        reason.value = savedReason;
      }
      render(entry);
      box.hidden = false;
    } catch {
      // A survey request should never interrupt search.
    } finally {
      entry.claiming = false;
    }
  }

  window.piqoOfferSurvey = (searchId, tabId, hasResults = true) => {
    if (searchId !== current?.searchId) {
      clearTimeout(closeTimer);
      box.hidden = true;
      current = searchId ? { searchId, tabId, hasResults } : null;
    }
    return offer();
  };
  new IntersectionObserver(entries => {
    panelVisible = entries.some(entry => entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0);
    if (panelVisible) { activity(); void offer(); }
  }).observe(document.documentElement);
  document.addEventListener('visibilitychange', () => { activity(); void offer(); });
  document.getElementById('guide-nav-btn')?.addEventListener('click', () => queueMicrotask(offer));

  async function send(entry) {
    if (!entry?.id || entry.busy || entry.sent) return;
    const selected = options.find(option => !option.disabled && option.checked);
    const feedback = selected?.value === 'other' ? reason.value.trim() || optionText(selected) : optionText(selected);
    entry.payload ||= { survey_id: entry.id, answer: entry.choice, reason: entry.choice === 'no' ? feedback : '' };
    entry.busy = true;
    entry.failed = false;
    render(entry);
    try {
      const result = await chrome.runtime.sendMessage({ type: 'SURVEY_SUBMIT', searchId: entry.searchId, payload: entry.payload });
      entry.sent = Boolean(result?.success);
    } catch {
      entry.sent = false;
    } finally {
      entry.busy = false;
      entry.failed = !entry.sent;
      if (current === entry) {
        render(entry);
        if (entry.sent) {
          closeTimer = setTimeout(() => {
            if (current === entry) box.hidden = true;
          }, 2000);
        }
      }
    }
  }

  yes.addEventListener('click', () => {
    if (!current?.id) return;
    current.choice = 'yes';
    void send(current);
  });
  no.addEventListener('click', () => {
    if (!current?.id) return;
    current.choice = 'no';
    render(current);
  });
  reasonOptions.addEventListener('change', () => {
    if (current?.id) render(current);
  });
  form.addEventListener('submit', event => { event.preventDefault(); void send(current); });
  dismiss.addEventListener('click', () => {
    if (!current?.id || current.busy) return;
    clearTimeout(closeTimer);
    box.hidden = true;
    void chrome.runtime.sendMessage({ type: 'SURVEY_DISMISS', searchId: current.searchId, survey_id: current.id }).catch(() => {});
  });
})();
