// Native AP module — bill review form.
// This is the AP module's own review surface, hosted inside the inbox shell.
// Item Mode / Accounting Mode tabs, flagged-field verification, ledger table, primary Approve.

const NativeAP = ({item, state, dispatch}) => {
  const [mode, setMode] = React.useState("item");
  const b = item.bill || {};
  const flagged = b.flagged || [];
  const isFlagged = (id) => flagged.includes(id);
  const touched = item._touched || new Set();

  const touchField = (id) => {
    const next = new Set(touched);
    next.add(id);
    dispatch({type:"setItemField", key:"_touched", value: next});
    if(flagged.every(f => next.has(f))){
      dispatch({type:"setItemField", key:"_allTouched", value: true});
    }
  };

  const dupBlock = item.status === "duplicate-hard" && !item._dupResolved;
  const approveDisabled =
    dupBlock ||
    (flagged.length > 0 && !item._allTouched);

  // Is this the last bill in the AP cohort? If so, CTA drops "& Next".
  const apCohort = state.items.filter(it => it.route === "AP" && ["needs-review","low-confidence","duplicate-soft","duplicate-hard"].includes(it.status));
  const isLastInCohort = apCohort.length <= 1 || apCohort[apCohort.length - 1]?.id === item.id;

  return (
    <div className="native">
      <div className="native__header">
        <div style={{flex:1}}>
          <h2 className="native__title">Review bill — {item.vendor}</h2>
          <div className="native__sub">{b.supplierInvoiceNo} · {b.billDate} · {fmtINRplain(b.grandTotal)}</div>
        </div>
        <div className="tabs" style={{border:0}}>
          <div className={cls("tab", mode==="item" && "is-active")} onClick={()=>setMode("item")}>Item Mode</div>
          <div className={cls("tab", mode==="acct" && "is-active")} onClick={()=>setMode("acct")}>Accounting Mode</div>
        </div>
      </div>

      <div className="native__body">
        {dupBlock && (
          <HintBanner kind="danger" title={"Duplicate of " + item.duplicateOf} body="Approve is disabled until you change a key field (Voucher No, Supplier Invoice No or Amount). Live re-check runs as you type."/>
        )}
        {item.status === "duplicate-soft" && (
          <HintBanner kind="warn" title="Possible duplicate" body="An earlier bill has a matching amount and vendor. You can still approve."/>
        )}
        {flagged.length > 0 && !item._allTouched && (
          <HintBanner kind="warn" title="Verify low-confidence fields" body={"We're less sure about " + flagged.length + " field" + (flagged.length===1?"":"s") + ". Touch each one and verify to enable Approve."}/>
        )}

        <div style={{padding:"16px 18px", border:"1px solid var(--stroke)", borderRadius:10, background:"var(--surface)"}}>
          <div className="form-grid">
            <APField label="GST Registration" value={b.gstReg} flagged={isFlagged("gstReg")} touched={touched.has("gstReg")} onTouch={()=>touchField("gstReg")}/>
            <APField label="Voucher Type" value={b.voucherType || item.voucherType} required/>
            <APField label="Voucher No" value={b.voucherNo} required onTouch={()=> dispatch({type:"setItemField", key:"_dupResolved", value:true})}/>
            <APField label="Supplier Invoice No" value={b.supplierInvoiceNo} required
                     flagged={isFlagged("supplierInvoiceNo")} touched={touched.has("supplierInvoiceNo")}
                     onTouch={()=>{ touchField("supplierInvoiceNo"); dispatch({type:"setItemField", key:"_dupResolved", value:true}); }}/>
            <APField label="Bill Date" value={b.billDate} required/>
            <APField label="Due Date"  value={b.dueDate}  required flagged={isFlagged("dueDate")} touched={touched.has("dueDate")} onTouch={()=>touchField("dueDate")}/>
            <APField label="Vendor Name" value={item.vendor} required
                     flagged={isFlagged("vendor")} touched={touched.has("vendor")} onTouch={()=>touchField("vendor")}
                     suffix={b.vendorMissing ? <span className="inline-add">does not exist · + Add to masters</span> : null}/>
            <APField label="Cost Centre" value={b.costCentre || ""} flagged={isFlagged("costCentre")} touched={touched.has("costCentre")} onTouch={()=>touchField("costCentre")} placeholder="Select Cost Centre"/>
          </div>
        </div>

        <div style={{padding:"16px 18px", border:"1px solid var(--stroke)", borderRadius:10, background:"var(--surface)"}}>
          <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:10}}>
            <strong style={{fontSize:"var(--t-14)"}}>Ledgers</strong>
            {mode === "item" && <span className="pill pill--info">Item-wise</span>}
            {mode === "acct" && <span className="pill pill--info">Account-wise</span>}
            <div style={{flex:1}}/>
            <a href="#" style={{fontSize:"var(--t-14)"}} onClick={e=>e.preventDefault()}>+ Add Ledger</a>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{width:"45%"}}>Description</th>
                <th>Ledger</th>
                <th>Cost Centre</th>
                <th className="tbl__num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(b.items || []).map((it, i) => (
                <tr key={i}>
                  <td>{it.desc}</td>
                  <td>{it.ledger}</td>
                  <td><span className="muted">{b.costCentre || "—"}</span></td>
                  <td className="tbl__num num">{it.amount.toLocaleString("en-IN", {minimumFractionDigits:2})}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{display:"flex", justifyContent:"flex-end", marginTop:12}}>
            <table style={{width:280, fontSize:"var(--t-14)"}}>
              <tbody>
                <tr><td style={{padding:"3px 0", color:"var(--text-muted)"}}>Sub Total</td><td style={{textAlign:"right"}} className="num">{b.subTotal?.toLocaleString("en-IN", {minimumFractionDigits:2})}</td></tr>
                {b.taxes?.cgst != null && <tr><td style={{padding:"3px 0", color:"var(--text-muted)"}}>CGST 9%</td><td style={{textAlign:"right"}} className="num">{b.taxes.cgst.toLocaleString("en-IN", {minimumFractionDigits:2})}</td></tr>}
                {b.taxes?.sgst != null && <tr><td style={{padding:"3px 0", color:"var(--text-muted)"}}>SGST 9%</td><td style={{textAlign:"right"}} className="num">{b.taxes.sgst.toLocaleString("en-IN", {minimumFractionDigits:2})}</td></tr>}
                {b.taxes?.igst != null && <tr><td style={{padding:"3px 0", color:"var(--text-muted)"}}>IGST 18%</td><td style={{textAlign:"right"}} className="num">{b.taxes.igst.toLocaleString("en-IN", {minimumFractionDigits:2})}</td></tr>}
                <tr style={{borderTop:"1px solid var(--stroke)"}}><td style={{padding:"6px 0", fontWeight:700}}>Grand Total</td><td style={{textAlign:"right", color:"var(--brand)", fontWeight:700}} className="num">₹ {b.grandTotal?.toLocaleString("en-IN", {minimumFractionDigits:2})}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="native__footer">
        {/* SECONDARY actions — Convert → picker, NOT near Approve */}
        <ConvertButton source="bill-detail" item={item} dispatch={dispatch} size="sm"/>
        <button className="btn btn--outline btn--sm">
          <Icon name="trash" size={14}/> Delete
        </button>
        <div style={{flex:1}}/>
        <button className="btn btn--outline">Save draft</button>
        <button className="btn btn--solid" disabled={approveDisabled} onClick={() => dispatch({type:"approve"})}>
          <Icon name="check" size={14}/> {isLastInCohort ? "Approve" : "Approve & Next"}
        </button>
      </div>
    </div>
  );
};

const APField = ({label, value, required, flagged, touched, onTouch, placeholder, suffix}) => {
  const showWarn = flagged && !touched;
  return (
    <div className="field">
      <label className="field__label">
        {required && <span className="req">*</span>}
        {label}
        {suffix && <span style={{marginLeft:6}}>{suffix}</span>}
      </label>
      <input
        className={cls("input", showWarn && "input--warn")}
        defaultValue={value}
        placeholder={placeholder}
        onFocus={onTouch}
        onChange={onTouch}
      />
      {showWarn && (
        <div className="fieldline-warn">
          <Icon name="alert-tri" size={11} stroke={2}/>
          <span>Low confidence — please verify</span>
        </div>
      )}
      {touched && flagged && (
        <div className="fieldline-help" style={{color:"var(--success)"}}>
          <Icon name="check" size={11} stroke={2}/> Verified
        </div>
      )}
    </div>
  );
};

Object.assign(window, { NativeAP, APField });
