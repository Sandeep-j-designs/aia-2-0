const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const root = path.resolve(__dirname, '..');
function freshStore() {
  const cache = new Map(), tasks = [];
  const storage = new Map();
  const context = { structuredClone, Date, console, crypto: webcrypto, setTimeout: (fn) => { tasks.push(fn); return tasks.length; }, window: {dispatchEvent(){}}, localStorage: {setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)||null}, CustomEvent: class {} };
  function load(filename) {
    if(cache.has(filename))return cache.get(filename);
    const source=fs.readFileSync(filename,'utf8');
    const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    const exports={};cache.set(filename,exports);
    const requireFn=(name)=>name==='react'?{useSyncExternalStore(){}}:load(path.join(root,name.replace('@/','')+'.ts'));
    vm.runInNewContext('(function(require,exports){'+js+'\n})',context)(requireFn,exports);
    return exports;
  }
  return {store:load(path.join(root,'components/inbox/v2/store.ts')),tasks};
}
const {store:s}=freshStore();
let hard=s.getState().items.find(x=>x.hardRef);
assert.equal(s.approve(hard.id),'Duplicate vendor and invoice number');
s.update(hard.id,{form:{...hard.form,voucherNo:'CHANGED-VOUCHER'}});
assert.equal(s.approve(hard.id),'Duplicate vendor and invoice number','voucher number must not bypass invoice duplicate');
s.update(hard.id,{form:{...s.getState().items.find(x=>x.id===hard.id).form,invoiceNo:'UNIQUE-TEST'}});
assert.equal(s.getState().items.find(x=>x.id===hard.id).status,'Needs Review');
assert.equal(s.approve(hard.id),'');
const approved=JSON.stringify(s.getState().items.find(x=>x.id===hard.id));
s.update(hard.id,{form:s.blankForm()});s.remove(hard.id);s.restore(hard.id);
assert.equal(JSON.stringify(s.getState().items.find(x=>x.id===hard.id)),approved,'approved snapshot is immutable');
let soft=s.getState().items.find(x=>x.softRef);
assert.equal(s.approve(soft.id),'','file hash soft warning permits approval');
let x=s.getState().items.find(x=>x.status==='Needs Review'&&x.company==='shakun'&&x.route==='AP');
s.setRoute(x.id,'JV');x=s.getState().items.find(y=>y.id===x.id);
assert.equal(x.route,'JV');assert.equal(x.form.voucherType,'Journal');
s.update(x.id,{form:{...x.form,invoiceNo:'JV-UNIQUE-TEST',lines:[{description:'',ledger:'Rent',amount:20,dr:20,cr:0}]}});
assert.equal(s.approve(x.id),'Journal out of balance');
s.remove(x.id);assert.equal(s.getState().items.find(y=>y.id===x.id).status,'Deleted');s.restore(x.id);assert.equal(s.getState().items.find(y=>y.id===x.id).status,'Needs Review');
const acme=s.getState().items.find(x=>x.company==='acme');assert.equal(s.approve(acme.id),'Item unavailable');
const acmeBefore=JSON.stringify(acme);s.update(acme.id,{form:s.blankForm()});assert.equal(JSON.stringify(s.getState().items.find(x=>x.id===acme.id)),acmeBefore);
s.setPermissions(['AR']);assert(s.getState().items.filter(x=>x.company==='shakun'&&x.status!=='Approved'&&x.status!=='Deleted').every(x=>x.route==='AR'));
const failed=s.getState().items.find(x=>x.company==='shakun'&&x.status==='Failed');s.manual(failed.id);const manual=s.getState().items.find(x=>x.id===failed.id);assert.equal(manual.form.party,'');assert.equal(manual.form.invoiceNo,'');assert.equal(manual.form.lines.length,0);assert.equal(s.approve(manual.id),'Required fields missing');
const {store:t,tasks}=freshStore();const f=t.getState().items.find(x=>x.company==='shakun'&&x.status==='Failed');t.retry(f.id);assert.equal(t.getState().items.find(x=>x.id===f.id).status,'Received');tasks.shift()();assert.equal(t.getState().items.find(x=>x.id===f.id).status,'Extracting');tasks.shift()();assert.equal(t.getState().items.find(x=>x.id===f.id).status,'Needs Review');assert(t.getState().events.some(e=>e.event==='Inbox Extraction Completed'));
assert(s.getState().events.some(e=>e.event==='Inbox Item Approved'&&e.properties.final_route));
console.log('PASS: duplicate rules, immutable approval, company isolation, permissions, route switching, balance validation, soft delete/restore, manual entry and extraction transitions.');

