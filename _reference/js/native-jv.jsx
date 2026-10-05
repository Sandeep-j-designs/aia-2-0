// Native JV module — Journal Voucher form.

const NativeJV = ({item, state, dispatch}) => {
  const lines = item.jv?.lines || [];
  const drTotal = lines.reduce((s,l)=> s + (l.dr || 0), 0);
  const crTotal = lines.reduce((s,l)=> s + (l.cr || 0), 0);
  const balanced = Math.abs(drTotal - crTotal) < 0.01;

  return (
    <div className="native">
      <div className="native__header">
        <div style={{flex:1}}>
          <h2 className="native__title">Journal Voucher</h2>
          <div className="native__sub">{item._sourceLabel || "JV/25-26/018"} · {item.bill?.billDate || "31 Mar 2026"}</div>
        </div>
      </div>

      <div className="native__body">
        <div className="form-grid">
          <APField label="Voucher Type" value="Journal" required/>
          <APField label="Voucher No"   value="JV/25-26/018" required/>
          <APField label="Voucher Date" value="31 Mar 2026" required/>
          <APField label="Cost Centre"  value="—"/>
        </div>

        <div style={{padding:"16px 18px", border:"1px solid var(--stroke)", borderRadius:10, background:"var(--surface)"}}>
          <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:10}}>
            <strong style={{fontSize:"var(--t-14)"}}>Debit / Credit</strong>
            <div style={{flex:1}}/>
            <a href="#" style={{fontSize:"var(--t-14)"}} onClick={e=>e.preventDefault()}>+ Add line</a>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Ledger</th>
                <th className="tbl__num">Debit (₹)</th>
                <th className="tbl__num">Credit (₹)</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l,i) => (
                <tr key={i}>
                  <td>{l.ledger}</td>
                  <td className="tbl__num num">{l.dr ? l.dr.toLocaleString("en-IN", {minimumFractionDigits:2}) : "—"}</td>
                  <td className="tbl__num num">{l.cr ? l.cr.toLocaleString("en-IN", {minimumFractionDigits:2}) : "—"}</td>
                </tr>
              ))}
              <tr style={{background:"var(--bg-primary)"}}>
                <td style={{fontWeight:700}}>Total</td>
                <td className="tbl__num num" style={{fontWeight:700}}>{drTotal.toLocaleString("en-IN", {minimumFractionDigits:2})}</td>
                <td className="tbl__num num" style={{fontWeight:700}}>{crTotal.toLocaleString("en-IN", {minimumFractionDigits:2})}</td>
              </tr>
            </tbody>
          </table>

          <div style={{marginTop:12, padding:10, borderRadius:6, background: balanced ? "var(--success-wash)" : "var(--danger-wash)", color: balanced ? "var(--success)" : "var(--danger)", fontSize:"var(--t-14)", fontWeight:600, display:"flex", alignItems:"center", gap:8}}>
            {balanced ? <Icon name="check" size={14} stroke={3}/> : <Icon name="alert-tri" size={14} stroke={2}/>}
            {balanced ? "Balanced — Dr = Cr" : "Variance ₹ " + Math.abs(drTotal-crTotal).toLocaleString("en-IN", {minimumFractionDigits:2})}
          </div>
        </div>

        <div className="field">
          <label className="field__label">Narration</label>
          <textarea className="textarea" rows={3} defaultValue={item.jv?.narration}/>
        </div>
      </div>

      <div className="native__footer">
        <ConvertButton source="jv-detail" item={item} dispatch={dispatch} size="sm"/>
        <button className="btn btn--outline btn--sm"><Icon name="trash" size={14}/> Delete</button>
        <div style={{flex:1}}/>
        <button className="btn btn--outline">Save draft</button>
        <button className="btn btn--solid" disabled={!balanced} onClick={() => dispatch({type:"approve"})}>
          <Icon name="check" size={14}/> Post Journal Voucher
        </button>
      </div>
    </div>
  );
};

Object.assign(window, { NativeJV });
