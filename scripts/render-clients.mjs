// Names/links may be supplied by the client; descriptions and reviews require verification.
import { readFileSync, writeFileSync } from 'node:fs';
const root=new URL('../public/',import.meta.url);
const clients=JSON.parse(readFileSync(new URL('clients.json',root),'utf8'));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arrow='<svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19 19 5M5 5h14v14"/></svg>';
const cards=clients.map((client,index)=>{
  if(new URL(client.url).protocol!=='https:')throw Error('Client links must use HTTPS');
  const review=client.review;
  if(review&&(!review.quote||!review.owner))throw Error('Reviews need an authentic quote and owner attribution');
  return `<article class="client-card"><span class="client-index">0${index+1}</span>${client.category?`<p class="client-category">${escape(client.category)}</p>`:''}<h3>${escape(client.name)}</h3>${client.description?`<p class="client-description">${escape(client.description)}</p>`:''}<a class="client-link" href="${escape(client.url)}" target="_blank" rel="noopener noreferrer" aria-label="Visit ${escape(client.name)} website (opens in a new tab)">Visit website ${arrow}</a>${review?`<blockquote class="client-review"><p>${escape(review.quote)}</p><cite>${escape(review.owner)}${review.title?`, ${escape(review.title)}`:''}</cite></blockquote>`:''}</article>`;
}).join('');
const file=new URL('index.html',root);let html=readFileSync(file,'utf8');
if(!html.includes('<!-- clients:start -->'))throw Error('Client section marker missing');
html=html.replace(/<!-- clients:start -->[\s\S]*?<!-- clients:end -->/,`<!-- clients:start -->${cards}<!-- clients:end -->`);
writeFileSync(file,html);