// Journal drafts survive route changes and approval records the reviewed form.
const {store:j}=freshStore();
let journal=j.getState().items.find(x=>x.company==='shakun'&&x.status==='Needs Review'&&x.route==='JV'&&!x.hardRef);
assert(journal, 'a reviewable journal is seeded');
const journalId=journal.id;
const form={...journal.form, gst:'Bangalore', voucherNo:'JV-INTEGRATION-TEST', voucherType:'Contra', date:'2026-09-16', invoiceNo:'', due:'', party:'', costClassEnabled:true, costClass:'Department', narration:'Reviewed journal', lines:[
  {description:'Expense',ledger:'Rent',amount:0.3,dr:0.3,cr:0,costCentre:'Finance'},
  {description:'Payment',ledger:'Bank',amount:0.3,dr:0,cr:0.3,costCentre:''}
]};
j.update(journalId,{form});
assert.equal(j.issue(j.getState().items.find(x=>x.id===journalId)), '', 'reference and party are optional for journals');
j.setRoute(journalId,'AP');j.setRoute(journalId,'JV');
journal=j.getState().items.find(x=>x.id===journalId);
assert.equal(JSON.stringify(journal.form),JSON.stringify(form),'restore the entire journal draft, including voucher type and allocation');
j.update(journalId,{form:{...form,voucherNo:'  '}});
assert.equal(j.approve(journalId),'Required fields missing');
j.update(journalId,{form:{...form,lines:[{...form.lines[0],ledger:''},form.lines[1]]}});
assert.equal(j.approve(journalId),'Incomplete ledger line');
j.update(journalId,{form:{...form,lines:[{...form.lines[0],dr:0.2},form.lines[1]]}});
assert.equal(j.approve(journalId),'Journal out of balance');
j.update(journalId,{form});assert.equal(j.approve(journalId),'');
journal=j.getState().items.find(x=>x.id===journalId);
assert.equal(JSON.stringify(journal.snapshot),JSON.stringify(form));
assert.equal(journal.amount,0.3,'queue shows debit total rather than debit plus credit');
assert(j.getState().events.some(e=>e.event==='Journal Voucher Created'&&e.itemId===journalId));
assert.equal(j.journalTotals({...form,lines:[{dr:0.1,cr:0},{dr:0.2,cr:0},{dr:0,cr:0.3}]}).difference,0);
console.log('PASS: journal draft restoration, optional references, validation, totals, approval snapshot and creation event.');

