// Detail Shell — v2 router model.
// Pieces:
//   1. Orientation strip (40px) at top — back, type pill, position, prev/next.
//   2. Optional disambiguation banner (only for ambiguous / sub-threshold confidence).
//   3. Split: file preview on left, NATIVE module surface on right.
// No phase rail. No "Classify / Prepare / Confirm" stops anywhere.

const DetailShell = ({state, dispatch}) => {
  const item = state.items.find(it => it.id === state.openedId);
  if(!item) return null;

  // Cohort by route inside the active Needs-Review-ish set
  const allOpenable = state.items.filter(it => ["needs-review","extracting","retrying","low-confidence","duplicate-soft","duplicate-hard","unclassified"].includes(it.status));
  const cohort = allOpenable.filter(it => it.route === item.route && it.route);
  const idx = cohort.findIndex(it => it.id === item.id);
  const total = cohort.length;
  const prev = idx > 0          ? cohort[idx - 1] : null;
  const next = idx < total - 1  ? cohort[idx + 1] : null;

  // Disambiguation conditions:
  // (a) item is ambiguous and user hasn't picked,
  // (b) AI confidence is below the user-controlled threshold and user hasn't confirmed route.
  const threshold = (window.AI_THRESHOLD || 60) / 100;
  const needsDisambig =
    (item.ambiguous && !item._chosenRoute) ||
    (item.ai?.confidence != null && item.ai.confidence < threshold && !item._routeConfirmed && item.route && !item.ambiguous);

  const isApproved = item.status === "approved" || item.status === "done";
  const isFailed   = item.status === "failed";
  const isExtracting = item.status === "extracting" || item.status === "retrying";
  const isCrossDup = item.status === "duplicate-cross-type";

  // Two-pane only for AP (and ambiguous before route is picked).
  // AR + Banking are single-pane full-width per design pivot — the file
  // preview adds no review value over the parsed grid/table.
  const twoPane = !needsDisambig && !isCrossDup &&
                  !isApproved && !isFailed && !isExtracting &&
                  (item.route === "AP" || item.route === "JV" || !item.route);

  return (
    <div className="detail" data-screen-label={"Inbox Detail · " + item.id}>

      <OrientationStrip
        item={item}
        cohort={{idx, total, prev, next}}
        onBack={() => dispatch({type:"closeDetail"})}
        onPrev={() => prev && dispatch({type:"openDetail", id: prev.id})}
        onNext={() => next && dispatch({type:"openDetail", id: next.id})}
      />

      {needsDisambig && (
        <DisambigBanner
          item={item}
          threshold={threshold}
          onPick={(r) => dispatch({type:"pickRouteAmbig", value: r})}
          onConfirm={() => dispatch({type:"setItemField", key:"_routeConfirmed", value: true})}
        />
      )}

      {twoPane ? (
        <div className="detail__split">
          <FilePreview item={item}/>
          <NativePane item={item} state={state} dispatch={dispatch}/>
        </div>
      ) : (
        <div className="detail__single">
          {needsDisambig ? (
            <div className="native">
              <div className="native__body" style={{alignItems:"center", justifyContent:"center", color:"var(--text-muted)", padding: 48}}>
                <Icon name="info" size={36}/>
                <div style={{marginTop:12, fontSize:"var(--t-14)", fontWeight:600, color:"var(--text)"}}>Confirm the route to load the review surface</div>
                <div style={{fontSize:"var(--t-12)", marginTop:4}}>We won't pre-populate any fields until you tell us where this document belongs.</div>
              </div>
            </div>
          ) : isCrossDup ? (
            <CrossTypeDupScreen item={item} dispatch={dispatch}/>
          ) : isApproved ? (
            <NativeApproved item={item} onNext={() => dispatch({type:"openNext"})}/>
          ) : isFailed ? (
            <NativeFailed item={item} dispatch={dispatch}/>
          ) : isExtracting ? (
            <NativeExtracting item={item}/>
          ) : (
            <NativePane item={item} state={state} dispatch={dispatch}/>
          )}
        </div>
      )}

      {state.conversion && <ConversionPanel state={state} dispatch={dispatch}/>}
      {state.snackbar && <UndoSnackbar text={state.snackbar.text} onUndo={() => dispatch({type:"undoApprove"})} onDismiss={() => dispatch({type:"dismissSnack"})}/>}
    </div>
  );
};

// ---------------- Orientation strip ----------------

