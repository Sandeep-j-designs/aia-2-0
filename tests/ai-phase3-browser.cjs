const {chromium}=require('/tmp/aia-playwright/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const shot=name=>p.screenshot({path:`shots/ai-features/${name}.png`});
 await p.goto('http://localhost:3001/inbox?module=DASH');await p.getByText('What moved',{exact:true}).waitFor();await shot('dashboard');assert((await p.locator('body').innerText()).includes('14.2%'));
 await p.getByLabel('Forecast assumption').fill('Paying ₹4L advance to SKF on 1 Nov');await p.getByRole('button',{name:'Re-run with note'}).click();await p.getByText('Assumption: Paying ₹4L advance to SKF on 1 Nov',{exact:true}).waitFor();await p.getByRole('button',{name:'27 Oct',exact:true}).click();assert((await p.getByRole('dialog').innerText()).includes('SKF'));await shot('forecast-assumptions');await p.keyboard.press('Escape');
 const download=p.waitForEvent('download');await p.getByRole('button',{name:'Export MIS'}).click();assert((await download).suggestedFilename().endsWith('.csv'));
 await p.setViewportSize({width:390,height:844});await shot('dashboard-mobile');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await p.setViewportSize({width:1440,height:1000});
 await p.getByRole('button',{name:/Organisation:.*Switch organisation/}).click();await p.getByRole('button',{name:/Sahyadri Precision/}).first().click();await p.getByRole('button',{name:/Organisation:.*Sahyadri/}).waitFor();
 await p.getByRole('button',{name:/Open overdue invoices/}).click();await p.getByText('3 overdue invoices · ₹7,40,000 outstanding',{exact:true}).waitFor();assert((await p.locator('body').innerText()).includes('74'));await shot('collections-overdue');
 await p.getByRole('button',{name:'Draft reminder',exact:true}).first().click();await p.getByRole('button',{name:/1 WhatsApp/}).click();await p.getByLabel('Message to send').fill('Please arrange payment today. Thank you.');await shot('collection-reminder');await p.getByRole('button',{name:'Send (simulated)',exact:true}).click();await p.getByText(/Reminded /).first().waitFor();
 await p.getByRole('button',{name:/Close Neo/}).click();
 await p.goto('http://localhost:3001/inbox?module=JV');await p.getByRole('button',{name:'Suggest year-end provisions'}).click();await p.getByLabel('Depreciation estimate').waitFor();await shot('provision-review');await p.getByRole('button',{name:'View source schedules'}).nth(1).click();await p.getByRole('button',{name:'AUDIT/24-25/shakun',exact:true}).click();await shot('provision-source');await p.keyboard.press('Escape');await p.getByRole('button',{name:'Create draft JVs',exact:true}).click();await p.getByText('Debits equal credits',{exact:true}).waitFor();await shot('provision-draft');
 await p.goto('http://localhost:3001/inbox?id=PO-RELIANCE-1042');await p.waitForTimeout(1800);assert((await p.locator('body').innerText()).includes('2,25,750.00'));await shot('customer-po-invoice');
 console.log(JSON.stringify({errors,checks:'Dashboard, 4L assumption, MIS download, 390px layout, 740000 overdue, edited reminder, provision drafts, PO review'}));assert.deepEqual(errors,[]);await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
