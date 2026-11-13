const test = require('node:test');
const assert = require('node:assert/strict');
const {generateKeyPairSync, verify} = require('node:crypto');
const {privateKey, publicKey} = generateKeyPairSync('rsa', {modulusLength:2048});
const key = privateKey.export({type:'pkcs8',format:'pem'});
const config = require('../config/inquiries.json');
const headers = ['Submitted at (UTC)','Name','Email','Phone','Business / brand','Service','Project goals','Submission ID'];
const valid = {name:'A person',email:'person@example.com',phone:'',business:'A brand',service:'Help choosing the right service',goal:'=1+2',website:'',submissionId:'8846be1d-b7ec-4d5d-8b1b-55c9af3eb708'};
async function run({body=valid,method='POST',requestHeaders={},configured=true,mode='existing'}={}) {
  const originalFetch=global.fetch, originalEmail=process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, originalKey=process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const calls=[];
  if(configured){process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL='test@example.iam.gserviceaccount.com';process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=key;}
  else {delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;delete process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;}
  global.fetch=async (url,options={})=>{
    calls.push({url,options});
    const response=(data,status=200)=>new Response(JSON.stringify(data),{status});
    if(url.includes('oauth2')){
      const assertion=options.body.get('assertion');const [head,payload,signature]=assertion.split('.');
      assert(verify('RSA-SHA256',Buffer.from(head+'.'+payload),publicKey,Buffer.from(signature,'base64url')));
      assert.equal(JSON.parse(Buffer.from(payload,'base64url')).scope,'https://www.googleapis.com/auth/spreadsheets');
      return response({access_token:'test-token',expires_in:3600});
    }
    assert(url.includes(config.spreadsheetId));assert.equal(options.headers.Authorization,'Bearer test-token');
    if(mode==='upstream-failure')return response({},403);
    if(url.includes('?fields='))return response({sheets:mode==='new'?[]:[{properties:{title:config.tab}}]});
    if(url.endsWith(':batchUpdate'))return response({replies:[{}]});
    if(url.includes(':append'))return response({updates:{updatedRows:mode==='unconfirmed'?0:1}});
    if(options.method==='PUT')return response({updatedRows:1});
    return response({values:mode==='new'?[]:[mode==='wrong-header'?['Existing user content']:headers]});
  };
  const response={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v},status(code){this.statusCode=code;return this},json(data){this.body=data;return this}};
  try{
    delete require.cache[require.resolve('../api/inquiry.js')];
    await require('../api/inquiry.js')({method,body,headers:{host:'example.com',origin:'https://example.com','content-type':'application/json',...requestHeaders}},response);
    return {...response,calls};
  }finally{
    global.fetch=originalFetch;
    for(const [name,value] of [['GOOGLE_SERVICE_ACCOUNT_EMAIL',originalEmail],['GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',originalKey]]){if(value===undefined)delete process.env[name];else process.env[name]=value;}
  }
}
test('validated inquiry is appended literally to the selected spreadsheet',async()=>{
 const result=await run();assert.equal(result.statusCode,200);assert.equal(result.body.ok,true);assert.equal(result.headers['Cache-Control'],'no-store');
 const append=result.calls.find(c=>c.url.includes(':append'));assert(append.url.includes('valueInputOption=RAW'));
 const row=JSON.parse(append.options.body).values[0];assert.deepEqual(row.slice(1),['A person','person@example.com','','A brand',valid.service,'=1+2',valid.submissionId]);
 assert(!result.calls.some(c=>c.options.method==='PUT'));
});
test('first submission creates only the dedicated tab and its headings',async()=>{
 const result=await run({mode:'new'});assert.equal(result.statusCode,200);
 const create=JSON.parse(result.calls.find(c=>c.url.endsWith(':batchUpdate')).options.body);assert.equal(create.requests[0].addSheet.properties.title,'Website inquiries');
 assert.deepEqual(JSON.parse(result.calls.find(c=>c.options.method==='PUT').options.body).values,[headers]);
});
test('missing credentials fail honestly without contacting Google',async()=>{const r=await run({configured:false});assert.equal(r.statusCode,503);assert.equal(r.body.ok,false);assert.equal(r.calls.length,0)});
test('validation and origin checks reject bad submissions before Google calls',async()=>{
 for(const options of [{body:{...valid,email:'bad'}},{body:{...valid,goal:'x'.repeat(4001)}},{body:{...valid,service:'Invented offer'}},{body:{...valid,website:'spam'}},{body:'{'},{requestHeaders:{origin:'https://other.example'}},{method:'GET'},{requestHeaders:{'content-type':'text/plain'}},{requestHeaders:{'content-length':'17000'}}]){
  const r=await run(options);assert(r.statusCode>=400);assert.equal(r.body.ok,false);assert.equal(r.calls.length,0);
 }
});
test('wrong headings preserve existing content; failed/unconfirmed saves never report success',async()=>{
 for(const mode of ['wrong-header','upstream-failure','unconfirmed']){const r=await run({mode});assert.equal(r.statusCode,502);assert.equal(r.body.ok,false);if(mode==='wrong-header')assert(!r.calls.some(c=>c.options.method==='PUT'||c.url.includes(':append')));}
});
