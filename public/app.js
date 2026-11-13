/* Core interactions work independently of motion enhancement. */
const list = document.querySelector('#service-list');
const rows = [...list.querySelectorAll('.service')];
const filters = [...document.querySelectorAll('[data-filter]')];
function filterServices(category, instant = false) {
  if (window.SiteMotion) return SiteMotion.filter(category, instant);
  filters.forEach(button => {
    const active = button.dataset.filter === category;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  rows.forEach(row => { row.hidden = category !== 'all' && row.dataset.category !== category; });
  return Promise.resolve();
}
filters.forEach(button => {
  button.setAttribute('aria-pressed', String(button.classList.contains('active')));
  button.addEventListener('click', () => filterServices(button.dataset.filter));
});
list.addEventListener('click', event => {
  const link = event.target.closest('.choose');
  if (link) document.querySelector('#inquiry-service').value = link.closest('.service').querySelector('h3').textContent;
});
function revealHash() {
  const id = location.hash.slice(1);
  const details = document.getElementById(id);
  if (!details?.classList.contains('service')) return;
  // Instant filtering/opening avoids competing layout and anchor animations.
  filterServices('all', true);
  if (window.SiteMotion) SiteMotion.open(details);
  else details.open = true;
  requestAnimationFrame(() => details.scrollIntoView({ block: 'start' }));
}
addEventListener('hashchange', revealHash);
addEventListener('popstate', revealHash);
// Clicking the same deep link again must reveal it even if the filter changed.
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#service-"]');
  if (link && link.hash === location.hash) revealHash();
});
revealHash();

const inquiryForm = document.querySelector('#inquiry-form');
const submitButton = inquiryForm.querySelector('button[type="submit"]');
const submitLabel = submitButton.querySelector('.submit-label');
const formStatus = document.querySelector('#form-status');
let submitting = false;
let submissionId = '';
submitButton.disabled = false;
inquiryForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting || !inquiryForm.reportValidity()) return;
  if (!/^https?:$/.test(location.protocol)) {
    formStatus.textContent = 'Please open the website to send your inquiry. This downloaded preview cannot submit it.';
    return;
  }
  submitting = true;
  submitButton.disabled = true;
  submitLabel.textContent = 'Sending…';
  inquiryForm.setAttribute('aria-busy', 'true');
  formStatus.textContent = 'Sending your inquiry…';
  formStatus.dataset.state = 'pending';
  submissionId ||= globalThis.crypto?.randomUUID?.() || '';
  const payload = {...Object.fromEntries(new FormData(inquiryForm)), submissionId};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch('/api/inquiry', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload), signal: controller.signal
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true) {
      formStatus.textContent = typeof result.message === 'string' ? result.message : 'We couldn’t confirm your inquiry was saved. Please try again.';
      formStatus.dataset.state = 'error';
      return;
    }
    formStatus.textContent = 'Thank you. Your inquiry has been received. We’ll contact you using the details you provided.';
    formStatus.dataset.state = 'success';
    inquiryForm.reset();
    submissionId = '';
    window.SiteMotion?.enter(formStatus, 0, 4);
  } catch {
    formStatus.textContent = 'We couldn’t confirm your inquiry was saved. Your entries are still here. Please check your connection and try again.';
    formStatus.dataset.state = 'error';
  } finally {
    clearTimeout(timeout);
    submitting = false;
    submitButton.disabled = false;
    submitLabel.textContent = 'Send inquiry';
    inquiryForm.removeAttribute('aria-busy');
  }
});
