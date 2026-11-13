// Vercel Node function. Credentials stay on the server; no runtime packages required.
const {createSign, randomUUID} = require('node:crypto');
const config = require('../config/inquiries.json');
const services = require('../public/services.json');
const HEADERS = ['Submitted at (UTC)', 'Name', 'Email', 'Phone', 'Business / brand', 'Service', 'Project goals', 'Submission ID'];
const allowedServices = new Set(['Help choosing the right service', ...services.map(service => service.name)]);
let cachedToken;

function reply(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}
function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const fields = {name:120, email:254, phone:40, business:180, service:160, goal:4000};
  const result = {};
  for (const [key, limit] of Object.entries(fields)) {
    const value = key === 'phone' && body[key] === undefined ? '' : body[key];
    if (typeof value !== 'string' || value.length > limit) return null;
    result[key] = value.trim();
  }
  if (!result.name || !result.business || !result.goal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email) || !allowedServices.has(result.service)) return null;
  result.submissionId = typeof body.submissionId === 'string' && /^[a-f\d-]{36}$/i.test(body.submissionId) ? body.submissionId : randomUUID();
  return result;
}
async function accessToken(email, key) {
  if (cachedToken?.email === email && cachedToken.expires > Date.now() + 60000) return cachedToken.value;
  const issued = Math.floor(Date.now()/1000);
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({alg:'RS256', typ:'JWT'})}.${encode({iss:email, scope:'https://www.googleapis.com/auth/spreadsheets', aud:'https://oauth2.googleapis.com/token', iat:issued, exp:issued+3600})}`;
  const signature = createSign('RSA-SHA256').update(unsigned).end().sign(key.replace(/\\n/g,'\n'), 'base64url');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion:`${unsigned}.${signature}`}),
    signal:AbortSignal.timeout(5000)
  });
  if (!response.ok) throw new Error('google-auth');
  const token = await response.json();
  if (typeof token.access_token !== 'string') throw new Error('google-auth');
  cachedToken = {email, value:token.access_token, expires:Date.now()+Math.min(Number(token.expires_in)||3600,3600)*1000};
  return token.access_token;
}
async function saveInquiry(data, token) {
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}`;
  // One shared deadline for all Sheets calls, keeping within the function's time budget.
  const signal = AbortSignal.timeout(18000);
  async function google(path, method='GET', body) {
    const response = await fetch(base+path, {method, headers:{Authorization:`Bearer ${token}`, 'Content-Type':'application/json'}, signal, ...(body ? {body:JSON.stringify(body)} : {})});
    if (!response.ok) throw new Error('google-sheets');
    return response.json();
  }
  const metadata = await google('?fields=sheets.properties.title');
  if (!metadata.sheets?.some(sheet => sheet.properties?.title === config.tab)) {
    try { await google(':batchUpdate','POST',{requests:[{addSheet:{properties:{title:config.tab}}}]}); }
    catch (error) {
      // A simultaneous first inquiry may have already created this tab.
      const latest = await google('?fields=sheets.properties.title');
      if (!latest.sheets?.some(sheet => sheet.properties?.title === config.tab)) throw error;
    }
  }
  const tab = `'${config.tab.replace(/'/g,"''")}'`;
  const headerPath = `/values/${encodeURIComponent(tab+'!A1:H1')}`;
  const existing = await google(headerPath);
  const header = existing.values?.[0] || [];
  if (header.every(value => value === '')) {
    await google(headerPath+'?valueInputOption=RAW','PUT',{values:[HEADERS]});
  } else if (HEADERS.some((label, index) => header[index] !== label)) {
    throw new Error('sheet-header-mismatch');
  }
  const row = [new Date().toISOString(), data.name, data.email, data.phone, data.business, data.service, data.goal, data.submissionId];
  // RAW keeps user input literal (including strings beginning with =, +, - or @).
  const saved = await google(`/values/${encodeURIComponent(tab+'!A:H')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, 'POST', {values:[row]});
  if (saved.updates?.updatedRows !== 1) throw new Error('save-unconfirmed');
}
module.exports = async function inquiry(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return reply(res,405,{ok:false,message:'Use the inquiry form to submit your details.'}); }
  try {
    if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return reply(res,403,{ok:false,message:'Please submit from our website.'});
  } catch { return reply(res,403,{ok:false,message:'Please submit from our website.'}); }
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return reply(res,415,{ok:false,message:'Please submit using the website form.'});
  if (Number(req.headers['content-length']) > 16000) return reply(res,413,{ok:false,message:'Please shorten your project details.'});
  let body = req.body;
  try { if (typeof body === 'string') body=JSON.parse(body); } catch { return reply(res,400,{ok:false,message:'Please check your details and try again.'}); }
  if (Buffer.byteLength(JSON.stringify(body ?? null)) > 16000) return reply(res,413,{ok:false,message:'Please shorten your project details.'});
  if (body?.website) return reply(res,400,{ok:false,message:'Unable to submit this inquiry.'});
  const data = validate(body);
  if (!data) return reply(res,400,{ok:false,message:'Please check your name, email, business, service and project details.'});
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !key) return reply(res,503,{ok:false,message:'The inquiry form is temporarily unavailable. Your details have not been sent. Please try again later.'});
  try {
    await saveInquiry(data, await accessToken(email,key));
    return reply(res,200,{ok:true,submissionId:data.submissionId});
  } catch (error) {
    // Never log submitted contact details, keys, tokens or upstream response bodies.
    console.error('Inquiry save failed:', ['google-auth','google-sheets','sheet-header-mismatch','save-unconfirmed'].includes(error.message) ? error.message : 'request-failed');
    return reply(res,502,{ok:false,message:'We couldn’t confirm your inquiry was saved. Your entries are still here. Please try again shortly.'});
  }
};
