// Native AR module — Invoice Bulk-upload.
// Right-pane content = the validation grid (the AR module's own surface).
// Drill-in: clicking a row opens an internal page within the same shell.
// JV escape lives per row via overflow menu, NOT as a visible button on every row.

const NativeAR = ({item, state, dispatch}) => {
  const [drillRow, setDrillRow] = React.useState(null);   // index into ar.rows or null

  if(drillRow != null){
    const row = item.ar.rows[drillRow];
    return <ARInvoiceDrill item={item} row={row} index={drillRow} onBack={() => setDrillRow(null)} dispatch={dispatch}/>;
  }
  return <ARValidationGrid item={item} onDrill={setDrillRow} dispatch={dispatch}/>;
};

// ---------------- Validation grid ----------------

const ARValidationGrid = ({item, onDrill, dispatch}) => {
  const [filter, setFilter] = React.useState("all");
  const [selected, setSelected] = React.useState(new Set());
  const rows = item.ar.rows || [];
  const total = item.ar.rowCount || rows.length;
  const issues = item.ar.invalidRows;
  const valid  = item.ar.validRows;
  const skipped   = item.ar.skippedRows   || 0;
  const converted = item.ar.convertedRows || 0;
  const isReupload = item._isReupload;

  const rowDedup = (r) => r.dedup;
  const rowIsSkipped = (r) => r.dedup && r.dedup.kind && r.dedup.kind.startsWith("skipped");
  const rowIsConverted = (r) => r.dedup && r.dedup.kind === "converted";

  const shownRows = rows.filter(r => {
    if(filter === "issues")    return !!r.issue && !rowIsSkipped(r) && !rowIsConverted(r);
    if(filter === "valid")     return !r.issue && !rowIsSkipped(r) && !rowIsConverted(r);
    if(filter === "skipped")   return rowIsSkipped(r);
    if(filter === "converted") return rowIsConverted(r);
    return true;
  });

  const toggleRow = (i) => {
    const next = new Set(selected);
    if(next.has(i)) next.delete(i); else next.add(i);
    setSelected(next);
  };
  const toggleAll = () => {
    if(selected.size === shownRows.length) setSelected(new Set());
    else setSelected(new Set(shownRows.map((_, i) => i)));
  };

  const dedupCountsByKind = React.useMemo(() => {
    const o = { posted: 0, converted: 0, pending: 0, totalSkipped: 0, totalConverted: 0 };
    rows.forEach(r => {
      if(!r.dedup) return;
      if(r.dedup.kind === "skipped-posted")     { o.posted++;    o.totalSkipped++; }
      if(r.dedup.kind === "skipped-converted")  { o.converted++; o.totalSkipped++; }
      if(r.dedup.kind === "skipped-pending")    { o.pending++;   o.totalSkipped++; }
      if(r.dedup.kind === "converted")           { o.totalConverted++; }
    });
    return o;
  }, [rows]);
  const hasPendingMerge = dedupCountsByKind.pending > 0;
  // Derive skipped/converted live from row markings so chip counts + math align
  const skippedDerived   = dedupCountsByKind.totalSkipped   || skipped;
  const convertedDerived = dedupCountsByKind.totalConverted || converted;
  const validDerived     = Math.max(0, total - issues - skippedDerived - convertedDerived);

  return (
    <div className="native">
      <div className="native__header">
        <div style={{flex:1}}>
          <h2 className="native__title">Validate invoices</h2>
          <div className="native__sub">
            {item.customer || "—"} · sheet "{item.ar.sheetName}"
            {item.ar.template && <> · template <strong style={{color:"var(--text)"}}>{item.ar.template}</strong></>}
            {isReupload && <> · <strong style={{color:"var(--brand)"}}>re-upload — row-level dedup</strong></>}
          </div>
        </div>
        <button className="btn btn--outline btn--sm">
          <Icon name="edit" size={13}/> Edit mapping
        </button>
      </div>

      <div style={{padding:"12px 20px 0", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap"}}>
        <button className={cls("btn btn--sm", filter==="all"     ? "btn--soft" : "btn--outline")} onClick={()=>setFilter("all")}>All ({total.toLocaleString("en-IN")})</button>
        <button className={cls("btn btn--sm", filter==="issues"  ? "btn--soft" : "btn--outline")} onClick={()=>setFilter("issues")}>Issues ({issues})</button>
        <button className={cls("btn btn--sm", filter==="valid"   ? "btn--soft" : "btn--outline")} onClick={()=>setFilter("valid")}>Valid ({validDerived.toLocaleString("en-IN")})</button>
        {skippedDerived > 0 && <button className={cls("btn btn--sm", filter==="skipped" ? "btn--soft" : "btn--outline")} onClick={()=>setFilter("skipped")}>Skipped ({skippedDerived})</button>}
        {convertedDerived > 0 && <button className={cls("btn btn--sm", filter==="converted" ? "btn--soft" : "btn--outline")} onClick={()=>setFilter("converted")}>Converted ({convertedDerived})</button>}
        <div style={{flex:1}}/>
        <div className="search" style={{width:220}}>
          <Icon name="search" size={14}/>
          <input className="input" placeholder="Search rows…"/>
        </div>
        {selected.size > 0 && (
          <button className="btn btn--outline btn--sm" onClick={() => dispatch({type:"openConversion", conversion:{source:"ar-bulk", target:"JV", rowIndices: Array.from(selected)}})}>
            <Icon name="swap" size={13}/> Convert {selected.size} rows
          </button>
        )}
      </div>

      <div style={{flex:1, minHeight:0, padding:"12px 20px 0", display:"flex", flexDirection:"column"}}>
        <div className="tbl-wrap" style={{flex:1}}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{width:30, paddingLeft:16}}>
                  <Checkbox checked={selected.size === shownRows.length && shownRows.length>0} onChange={toggleAll}/>
                </th>
                <th style={{width:34}}>#</th>
                <th>Invoice Date</th>
                <th>Invoice No</th>
                <th>Customer</th>
                <th>Voucher Type</th>
                <th>GSTIN</th>
                <th>State</th>
                <th>Ledger</th>
                <th className="tbl__num">Amount</th>
                <th>Status</th>
                <th style={{width:40}}/>
              </tr>
            </thead>
            <tbody>
              {shownRows.slice(0, 24).map((r, i) => {
                const dedup = r.dedup;
                const isSkip = rowIsSkipped(r);
                const isConv = rowIsConverted(r);
                const cellTitle = isSkip
                  ? `Skipped — lineage chain: this row's content (${r.invoiceNo}, ${r.customer}, ₹${r.amount.toLocaleString("en-IN")}) matches ${dedup.ref}`
                  : isConv
                    ? `Converted — this row was converted to ${dedup.ref} in a previous session`
                    : "";
                return (
                <tr key={i}
                    className={cls("tr-kebab",
                      r.issue && !isSkip && !isConv ? "grid-row-invalid" : (!isSkip && !isConv ? "grid-row-valid" : ""),
                      selected.has(i) && "is-selected",
                      isSkip && "tr-skipped",
                      isConv && "tr-converted"
                    )}
                    onClick={() => !isSkip && !isConv && onDrill(i)}
                    style={{cursor: (isSkip || isConv) ? "default" : "pointer"}}
                    title={cellTitle}>
                  <td style={{paddingLeft:16}} onClick={(e)=>e.stopPropagation()}>
                    {!isSkip && !isConv && <Checkbox checked={selected.has(i)} onChange={() => toggleRow(i)}/>}
                  </td>
                  <td style={{color:"var(--text-muted)", fontSize:"var(--t-12)"}}>{i+2}</td>
                  <td>{r.invoiceDate}</td>
                  <td>{r.invoiceNo}</td>
                  <td>{r.customer}</td>
                  <td>{r.voucherType}</td>
                  <td className={r.gstin === "—" && !isSkip && !isConv ? "grid-cell-invalid" : ""}>{r.gstin}</td>
                  <td>{r.state}</td>
                  <td>{r.ledger}</td>
                  <td className="tbl__num num">{r.amount.toLocaleString("en-IN")}</td>
                  <td>
                    {isSkip && dedup.kind === "skipped-posted" && <span title={cellTitle}><span className="pill pill--neutral">Skipped — posted {dedup.ref}</span></span>}
                    {isSkip && dedup.kind === "skipped-converted" && <span title={cellTitle}><span className="pill pill--neutral">Skipped — converted to {dedup.ref}</span></span>}
                    {isSkip && dedup.kind === "skipped-pending" && <span title={cellTitle}><span className="pill pill--warn">Already pending in {dedup.ref}</span></span>}
                    {isConv && <span className="pill pill--info">→ {dedup.ref}</span>}
                    {!isSkip && !isConv && r.issue === "missing-gstin"  && <span className="pill pill--danger">Missing GSTIN</span>}
                    {!isSkip && !isConv && r.issue === "invalid-state"  && <span className="pill pill--warn">Invalid state</span>}
                    {!isSkip && !isConv && r.issue === "missing-data"   && <span className="pill pill--warn">Missing data</span>}
                    {!isSkip && !isConv && r.issue === "multiple-issues"&& <span className="pill pill--danger">Multiple</span>}
                    {!isSkip && !isConv && !r.issue && <span className="pill pill--success">Valid</span>}
                  </td>
                  <td onClick={(e)=>e.stopPropagation()}>
                    {!isSkip && !isConv && (
                      <KebabMenu items={[
                        { label: "Open invoice", icon: "external", onClick: () => onDrill(i) },
                        { label: "Edit row inline", icon: "edit" },
                        { divider: true },
                        { label: "Convert row →", icon: "swap", onClick: () => dispatch({type:"openConversion", conversion:{source:"ar-row", target:"JV", rowIndex: i}}) },
                        { divider: true },
                        { label: "Skip this row", icon: "trash", danger: true }
                      ]}/>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="counter-bar">
        <span><strong>Total:</strong> {total.toLocaleString("en-IN")}</span>
        <span><strong style={{color:"var(--danger)"}}>Issues:</strong> {issues}</span>
        <span><strong style={{color:"var(--success)"}}>Valid:</strong> {validDerived.toLocaleString("en-IN")}</span>
        {skippedDerived > 0 && <span><strong style={{color:"var(--text-muted)"}}>Skipped:</strong> {skippedDerived}</span>}
        {convertedDerived > 0 && <span><strong style={{color:"var(--brand)"}}>Converted:</strong> {convertedDerived}</span>}
        <div style={{flex:1}}/>
        <span style={{color:"var(--text-muted)", fontSize:"var(--t-12)"}}>
          {(skippedDerived + convertedDerived) > 0
            ? `${issues} + ${validDerived} + ${skippedDerived} + ${convertedDerived} = ${total.toLocaleString("en-IN")}`
            : "Only valid rows are created."
          }
        </span>
      </div>

      <div className="native__footer">
        <button className="btn btn--outline btn--sm"><Icon name="trash" size={14}/> Delete batch</button>
        {hasPendingMerge && (
          <button className="btn btn--outline btn--sm">
            <Icon name="swap" size={13}/> Merge {dedupCountsByKind.pending} into INB-2044
          </button>
        )}
        <div style={{flex:1}}/>
        <button className="btn btn--outline">Save draft</button>
        <button className="btn btn--solid" onClick={() => dispatch({type:"approve"})}>
          <Icon name="check" size={14}/>
          Create {validDerived.toLocaleString("en-IN")} invoices
          {skippedDerived > 0 && <span style={{fontSize:"var(--t-11)", opacity:.85, marginLeft:6}}>· {skippedDerived} skipped ({dedupCountsByKind.posted} posted, {dedupCountsByKind.converted} converted, {dedupCountsByKind.pending} pending)</span>}
          {convertedDerived > 0 && <span style={{fontSize:"var(--t-11)", opacity:.85, marginLeft:6}}>· {convertedDerived} previously converted</span>}
        </button>
      </div>
    </div>
  );
};

// ---------------- Per-row drill-in ----------------

const ARInvoiceDrill = ({item, row, index, onBack, dispatch}) => {
  return (
    <div className="native">
      <div className="drill__head">
        <span className="drill__back" onClick={onBack}>
          <Icon name="chev-l" size={14}/> Back to grid
        </span>
        <span className="strip__divider"/>
        <span style={{fontSize:"var(--t-14)", color:"var(--text-muted)"}}>
          Row {index+2} · <strong style={{color:"var(--text)"}}>{row.invoiceNo}</strong>
        </span>
        <div style={{flex:1}}/>
        {/* Drill-in: Convert → picker as a VISIBLE secondary action in the header */}
        <ConvertButton source="ar-row-drill" item={item} dispatch={dispatch} size="sm" extraContext={{rowIndex: index}}/>
        <button className="btn btn--danger btn--sm">
          <Icon name="trash" size={13}/> Skip row
        </button>
      </div>

      <div className="native__body">
        {row.issue && (
          <HintBanner kind="warn" title="This row has validation issues" body={
            row.issue === "missing-gstin"  ? "GSTIN is missing. Add it below or skip this row." :
            row.issue === "invalid-state"  ? "Place of supply doesn't match a known Indian state code." :
            row.issue === "missing-data"   ? "One or more required cells are empty." :
            "Multiple issues — see flagged fields below."
          }/>
        )}

        <div style={{padding:"16px 18px", border:"1px solid var(--stroke)", borderRadius:10, background:"var(--surface)"}}>
          <div className="form-grid">
            <APField label="Invoice Date"    value={row.invoiceDate} required/>
            <APField label="Invoice No"      value={row.invoiceNo}   required/>
            <APField label="Customer"        value={row.customer}    required/>
            <APField label="Voucher Type"    value={row.voucherType} required/>
            <APField label="GSTIN"           value={row.gstin}       flagged={row.gstin === "—"} touched={false} onTouch={()=>{}}/>
            <APField label="Place of Supply" value={row.state}/>
            <APField label="Sales Ledger"    value={row.ledger}      required/>
            <APField label="Amount (₹)"      value={row.amount.toLocaleString("en-IN")} required/>
          </div>
        </div>

        <div style={{padding:"14px 16px", border:"1px solid var(--stroke)", borderRadius:8, background:"var(--bg-primary)", fontSize:"var(--t-14)", color:"var(--text-muted)"}}>
          <strong style={{color:"var(--text)"}}>What happens on save:</strong> This single row becomes a customer invoice in AR. The rest of the batch ({(item.ar.rowCount-1).toLocaleString("en-IN")} rows) continues independently — back-to-grid lets you keep working on them.
        </div>
      </div>

      <div className="native__footer">
        <button className="btn btn--outline btn--sm" onClick={onBack}>
          <Icon name="back" size={13}/> Back to batch
        </button>
        <div style={{flex:1}}/>
        <button className="btn btn--outline">Save changes</button>
        <button className="btn btn--solid">
          <Icon name="check" size={14}/> Save &amp; next row
        </button>
      </div>
    </div>
  );
};

Object.assign(window, { NativeAR, ARValidationGrid, ARInvoiceDrill });
