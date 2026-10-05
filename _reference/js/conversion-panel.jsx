// Unified Conversion Panel — replaces the old JV-only panel.
// Handles every conversion edge: Bill→JV, Bill→Invoice, AR-row→JV, AR-row→Bill,
// Bank-txn→JV, JV→Bill, JV→Invoice. Same surface, same motion.

const ConversionPanel = ({state, dispatch}) => {
  const conv = state.conversion;
  const item = state.items.find(it => it.id === state.openedId);
  if(!conv || !item) return null;

  const spec = describeConversion(item, conv);

  // Local state — values the user resolves in the mapping table
  const [resolved, setResolved] = React.useState({});
  const resolve = (key, value) => setResolved(prev => ({...prev, [key]: value}));

  // CTA gating — every "needs" row must have a resolved value
  const unresolved = spec.mapping.filter(r => r.status === "needs" && !resolved[r.key]);
  const preflightBlocking = spec.preflight.duplicate.blocking;
  const ctaDisabled = unresolved.length > 0 || preflightBlocking;

  // Multi-user conflict
  const conflict = state.conflictForId === item.id;

  const confirm = () => {
    if(item._conflictSim && !conflict){
      // First confirm on a conflict-sim item — fire the conflict, don't actually convert.
      dispatch({type:"simulateConflict", id: item.id});
      return;
    }
    dispatch({type:"confirmConversion", spec, resolved});
  };

  return (
    <div className="jvc-backdrop" onClick={() => dispatch({type:"closeConversion"})}>
      <div className="jvc jvc--wide" onClick={e => e.stopPropagation()} data-screen-label="Conversion Panel">
        {/* ── Header ───────────────────────────────────────── */}
        <div className="jvc__head">
          <span className="jvc__head-icon"><Icon name="swap" size={18}/></span>
          <div style={{flex:1, minWidth:0}}>
            <h3 className="jvc__title">{spec.title}</h3>
            <div style={{fontSize:"var(--t-12)", color:"var(--text-muted)", marginTop:2}}>{spec.subtitle}</div>
          </div>
          <button className="icon-btn" onClick={() => dispatch({type:"closeConversion"})}>
            <Icon name="x" size={16}/>
          </button>
        </div>

        {/* Consequence chips */}
        <div style={{padding:"12px 20px 4px", display:"flex", flexWrap:"wrap", gap:8, borderBottom: "1px solid var(--stroke)"}}>
          {spec.consequenceChips.map((c, i) => (
            <span key={i} className="conseq-chip">{c}</span>
          ))}
        </div>

        {/* Optional freeform → structured banner (JV → typed only) */}
        {spec.freeformBanner && (
          <div style={{padding:"12px 20px", borderBottom:"1px solid var(--stroke)", background:"var(--bg-secondary)"}}>
            <div style={{fontSize:"var(--t-14)", color:"var(--brand-deep)", lineHeight:1.55, display:"flex", gap:8, alignItems:"flex-start"}}>
              <Icon name="info" size={14}/>
              <span>{spec.freeformBanner}</span>
            </div>
          </div>
        )}

        {/* Multi-user conflict banner */}
        {conflict && (
          <div style={{padding:"12px 20px", background:"var(--danger-wash)", borderBottom:"1px solid var(--danger-edge)"}}>
            <div style={{fontSize:"var(--t-14)", color:"var(--danger)", display:"flex", gap:10, alignItems:"flex-start"}}>
              <Icon name="alert-tri" size={14}/>
              <div>
                <strong>This item was just converted to a JV by Priya R. (30s ago).</strong>
                <div style={{marginTop:4}}>
                  <a href="#" onClick={(e)=>{e.preventDefault(); dispatch({type:"closeConversion"});}}>View JV/25-26/098</a> · <a href="#" onClick={(e)=>{e.preventDefault(); dispatch({type:"refreshConflict", id: item.id});}}>Refresh and continue</a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Body: mapping table ─────────────────────────── */}
        <div className="jvc__body">
          <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:4}}>
            <strong style={{fontSize:"var(--t-14)"}}>Mapping</strong>
            <span style={{fontSize:"var(--t-11)", color:"var(--text-muted)"}}>{spec.mapping.length} fields · {unresolved.length} need you</span>
          </div>

          <div className="map-table">
            <div className="map-row map-row--head">
              <div>Source Field</div>
              <div>Target Field</div>
              <div>Status</div>
            </div>
            {spec.mapping.map((row, i) => (
              <MappingRow
                key={row.key}
                row={row}
                resolvedValue={resolved[row.key]}
                onResolve={(v) => resolve(row.key, v)}
              />
            ))}
          </div>

          {/* Line builder (JV → typed only) */}
          {spec.lineBuilder && (
            <LineBuilder spec={spec.lineBuilder} value={resolved.__lines} onChange={(lines) => resolve("__lines", lines)}/>
          )}

          {/* ── Pre-flight checks ─────────────────────────── */}
          <div style={{marginTop:20}}>
            <strong style={{fontSize:"var(--t-14)", display:"block", marginBottom:8}}>Pre-flight</strong>
            <PreflightLine kind={spec.preflight.duplicate.ok ? "ok" : "warn"} label="Duplicate check" body={spec.preflight.duplicate.message} action={spec.preflight.duplicate.action}/>
            <PreflightLine kind={spec.preflight.gstPeriod.ok ? "ok" : "warn"} label="GST period" body={spec.preflight.gstPeriod.message} action={spec.preflight.gstPeriod.action}/>
            <PreflightLine kind="info" label="Blast radius" body={spec.preflight.blastRadius}/>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <div className="jvc__foot">
          <button className="btn btn--outline" onClick={() => dispatch({type:"closeConversion"})}>Cancel</button>
          <button className="btn btn--solid" disabled={ctaDisabled} onClick={confirm}>
            <Icon name="check" size={14}/> {spec.ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Mapping row — renders by status
// ─────────────────────────────────────────────────────────────────

const MappingRow = ({row, resolvedValue, onResolve}) => {
  const value = resolvedValue ?? row.value;

  return (
    <div className={cls("map-row", "map-row--" + row.status)}>
      <div className="map-cell map-cell--source">
        <div style={{fontWeight:600}}>{row.sourceLabel}</div>
        {row.sourceValue && <div style={{fontSize:"var(--t-11)", color:"var(--text-muted)", marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{row.sourceValue}</div>}
      </div>

      <div className="map-cell map-cell--target">
        <div style={{fontWeight:600, marginBottom:4}}>{row.targetLabel}</div>

        {row.status === "mapped" && (
          <div style={{fontSize:"var(--t-12)", color:"var(--text)"}}>{row.value}</div>
        )}
        {row.status === "locked" && (
          <div style={{fontSize:"var(--t-12)", color:"var(--text-muted)"}}>{row.value}</div>
        )}
        {row.status === "needs" && (
          <MappingControl row={row} resolvedValue={resolvedValue} onResolve={onResolve}/>
        )}
        {row.status === "new" && (
          <input
            className="input"
            style={{height:28, fontSize:"var(--t-12)"}}
            placeholder={row.placeholder}
            value={resolvedValue ?? ""}
            onChange={(e)=> onResolve(e.target.value)}
          />
        )}
        {row.status === "new" && row.helper && (
          <div className="fieldline-help" style={{marginTop:4}}>{row.helper}</div>
        )}
      </div>

      <div className="map-cell map-cell--status">
        <MappingStatusChip row={row} resolved={!!resolvedValue}/>
      </div>
    </div>
  );
};

const MappingStatusChip = ({row, resolved}) => {
  if(row.status === "mapped") return <span className="pill pill--success"><Icon name="check" size={11} stroke={2.5}/> Mapped</span>;
  if(row.status === "locked") return <span className="pill pill--info"><Icon name="rotate" size={11} stroke={2}/> Auto-derived</span>;
  if(row.status === "needs")  return resolved
    ? <span className="pill pill--success"><Icon name="check" size={11} stroke={2.5}/> Resolved</span>
    : <span className="pill pill--warn"><Icon name="alert-tri" size={11} stroke={2}/> Needs you</span>;
  if(row.status === "new")    return <span className="pill pill--info"><Icon name="plus" size={11} stroke={2.5}/> New</span>;
  return null;
};

const MappingControl = ({row, resolvedValue, onResolve}) => {
  const [adding, setAdding] = React.useState(false);

  if(row.control === "party-flip"){
    if(adding){
      return (
        <div style={{display:"flex", flexDirection:"column", gap:6, padding:8, background:"var(--bg-primary)", borderRadius:6, border:"1px solid var(--brand-soft)"}}>
          <div style={{fontSize:"var(--t-11)", color:"var(--brand-deep)", fontWeight:600}}>Adding as {row.partyType}</div>
          <input className="input" style={{height:28, fontSize:"var(--t-12)"}} defaultValue={row.partyName} readOnly/>
          <input className="input" style={{height:28, fontSize:"var(--t-12)"}} defaultValue={row.partyGstin} readOnly/>
          <input className="input" style={{height:28, fontSize:"var(--t-12)"}} placeholder="Default ledger (e.g., Sales Income)" defaultValue={row.suggestedLedger}/>
          <div style={{display:"flex", gap:6}}>
            <button className="btn btn--outline btn--sm" style={{padding:"4px 10px", fontSize:"var(--t-11)"}} onClick={()=>setAdding(false)}>Cancel</button>
            <button className="btn btn--solid btn--sm" style={{padding:"4px 10px", fontSize:"var(--t-11)"}} onClick={()=>{ onResolve("+ Added: " + row.partyName); setAdding(false); }}>Add</button>
          </div>
        </div>
      );
    }
    return (
      <div style={{display:"flex", flexDirection:"column", gap:4}}>
        <button className="btn btn--soft btn--sm" style={{padding:"4px 10px", fontSize:"var(--t-12)", alignSelf:"flex-start"}} onClick={()=>setAdding(true)}>
          <Icon name="plus" size={12} stroke={2.5}/> Add {row.partyName} as {row.partyType}
        </button>
        <select className="select" style={{height:28, fontSize:"var(--t-12)"}} value={resolvedValue ?? ""} onChange={(e)=>onResolve(e.target.value)}>
          <option value="">Or pick existing {row.partyType}…</option>
          <option>Alpha Customers Pvt Ltd</option>
          <option>Beta Retail Co</option>
          <option>Gamma Trading LLP</option>
        </select>
      </div>
    );
  }

  if(row.control === "ledger-flip"){
    return (
      <div style={{display:"flex", flexDirection:"column", gap:4}}>
        <select className="select" style={{height:28, fontSize:"var(--t-12)"}} value={resolvedValue ?? ""} onChange={(e)=>onResolve(e.target.value)}>
          <option value="">Pick {row.ledgerSide} ledger…</option>
          {(row.ledgerOptions || []).map(l => <option key={l}>{l}</option>)}
        </select>
        <a href="#" style={{fontSize:"var(--t-11)", color:"var(--brand)"}} onClick={(e)=>{e.preventDefault(); onResolve("+ New: " + row.ledgerSide + " ledger");}}>
          + Add new {row.ledgerSide} ledger inline
        </a>
      </div>
    );
  }

  // Fallback — free text input
  return (
    <input className="input" style={{height:28, fontSize:"var(--t-12)"}} placeholder={row.placeholder} value={resolvedValue ?? ""} onChange={(e)=>onResolve(e.target.value)}/>
  );
};

// ─────────────────────────────────────────────────────────────────
// Line builder (JV → typed doc only)
// ─────────────────────────────────────────────────────────────────

const LineBuilder = ({spec, value, onChange}) => {
  const lines = value || [];
  const addLine = () => onChange([...lines, { desc: "", ledger: "", hsn: "", qty: 1, rate: 0 }]);
  const updateLine = (i, key, val) => {
    const next = lines.slice();
    next[i] = {...next[i], [key]: val};
    onChange(next);
  };
  const remove = (i) => onChange(lines.filter((_, j) => j !== i));

  return (
    <div style={{marginTop:20, padding:14, border:"1px solid var(--brand-soft)", borderRadius:8, background:"var(--bg-secondary)"}}>
      <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:8}}>
        <Icon name="ledger" size={14}/>
        <strong style={{fontSize:"var(--t-14)", flex:1}}>Line items for the new {spec.target}</strong>
        <span style={{fontSize:"var(--t-11)", color:"var(--text-muted)"}}>{lines.length} line{lines.length===1?"":"s"} · at least 1 required</span>
      </div>
      {lines.length === 0 && (
        <div style={{padding:"16px 12px", textAlign:"center", color:"var(--text-muted)", fontSize:"var(--t-12)", border:"1px dashed var(--brand-soft)", borderRadius:6, background:"var(--surface)"}}>
          A Journal is freeform. A {spec.target} needs line items. Add at least one to continue.
        </div>
      )}
      {lines.length > 0 && (
        <div className="line-builder">
          <div className="lb-row lb-row--head">
            <div>Description</div>
            <div>Ledger</div>
            <div>HSN/SAC</div>
            <div className="num">Qty</div>
            <div className="num">Rate</div>
            <div/>
          </div>
          {lines.map((l, i) => (
            <div key={i} className="lb-row">
              <input className="input" style={{height:28, fontSize:"var(--t-12)"}} value={l.desc} onChange={e=>updateLine(i, "desc", e.target.value)} placeholder="Description"/>
              <input className="input" style={{height:28, fontSize:"var(--t-12)"}} value={l.ledger} onChange={e=>updateLine(i, "ledger", e.target.value)} placeholder={spec.suggestedLedger || "Pick ledger"}/>
              <input className="input" style={{height:28, fontSize:"var(--t-12)"}} value={l.hsn} onChange={e=>updateLine(i, "hsn", e.target.value)} placeholder="HSN"/>
              <input className="input num" style={{height:28, fontSize:"var(--t-12)", textAlign:"right"}} value={l.qty} onChange={e=>updateLine(i, "qty", e.target.value)}/>
              <input className="input num" style={{height:28, fontSize:"var(--t-12)", textAlign:"right"}} value={l.rate} onChange={e=>updateLine(i, "rate", e.target.value)} placeholder={spec.suggestedRate}/>
              <button className="icon-btn" onClick={()=>remove(i)} title="Remove"><Icon name="trash" size={14}/></button>
            </div>
          ))}
        </div>
      )}
      <button className="btn btn--soft btn--sm" style={{marginTop:8}} onClick={addLine}>
        <Icon name="plus" size={12} stroke={2.5}/> Add line {lines.length === 0 && "— pre-fill from JV"}
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Pre-flight line
// ─────────────────────────────────────────────────────────────────

const PreflightLine = ({kind, label, body, action}) => (
  <div className={cls("preflight", "preflight--" + kind)}>
    <span className="preflight__icon">
      {kind === "ok"   && <Icon name="check" size={12} stroke={3}/>}
      {kind === "warn" && <Icon name="alert-tri" size={12} stroke={2}/>}
      {kind === "info" && <Icon name="info" size={12} stroke={2}/>}
    </span>
    <div style={{flex:1, minWidth:0}}>
      <div style={{fontSize:"var(--t-12)", fontWeight:600, color:"var(--text)"}}>{label}</div>
      <div style={{fontSize:"var(--t-12)", color:"var(--text-muted)", marginTop:1}}>{body}</div>
    </div>
    {action && <button className="btn btn--outline btn--sm" style={{fontSize:"var(--t-11)", padding:"3px 8px"}}>{action}</button>}
  </div>
);

// ─────────────────────────────────────────────────────────────────
// describeConversion — returns the spec for any of the 7 edges
// ─────────────────────────────────────────────────────────────────

function describeConversion(item, conv){
  const target = conv.target;        // "JV" | "Bill" | "Invoice"
  const source = conv.source;        // "bill" | "jv" | "ar-row" | "banking-row" | etc

  // ── Bill → JV / Bill → Invoice
  if(source === "bill" || source === "list-row" || source === "bill-detail"){
    const b = item.bill || {};
    if(target === "JV"){
      return {
        title: `Converting Bill — ${b.supplierInvoiceNo || item.id} → Journal Voucher`,
        subtitle: `From ${item.vendor}`,
        consequenceChips: ["Voucher class → Journal"],
        freeformBanner: null,
        mapping: [
          { key:"date",      sourceLabel:"Bill Date",       sourceValue: b.billDate,         targetLabel:"Voucher Date", status:"mapped",  value: b.billDate },
          { key:"vno",       sourceLabel:"Supplier Inv. No",sourceValue: b.supplierInvoiceNo,targetLabel:"Voucher No",   status:"locked",  value: "JV/25-26/" + Math.floor(Math.random()*99+50) },
          { key:"dr",        sourceLabel:"Bill items",      sourceValue: (b.items||[]).map(it=>it.desc).join(", "),                    targetLabel:"Dr lines",     status:"mapped",  value: (b.items||[]).map(it=>`${it.ledger}: ₹${it.amount.toLocaleString("en-IN")}`).join(" / ") },
          { key:"cr",        sourceLabel:"Bill total",      sourceValue: fmtINRplain(b.grandTotal),                                     targetLabel:"Cr line",      status:"mapped",  value: "Vendor — " + item.vendor + ": " + fmtINRplain(b.grandTotal) },
          { key:"narration", sourceLabel:"Description",     sourceValue: "Auto-drafted",     targetLabel:"Narration",    status:"locked",  value: `Conversion of bill ${b.supplierInvoiceNo || "—"} from ${item.vendor}` }
        ],
        preflight: {
          duplicate:  { ok:true,  message:"No matching content hash in posted records." },
          gstPeriod:  { ok:true,  message:"Bill date 12 May 2026 — current period (May FY26)." },
          blastRadius:"A new Journal Voucher will be posted. The original bill draft is destroyed and the inbox item moves to Done."
        },
        ctaLabel: "Convert & Post as Journal Voucher"
      };
    }
    if(target === "Invoice"){
      // The interesting case — party flip + ledger flip + tax flip
      return {
        title: `Converting Bill — ${b.supplierInvoiceNo || item.id} → Sales Invoice`,
        subtitle: `From ${item.vendor}`,
        consequenceChips: ["Vendor → Customer", "Input GST → Output GST", "Expense → Income"],
        freeformBanner: null,
        mapping: [
          { key:"date",   sourceLabel:"Bill Date",          sourceValue: b.billDate,           targetLabel:"Invoice Date",        status:"mapped", value: b.billDate },
          { key:"ino",    sourceLabel:"Supplier Inv. No",   sourceValue: b.supplierInvoiceNo,  targetLabel:"Invoice No",          status:"locked", value: "INV-S/25-26/" + Math.floor(Math.random()*99+100) },
          { key:"party",  sourceLabel:"Vendor",             sourceValue: item.vendor + " · " + (b.gstReg||"").split("·")[1]?.trim(), targetLabel:"Customer",            status:"needs",
            control:"party-flip", partyType:"Customer", partyName: item.vendor, partyGstin:(b.gstReg||"").split("·")[1]?.trim() || "—", suggestedLedger:"Sales Income — Services"
          },
          { key:"ledger", sourceLabel:(b.items||[])[0]?.ledger || "Expense ledger", sourceValue:"Expense side", targetLabel:"Income ledger",       status:"needs",
            control:"ledger-flip", ledgerSide:"Income", ledgerOptions:["Sales Income — Services","Sales Income — Goods","Other Income"]
          },
          { key:"tax",    sourceLabel:"Input GST (CGST/SGST)", sourceValue: `₹${(b.taxes?.cgst||0)+(b.taxes?.sgst||0)}`, targetLabel:"Output GST (CGST/SGST)", status:"locked", value:"Flipped to output side, same rates" },
          { key:"items",  sourceLabel:"Bill items",         sourceValue: (b.items||[]).map(it=>it.desc).join(", "), targetLabel:"Invoice line items",  status:"mapped", value:"Carried over as-is" },
          { key:"total",  sourceLabel:"Grand Total",         sourceValue: fmtINRplain(b.grandTotal), targetLabel:"Invoice Total", status:"mapped", value: fmtINRplain(b.grandTotal) }
        ],
        preflight: {
          duplicate:  { ok:true,  message:"No matching invoice content hash in posted records." },
          gstPeriod:  { ok:true,  message:"Bill date in current period; safe to invoice the converted side." },
          blastRadius:"A new Sales Invoice will be posted in the current period. The original bill is marked superseded and a reversal entry is posted automatically."
        },
        ctaLabel: `Convert & Post as Sales Invoice (with reversal of ${b.voucherNo || "PUR/25-26/041"})`
      };
    }
  }

  // ── JV → Bill / JV → Invoice
  if(source === "jv" || source === "jv-detail"){
    const j = item.jv || { narration:"—", lines: [] };
    const partyHint = "Rentyx Stores Pvt Ltd";        // extracted from narration (mock)
    const labelTarget = target === "Bill" ? "Bill" : "Sales Invoice";
    return {
      title: `Converting Journal Voucher — ${item.id} → ${labelTarget}`,
      subtitle: "Narration: " + (j.narration?.slice(0, 80) || "—") + (j.narration?.length > 80 ? "…" : ""),
      consequenceChips: target === "Bill"
        ? ["Journal lines → Bill structure", "Receivable → Vendor (payable side)", "Date narration → Bill date + Due date"]
        : ["Journal lines → Invoice structure", "Receivable → Customer", "Narration party → Invoiced party"],
      freeformBanner: `A Journal is freeform. A ${labelTarget} needs structured fields the Journal doesn't carry. You'll fill some of these in below.`,
      mapping: [
        { key:"date",  sourceLabel:"JV Date",        sourceValue: "31 Mar 2026",  targetLabel:`${labelTarget} Date`, status:"mapped", value: "31 Mar 2026" },
        { key:"party", sourceLabel:"Narration party",sourceValue: partyHint,       targetLabel: target === "Bill" ? "Vendor" : "Customer", status:"needs",
          control:"party-flip", partyType: target === "Bill" ? "Vendor" : "Customer", partyName: partyHint, partyGstin:"27AABCR4421L1Z3", suggestedLedger: target === "Bill" ? "Pass-through Expense" : "Sales Income — Pass-through"
        },
        { key:"total", sourceLabel:"JV total",        sourceValue: fmtINRplain(item.amount), targetLabel:`${labelTarget} Total`, status:"mapped", value: fmtINRplain(item.amount) }
      ],
      lineBuilder: {
        target: labelTarget,
        suggestedLedger: target === "Bill" ? "Warehouse Rent" : "Sales Income — Services",
        suggestedRate: String(item.amount)
      },
      preflight: {
        duplicate:  { ok:true,  message:"No matching content hash in posted records." },
        gstPeriod:  { ok:false, message:"JV date 31 Mar 2026 falls in a filed period (Mar FY26). This conversion would change tax direction — would create a GSTR-1 amendment.",
                      action:"Post as current-period amendment (GSTR-1A) instead" },
        blastRadius:`A new ${labelTarget} will be posted in the current period. The original JV is marked superseded — a reversal entry is posted automatically.`
      },
      ctaLabel: `Create ${labelTarget} from this Journal (with reversal of ${item.id})`,
      extraGate: (resolved) => Array.isArray(resolved.__lines) && resolved.__lines.length > 0
    };
  }

  // ── AR-row → JV / AR-row → Bill
  if(source === "ar-row" || source === "ar-row-drill"){
    const row = item.ar?.rows?.[conv.rowIndex] || { invoiceNo:"—", customer:"—", amount: 0, ledger:"—", invoiceDate:"—" };
    if(target === "JV"){
      return {
        title: `Converting Invoice row ${conv.rowIndex + 2} — ${row.invoiceNo} → Journal Voucher`,
        subtitle: `From ${row.customer}`,
        consequenceChips: ["Voucher class → Journal"],
        freeformBanner: null,
        mapping: [
          { key:"date",  sourceLabel:"Invoice Date", sourceValue: row.invoiceDate, targetLabel:"Voucher Date", status:"mapped", value: row.invoiceDate },
          { key:"vno",   sourceLabel:"Invoice No",   sourceValue: row.invoiceNo,    targetLabel:"Voucher No",   status:"locked", value: "JV/25-26/" + Math.floor(Math.random()*99+50) },
          { key:"dr",    sourceLabel:"Customer",     sourceValue: row.customer,     targetLabel:"Dr line",      status:"mapped", value: `Customer — ${row.customer}: ₹${row.amount.toLocaleString("en-IN")}` },
          { key:"cr",    sourceLabel:"Sales ledger", sourceValue: row.ledger,       targetLabel:"Cr line",      status:"mapped", value: `${row.ledger}: ₹${row.amount.toLocaleString("en-IN")}` }
        ],
        preflight: {
          duplicate: { ok:true, message:"No matching content hash in posted records." },
          gstPeriod: { ok:true, message:"Current-period row; safe to journalise." },
          blastRadius:`Only this row converts; the other ${(item.ar.rowCount-1).toLocaleString("en-IN")} rows continue in the AR validation grid.`
        },
        ctaLabel: "Convert & Post as Journal Voucher"
      };
    }
    if(target === "Bill"){
      return {
        title: `Converting Invoice row ${conv.rowIndex + 2} — ${row.invoiceNo} → Bill (Purchase)`,
        subtitle: `From ${row.customer}`,
        consequenceChips: ["Customer → Vendor", "Output GST → Input GST", "Income → Expense"],
        freeformBanner: null,
        mapping: [
          { key:"date",   sourceLabel:"Invoice Date",  sourceValue: row.invoiceDate,  targetLabel:"Bill Date",          status:"mapped", value: row.invoiceDate },
          { key:"vno",    sourceLabel:"Invoice No",    sourceValue: row.invoiceNo,    targetLabel:"Supplier Invoice No",status:"mapped", value: row.invoiceNo },
          { key:"party",  sourceLabel:"Customer",      sourceValue: row.customer,     targetLabel:"Vendor",             status:"needs",
            control:"party-flip", partyType:"Vendor", partyName: row.customer, partyGstin: row.gstin || "—", suggestedLedger:"Pass-through Expense"
          },
          { key:"ledger", sourceLabel:"Sales ledger",  sourceValue: row.ledger,       targetLabel:"Expense ledger",     status:"needs",
            control:"ledger-flip", ledgerSide:"Expense", ledgerOptions:["Pass-through Expense","Cost of Sales","Other Expenses"]
          },
          { key:"total",  sourceLabel:"Total",         sourceValue: `₹${row.amount.toLocaleString("en-IN")}`, targetLabel:"Bill Total", status:"mapped", value: `₹${row.amount.toLocaleString("en-IN")}` }
        ],
        preflight: {
          duplicate: { ok:true, message:"No matching bill content hash in posted records." },
          gstPeriod: { ok:true, message:"Current period — safe to bill the converted side." },
          blastRadius:`Only this row converts; the other ${(item.ar.rowCount-1).toLocaleString("en-IN")} rows continue in the AR grid.`
        },
        ctaLabel: "Convert & Post as Bill (with reversal of this row)"
      };
    }
  }

  // ── Bank-txn → JV (only edge for banking)
  if(source === "banking-row" || source === "banking-row-drill"){
    const tx = conv.txn || { date:"—", narration:"—", dr:0, cr:0 };
    return {
      title: `Converting Bank transaction — ${tx.narration} → Journal Voucher`,
      subtitle: `${tx.date} · HDFC 50100123456`,
      consequenceChips: ["Voucher class → Journal", "Banking → General Ledger"],
      freeformBanner: null,
      mapping: [
        { key:"date",  sourceLabel:"Txn Date",   sourceValue: tx.date,        targetLabel:"Voucher Date", status:"mapped", value: tx.date },
        { key:"vno",   sourceLabel:"Bank ref",   sourceValue: "—",            targetLabel:"Voucher No",   status:"locked", value: "JV/25-26/" + Math.floor(Math.random()*99+50) },
        { key:"dr",    sourceLabel:"Debit",      sourceValue: tx.dr ? `₹${tx.dr.toLocaleString("en-IN")}` : "—", targetLabel:"Dr line", status:"mapped", value: tx.dr ? `Bank Charges: ₹${tx.dr.toLocaleString("en-IN")}` : "—" },
        { key:"cr",    sourceLabel:"Credit",     sourceValue: tx.cr ? `₹${tx.cr.toLocaleString("en-IN")}` : "—", targetLabel:"Cr line", status:"mapped", value: tx.cr ? `Interest Received: ₹${tx.cr.toLocaleString("en-IN")}` : "HDFC Bank — 50100123456" },
        { key:"narr",  sourceLabel:"Narration",  sourceValue: tx.narration,   targetLabel:"Narration",    status:"locked", value: tx.narration }
      ],
      preflight: {
        duplicate: { ok:true, message:"No matching content hash in posted records." },
        gstPeriod: { ok:true, message:"Current period — banking JVs don't affect GST returns." },
        blastRadius:`This transaction is moved from the reconciliation queue to a JV draft. The other ${(item.banking.txnCount-1)} transactions are unaffected.`
      },
      ctaLabel: "Convert & Post as Journal Voucher"
    };
  }

  // Fallback
  return {
    title: "Convert",
    subtitle: "—",
    consequenceChips: [],
    freeformBanner: null,
    mapping: [],
    preflight: {
      duplicate: { ok: true, message: "—" },
      gstPeriod: { ok: true, message: "—" },
      blastRadius: "—"
    },
    ctaLabel: "Convert"
  };
}

Object.assign(window, { ConversionPanel, describeConversion });