// Bulk actions use live eligibility and preserve company isolation and amounts.
const {store:bulk}=freshStore();
const ready=bulk.getState().items.find(x=>x.company==='shakun'&&x.status==='Needs Review'&&!bulk.issue(x));
const duplicate=bulk.getState().items.find(x=>x.company==='shakun'&&x.hardRef);
const softDuplicate=bulk.getState().items.find(x=>x.company==='shakun'&&x.softRef&&!x.hardRef);
const foreign=bulk.getState().items.find(x=>x.company==='acme');
assert(ready && duplicate && softDuplicate && foreign);
const approvalResult=bulk.applyBulkAction([ready.id,ready.id,duplicate.id,softDuplicate.id,foreign.id],'Approve');
assert.equal(approvalResult.changed,1);
assert.equal(approvalResult.skipped,3);
assert.equal(approvalResult.reasons['Hard-block duplicate'],1);
assert.equal(approvalResult.reasons['Not in Needs Review'],1);
assert.equal(approvalResult.reasons['Item unavailable'],1);
assert.equal(bulk.getState().items.find(x=>x.id===ready.id).route,ready.route);
assert.equal(bulk.getState().items.find(x=>x.id===softDuplicate.id).status,'Duplicate');
const target=bulk.getState().items.find(x=>x.company==='shakun'&&x.status==='Needs Review'&&x.route==='AP'&&x.form.lines.length);
const amount=target.amount;
for(const [field,value] of [['Vendor','Acme Corp Pvt Ltd'],['GST Registration','Maharashtra Branch'],['Voucher Type','Debit Note'],['Ledger','Rent']]) {
  const result=bulk.applyBulkAction([target.id,ready.id,foreign.id],field,value);
  assert.equal(result.changed,1);
  assert.equal(result.skipped,2);
}
const changed=bulk.getState().items.find(x=>x.id===target.id);
assert.equal(changed.form.party,'Acme Corp Pvt Ltd');
assert.equal(changed.form.gst,'Maharashtra Branch');
assert.equal(changed.form.voucherType,'Debit Note');
assert(changed.form.lines.every(x=>x.ledger==='Rent'));
assert.equal(changed.amount,amount,'metadata changes must not recalculate invoice totals');
assert.equal(bulk.BULK_VOUCHER_TYPES.length,7);
assert.equal(bulk.applyBulkAction([target.id],'GST Registration','Unknown branch').changed,0);
assert.equal(bulk.applyBulkAction([target.id],'Voucher Type','Invalid').changed,0);
const deletion=bulk.applyBulkAction([target.id,ready.id,foreign.id],'Delete');
assert.equal(deletion.changed,1);assert.equal(deletion.skipped,2);
assert.equal(bulk.getState().items.find(x=>x.id===target.id).status,'Deleted');
bulk.restore(target.id);
assert.notEqual(bulk.getState().items.find(x=>x.id===target.id).status,'Deleted');
const arTarget=bulk.getState().items.find(x=>x.company==='shakun'&&x.route==='AR'&&x.arSheet&&x.status==='Needs Review');
assert(arTarget);
assert.equal(bulk.applyBulkAction([arTarget.id],'Ledger','Sales').changed,1);
const updatedAr=bulk.getState().items.find(x=>x.id===arTarget.id);
assert.equal(updatedAr.arSheet.salesLedger,'Sales');
assert(updatedAr.arSheet.ledgers.every(x=>x.ledger==='Sales'));
assert(updatedAr.form.lines.every(x=>x.ledger==='Sales'));
console.log('PASS: bulk approval eligibility and counts, reassignment, AR ledger projection, totals, company isolation, and soft deletion.');

// Initial upload stages the dataset before any extraction result is exposed.
const {store:uploadFlow,tasks:uploadTasks}=freshStore();
const samples=uploadFlow.demoUploadDocuments('shakun',36);
assert.equal(samples.length,36);
assert.equal(new Set(samples.map(item=>item.id)).size,36);
const otherCompanyBefore=JSON.stringify(uploadFlow.getState().items.filter(item=>item.company==='acme'));
uploadFlow.beginUploadedExtraction('shakun',samples,[]);
const sampleIds=new Set(samples.map(item=>item.id));
const extracting=uploadFlow.getState().items.filter(item=>sampleIds.has(item.id));
assert.equal(extracting.length,36);
assert(extracting.every(item=>item.status==='Extracting' && item.form.party==='' && item.amount===0));
assert(uploadFlow.getState().startedCompanies.includes('shakun'));
assert.equal(uploadTasks.length,36);
while(uploadTasks.length) uploadTasks.shift()();
for(const sample of samples){
  const result=uploadFlow.getState().items.find(item=>item.id===sample.id);
  assert.equal(result.status,['Received','Extracting'].includes(sample.status)?'Needs Review':sample.status);
  assert.equal(JSON.stringify(result.form),JSON.stringify(sample.form));
  assert.equal(result.extractionResult,undefined);
}
assert.equal(JSON.stringify(uploadFlow.getState().items.filter(item=>item.company==='acme')),otherCompanyBefore);
const populatedBefore=JSON.stringify(uploadFlow.getState().items);
uploadFlow.beginUploadedExtraction('shakun',[],[]);
assert.equal(JSON.stringify(uploadFlow.getState().items),populatedBefore,'later uploads must not restart extraction for the existing dataset');
assert.equal(uploadTasks.length,0);
console.log('PASS: 36-document batch, extraction before results, final statuses, company isolation and no bulk replay.');
