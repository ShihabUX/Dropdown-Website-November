// Optional content maintenance tool; deployment remains buildless.
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../public/', import.meta.url);
const services = JSON.parse(readFileSync(new URL('services.json', root), 'utf8'));
const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rows = services.map((s, i) => {
  const category = [0,1,5].includes(i) ? 'launch' : [2,3,4].includes(i) ? 'grow' : 'systems';
  const body = `<summary><span class="num">0${i+1}</span><h3>${escapeHTML(s.name)}</h3><span class="price">${i===0?'Launch offer':'From'} ${s.price}</span><span class="plus" aria-hidden="true">+</span></summary><div class="service-body"><div><span class="eyebrow">${i>5?'CUSTOM SOLUTION':'THE OPPORTUNITY'}</span><h4>${escapeHTML(s.desc)}</h4><p>${escapeHTML(s.example||'Monthly content planning and creative direction for a consistent brand presence.')}</p><h4>${i===0?'Launch offer':'Starting at'} ${s.price}</h4><p>${escapeHTML(s.note)}</p>${s.timeline?'<p><strong>Timeline</strong><br>'+escapeHTML(s.timeline)+'</p>':''}<a class="button choose" data-index="${i}" href="#brief">Plan this project <span>↗</span></a></div><div><span class="eyebrow">${i>5?'POSSIBLE MODULES · AGREED TO SCOPE':'WHAT’S INCLUDED'}</span><ul>${s.items.map(x=>'<li>'+escapeHTML(x)+'</li>').join('')}</ul><p><strong>What we need from you</strong><br>${escapeHTML(s.need)}</p></div></div>`;
  return `<details class="service" id="service-${i}" data-category="${category}">${body}</details>`;
}).join('');
const options = services.map(s => `<option>${escapeHTML(s.name)}</option>`).join('');
const file = new URL('index.html', root);
let html = readFileSync(file, 'utf8');
html = html.replace(/<!-- services:start -->[\s\S]*?<!-- services:end -->/, `<!-- services:start -->${rows}<!-- services:end -->`);
html = html.replace(/<!-- options:start -->[\s\S]*?<!-- options:end -->/, `<!-- options:start -->${options}<!-- options:end -->`);
writeFileSync(file, html);