const ROUTE_PILL_TONE = { AP: "pill--info", AR: "pill--info", Banking: "pill--soft", JV: "pill--soft" };

const OrientationStrip = ({item, cohort, onBack, onPrev, onNext}) => {
  const route = item.route ? window.SEED.ROUTES[item.route] : null;
  const sourceMeta = window.SEED.CHANNELS[item.source.channel];

  // Position chip text varies subtly per surface, but the strip never reframes the surface
  const cohortLabel =
    !item.route                  ? "Unclassified" :
    item.route === "AP"          ? "Bill" :
    item.route === "AR"          ? "Invoice batch" :
    item.route === "Banking"     ? "Statement" :
    "Journal voucher";

  // AR / Banking carry richer position chips because they describe a batch, not a single unit
  const positionEl =
    item.route === "AR" && item.ar ? (
      <>
        <strong>Invoice batch</strong>
        <span> · {item.ar.rowCount.toLocaleString("en-IN")} rows</span>
        {item.ar.validRows != null && <span style={{color:"var(--success)"}}> · {item.ar.validRows.toLocaleString("en-IN")} valid</span>}
        {item.ar.invalidRows ? <span style={{color:"var(--danger)"}}> · {item.ar.invalidRows} issues</span> : null}
      </>
    ) : item.route === "Banking" && item.banking ? (
      <>
        <strong>Statement</strong>
        <span> · {item.banking.dateRange} · {item.banking.txnCount} txns</span>
      </>
    ) : (
      <>
        <strong>{cohortLabel}</strong>
        <span> {cohort.idx + 1} of {cohort.total} pending</span>
      </>
    );

  return (
    <div className="strip" data-screen-label="Orientation strip">
      <span className="strip__back" onClick={onBack}>
        <Icon name="back" size={14}/> Inbox
      </span>
      <span className="strip__divider"/>
      {route && (
        <span className={cls("pill", ROUTE_PILL_TONE[item.route])}>
          <Icon name={route.icon} size={11} stroke={2}/>
          {route.label}
        </span>
      )}
      <span className="strip__pos">{positionEl}</span>

      <span className="strip__source" title={item.source.sender}>
        <Icon name={sourceMeta?.icon || "upload"} size={11} stroke={2}/>
        from {sourceMeta?.label || "Upload"}
        {item.ar?.template && <> · template recognised</>}
        {item.ai?.confidence != null && item.ai.confidence < 0.7 && <> · low confidence</>}
      </span>

      <div className="strip__right">
        <div className="strip__pager">
          <button onClick={onPrev} disabled={!cohort.prev} title="Previous (in route cohort)">
            <Icon name="chev-l" size={14}/>
          </button>
          <span>{cohort.idx + 1} / {cohort.total}</span>
          <button onClick={onNext} disabled={!cohort.next} title="Next (in route cohort)">
            <Icon name="chev-r" size={14}/>
          </button>
        </div>
        <KebabMenu items={stripOverflowItems(item)}/>
      </div>
    </div>
  );
};

// Overflow contents vary per surface — see memo §4
function stripOverflowItems(item){
  const common = [
    { label: "View source file",          icon: "external" },
    { label: "Reassign route",            icon: "swap" }
  ];
  if(item.route === "AP" || item.route === "JV"){
    return [
      ...(item.route === "AP" ? [{ label: "Convert this bill to Journal Voucher", icon: "ledger", action: "jv-bill" }] : []),
      ...(item.route === "JV" ? [{ label: "Re-route to AP / AR / Banking", icon: "swap" }] : []),
      { divider: true },
      ...common,
      { divider: true },
      { label: "Delete", icon: "trash", danger: true }
    ];
  }
  if(item.route === "AR"){
    return [
      { label: "Edit column mapping", icon: "edit" },
      { divider: true },
      ...common,
      { divider: true },
      { label: "Delete batch", icon: "trash", danger: true }
    ];
  }
  if(item.route === "Banking"){
    return [
      ...common,
      { divider: true },
      { label: "Delete statement", icon: "trash", danger: true }
    ];
  }
  return common;
}

