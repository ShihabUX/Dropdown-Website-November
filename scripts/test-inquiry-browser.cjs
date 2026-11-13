const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.TEST_URL||'http://127.0.0.1:8098';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 for(const width of [390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[],downloads=[];page.on('pageerror',e=>errors.push(e.message));page.on('download',d=>downloads.push(d));
  let calls=0,payload,mode='failure';
  await page.route('**/api/inquiry',async route=>{
   calls++;payload=route.request().postDataJSON();
   await new Promise(resolve=>setTimeout(resolve,250));
   await route.fulfill({status:mode==='success'?200:503,contentType:'application/json',body:JSON.stringify(mode==='success'?{ok:true}:{ok:false,message:'The inquiry form is temporarily unavailable. Your details have not been sent. Please try again later.'})});
  });
  await page.goto(base);await page.waitForTimeout(1000);
  await page.locator('#inquiry-form button').click();assert.equal(calls,0,'browser required-field validation');
  await page.locator('[name="name"]').fill('Inquiry QA');await page.locator('[name="email"]').fill('qa@example.com');
  await page.locator('[name="business"]').fill('Test business');await page.locator('[name="phone"]').fill('+880 1700000000');await page.locator('[name="goal"]').fill('A test inquiry, not a brief download.');
  await page.locator('#inquiry-form button').click();
  await page.waitForFunction(()=>document.querySelector('#form-status').dataset.state==='error');
  assert.equal(await page.locator('[name="name"]').inputValue(),'Inquiry QA');assert((await page.locator('#form-status').innerText()).includes('not been sent'));
  assert.equal(await page.locator('#inquiry-form button').isEnabled(),true);
  mode='success';calls=0;
  await page.locator('#inquiry-form').evaluate(form=>{form.requestSubmit();form.requestSubmit()});
  assert(await page.locator('#inquiry-form button').isDisabled());
  await page.waitForFunction(()=>document.querySelector('#form-status').dataset.state==='success');
  assert.equal(calls,1,'double submits are suppressed');assert.equal(payload.email,'qa@example.com');assert.equal(payload.phone,'+880 1700000000');
  assert.equal(await page.locator('[name="name"]').inputValue(),'');assert.equal(downloads.length,0);
  await page.locator('#brief').evaluate(e=>e.scrollIntoView({behavior:'instant',block:'start'}));await page.waitForTimeout(800);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`/tmp/inquiry-${width}.png`});
  assert.deepEqual(errors,[]);console.log(`PASS ${width}px: validation, pending/duplicate protection, failure retains data, confirmed success resets, no downloads, no overflow/errors (mocked transport)`);await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
