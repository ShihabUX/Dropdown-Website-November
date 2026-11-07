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
  if (link) document.querySelector('#brief-service').value = link.closest('.service').querySelector('h3').textContent;
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

document.querySelector('#brief-form').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.target);
  const text = `DROPDOWN DIGITAL — PROJECT BRIEF\n\nName: ${data.get('name')}\nBusiness: ${data.get('business')}\nService: ${data.get('service')}\n\nGoal:\n${data.get('goal')}\n\nPrepared for a free discovery consultation. This brief has not been sent. Scope, pricing and timeline are subject to agreement.`;
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'dropdown-digital-project-brief.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  const status = document.querySelector('#form-status');
  status.textContent = 'Your brief is ready to download. No inquiry has been sent.';
  window.SiteMotion?.enter(status, 0, 4);
});
