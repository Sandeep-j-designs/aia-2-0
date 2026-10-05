/* ============================================================================
   EMBED MODE — this sheet, hosted inside the Unified Inbox
   ----------------------------------------------------------------------------
   The inbox already supplies the furniture around a bill: the source document
   on the left, the title and the cohort pager above, and Convert / Delete /
   Save draft / Approve & Next below. So when this file is loaded with ?embed=1
   it drops its own topbar and document pane and renders the sheet alone, and
   the two halves talk over postMessage.

   Nothing above this block knows it is embedded. Opening index.html directly
   behaves exactly as it did — this is additive, and the guard is the first
   line of it.

   The inbox sends:
     seed       {supplier, supplierInvoiceNo, billDate, lines, …}  — a SAMPLE-
                shaped document; the real extraction pipeline runs on it, so
                every prediction, HSN call and threshold test is the same one
                the standalone sheet makes.
     approve    press Create Bill
     saveDraft  hold the draft against this inbox item

   This sheet sends back:
     ready      the sheet is up and listening
     totals     after every render, so the inbox header can show the figure
     dirty      something was edited — the inbox marks the item unsaved
     approved   the bill was created
   ========================================================================== */
(function(){
  const params = AP_PARAMS;
  if(params.get('embed') !== '1') return;

  /* --- one live engine at a time -----------------------------------------
     Only the newest evaluation drives the sheet; see apLive() at the top of
     this file for why there is more than one. Without this, paging through
     four bills left four engines alive on the same ids in the same document,
     and every one of them answered the next seed — a fresh bill raised a toast
     per bill previously opened, growing 1, 2, 3, 4, which is what read as
     notifications firing at random. */
  const current = apLive;

  /* A draft belongs to the inbox item it was opened from, not to the browser.
     One shared key would restore item 2041's draft over item 2042's sheet. */
  const itemId = params.get('item') || '';
  if(itemId) DRAFT_KEY = 'aia.ap.draft.v1:' + itemId;

  const post = (type, payload) =>
    parent.postMessage({source:'aia-ap', type, payload}, '*');

  /* --- what the inbox already draws, this sheet stops drawing -------------
     Only the topbar. It held the title and Discard / Create Bill, and the inbox
     supplies both — the title with the cohort pager above, the actions in the
     footer below.

     The document pane stays. It is this sheet's own, it renders the very
     document that was seeded into it, and — this is the part that matters — the
     sheet is already a two-pane layout. Hiding its document pane and then
     nesting the whole thing inside the inbox's *other* two-pane split gave the
     form a quarter of the screen, which is narrow enough for its own container
     query to fold every field into one column. So the sheet keeps its split and
     the inbox stops adding a second one; see `isTwoPane` for the AP case. */
  /* These rules have to out-rank the sheet's own stylesheet in both the places
     this block runs. Loaded into the inbox's document that stylesheet is scoped
     — every selector sits under .ap-sheet — so a bare `.topbar` is a weaker
     selector than `.ap-sheet .topbar` and lost, and `:root{--topbar-h}` was
     shadowed outright by the `--topbar-h` the wrapper itself declares. Hence
     !important on the hide, and the wrapper named alongside :root for the
     variable. In an iframe there is no wrapper and the :root half still does
     the work, so one block covers both. */
  const style = document.createElement('style');
  style.textContent = `
    .topbar{display:none!important}
    /* The document pane and the splitter are sticky, offset by the topbar they
       normally scroll under. With no topbar the offset became a 71px drop that
       started the document pane below the form beside it, and the two columns
       no longer began on the same line. Zeroing the variable is the whole fix:
       both sticky rules and the pane's own height are expressed in terms of it,
       so none of them has to be restated here. */
    :root,.ap-sheet{--topbar-h:0px}
    /* The sheet's own 12px workspace gutter against the inbox's 20px one put
       the document pane 8px inside every other edge on the screen — the header,
       the Post-to band, the footer. The sheet is a panel in someone else's page
       now, so it takes the page's gutter. Nothing else about the layout moves. */
    .ap-sheet .workspace{padding-left:20px;padding-right:20px}
    /* Two surfaces are pinned to the bottom of the viewport — the line-item bulk
       bar and the toast stack — from when this sheet owned the window. That band
       is the inbox's footer now, so both clear it by the footer's own measured
       height (published as --inbox-footer-h by the Footer component). The 24 /
       16 / 93 are the sheet's own offsets, kept and added to rather than
       replaced, so the spacing it was tuned with survives. */
    .ap-sheet .bulkbar{bottom:calc(24px + var(--inbox-footer-h, 0px))}
    .ap-sheet .toasts{bottom:calc(16px + var(--inbox-footer-h, 0px))}
    .ap-sheet.has-bulkbar .toasts{bottom:calc(93px + var(--inbox-footer-h, 0px))}
    /* The full-screen document viewer stops the page behind it scrolling. The
       sheet says that with a rule on body.is-viewer-full, which scoping
       rewrites onto the wrapper — and hiding the wrapper's overflow is not the
       same as locking the page's. This restates it against the real body,
       keyed off the mirrored class. */
    body:has(.ap-sheet.is-viewer-full){overflow:hidden}
    /* Lifted above the inbox footer, which the sheet does not know about. */
    .ap-sheet .doc-pane.is-full{z-index:70}
  `;
  document.head.append(style);

  /* --- seeding ----------------------------------------------------------- */
  /* The inbox hands over what its extraction read. Anything it does not carry
     falls back to the sample's own value, so a partial seed still produces a
     workable sheet rather than a blank one. */
  function seed(doc){
    if(!doc) return;
    const base = SAMPLE;
    SAMPLE = {
      ...base,
      ...doc,
      supplier: {...base.supplier, ...(doc.supplier||{})},
      extra:    {...base.extra,    ...(doc.extra||{})},
      lines:    Array.isArray(doc.lines) && doc.lines.length ? doc.lines : base.lines
    };
    applyExtraction(null);

    /* Two values the extraction cannot reach on its own. The due date is the
       document's, not the credit period's, when the document states one; and on
       a sale the place of supply is a column in the upload rather than
       something derivable from a GSTIN — a row whose GSTIN is missing still
       states which state it went to. */
    let patched = false;
    if(doc.dueDate){ state.dueDate = doc.dueDate; patched = true; }
    if(doc.placeOfSupply){ state.destState = doc.placeOfSupply; patched = true; }
    if(patched){ syncLedgerToSupply(); render(); }
  }

  /* --- render → totals --------------------------------------------------- */
  /* Wrapped rather than called from each site: every path that changes a
     figure already ends in render(), so this is the one place the inbox can
     be told without hunting for the others. */
  const innerRender = render;
  render = function(){
    const calc = innerRender.apply(this, arguments);
    if(calc) post('totals', {
      subTotal: calc.subTotal, gstTotal: calc.gstTotal,
      dedTotal: calc.dedTotal, adjTotal: calc.adjTotal, grand: calc.grand,
      voucherNo: state.voucherNo, supplierInvoiceNo: state.supplierInvoiceNo,
      vendor: (byId(MASTERS.vendors,state.vendor)||state.vendorSuggestion||{}).name || ''
    });
    return calc;
  };

  /* --- inbound ----------------------------------------------------------- */
  addEventListener('message', (ev)=>{
    if(!current()) return;   /* superseded: the seed is not ours to answer */
    const msg = ev.data;
    if(ev.source!==parent||ev.origin!==location.origin||!msg || msg.source !== 'aia-inbox') return;
    if(msg.type === 'seed')      seed(msg.payload);
    if(msg.type === 'approve')   $('#btn-allocate')?.click();
    if(msg.type === 'saveDraft'){ saveDraft(); toast('Draft saved'); }
    if(msg.type === 'discard')   $('#btn-discard')?.click();
  });

  /* An edit anywhere in the sheet is an edit — the inbox only needs to know
     that one happened, not what it was. */
  let dirty = false;
  const markDirty = ()=>{ if(!current()) return; if(!dirty){ dirty = true; post('dirty'); } };
  addEventListener('input',  markDirty, true);
  addEventListener('change', markDirty, true);

  /* Create Bill is the sheet's own button; the inbox's Approve presses it, and
     either way the inbox is told the bill was made. */
  document.addEventListener('click', (ev)=>{
    if(!current()) return;
    if(ev.target.closest('#btn-allocate')) setTimeout(()=>{
      if(state.allocated) post('approved', {voucherNo: state.voucherNo});
    }, 0);
  }, true);

  /* Announced once. Posting on both `load` and immediately seeded the sheet
     twice, which ran the extraction twice and stacked two identical toasts. */
  if(document.readyState === 'complete') queueMicrotask(()=>{ if(current()) post('ready'); });
  else addEventListener('load', ()=>{ if(current()) post('ready'); }, {once:true});
})();