const KebabMenu = ({items, align = "right"}) => {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState(null);
  const btnRef = React.useRef(null);

  React.useEffect(() => {
    if(!open) return;
    const onDocClick = (e) => {
      // Close if click is outside the button AND outside the menu element
      if(btnRef.current && btnRef.current.contains(e.target)) return;
      if(e.target.closest && e.target.closest(".kebab-menu-portal")) return;
      setOpen(false);
    };
    const onEsc = (e) => { if(e.key === "Escape") setOpen(false); };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const onToggle = (e) => {
    e.stopPropagation();
    if(open){ setOpen(false); return; }
    const r = btnRef.current.getBoundingClientRect();
    const MENU_W = 240;
    const left = align === "right"
      ? Math.max(8, r.right - MENU_W)
      : r.left;
    // Flip up if there isn't room below
    const spaceBelow = window.innerHeight - r.bottom;
    const placeAbove = spaceBelow < 260;
    setPos({
      left,
      top: placeAbove ? r.top - 8 : r.bottom + 4,
      placeAbove
    });
    setOpen(true);
  };

  return (
    <div className="kebab-wrap">
      <button ref={btnRef} className={cls("kebab-btn", open && "is-open")} onClick={onToggle} title="More actions">
        <Icon name="kebab" size={14}/>
      </button>
      {open && pos && ReactDOM.createPortal(
        <div
          className="kebab-menu-portal"
          style={{
            position: "fixed",
            left: pos.left,
            top: pos.top,
            zIndex: 1000,
            transform: pos.placeAbove ? "translateY(-100%)" : "none"
          }}
        >
          <div className="kebab-menu">
            {items.map((it, i) => it.divider ? (
              <div key={i} className="kebab-divider"/>
            ) : (
              <div
                key={i}
                className={cls("kebab-item", it.danger && "danger")}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  if(it.onClick) it.onClick();
                  else if(it.action === "jv-bill") window.__dispatch({type:"openJv", source:"bill"});
                  else window.__toast && window.__toast("This action would " + it.label.toLowerCase() + " in the live product.");
                }}
              >
                <Icon name={it.icon} size={14}/>
                <span>{it.label}</span>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// ---------------- Disambiguation banner ----------------

const DisambigBanner = ({item, threshold, onPick, onConfirm}) => {
  // Ambiguous file with no chosen route: show candidates inline.
  if(item.ambiguous){
    return (
      <div className="disambig">
        <span className="disambig__icon"><Icon name="alert-tri" size={16}/></span>
        <div style={{flex:1, minWidth:0}}>
          <div className="disambig__title">We weren't sure how to classify this. Pick a route to continue.</div>
          <div className="disambig__sub">
            {item.candidates.map((c, i) => (
              <span key={i} style={{marginRight: 14}}>
                <strong style={{color:"var(--text)", fontWeight:600}}>{window.SEED.ROUTES[c.route]?.short || c.route}:</strong> {c.evidence}
              </span>
            ))}
          </div>
        </div>
        <div className="disambig__actions">
          {item.candidates.map((c, i) => (
            <button key={i} className="btn btn--outline btn--sm" onClick={() => onPick(c.route)}>
              Use {window.SEED.ROUTES[c.route]?.short || c.route}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Sub-threshold confidence on a routed item.
  return (
    <div className="disambig">
      <span className="disambig__icon"><Icon name="alert-tri" size={16}/></span>
      <div style={{flex:1, minWidth:0}}>
        <div className="disambig__title">
          Confidence below threshold ({Math.round(item.ai.confidence*100)}% &lt; {Math.round(threshold*100)}%)
        </div>
        <div className="disambig__sub">
          We classified this as <strong style={{color:"var(--text)"}}>{window.SEED.ROUTES[item.route]?.label}</strong>. {item.ai.rationale} — confirm before we load the review surface.
        </div>
      </div>
      <div className="disambig__actions">
        <button className="btn btn--outline btn--sm">Pick a different route</button>
        <button className="btn btn--solid btn--sm" onClick={onConfirm}>
          <Icon name="check" size={13}/> Confirm {window.SEED.ROUTES[item.route]?.short}
        </button>
      </div>
    </div>
  );
};

// ---------------- Failure / Extracting / Approved placeholders ----------------

const NativeFailed = ({item, dispatch}) => {
  const f = item.failure;
  return (
    <div className="native">
      <div className="native__header">
        <h2 className="native__title">{f.title}</h2>
      </div>
      <div className="native__body">
        <HintBanner kind="danger" title={f.title} body={f.body}/>
        <div style={{display:"flex", gap:8}}>
          <button className="btn btn--solid"><Icon name="rotate" size={14}/> Retry</button>
          <button className="btn btn--outline">Fill manually</button>
          <button className="btn btn--danger"><Icon name="trash" size={14}/> Delete</button>
        </div>
        <div style={{padding:16, background:"var(--bg-primary)", borderRadius:8, border:"1px solid var(--stroke)", fontSize:"var(--t-14)"}}>
          <div style={{fontWeight:600, marginBottom:6}}>What we tried</div>
          <ul style={{margin:0, paddingLeft:20, color:"var(--text-muted)", lineHeight:"22px"}}>
            <li>OCR pass 1 — Tesseract — 0% structured fields</li>
            <li>OCR pass 2 — Layout-aware — partial header detect</li>
            <li>Vendor matching — no match against masters</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const NativeExtracting = ({item}) => (
  <div className="native">
    <div className="native__body" style={{alignItems:"center", justifyContent:"center", padding:48}}>
      <span className="spin" style={{width:32, height:32, borderWidth:3, color:"var(--brand)"}}/>
      <div style={{marginTop:16, fontSize:"var(--t-14)", fontWeight:600}}>
        {item.status === "retrying" ? `Retrying — attempt ${item.retryAttempt} of ${item.retryMax}` : "Reading the document…"}
      </div>
      <div style={{fontSize:"var(--t-12)", color:"var(--text-muted)", marginTop:4}}>
        We'll load the review surface as soon as extraction completes.
      </div>
    </div>
  </div>
);

const NativeApproved = ({item, onNext}) => (
  <div className="native">
    <div className="native__body">
      <div className="approved-inline">
        <span style={{width:40, height:40, borderRadius:"50%", background:"var(--success)", color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center"}}>
          <Icon name="check" size={20} stroke={3}/>
        </span>
        <div style={{flex:1}}>
          <div style={{fontSize:"var(--t-16)", fontWeight:600, color:"var(--success)"}}>
            {item._convertedToJv ? "Converted to Journal Voucher" : "Approved"}
          </div>
          <div style={{fontSize:"var(--t-14)", color:"var(--text-muted)", marginTop:2}}>
            By <strong style={{color:"var(--text)"}}>{item.approvedBy || "Sandeep Balaji"}</strong> · just now · destination <strong style={{color:"var(--text)"}}>{item._destination || "—"}</strong>
          </div>
        </div>
        <button className="btn btn--soft btn--sm">
          <Icon name="external" size={13}/> View {item._convertedToJv ? "JV" : "voucher"}
        </button>
      </div>

      <div style={{display:"flex", gap:8, alignItems:"center", padding:"14px 16px", border:"1px solid var(--stroke)", borderRadius:8, background:"var(--surface)"}}>
        <Icon name="info" size={16}/>
        <div style={{fontSize:"var(--t-14)", color:"var(--text-muted)", flex:1}}>
          The next Needs-Review item in this route is queued. Use the pager or click below.
        </div>
        <button className="btn btn--solid btn--sm" onClick={onNext}>
          Next item <Icon name="chev-r" size={13}/>
        </button>
      </div>
    </div>
  </div>
);

// ---------------- Routing — which native pane to render ----------------

const NativePane = ({item, state, dispatch}) => {
  if(item.route === "AP")      return <NativeAP item={item} state={state} dispatch={dispatch}/>;
  if(item.route === "AR")      return <NativeAR item={item} state={state} dispatch={dispatch}/>;
  if(item.route === "Banking") return <NativeBanking item={item} state={state} dispatch={dispatch}/>;
  if(item.route === "JV")      return <NativeJV item={item} state={state} dispatch={dispatch}/>;
  return <NativeFailed item={{failure:{title:"No route", body:"This item has no route. Pick one from the disambiguation banner."}}}/>;
};

// ---------------- Undo snackbar ----------------

const UndoSnackbar = ({text, onUndo, onDismiss}) => {
  React.useEffect(() => {
    const t = setTimeout(onDismiss, 10000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="snack">
      <Icon name="check" size={14} stroke={3}/>
      <span style={{flex:1}}>{text}</span>
      <span className="snack__undo" onClick={onUndo}>Undo</span>
      <span style={{color:"#7889E8", cursor:"pointer"}} onClick={onDismiss}><Icon name="x" size={14}/></span>
      <div className="snack__bar"/>
    </div>
  );
};

Object.assign(window, { DetailShell, OrientationStrip, DisambigBanner, NativePane, NativeFailed, NativeExtracting, NativeApproved, UndoSnackbar, KebabMenu });
