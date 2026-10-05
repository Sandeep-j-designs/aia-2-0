// Native Banking module — parsed statement table → reconcile.
// JV escape is per-transaction via row overflow (bank charges, interest credits, transfers).

const NativeBanking = ({item, state, dispatch}) => {
  const [drillIdx, setDrillIdx] = React.useState(null);
  if(drillIdx != null){
    return <BankingTxnDrill item={item} index={drillIdx} onBack={() => setDrillIdx(null)} dispatch={dispatch}/>;
  }
  return <BankingTable item={item} onDrill={setDrillIdx} dispatch={dispatch}/>;
};

const BankingTable = ({item, onDrill, dispatch}) => {
  const b = item.banking;
  const [selected, setSelected] = React.useState(new Set());

  // Synthesize more rows so the surface looks like a real statement
  const allTxns = React.useMemo(() => {
    const synth = [];
    const base = b.sample;
    let bal = b.opening;
    for(let i=0; i<24; i++){
      const tx = base[i % base.length];
      bal += (tx.cr || 0) - (tx.dr || 0);
      synth.push({...tx,
        date: `${String((i%28)+1).padStart(2,"0")}-Apr-26`,
        narration: tx.narration + (i % 5 === 0 ? " — Apr batch" : ""),
        bal,
        isCharge: tx.narration.includes("POS") || tx.narration.includes("UPI"),
      });
    }
    return synth;
  }, [b]);

  const toggleRow = (i) => {
    const next = new Set(selected);
    if(next.has(i)) next.delete(i); else next.add(i);
    setSelected(next);
  };

  return (
    <div className="native">
      <div className="native__header">
        <div style={{flex:1}}>
          <h2 className="native__title">HDFC Bank · Statement</h2>
          <div className="native__sub">A/C 50100123456 · {b.dateRange} · {b.txnCount} transactions</div>
        </div>
      </div>

      <div style={{padding:"16px 20px 0", display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12}}>
        <StatCard label="Transactions"     value={String(b.txnCount)}/>
        <StatCard label="Date range"        value={b.dateRange.replace("–","→")} small/>
        <StatCard label="Opening balance"   value={"₹ " + b.opening.toLocaleString("en-IN")}/>
        <StatCard label="Closing balance"   value={"₹ " + b.closing.toLocaleString("en-IN")} accent/>
      </div>

      <div style={{padding:"16px 20px 0", display:"flex", alignItems:"center", gap:10}}>
        <strong style={{fontSize:"var(--t-14)"}}>Transactions</strong>
        <span className="pill pill--neutral">Showing 24 of {b.txnCount}</span>
        <div style={{flex:1}}/>
        {selected.size > 0 && (
          <button className="btn btn--outline btn--sm" onClick={() => dispatch({type:"openConversion", conversion:{source:"banking-bulk", target:"JV", rowIndices: Array.from(selected)}})}>
            <Icon name="swap" size={13}/> Convert {selected.size} txns →
          </button>
        )}
      </div>

      <div style={{flex:1, minHeight:0, padding:"8px 20px 0", display:"flex", flexDirection:"column"}}>
        <div className="tbl-wrap" style={{flex:1}}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{width:30, paddingLeft:16}}/>
                <th style={{width:100}}>Date</th>
                <th>Narration</th>
                <th className="tbl__num">Debit</th>
                <th className="tbl__num">Credit</th>
                <th className="tbl__num">Balance</th>
                <th style={{width:40}}/>
              </tr>
            </thead>
            <tbody>
              {allTxns.map((tx, i) => (
                <tr key={i} className={cls("tr-kebab", selected.has(i) && "is-selected")} onClick={() => onDrill(i)} style={{cursor:"pointer"}}>
                  <td style={{paddingLeft:16}} onClick={(e)=>e.stopPropagation()}>
                    <Checkbox checked={selected.has(i)} onChange={() => toggleRow(i)}/>
                  </td>
                  <td>{tx.date}</td>
                  <td>{tx.narration}</td>
                  <td className="tbl__num num" style={{color: tx.dr ? "var(--danger)" : "var(--text-muted)"}}>{tx.dr ? tx.dr.toLocaleString("en-IN") : "—"}</td>
                  <td className="tbl__num num" style={{color: tx.cr ? "var(--success)" : "var(--text-muted)"}}>{tx.cr ? tx.cr.toLocaleString("en-IN") : "—"}</td>
                  <td className="tbl__num num">{tx.bal.toLocaleString("en-IN")}</td>
                  <td onClick={(e)=>e.stopPropagation()}>
                    <KebabMenu items={[
                      { label: "Open transaction", icon: "external", onClick: () => onDrill(i) },
                      { divider: true },
                      { label: "Reconcile against bill", icon: "swap" },
                      { label: "Reconcile against receipt", icon: "swap" },
                      { divider: true },
                      { label: "Convert →", icon: "swap", onClick: () => dispatch({type:"openConversion", conversion:{source:"banking-row", target:"JV", rowIndex: i, txn: tx}}) },
                      { divider: true },
                      { label: "Mark unreconciled", icon: "x", danger: true }
                    ]}/>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="native__footer">
        <button className="btn btn--outline btn--sm"><Icon name="trash" size={14}/> Delete statement</button>
        <div style={{flex:1}}/>
        <button className="btn btn--outline">Save draft</button>
        <button className="btn btn--solid" onClick={() => dispatch({type:"approve"})}>
          <Icon name="check" size={14}/> Confirm &amp; Send to Reconcile
        </button>
      </div>
    </div>
  );
};

const BankingTxnDrill = ({item, index, onBack, dispatch}) => {
  // Synthesize the same txn so drill matches grid
  const b = item.banking;
  const tx = b.sample[index % b.sample.length];

  return (
    <div className="native">
      <div className="drill__head">
        <span className="drill__back" onClick={onBack}>
          <Icon name="chev-l" size={14}/> Back to statement
        </span>
        <span className="strip__divider"/>
        <span style={{fontSize:"var(--t-14)", color:"var(--text-muted)"}}>
          Transaction · <strong style={{color:"var(--text)"}}>{tx.narration}</strong>
        </span>
        <div style={{flex:1}}/>
        <ConvertButton source="banking-row-drill" item={item} dispatch={dispatch} size="sm" extraContext={{rowIndex: index, txn: tx}}/>
      </div>

      <div className="native__body">
        <div style={{padding:"16px 18px", border:"1px solid var(--stroke)", borderRadius:10, background:"var(--surface)"}}>
          <div className="form-grid">
            <APField label="Date" value={tx.date} required/>
            <APField label="Narration" value={tx.narration} required/>
            <APField label="Debit (₹)" value={tx.dr ? tx.dr.toLocaleString("en-IN") : "—"}/>
            <APField label="Credit (₹)" value={tx.cr ? tx.cr.toLocaleString("en-IN") : "—"}/>
            <APField label="Reconciled against" value="" placeholder="Search bills, receipts, ledgers…"/>
            <APField label="Cost Centre" value="" placeholder="Optional"/>
          </div>
        </div>

        <HintBanner kind="info" title="Match to a bill or receipt"
          body="Type vendor name or amount above. We'll surface matching bills, customer receipts and ledger entries from the last 90 days."/>
      </div>

      <div className="native__footer">
        <button className="btn btn--outline btn--sm" onClick={onBack}>
          <Icon name="back" size={13}/> Back
        </button>
        <div style={{flex:1}}/>
        <button className="btn btn--solid"><Icon name="check" size={14}/> Reconcile</button>
      </div>
    </div>
  );
};

const StatCard = ({label, value, accent, small}) => (
  <div style={{padding:"12px 14px", border:"1px solid var(--stroke)", borderRadius:8, background:"var(--surface)"}}>
    <div style={{fontSize:"var(--t-11)", color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:".04em", fontWeight:600}}>{label}</div>
    <div style={{fontSize: small ? 13 : 18, fontWeight:700, color: accent ? "var(--brand)" : "var(--text)", marginTop:4, fontVariantNumeric:"tabular-nums"}}>{value}</div>
  </div>
);

Object.assign(window, { NativeBanking, BankingTable, BankingTxnDrill, StatCard });