/* PRD v2 bridge: local draft state and reviewed values belong to an Inbox item. */
(function(){
 if(AP_PARAMS.get('inboxv2')!=='1')return;
 /* Same generation gate — see apLive() at the top of this file. A superseded
    bridge must stop writing snapshots most of all: it would keep pushing the
    previous bill's form onto whichever item is open now. */
 const current = apLive;
 let context=null, sent='', readyForSnapshots=false;
 const post=(type,payload)=>parent.postMessage({source:'aia-ap-v2',type,payload},location.origin);
 const snapshot=()=>{
  if(!current())return;
  if(!readyForSnapshots||!context)return;
  const calc=compute();
  const party=(byId(MASTERS.vendors,state.vendor)||state.vendorSuggestion||{}).name||'';
  const lines=state.ledgers.filter(r=>num(r.amount)).map(r=>({description:r.description||r.desc||r.text||'',ledger:ledgerNameOf(r.ledger)||r.ledgerSuggestion?.name||'',amount:num(r.amount),dr:num(r.amount),cr:0}));
  if(state.mode==='item')state.items.filter(r=>num(r.qty)*num(r.rate)).forEach(r=>lines.push({description:r.description||r.desc||r.text||'',ledger:byId(MASTERS.purchaseLedgers,state.purchaseLedger)?.name||state.purchaseLedgerSuggestion?.name||'',amount:num(r.qty)*num(r.rate),dr:num(r.qty)*num(r.rate),cr:0}));
  const payload={sheet:JSON.parse(JSON.stringify({...state,__drafted:state.newMasters.map(m=>({kind:m.kind,master:(NM_LIST[m.kind]?.()||[]).find(x=>x.id===m.id)})).filter(d=>d.master)})),form:{gst:byId(MASTERS.branches,state.branch)?.name||'',voucherType:byId(MASTERS.voucherTypes,state.voucherType)?.name||state.voucherType,voucherNo:state.voucherNo||nextVoucherNo(),invoiceNo:state.supplierInvoiceNo,date:state.billDate,due:state.dueDate,party,costClass:state.costCentreClass,costCentre:state.billCostCentre,narration:state.narration,lines},amount:calc.grand};
  const key=JSON.stringify(payload);if(key!==sent){sent=key;post('snapshot',payload);}
 };
 const originalExtract=applyExtraction;
 applyExtraction=function(){
  const result=originalExtract.apply(this,arguments);
  if(context){
   if(context.sheet){for(const d of context.sheet.__drafted||[]){const list=NM_LIST[d.kind]?.();if(list&&d.master&&!list.some(x=>x.id===d.master.id))list.push(d.master);}state=JSON.parse(JSON.stringify(context.sheet));state.allocated=false;refreshVendorList();}
   else if(context.manual){state=freshState();state.document={name:context.fileName};state.voucherType=context.route==='AR'?'sales':'purchase';state.voucherNo=context.form?.voucherNo||'';}
   else if(context.form){
    state.voucherNo=context.form.voucherNo;state.supplierInvoiceNo=context.form.invoiceNo;state.billDate=context.form.date;state.dueDate=context.form.due;state.costCentreClass=context.form.costClass;state.billCostCentre=context.form.costCentre;
   }
   readyForSnapshots=true;render();snapshot();
  }
  return result;
 };
 /* The sheet flags two states with a class on document.body — has-bulkbar, so
    the toast stack steps up rather than covering Apply, and is-viewer-full,
    so the page behind the full-screen document stops scrolling. Both have
    rules written as `body.x`, and under the inbox the sheet's CSS is scoped,
    which rewrites those to `.ap-sheet.x` — a selector a class on <body> can
    never satisfy.

    Mirroring onto the wrapper is the fix, and it is done with an observer
    rather than by wrapping each function that sets a flag: the list of flags
    is upstream's to grow, and the next one added there should work here
    without anyone remembering this file exists. Body keeps its own class, so
    standalone behaviour is untouched. */
 (function(){
  const wrap = document.querySelector('.ap-sheet');
  if(!wrap) return;   /* not embedded — `body.x` matches body, as written */
  const sync = () => ['has-bulkbar','is-viewer-full'].forEach(c =>
   wrap.classList.toggle(c, document.body.classList.contains(c)));
  sync();
  const obs = new MutationObserver(()=>{
   /* Disconnects itself once superseded, rather than leaving one observer per
      bill ever opened all writing the same two classes. */
   if(!current()){ obs.disconnect(); return; }
   sync();
  });
  obs.observe(document.body, {attributes:true, attributeFilter:['class']});
 })();
 /* This used to append a ✦ to every field label the extraction had filled.
    It marked so many labels at once that it stopped distinguishing anything —
    on a seeded bill that is nearly the whole form — so the mark is gone. What a
    field has actually had done to it is still shown: "Edited by you" appears on
    the ones the accountant changed, which is the distinction that carries. */
 const originalRender=render;render=function(){const result=originalRender.apply(this,arguments);queueMicrotask(snapshot);return result;};
 const originalAllocate=allocateNow;allocateNow=function(){const result=originalAllocate.apply(this,arguments);snapshot();post('approved',{voucherNo:state.voucherNo});return result;};
 addEventListener('message',ev=>{
  if(!current())return;
  if(ev.source!==parent||ev.origin!==location.origin||ev.data?.source!=='aia-inbox-v2')return;
  const {type,payload}=ev.data;
  if(type==='context'){
   context=payload;
   MASTERS.branches.forEach(b=>{b.name=b.name.replace('Karbon Business',context.company);});
   $('[data-bind="branch"]').innerHTML=options(MASTERS.branches,'Select Location',state.branch);
   refreshVendorList();
   /* Only the two inbox annotation styles. This used to also carry
        .doc-pane,.preview,.splitter{display:none!important}
        .workspace{display:block!important;padding:12px!important}
        .form{width:100%!important;max-width:none!important}
      whenever the inbox passed externalPreview, on the grounds that the inbox
      was drawing the document itself. That override was the whole problem: it
      deleted this sheet's splitter, dropped --gutter from 20 to 12, and undid
      .form__narrow's 642px cap, so every field stretched the full width and the
      screen stopped looking like the bill review it is.

      The sheet now always keeps its own layout. Where the inbox has real
      uploaded bytes it sends previewUrl and they render in this sheet's own
      document pane (below) — one layout for every case, rather than a second
      one that appears only for uploads. */
   const style=document.createElement('style');style.textContent='.inbox-edited{color:#8a5300;font-size:11px}';document.head.append(style);

  }
  /* A real upload, shown in this sheet's own pane the same way a local drop is:
     an embed for PDFs, an img for pictures. Arrives after `seed` because the
     inbox has to resolve a blob URL first, so the pane shows its sample
     facsimile until this lands and then swaps. Without it an uploaded bill
     would never be seen once the sheet owns the pane. */
  if(type==='preview'&&payload?.url){
   const name=payload.fileName||'Uploaded bill';
   $('#preview-name').textContent=name;
   $('#preview-body').innerHTML='';
   if(/\.(png|jpe?g)$/i.test(name)){
    const img=document.createElement('img');img.src=payload.url;img.alt='Uploaded bill';
    $('#preview-body').append(img);
   }else{
    const o=document.createElement('embed');o.src=payload.url;o.type='application/pdf';
    $('#preview-body').append(o);
   }
   showPaneState('preview');
  }
 });
 document.addEventListener('change',ev=>{if(!current())return;post('edited',{field:ev.target.dataset.bind||'lines'});const field=ev.target.closest('.field');if(field&&!field.querySelector('.inbox-edited')){const tag=document.createElement('span');tag.className='inbox-edited';tag.textContent='Edited by you';field.append(tag);}setTimeout(snapshot,0);});
})();
