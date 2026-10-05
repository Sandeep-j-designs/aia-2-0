// Document preview — the LEFT pane of the detail shell.
// Renders a mock visualisation of the source file based on its type.
// (Real product would render the actual PDF/XLSX.)

const FilePreview = ({item}) => {

  // ---- Excel preview ----
  if(item.file.ext === "xlsx"){
    return (
      <div className="preview">
        <div className="preview__toolbar">
          <span className="muted" style={{fontSize:"var(--t-12)", marginRight:"auto", marginLeft:8}}>{item.file.name} · {item.ar?.sheetName || "Sheet 1"}</span>
          <button className="icon-btn" title="Zoom in"><Icon name="zoom-in" size={14}/></button>
          <button className="icon-btn" title="Zoom out"><Icon name="zoom-out" size={14}/></button>
          <button className="icon-btn" title="Fullscreen"><Icon name="expand" size={14}/></button>
        </div>
        <div className="preview__paper" style={{padding:0, width:"min(720px, 96%)", minHeight:600}}>
          <table className="tbl" style={{fontSize:"var(--t-11)"}}>
            <thead>
              <tr>
                <th style={{width:30, textAlign:"center"}}>#</th>
                {(item.ar?.headers || ["Col A","Col B","Col C","Col D"]).slice(0,8).map((h, i) => <th key={i} style={{fontSize:"var(--t-10)"}}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {(item.ar?.rows || []).slice(0,20).map((r, i) => (
                <tr key={i}>
                  <td style={{textAlign:"center", color:"var(--text-muted)", fontSize:"var(--t-10)"}}>{i+2}</td>
                  <td>{r.invoiceNo}</td>
                  <td>{r.customer}</td>
                  <td className="num">{r.amount.toLocaleString("en-IN")}</td>
                  <td>{r.voucherType}</td>
                  <td>{r.gstin}</td>
                  <td>{r.state}</td>
                  <td>{r.ledger}</td>
                  <td>{r.invoiceDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ---- Banking statement preview ----
  if(item.route === "Banking" && item.banking){
    return (
      <div className="preview">
        <div className="preview__toolbar">
          <span className="muted" style={{fontSize:"var(--t-12)", marginRight:"auto", marginLeft:8}}>{item.file.name}</span>
          <button className="icon-btn"><Icon name="zoom-in" size={14}/></button>
          <button className="icon-btn"><Icon name="expand" size={14}/></button>
        </div>
        <div className="preview__paper">
          <div style={{textAlign:"center", marginBottom:24}}>
            <div style={{fontSize:"var(--t-20)", fontWeight:700}}>HDFC BANK</div>
            <div style={{fontSize:"var(--t-11)", color:"#888"}}>Account Statement</div>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16, fontSize:"var(--t-11)"}}>
            <div><strong>Account Holder</strong><br/>SHAKUNTHALAM OIL &amp; REFINERIES PVT LTD</div>
            <div><strong>Account No.</strong><br/>50100123456 (Current)</div>
            <div><strong>Statement Period</strong><br/>{item.banking.dateRange}</div>
            <div><strong>Branch</strong><br/>Bangalore — Indiranagar</div>
          </div>
          <hr style={{border:0, borderTop:"1px solid #ddd"}}/>
          <div className="preview__bank-rows" style={{marginTop:12}}>
            <div style={{display:"grid", gridTemplateColumns:"70px 1fr 70px 70px 70px", gap:6, fontWeight:700, borderBottom:"1px solid #ccc", paddingBottom:4}}>
              <span>Date</span><span>Narration</span><span style={{textAlign:"right"}}>Dr</span><span style={{textAlign:"right"}}>Cr</span><span style={{textAlign:"right"}}>Balance</span>
            </div>
            {item.banking.sample.map((tx, i) => (
              <div key={i} style={{display:"grid", gridTemplateColumns:"70px 1fr 70px 70px 70px", gap:6, padding:"4px 0", borderBottom:"1px dotted #eee"}}>
                <span>{tx.date}</span>
                <span style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{tx.narration}</span>
                <span style={{textAlign:"right", color:"#a00"}}>{tx.dr ? tx.dr.toLocaleString("en-IN") : ""}</span>
                <span style={{textAlign:"right", color:"#080"}}>{tx.cr ? tx.cr.toLocaleString("en-IN") : ""}</span>
                <span style={{textAlign:"right"}}>—</span>
              </div>
            ))}
            <div style={{padding:"6px 0", fontStyle:"italic", color:"#888"}}>… +{item.banking.txnCount - item.banking.sample.length} more transactions</div>
          </div>
          <hr style={{border:0, borderTop:"1px solid #ddd", margin:"16px 0"}}/>
          <div style={{display:"flex", justifyContent:"space-between", fontSize:"var(--t-11)"}}>
            <span><strong>Opening</strong> ₹ {item.banking.opening.toLocaleString("en-IN")}</span>
            <span><strong>Closing</strong> ₹ {item.banking.closing.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>
    );
  }

  // ---- Failure previews ----
  if(item.status === "failed" && item.failure?.type === "scanned-pdf"){
    return (
      <div className="preview">
        <div className="preview__toolbar">
          <span className="muted" style={{fontSize:"var(--t-12)", marginRight:"auto", marginLeft:8}}>{item.file.name}</span>
        </div>
        <div className="preview__paper" style={{background:"linear-gradient(45deg,#f5f5f5 25%,#eee 25%,#eee 50%,#f5f5f5 50%,#f5f5f5 75%,#eee 75%)", backgroundSize:"12px 12px", color:"#555", textAlign:"center", padding:80}}>
          <div style={{background:"#fff", padding:16, borderRadius:6, border:"1px solid #ddd", display:"inline-block", color:"#333"}}>
            <Icon name="file" size={36}/>
            <div style={{fontSize:"var(--t-14)", marginTop:8, fontWeight:600}}>Scanned image — text not extractable</div>
            <div style={{fontSize:"var(--t-11)", color:"#999", marginTop:4}}>Preview shown as page-image only</div>
          </div>
        </div>
      </div>
    );
  }

  if(item.status === "failed" && item.failure?.type === "password-protected"){
    return (
      <div className="preview">
        <div className="preview__toolbar">
          <span className="muted" style={{fontSize:"var(--t-12)", marginRight:"auto", marginLeft:8}}>{item.file.name}</span>
        </div>
        <div className="preview__paper" style={{textAlign:"center", padding:80, color:"#777"}}>
          <Icon name="lock" size={48}/>
          <div style={{fontSize:"var(--t-14)", fontWeight:600, marginTop:12, color:"#333"}}>This PDF is password-protected</div>
          <div style={{fontSize:"var(--t-12)", marginTop:6}}>Provide the password and we'll retry extraction.</div>
        </div>
      </div>
    );
  }

  // ---- Default bill PDF ----
  if(item.bill){
    const b = item.bill;
    return (
      <div className="preview">
        <div className="preview__toolbar">
          <span className="muted" style={{fontSize:"var(--t-12)", marginRight:"auto", marginLeft:8}}>{item.file.name} · Page 1 of 1</span>
          <button className="icon-btn"><Icon name="zoom-in" size={14}/></button>
          <button className="icon-btn"><Icon name="zoom-out" size={14}/></button>
          <button className="icon-btn"><Icon name="expand" size={14}/></button>
        </div>
        <div className="preview__paper">
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24}}>
            <div>
              <div style={{fontSize:"var(--t-20)", fontWeight:700, color:"#111"}}>{item.vendor}</div>
              <div style={{fontSize:"var(--t-11)", color:"#666"}}>GSTIN 27AAACD0596P1ZH · CIN U72200KA2014PTC077632</div>
              <div style={{fontSize:"var(--t-11)", color:"#666"}}>456, Outer Ring Road, Bangalore 560037</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:"var(--t-16)", fontWeight:700, color:"#111"}}>TAX INVOICE</div>
              <div style={{fontSize:"var(--t-11)", color:"#666"}}>{b.supplierInvoiceNo}</div>
              <div style={{fontSize:"var(--t-11)", color:"#666"}}>{b.billDate}</div>
            </div>
          </div>

          <div style={{background:"#f6f7ff", padding:"10px 12px", borderRadius:6, fontSize:"var(--t-11)", marginBottom:16}}>
            <strong>Bill to:</strong> Shakunthalam Oil &amp; Refineries Pvt Ltd<br/>
            13, Mahatma Gandhi Road, Dollar Colony, Delhi 110001 · {b.gstReg?.split("·")[1]?.trim()}
          </div>

          <table style={{width:"100%", borderCollapse:"collapse", fontSize:"var(--t-11)", marginBottom:16}}>
            <thead>
              <tr style={{borderBottom:"1px solid #333"}}>
                <th style={{textAlign:"left", padding:"6px 0"}}>Description</th>
                <th style={{textAlign:"right", padding:"6px 0", width:90}}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {b.items.map((it, i) => (
                <tr key={i} style={{borderBottom:"1px dotted #ccc"}}>
                  <td style={{padding:"8px 0"}}>{it.desc}</td>
                  <td style={{padding:"8px 0", textAlign:"right"}}>{it.amount.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{display:"flex", justifyContent:"flex-end", fontSize:"var(--t-11)"}}>
            <table style={{width:240}}>
              <tbody>
                <tr><td>Sub-total</td><td style={{textAlign:"right"}}>{b.subTotal.toLocaleString("en-IN")}</td></tr>
                {b.taxes.cgst != null && <tr><td>CGST (9%)</td><td style={{textAlign:"right"}}>{b.taxes.cgst.toLocaleString("en-IN")}</td></tr>}
                {b.taxes.sgst != null && <tr><td>SGST (9%)</td><td style={{textAlign:"right"}}>{b.taxes.sgst.toLocaleString("en-IN")}</td></tr>}
                {b.taxes.igst != null && <tr><td>IGST (18%)</td><td style={{textAlign:"right"}}>{b.taxes.igst.toLocaleString("en-IN")}</td></tr>}
                <tr style={{borderTop:"1px solid #333", fontWeight:700}}>
                  <td style={{paddingTop:6}}>Total</td>
                  <td style={{paddingTop:6, textAlign:"right"}}>{b.grandTotal.toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{marginTop:32, fontSize:"var(--t-10)", color:"#888", borderTop:"1px solid #eee", paddingTop:8}}>
            Subject to Bangalore jurisdiction. Payment due within 30 days. E. &amp; O.E.
          </div>
        </div>
      </div>
    );
  }

  // ---- JV memo ----
  if(item.jv){
    return (
      <div className="preview">
        <div className="preview__toolbar">
          <span className="muted" style={{fontSize:"var(--t-12)", marginRight:"auto", marginLeft:8}}>{item.file.name}</span>
        </div>
        <div className="preview__paper" style={{fontSize:"var(--t-12)"}}>
          <div style={{fontSize:"var(--t-16)", fontWeight:700, marginBottom:6}}>Adjustment Memo</div>
          <div style={{color:"#666", fontSize:"var(--t-11)", marginBottom:24}}>Internal note · {item.id}</div>
          <p style={{lineHeight:1.7}}>{item.jv.narration}</p>
          <table style={{width:"100%", marginTop:24, borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:"1px solid #333"}}>
              <th style={{textAlign:"left", padding:"4px 0"}}>Ledger</th>
              <th style={{textAlign:"right", padding:"4px 0"}}>Dr</th>
              <th style={{textAlign:"right", padding:"4px 0"}}>Cr</th>
            </tr></thead>
            <tbody>
              {item.jv.lines.map((l,i)=> (
                <tr key={i} style={{borderBottom:"1px dotted #ccc"}}>
                  <td style={{padding:"6px 0"}}>{l.ledger}</td>
                  <td style={{padding:"6px 0", textAlign:"right"}}>{l.dr ? l.dr.toLocaleString("en-IN") : ""}</td>
                  <td style={{padding:"6px 0", textAlign:"right"}}>{l.cr ? l.cr.toLocaleString("en-IN") : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ---- Fallback ----
  return (
    <div className="preview">
      <div className="preview__paper" style={{textAlign:"center", padding:80, color:"#777"}}>
        <Icon name="file" size={48}/>
        <div style={{fontSize:"var(--t-14)", marginTop:12}}>{item.file.name}</div>
      </div>
    </div>
  );
};

// HintBanner — small alert/info block used across the prototype.
const HintBanner = ({kind, title, body, icon}) => (
  <div className={cls("hint", "hint--"+kind)}>
    <Icon name={icon || (kind==="warn"?"alert-tri":kind==="danger"?"alert-tri":kind==="success"?"check":"info")} size={16} stroke={2}/>
    <div>
      <div style={{fontWeight:600, marginBottom:2}}>{title}</div>
      <div>{body}</div>
    </div>
  </div>
);

Object.assign(window, { FilePreview, HintBanner });
