// Inbox List — tabs, table, bulk actions, search/filter, upload modal, empty state.

const TABS = [
  { id: "all",       label: "All" },
  { id: "needs",     label: "Needs Review" },
  { id: "done",      label: "Done" },
  { id: "failed",    label: "Failed" },
  { id: "duplicate", label: "Duplicate" },
  { id: "deleted",   label: "Deleted" }
];

const tabMatches = (tab, it) => {
  if(tab === "all")        return it.status !== "deleted";
  if(tab === "needs")      return ["needs-review","low-confidence","duplicate-soft","unclassified","retrying"].includes(it.status);
  if(tab === "done")       return it.status === "done";
  if(tab === "failed")     return it.status === "failed";
  if(tab === "duplicate")  return it.status === "duplicate-hard" || it.status === "duplicate-soft" || it.status === "duplicate-cross-type";
  if(tab === "deleted")    return it.status === "deleted";
  return false;
};

const InboxList = ({state, dispatch}) => {
  const { items, activeTab, selected, filters, search, showUpload, showEmpty } = state;

  // counts per tab
  const counts = React.useMemo(() => {
    const o = {};
    TABS.forEach(t => o[t.id] = items.filter(it => tabMatches(t.id, it)).length);
    return o;
  }, [items]);

  // tab + filters + search
  const visibleItems = React.useMemo(() => {
    let xs = items.filter(it => tabMatches(activeTab, it));
    if(filters.source && filters.source !== "all") xs = xs.filter(it => it.source.channel === filters.source);
    if(filters.route  && filters.route  !== "all") xs = xs.filter(it => it.route === filters.route);
    if(filters.aged)   xs = xs.filter(it => it.aged);
    if(filters.failed) xs = xs.filter(it => it.status === "failed");
    if(search.trim()){
      const q = search.toLowerCase();
      xs = xs.filter(it =>
        it.file.name.toLowerCase().includes(q) ||
        (it.vendor||"").toLowerCase().includes(q) ||
        (it.customer||"").toLowerCase().includes(q) ||
        it.id.toLowerCase().includes(q) ||
        it.source.sender.toLowerCase().includes(q)
      );
    }
    return xs;
  }, [items, activeTab, filters, search]);

  const allSelected = visibleItems.length > 0 && visibleItems.every(it => selected.has(it.id));
  const someSelected = visibleItems.some(it => selected.has(it.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if(allSelected){ visibleItems.forEach(it => next.delete(it.id)); }
    else           { visibleItems.forEach(it => next.add(it.id));    }
    dispatch({type:"setSelected", value: next});
  };
  const toggleOne = (id) => {
    const next = new Set(selected);
    if(next.has(id)) next.delete(id); else next.add(id);
    dispatch({type:"setSelected", value: next});
  };

  if(showEmpty){
    return <InboxEmpty state={state} dispatch={dispatch}/>;
  }

  return (
    <div className="page" data-screen-label="Inbox List">
      <div className="page__head">
        <h1 className="page__title">Inbox</h1>
        <div style={{flex:1}}/>
        <button className="btn btn--outline btn--sm" onClick={()=> dispatch({type:"setShowEmpty", value:true})}>
          <Icon name="eye" size={14}/> Empty state
        </button>
        <button className="btn btn--solid" onClick={()=> dispatch({type:"setShowUpload", value:true})}>
          <Icon name="upload" size={14}/> Upload
        </button>
      </div>

      <div style={{padding:"16px 24px 0"}}>
        <div className="tabs">
          {TABS.map(t => (
            <div
              key={t.id}
              className={cls("tab", activeTab === t.id && "is-active")}
              onClick={() => dispatch({type:"setActiveTab", value: t.id})}
            >
              <span>{t.label}</span>
              <span className="tab__count">{counts[t.id]}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{padding:"12px 24px 0", display:"flex", alignItems:"center", gap:12}}>
        <div className="search" style={{flex:1, maxWidth:360}}>
          <Icon name="search" size={14}/>
          <input className="input" placeholder="Search file, vendor, sender, ID…" value={search} onChange={e => dispatch({type:"setSearch", value: e.target.value})}/>
        </div>
        <FilterChip label="Source" value={filters.source} options={[["all","All sources"],["email","Email"],["whatsapp","WhatsApp"],["upload","Upload"],["drive","Drive"]]} onChange={v=>dispatch({type:"setFilter", key:"source", value:v})}/>
        <FilterChip label="AI Route" value={filters.route} options={[["all","All routes"],["AP","Accounts Payable"],["AR","Accounts Receivable"],["Banking","Banking"],["JV","Journal Voucher"]]} onChange={v=>dispatch({type:"setFilter", key:"route", value:v})}/>
        <button className={cls("btn btn--outline btn--sm", filters.aged && "btn--soft")} onClick={()=>dispatch({type:"setFilter", key:"aged", value: !filters.aged})}>
          <Icon name="clock" size={14}/> Aged 7d+
        </button>
        <button className={cls("btn btn--outline btn--sm", filters.failed && "btn--soft")} onClick={()=>dispatch({type:"setFilter", key:"failed", value: !filters.failed})}>
          <Icon name="alert-tri" size={14}/> Failed
        </button>
        <div style={{flex:1}}/>
        <span style={{fontSize:"var(--t-14)", color:"var(--text-muted)"}}>{visibleItems.length} item{visibleItems.length===1?"":"s"}</span>
      </div>

      <div className="page__body" style={{paddingTop:12}}>
        <div className="tbl-wrap">
          <table className="tbl tbl--inbox">
            <thead>
              <tr>
                <th className="col-check" style={{paddingLeft:16}}>
                  <Checkbox checked={allSelected} indeterminate={!allSelected && someSelected} onChange={toggleAll}/>
                </th>
                <th className="col-file">File</th>
                <th className="col-source">Source</th>
                <th className="col-vendor">Vendor / Customer</th>
                <th className="col-voucher">Voucher Type</th>
                <th className="col-route">AI Route</th>
                <th className="col-amount tbl__num">Amount</th>
                <th className="col-received tbl__date">Received</th>
                <th className="col-status">Status</th>
                <th className="col-kebab"/>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length === 0 && (
                <tr><td colSpan={10} style={{padding:48, textAlign:"center", color:"var(--text-muted)"}}>
                  No items in this view. Try a different tab or clear filters.
                </td></tr>
              )}
              {visibleItems.map(it => {
                const disabled = it.status === "extracting";
                return (
                <tr key={it.id}
                    className={cls("tr-kebab", selected.has(it.id) && "is-selected", disabled && "is-disabled")}
                    onClick={() => { if(!disabled) dispatch({type:"openDetail", id: it.id}); }}
                    style={{cursor: disabled ? "not-allowed" : "pointer"}}>
                  <td className="col-check" style={{paddingLeft:16}} onClick={(e)=>e.stopPropagation()}>
                    {disabled
                      ? <Checkbox checked={false} onChange={() => {}}/>
                      : <Checkbox checked={selected.has(it.id)} onChange={() => toggleOne(it.id)}/>}
                  </td>
                  <td className="col-file">
                    <div style={{display:"flex", alignItems:"center", gap:10, minWidth:0}}>
                      <FileIcon ext={it.file.ext}/>
                      <div style={{minWidth:0, flex:1, overflow:"hidden"}}>
                        <div className="cell-ellipsis" title={it.file.name} style={{fontWeight:600, color:"var(--text)"}}>{it.file.name}</div>
                        <div className="cell-ellipsis" style={{fontSize:"var(--t-12)", color:"var(--text-muted)"}}>{it.file.size} · {it.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="col-source">
                    {/* alignItems:flex-start — in a column flex the default
                        stretch made the channel pill span the whole cell,
                        which the reference table never does. */}
                    <div style={{display:"flex", flexDirection:"column", alignItems:"flex-start", gap:3, minWidth:0, maxWidth:"100%"}}>
                      <ChannelPill channel={it.source.channel}/>
                      <span className="cell-ellipsis" style={{fontSize:"var(--t-12)", color:"var(--text-muted)"}} title={it.source.sender}>{it.source.sender}</span>
                    </div>
                  </td>
                  <td className="col-vendor">
                    <span className="cell-ellipsis" title={it.vendor || it.customer || ""}>{it.vendor || it.customer || "—"}</span>
                    {it.bill?.vendorMissing && <span className="inline-add" style={{marginLeft:6}}>+ Add</span>}
                  </td>
                  <td className="col-voucher">{it.voucherType || "—"}</td>
                  <td className="col-route"><RoutePill route={it.route}/></td>
                  <td className="col-amount tbl__num num">{fmtINR(it.amount)}</td>
                  <td className="col-received tbl__date">
                    <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end"}}>
                      <span style={{fontSize:"var(--t-14)", color:"var(--text)"}}>{absDate(it.receivedAt).split(",")[0]}</span>
                      <span style={{fontSize:"var(--t-12)", color:"var(--text-muted)"}}>{ago(it.receivedAt)}</span>
                    </div>
                  </td>
                  <td className="col-status">
                    <div style={{display:"flex", alignItems:"center", gap:6, flexWrap:"wrap"}}>
                      <StatusPill status={it.status} aged={it.aged}/>
                      {it.lineage && <LineageChip lineage={it.lineage} dir="fwd"/>}
                    </div>
                  </td>
                  <td className="col-kebab" onClick={(e)=>e.stopPropagation()}>
                    <RowKebab item={it} dispatch={dispatch}/>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {selected.size > 0 && <BulkBar items={items} selected={selected} dispatch={dispatch}/>}

        <div style={{display:"flex", alignItems:"center", justifyContent:"flex-end", gap:16, padding:"16px 4px 0", color:"var(--text-muted)", fontSize:"var(--t-14)"}}>
          <span>Rows per page: 10</span>
          <span>1 – {visibleItems.length} of {visibleItems.length}</span>
          <button className="icon-btn"><Icon name="chev-l" size={14}/></button>
          <button className="icon-btn"><Icon name="chev-r" size={14}/></button>
        </div>
      </div>

      {showUpload && <UploadModal onClose={()=>dispatch({type:"setShowUpload", value:false})}/>}
    </div>
  );
};

// ---------------- Bulk action bar ----------------
// Same-type only — guards against mixed AP+AR+Banking bulk approve.

const BulkBar = ({items, selected, dispatch}) => {
  const selectedItems = items.filter(it => selected.has(it.id));
  const routes = new Set(selectedItems.map(it => it.route));
  const sameType = routes.size === 1;
  const route = sameType ? [...routes][0] : null;
  const verb = route === "AR" ? "invoice batches"
             : route === "Banking" ? "statements"
             : route === "JV" ? "journals"
             : "bills";

  return (
    <div className="bulk">
      <span className="bulk__count">{selected.size} selected</span>
      {sameType ? (
        <>
          <span style={{fontSize:"var(--t-12)", opacity:.7}}>All same type · {verb}</span>
          <button className="bulk__btn bulk__btn--solid"><Icon name="check" size={13}/> Approve all</button>
          <button className="bulk__btn bulk__btn--danger"><Icon name="trash" size={13}/> Delete</button>
        </>
      ) : (
        <>
          <span style={{fontSize:"var(--t-12)", opacity:.7, color:"#fca5a5"}}>Mixed types · approve disabled</span>
          <button className="bulk__btn"><Icon name="swap" size={13}/> Reassign</button>
          <button className="bulk__btn bulk__btn--danger"><Icon name="trash" size={13}/> Delete</button>
        </>
      )}
      <button className="bulk__btn" onClick={()=>dispatch({type:"setSelected", value: new Set()})}><Icon name="x" size={13}/> Clear</button>
    </div>
  );
};

const FilterChip = ({label, value, options, onChange}) => {
  const cur = options.find(o => o[0] === value) || options[0];
  return (
    <div style={{position:"relative"}}>
      <select className="select btn--sm" style={{height:32, fontSize:"var(--t-14)", paddingRight:28}} value={cur[0]} onChange={e=>onChange(e.target.value)}>
        {options.map(([v,l]) => <option key={v} value={v}>{label}: {l}</option>)}
      </select>
    </div>
  );
};

// ---------------- Empty state (first-run) ----------------

const InboxEmpty = ({state, dispatch}) => {
  const [showQr, setShowQr] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard?.writeText("inbox@shakunthalam.aiaccountant.com").catch(()=>{});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="page" data-screen-label="Inbox Empty">
      <div className="page__head">
        <h1 className="page__title">Inbox</h1>
        <div style={{flex:1}}/>
        <button className="btn btn--outline btn--sm" onClick={()=> dispatch({type:"setShowEmpty", value:false})}>
          <Icon name="eye" size={14}/> Show list (seeded)
        </button>
      </div>

      <div className="empty">
        <div className="empty__inner">
          <div className="empty__hero">
            <div className="empty__eyebrow">Inbox</div>
            <h2 className="empty__title">Nothing to review — yet.</h2>
            <p className="empty__sub">Send a bill, statement or invoice sheet by any of these. We'll classify it and route it to the right module.</p>
          </div>

          <div className="channel-tiles">
            <div className="tile tile--email">
              <span className="tile__icon"><Icon name="envelope" size={22}/></span>
              <div>
                <div className="tile__title">Forward by email</div>
                <div className="tile__sub">Forward bills and invoices straight from your inbox. We'll pick up attachments.</div>
              </div>
              <div className="tile__value">
                <code>inbox@shakunthalam.aiaccountant.com</code>
                <button className="tile__btn" onClick={copy}>
                  {copied ? <><Icon name="check" size={12} stroke={3}/> Copied</> : "Copy"}
                </button>
              </div>
            </div>

            <div className="tile tile--whatsapp">
              <span className="tile__icon"><Icon name="phone" size={22}/></span>
              <div>
                <div className="tile__title">Send via WhatsApp</div>
                <div className="tile__sub">Snap a paper bill on your phone, send it. Photos OCR'd in seconds.</div>
              </div>
              <div className="tile__value">
                <code>+91 80 4567 1234</code>
                <button className="tile__btn" onClick={() => setShowQr(v => !v)}>{showQr ? "Hide QR" : "Show QR"}</button>
              </div>
              {showQr && <div className="tile__qr" aria-label="WhatsApp QR"/>}
            </div>

            <div className="tile tile--upload">
              <span className="tile__icon"><Icon name="upload" size={22}/></span>
              <div>
                <div className="tile__title">Upload from this device</div>
                <div className="tile__sub">Drag-drop up to 50 files at once — PDF, JPG, PNG, XLSX. Mixed types are fine.</div>
              </div>
              <button className="tile__upload-btn" onClick={() => dispatch({type:"setShowUpload", value:true})}>
                <Icon name="upload" size={16}/> Upload files
              </button>
              <div className="tile__hint">No metadata needed — we work out what each file is.</div>
            </div>
          </div>

          <div className="howitworks">
            <div className="howitworks__step">
              <div className="howitworks__num">01 Classify</div>
              <div className="howitworks__title">We pick a route</div>
              <div className="howitworks__sub">Bill, invoice batch, statement, or journal.</div>
            </div>
            <div className="howitworks__connector"/>
            <div className="howitworks__step">
              <div className="howitworks__num">02 Prepare</div>
              <div className="howitworks__title">We pull the fields</div>
              <div className="howitworks__sub">Vendor, GST, line items, dates — extracted.</div>
            </div>
            <div className="howitworks__connector"/>
            <div className="howitworks__step">
              <div className="howitworks__num">03 Confirm</div>
              <div className="howitworks__title">You approve</div>
              <div className="howitworks__sub">One tap to send to Tally / Zoho.</div>
            </div>
          </div>
        </div>
      </div>

      {state.showUpload && <UploadModal onClose={()=>dispatch({type:"setShowUpload", value:false})}/>}
    </div>
  );
};

// ---------------- Upload modal ----------------

const UploadModal = ({onClose}) => {
  const [files, setFiles] = React.useState([]);
  const [dragging, setDragging] = React.useState(false);

  const addFiles = () => {
    // simulate adding a few realistic files
    const samples = [
      { name: "Acme-May-Invoice.pdf",       size: "412 KB", progress: 100, status: "ok" },
      { name: "Theta-Sales-May.xlsx",       size: "184 KB", progress: 100, status: "ok" },
      { name: "HDFC-Apr-Statement.pdf",     size: "624 KB", progress: 100, status: "ok" },
      { name: "Sigma-Pkg-INV-0421.pdf",     size: "320 KB", progress: 64,  status: "uploading" },
      { name: "vendor-credit-note.docx",    size: "82 KB",  progress: 100, status: "error", error: "Unsupported file type" }
    ];
    setFiles(samples);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{width:720}} onClick={e=>e.stopPropagation()}>
        <div className="modal__head">
          <h3 className="modal__title">Upload to Inbox</h3>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16}/></button>
        </div>
        <div className="modal__body">
          <div
            style={{
              border:"1.5px dashed " + (dragging ? "var(--brand)" : "var(--brand-soft)"),
              borderRadius: "10px",
              padding: "32px 24px",
              background: dragging ? "var(--bg-secondary)" : "var(--bg-secondary)",
              display:"flex", alignItems:"center", gap:24
            }}
            onDragOver={e=>{e.preventDefault(); setDragging(true);}}
            onDragLeave={()=> setDragging(false)}
            onDrop={e=>{e.preventDefault(); setDragging(false); addFiles();}}
          >
            <span style={{width:56, height:56, borderRadius:"50%", background:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", color:"var(--brand)"}}>
              <Icon name="upload" size={24}/>
            </span>
            <div>
              <div style={{fontSize:"var(--t-16)", fontWeight:600, color:"var(--text)"}}>
                Drop your files or <a href="#" onClick={(e)=>{e.preventDefault(); addFiles();}}>browse</a>
              </div>
              <div style={{fontSize:"var(--t-14)", color:"var(--text-muted)", marginTop:4}}>Upload up to 50 files at once · We'll classify each one for you</div>
              <div style={{fontSize:"var(--t-12)", color:"var(--text-muted)", marginTop:2}}>Supported: PDF, JPG, PNG, XLSX</div>
            </div>
          </div>

          <div style={{marginTop:16, fontSize:"var(--t-11)", color:"var(--text-muted)", display:"flex", alignItems:"center", gap:6}}>
            <Icon name="info" size={12}/>
            <span>No need to pick a route — we work that out from the file. Mix bills, statements, and Excel sheets in one upload.</span>
          </div>

          {files.length > 0 && (
            <div style={{marginTop:20}}>
              <div style={{fontSize:"var(--t-14)", fontWeight:600, marginBottom:8}}>{files.length} files</div>
              <div style={{display:"flex", flexDirection:"column", gap:8}}>
                {files.map((f, i) => (
                  <div key={i} style={{
                    padding:"10px 12px",
                    border:"1px solid " + (f.status==="error" ? "var(--danger-edge)" : "var(--stroke)"),
                    background: f.status==="error" ? "var(--danger-wash)" : "#fff",
                    borderRadius:6, display:"flex", alignItems:"center", gap:12
                  }}>
                    <FileIcon ext={f.name.endsWith(".xlsx") ? "xlsx" : "pdf"}/>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontSize:"var(--t-14)", fontWeight:600}}>{f.name}</div>
                      <div style={{fontSize:"var(--t-11)", color:"var(--text-muted)"}}>
                        {f.size}
                        {f.status === "error" && <span style={{color:"var(--danger)", marginLeft:6}}>· {f.error}</span>}
                      </div>
                      {f.status === "uploading" && (
                        <div style={{height:4, background:"var(--stroke)", borderRadius:2, marginTop:6, overflow:"hidden"}}>
                          <div style={{width: f.progress+"%", height:"100%", background:"var(--brand)"}}/>
                        </div>
                      )}
                    </div>
                    {f.status === "ok"     && <Icon name="check" size={16} className="" stroke={2.5} />}
                    {f.status === "error"  && <button className="btn btn--outline btn--sm">Retry</button>}
                    {f.status === "uploading" && <span style={{fontSize:"var(--t-12)", fontWeight:600, color:"var(--brand)"}}>{f.progress}%</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal__foot">
          <button className="btn btn--outline" onClick={onClose}>Cancel</button>
          <button className="btn btn--solid" onClick={() => { addFiles(); setTimeout(onClose, 600); }}>
            <Icon name="upload" size={14}/> Upload {files.length || ""}
          </button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { InboxList, UploadModal });

// Per-row kebab on the inbox list. Items vary by status / route.
const RowKebab = ({item, dispatch}) => {
  const open = { label: "Open", icon: "external", onClick: () => dispatch({type:"openDetail", id: item.id}) };
  const del  = { label: "Delete", icon: "trash", danger: true,
                 onClick: () => window.__toast && window.__toast("Item moved to Deleted tab.") };

  let items;
  if(item.status === "extracting"){
    items = [
      { label: "Cancel extraction", icon: "x",
        onClick: () => window.__toast && window.__toast("Extraction cancelled. Item removed.") },
      del
    ];
  } else if(item.status === "failed"){
    items = [
      { label: "Retry extraction", icon: "rotate",
        onClick: () => window.__toast && window.__toast("Retrying extraction…") },
      { label: "Fill manually", icon: "edit",
        onClick: () => dispatch({type:"openDetail", id: item.id}) },
      del
    ];
  } else if(item.status === "done"){
    // Done-tab rows: Reverse this conversion (if it was a conversion), Open
    const itemsArr = [
      { label: "Open record", icon: "external",
        onClick: () => window.__toast && window.__toast("Opens " + (item.lineage?.convertedTo?.id || item.destination || "the posted record") + " in its module.") }
    ];
    if(item.lineage){
      itemsArr.push({ divider: true });
      itemsArr.push({ label: "Reverse this conversion", icon: "rotate",
        onClick: () => dispatch({type:"openReversal", id: item.id}) });
    }
    items = itemsArr;
  } else if(item.status === "duplicate-cross-type"){
    items = [open, del];
  } else if(item.status === "duplicate-hard" || item.status === "duplicate-soft"){
    items = [open, del];
  } else if(item.route === "AP"){
    items = [
      open,
      { label: "Convert to Journal Voucher", icon: "ledger",
        onClick: () => { dispatch({type:"openDetail", id: item.id}); setTimeout(() => dispatch({type:"openConversion", conversion:{source:"list-row", target:"JV"}}), 50); } },
      del
    ];
  } else {
    items = [open, del];
  }
  return <KebabMenu items={items}/>;
};

Object.assign(window, { RowKebab });
