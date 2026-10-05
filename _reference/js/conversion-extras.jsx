// Convert picker — small popover listing valid target types for a source.
// Triggered by "Convert →" buttons in AP form, AR row kebab, Banking row kebab, JV form.

const ConvertPicker = ({source, item, anchor, onClose, dispatch}) => {
  // Determine options + recommended first
  const targets = pickerTargetsFor(source, item);

  // Position calc — flip up if no room below
  const PICKER_W = 320;
  const ESTIMATED_H = 220;
  const spaceBelow = window.innerHeight - anchor.bottom;
  const placeAbove = spaceBelow < ESTIMATED_H;
  const left = Math.max(8, Math.min(window.innerWidth - PICKER_W - 8, anchor.left));
  const top  = placeAbove ? anchor.top - 6 : anchor.bottom + 6;
  const transform = placeAbove ? "translateY(-100%)" : "none";

  React.useEffect(() => {
    const onEsc = (e) => { if(e.key === "Escape") onClose(); };
    const onDocClick = (e) => {
      if(e.target.closest(".convert-picker")) return;
      onClose();
    };
    document.addEventListener("keydown", onEsc);
    document.addEventListener("mousedown", onDocClick);
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [onClose]);

  const pick = (target) => {
    onClose();
    dispatch({
      type: "openConversion",
      conversion: { source, target, ...(anchor.context || {}) }
    });
  };

  return ReactDOM.createPortal(
    <div className="convert-picker" style={{position:"fixed", top, left, width: PICKER_W, zIndex: 1100, transform}}>
      <div className="convert-picker__head">
        <Icon name="swap" size={13}/>
        <span>Convert to…</span>
      </div>
      {targets.map(t => (
        <div key={t.target} className="convert-picker__opt" onClick={() => pick(t.target)}>
          <div style={{display:"flex", alignItems:"center", gap:8}}>
            <Icon name={t.icon} size={14}/>
            <strong style={{fontSize:"var(--t-14)"}}>{t.label}</strong>
            {t.badge && <span className="convert-picker__badge">{t.badge}</span>}
          </div>
          <div className="convert-picker__sub">{t.consequence}</div>
        </div>
      ))}
    </div>,
    document.body
  );
};

function pickerTargetsFor(source, item){
  if(source === "bill" || source === "bill-detail" || source === "list-row"){
    return [
      { target:"JV",      label:"Journal Voucher", icon:"ledger",  consequence:"Voucher class → Journal." },
      { target:"Invoice", label:"Sales Invoice",   icon:"receipt", badge:"uncommon · party flip",
        consequence:"Vendor → Customer · Input GST → Output GST · Expense → Income." }
    ];
  }
  if(source === "ar-row" || source === "ar-row-drill"){
    return [
      { target:"JV",   label:"Journal Voucher", icon:"ledger", consequence:"Voucher class → Journal." },
      { target:"Bill", label:"Bill (Purchase)", icon:"wallet", badge:"uncommon · party flip",
        consequence:"Customer → Vendor · Output GST → Input GST · Income → Expense." }
    ];
  }
  if(source === "banking-row" || source === "banking-row-drill"){
    return [
      { target:"JV", label:"Journal Voucher", icon:"ledger",
        consequence:"Bank transaction → General Ledger entry." }
    ];
  }
  if(source === "jv" || source === "jv-detail"){
    return [
      { target:"Bill",    label:"Bill (Purchase)",  icon:"wallet",  consequence:"Receivable → Vendor · Journal lines → Bill structure." },
      { target:"Invoice", label:"Sales Invoice",     icon:"receipt", consequence:"Narration party → Customer · Journal lines → Invoice lines." }
    ];
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────
// Convert → button — opens picker on click
// ─────────────────────────────────────────────────────────────────

const ConvertButton = ({source, item, dispatch, extraContext, size = "default"}) => {
  const [open, setOpen] = React.useState(false);
  const [anchor, setAnchor] = React.useState(null);
  const ref = React.useRef(null);

  const onClick = () => {
    const r = ref.current.getBoundingClientRect();
    setAnchor({ top: r.top, left: r.left, bottom: r.bottom, right: r.right, context: extraContext });
    setOpen(true);
  };

  return (
    <>
      <button
        ref={ref}
        className={cls("btn", "btn--outline", size === "sm" ? "btn--sm" : "")}
        onClick={onClick}
      >
        <Icon name="swap" size={14}/> Convert <Icon name="chev-d" size={12}/>
      </button>
      {open && anchor && <ConvertPicker source={source} item={item} anchor={anchor} onClose={()=>setOpen(false)} dispatch={dispatch}/>}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────
// Cross-type Duplicate Screen — full-canvas, replaces detail body
// ─────────────────────────────────────────────────────────────────

const CrossTypeDupScreen = ({item, dispatch}) => {
  const [showReason, setShowReason] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const dup = item.crossDupOf;

  const okToProcess = reason.trim().length >= 12;

  return (
    <div className="native" data-screen-label="Cross-type Duplicate">
      <div className="native__body" style={{padding:"48px 32px", maxWidth: 720, margin: "0 auto", gap: 24}}>

        {/* Big lineage card */}
        <div style={{padding:24, border:"1px solid var(--warning-edge)", background:"var(--warning-wash)", borderRadius:12}}>
          <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:14}}>
            <span style={{width:44, height:44, borderRadius:"50%", background:"var(--warning)", color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center"}}>
              <Icon name="alert-tri" size={22}/>
            </span>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:"var(--t-20)", fontWeight:700, color:"var(--text)"}}>Already posted</div>
              <div style={{fontSize:"var(--t-14)", color:"var(--warning)", marginTop:2}}>The content of this {item.voucherType?.toLowerCase() || "file"} matches a record already in your books.</div>
            </div>
          </div>

          <div style={{padding:"14px 16px", background:"var(--surface)", border:"1px solid var(--warning-edge)", borderRadius:8, display:"flex", flexDirection:"column", gap:10}}>
            <div style={{display:"flex", alignItems:"center", gap:10}}>
              <span className="pill pill--success">Posted</span>
              <strong style={{fontSize:"var(--t-14)", color:"var(--text)"}}>{dup.id}</strong>
              <span style={{fontSize:"var(--t-12)", color:"var(--text-muted)"}}>· {dup.type}</span>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"100px 1fr", gap:"6px 12px", fontSize:"var(--t-12)"}}>
              <span style={{color:"var(--text-muted)"}}>Posted by</span>      <strong style={{color:"var(--text)"}}>{dup.postedBy}</strong>
              <span style={{color:"var(--text-muted)"}}>Posted on</span>       <strong style={{color:"var(--text)"}}>{dup.postedOn}</strong>
              <span style={{color:"var(--text-muted)"}}>Amount</span>           <strong style={{color:"var(--text)"}} className="num">{fmtINRplain(dup.amount)}</strong>
              <span style={{color:"var(--text-muted)"}}>This file</span>        <span style={{color:"var(--text)"}}>{item.file.name}</span>
            </div>
          </div>
        </div>

        {/* Plain-language explanation */}
        <div style={{padding:"16px 20px", background:"var(--bg-primary)", border:"1px solid var(--stroke)", borderRadius:8}}>
          <div style={{fontSize:"var(--t-14)", fontWeight:600, marginBottom:6, color:"var(--text)"}}>Why we're blocking this</div>
          <div style={{fontSize:"var(--t-14)", color:"var(--text-muted)", lineHeight:1.55}}>
            Re-posting this would double-count the entry. The original record is already in your books and synced to Tally. Even if the file looks different (different type, different source), the content is the same — same party, same amount, same period.
          </div>
        </div>

        {/* Three actions */}
        <div style={{display:"flex", flexDirection:"column", gap:10}}>
          <button className="btn btn--solid" style={{justifyContent:"flex-start", padding:"14px 16px"}} onClick={() => {
            dispatch({type:"discardCrossDup", id: item.id});
            window.__toast && window.__toast("Upload discarded. Original posting kept.");
          }}>
            <Icon name="trash" size={14}/> Discard this upload
            <span style={{marginLeft:"auto", fontSize:"var(--t-11)", opacity:.8}}>Recommended</span>
          </button>

          <button className="btn btn--outline" style={{justifyContent:"flex-start", padding:"14px 16px"}} onClick={() => window.open && window.__toast("In the live product, this opens " + dup.id + " in its module.")}>
            <Icon name="external" size={14}/> Open the existing posting ({dup.id})
          </button>

          <div style={{padding:"12px 16px", border:"1px dashed var(--stroke)", borderRadius:8}}>
            {!showReason ? (
              <button className="btn btn--outline btn--sm" style={{padding:0}} onClick={() => setShowReason(true)}>
                <Icon name="edit" size={13}/> It's not a duplicate — process anyway
              </button>
            ) : (
              <div style={{display:"flex", flexDirection:"column", gap:8}}>
                <div style={{fontSize:"var(--t-14)", fontWeight:600}}>Reason for processing anyway</div>
                <div style={{fontSize:"var(--t-11)", color:"var(--text-muted)"}}>At least 12 characters. This is recorded on both records' lineage.</div>
                <textarea
                  className="textarea" rows={3}
                  placeholder="e.g., This is a separate transaction with the same amount but different period…"
                  value={reason}
                  onChange={(e)=>setReason(e.target.value)}
                />
                <div style={{display:"flex", gap:6}}>
                  <button className="btn btn--outline btn--sm" onClick={() => { setShowReason(false); setReason(""); }}>Cancel</button>
                  <button className="btn btn--solid btn--sm" disabled={!okToProcess} onClick={() => {
                    dispatch({type:"forceProcessCrossDup", id: item.id, reason});
                    window.__toast && window.__toast("Routed to Classify. Reason recorded on lineage.");
                  }}>
                    Submit &amp; route to Classify ({reason.trim().length}/12)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Reversal Panel
// ─────────────────────────────────────────────────────────────────

const ReversalPanel = ({state, dispatch}) => {
  const item = state.items.find(it => it.id === state.reversalForId);
  if(!item || !item.lineage) return null;

  const lin = item.lineage;
  const ct = lin.convertedTo;

  return (
    <div className="jvc-backdrop" onClick={() => dispatch({type:"closeReversal"})}>
      <div className="jvc jvc--wide" onClick={e => e.stopPropagation()} data-screen-label="Reversal Panel">
        <div className="jvc__head">
          <span className="jvc__head-icon" style={{background:"var(--danger-wash)", color:"var(--danger)"}}>
            <Icon name="rotate" size={18}/>
          </span>
          <div style={{flex:1, minWidth:0}}>
            <h3 className="jvc__title">Reverse the conversion of {lin.sourceId} → {ct.id}</h3>
            <div style={{fontSize:"var(--t-12)", color:"var(--text-muted)", marginTop:2}}>This restores the original {lin.sourceType} to your inbox.</div>
          </div>
          <button className="icon-btn" onClick={() => dispatch({type:"closeReversal"})}>
            <Icon name="x" size={16}/>
          </button>
        </div>

        <div style={{padding:"12px 20px 4px", display:"flex", flexWrap:"wrap", gap:8, borderBottom:"1px solid var(--stroke)"}}>
          <span className="conseq-chip">{ct.type} → Reversal voucher</span>
          <span className="conseq-chip">Source returns to inbox as Needs Review</span>
        </div>

        <div className="jvc__body">
          <div style={{padding:14, background:"var(--bg-secondary)", border:"1px solid var(--brand-soft)", borderRadius:8, display:"flex", gap:10, alignItems:"flex-start"}}>
            <Icon name="info" size={14}/>
            <div style={{fontSize:"var(--t-14)", color:"var(--brand-deep)", lineHeight:1.55}}>
              A reversal voucher will be posted in <strong>{ct.type}</strong>, and the original <strong>{lin.sourceType}</strong> ({lin.sourceId}) will return to your inbox as <strong>Needs Review</strong>.
            </div>
          </div>

          {/* The chain */}
          <div style={{marginTop:20}}>
            <strong style={{fontSize:"var(--t-14)", display:"block", marginBottom:8}}>Lineage chain</strong>
            <div style={{padding:14, border:"1px solid var(--stroke)", borderRadius:8, fontSize:"var(--t-14)", lineHeight:1.7}}>
              <div><strong style={{color:"var(--text-muted)"}}>1.</strong> {lin.sourceType} <strong>{lin.sourceId}</strong> posted {lin.sourcePostedOn} → marked superseded</div>
              <div><strong style={{color:"var(--text-muted)"}}>2.</strong> {ct.type} <strong>{ct.id}</strong> posted {ct.postedOn} by {ct.actor} → will be reversed</div>
              <div><strong style={{color:"var(--text-muted)"}}>3.</strong> Reversal voucher <strong>{ct.id}-REV</strong> will be posted today by Sandeep B.</div>
              <div><strong style={{color:"var(--text-muted)"}}>4.</strong> {lin.sourceType} <strong>{lin.sourceId}</strong> returns to inbox as Needs Review</div>
            </div>
          </div>

          <div style={{marginTop:20}}>
            <strong style={{fontSize:"var(--t-14)", display:"block", marginBottom:8}}>Pre-flight</strong>
            <PreflightLine kind="ok" label="GST period" body="Reversal posts in current period — does not cross a filed return."/>
            <PreflightLine kind="info" label="Blast radius" body={`A reversal voucher is posted in ${ct.type}. The original ${lin.sourceType} returns to your inbox. Both records carry the full lineage chain.`}/>
          </div>
        </div>

        <div className="jvc__foot">
          <button className="btn btn--outline" onClick={() => dispatch({type:"closeReversal"})}>Cancel</button>
          <button className="btn btn--solid" onClick={() => dispatch({type:"confirmReversal"})}>
            <Icon name="rotate" size={14}/> Post reversal &amp; restore source
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Lineage chip — small inline reference on Done-tab row + detail header
// ─────────────────────────────────────────────────────────────────

const LineageChip = ({lineage, dir = "fwd"}) => {
  if(!lineage) return null;
  const arrow = dir === "fwd" ? "→" : "←";
  // The id already carries its own prefix (JV/, PUR/, INV-S/) — show as-is
  const target = dir === "fwd"
    ? (lineage.convertedTo?.id || "")
    : (lineage.sourceId || "");
  return (
    <span className="lineage-chip" title={`Converted from ${lineage.sourceType} ${lineage.sourceId}`}>
      <Icon name="swap" size={10} stroke={2}/>
      <span>{arrow} {target}</span>
    </span>
  );
};

const LineageHeader = ({lineage, dir = "fwd"}) => {
  if(!lineage) return null;
  return (
    <div className="lineage-header">
      <Icon name="swap" size={12} stroke={2}/>
      {dir === "fwd"
        ? <span>Converted from <strong>{lineage.sourceId}</strong> ({lineage.sourceType}, posted {lineage.sourcePostedOn} by Sandeep B.) — <a href="#" onClick={(e)=>e.preventDefault()}>View source</a>.</span>
        : <span>Converted to <strong>{lineage.convertedTo.id}</strong> ({lineage.convertedTo.type}) on {lineage.convertedTo.postedOn} — <a href="#" onClick={(e)=>e.preventDefault()}>View target</a>.</span>
      }
    </div>
  );
};

Object.assign(window, { ConvertPicker, ConvertButton, CrossTypeDupScreen, ReversalPanel, LineageChip, LineageHeader, pickerTargetsFor });
