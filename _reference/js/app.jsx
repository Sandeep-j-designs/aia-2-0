// App root — router model. No phases.

const initialState = () => ({
  items: window.SEED.items.map(it => ({...it})),
  view: "inbox",
  activeTab: "needs",
  selected: new Set(),
  filters: { source: "all", route: "all", aged: false, failed: false },
  search: "",
  showUpload: false,
  showEmpty: true,
  openedId: null,
  conversion: null,         // { source, target, ...extra }
  reversalForId: null,      // id of item whose conversion is being reversed
  conflictForId: null,      // id whose multi-user conflict banner is showing
  snackbar: null
});

function reducer(state, action){
  switch(action.type){
    case "setView":      return {...state, view: action.value};
    case "setActiveTab": return {...state, activeTab: action.value, selected: new Set()};
    case "setSelected":  return {...state, selected: action.value};
    case "setFilter":    return {...state, filters: {...state.filters, [action.key]: action.value}};
    case "setSearch":    return {...state, search: action.value};
    case "setShowUpload":return {...state, showUpload: action.value};
    case "setShowEmpty": return {...state, showEmpty: action.value};

    case "openDetail":   return {...state, openedId: action.id, conflictForId: null};
    case "closeDetail":  return {...state, openedId: null, conversion: null, conflictForId: null};

    case "pickRouteAmbig": {
      const items = state.items.map(it =>
        it.id === state.openedId ? {...it, route: action.value, _chosenRoute: action.value} : it
      );
      return {...state, items};
    }

    case "setItemField": {
      const items = state.items.map(it =>
        it.id === state.openedId ? {...it, [action.key]: action.value} : it
      );
      return {...state, items};
    }

    case "approve": {
      // Conflict-sim items intercept the first approve
      const cur = state.items.find(it => it.id === state.openedId);
      if(cur && cur._conflictSim && !state.conflictForId){
        return {...state, conflictForId: cur.id};
      }
      const items = state.items.map(it => {
        if(it.id !== state.openedId) return it;
        return {...it, status:"done", doneBy:"Sandeep Balaji", doneAt: Date.now(),
                destination: it.route === "AR" ? "Batch · " + (it.ar?.validRows||0) + " invoices"
                            : it.route === "Banking" ? "Banking · " + (it.banking?.txnCount||0) + " txns"
                            : it.bill?.voucherNo || "JV/25-26/018"};
      });
      return {...state, items, snackbar: { text: "Approved — destination ready in module", canUndo: true }};
    }

    case "undoApprove": {
      const items = state.items.map(it => it.id === state.openedId ? {...it, status:"needs-review", doneBy: null, doneAt: null, destination: null, lineage: null} : it);
      return {...state, items, snackbar: null};
    }
    case "dismissSnack": return {...state, snackbar: null};

    case "openNext": {
      const cohort = state.items.filter(it => ["needs-review","extracting","retrying","low-confidence","duplicate-soft","duplicate-hard","unclassified"].includes(it.status));
      const next = cohort[0];
      return next ? {...state, openedId: next.id} : {...state, openedId: null};
    }

    // ────────── Conversion (unified) ──────────
    case "openConversion": {
      return {...state, conversion: action.conversion};
    }
    case "closeConversion": return {...state, conversion: null, conflictForId: null};

    case "confirmConversion": {
      const cur = state.items.find(it => it.id === state.openedId);
      // Conflict-sim items intercept the first confirm
      if(cur && cur._conflictSim && !state.conflictForId){
        return {...state, conflictForId: cur.id};
      }
      const conv = state.conversion;
      const spec = action.spec;
      if(!conv || !cur) return state;

      const newRouteByTarget = { JV: "JV", Bill: "AP", Invoice: "AR" };
      const newDestId =
        conv.target === "JV"      ? "JV/25-26/" + Math.floor(Math.random()*99 + 50) :
        conv.target === "Bill"    ? "PUR/25-26/" + Math.floor(Math.random()*99 + 70) :
        "INV-S/25-26/" + Math.floor(Math.random()*99 + 100);

      const isBatchSource = conv.source === "ar-row" || conv.source === "ar-row-drill" || conv.source === "banking-row" || conv.source === "banking-row-drill" || conv.source === "ar-bulk" || conv.source === "banking-bulk";

      const items = state.items.map(it => {
        if(it.id !== state.openedId) return it;

        if(isBatchSource){
          // Update counters only — the batch item itself stays in Needs Review
          if(conv.source === "ar-row" || conv.source === "ar-row-drill"){
            const ar = {...it.ar, rowCount: it.ar.rowCount - 1, convertedRows: (it.ar.convertedRows||0) + 1, validRows: Math.max(0, (it.ar.validRows||0)-1)};
            return {...it, ar};
          }
          if(conv.source === "banking-row" || conv.source === "banking-row-drill"){
            return {...it, banking: {...it.banking, txnCount: it.banking.txnCount - 1}};
          }
          return it;
        }

        // Whole-item conversion (Bill→*, JV→*)
        const sourceType =
          (it.route === "AP") ? "Bill" :
          (it.route === "AR") ? "Invoice" :
          (it.route === "Banking") ? "Statement" : "Journal Voucher";
        const sourceId = it.bill?.voucherNo || it.id;

        return {...it,
          status: "done",
          route: newRouteByTarget[conv.target] || it.route,
          doneBy: "Sandeep Balaji",
          doneAt: Date.now(),
          lineage: {
            sourceType,
            sourceId,
            sourcePostedOn: new Date().toLocaleDateString("en-IN", {day:"2-digit", month:"short", year:"numeric"}),
            convertedTo: { type: conv.target === "JV" ? "Journal Voucher" : conv.target === "Bill" ? "Bill" : "Sales Invoice", id: newDestId, postedOn: new Date().toLocaleDateString("en-IN", {day:"2-digit", month:"short", year:"numeric"}), actor: "Sandeep B." },
            ...(action.resolved?.__reason ? {forceReason: action.resolved.__reason} : {})
          }
        };
      });

      const targetLabel = conv.target === "JV" ? "Journal Voucher" : conv.target === "Bill" ? "Bill" : "Sales Invoice";
      return {
        ...state,
        items,
        conversion: null,
        snackbar: { text: `Converted to ${targetLabel} · ${newDestId}`, canUndo: true }
      };
    }

    // ────────── Multi-user conflict ──────────
    case "simulateConflict": return {...state, conflictForId: action.id, conversion: state.conversion};
    case "refreshConflict": {
      // After "refresh and continue", clear conflict + clear the sim flag so user can proceed
      const items = state.items.map(it => it.id === action.id ? {...it, _conflictSim: false} : it);
      return {...state, items, conflictForId: null};
    }

    // ────────── Cross-type duplicate ──────────
    case "discardCrossDup": {
      const items = state.items.map(it => it.id === action.id ? {...it, status:"deleted", deletedBy:"Sandeep Balaji", deletedAt: Date.now()} : it);
      return {...state, items, openedId: null};
    }
    case "forceProcessCrossDup": {
      const items = state.items.map(it => it.id === action.id
        ? {...it, status:"needs-review", _forceReason: action.reason, crossDupOf: null}
        : it
      );
      return {...state, items};
    }

    // ────────── Reversal ──────────
    case "openReversal":  return {...state, reversalForId: action.id};
    case "closeReversal": return {...state, reversalForId: null};
    case "confirmReversal": {
      const items = state.items.map(it => {
        if(it.id !== state.reversalForId) return it;
        // Restore item to Needs Review, keep extended lineage
        const prevLineage = it.lineage;
        return {
          ...it,
          status: "needs-review",
          route: prevLineage?.sourceType === "Bill" ? "AP" : prevLineage?.sourceType === "Invoice" ? "AR" : it.route,
          lineage: prevLineage ? {...prevLineage, reversed: { id: (prevLineage.convertedTo.id || "")+"-REV", postedOn: new Date().toLocaleDateString("en-IN", {day:"2-digit", month:"short", year:"numeric"}), actor: "Sandeep B." }} : null
        };
      });
      return {...state, items, reversalForId: null, snackbar: { text: "Reversal posted · source restored to Needs Review", canUndo: false }};
    }

    case "forceStatus": {
      const items = state.items.map((it, i) => i === 0 ? {...it, status: action.value} : it);
      return {...state, items};
    }
    default: return state;
  }
}

const App = () => {
  const [state, dispatch] = React.useReducer(reducer, undefined, initialState);
  React.useEffect(() => { window.__dispatch = dispatch; }, [dispatch]);

  // Tiny toast helper for "this would happen in the live product" feedback
  const [toast, setToast] = React.useState(null);
  React.useEffect(() => {
    window.__toast = (msg) => {
      setToast(msg);
      window.clearTimeout(window.__toastT);
      window.__toastT = window.setTimeout(() => setToast(null), 2400);
    };
  }, []);

  // Sidebar collapsed state — session-persisted
  const [collapsed, setCollapsed] = React.useState(() => {
    try { return sessionStorage.getItem("sb-collapsed") === "1"; } catch(_){ return false; }
  });
  React.useEffect(() => {
    try { sessionStorage.setItem("sb-collapsed", collapsed ? "1" : "0"); } catch(_){}
  }, [collapsed]);

  const [t, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "density": "comfortable",
    "ai_threshold": 60,
    "force_state": "none",
    "accent": ["#465ed5", "#3146b0"]
  }/*EDITMODE-END*/);

  React.useEffect(() => { document.body.setAttribute("data-density", t.density); }, [t.density]);
  // The house brand is a pair — --brand carries the fill, --brand-deep the hover
  // and every text-on-white use. Setting one without the other splits them.
  React.useEffect(() => {
    const [fill, deep] = Array.isArray(t.accent) ? t.accent : [t.accent, t.accent];
    document.documentElement.style.setProperty("--brand", fill);
    document.documentElement.style.setProperty("--brand-deep", deep);
  }, [t.accent]);
  React.useEffect(() => { window.AI_THRESHOLD = t.ai_threshold; }, [t.ai_threshold]);
  React.useEffect(() => {
    if(t.force_state && t.force_state !== "none") dispatch({type:"forceStatus", value: t.force_state});
  }, [t.force_state]);

  const needsReviewCount = React.useMemo(() =>
    state.items.filter(it => tabMatches("needs", it)).length, [state.items]);

  const opened = state.openedId ? state.items.find(it => it.id === state.openedId) : null;
  const crumbs = opened ? ["Inbox", opened.file.name] : ["Inbox"];

  return (
    <div className="app">
      <Topbar crumbs={crumbs}/>
      <div className="app__shell">
        <Sidebar
          active={opened ? "inbox" : state.view}
          onNavigate={v => dispatch({type:"setView", value: v})}
          needsReviewCount={needsReviewCount}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(c => !c)}
        />
        <main className="app__main">
          {opened ? (
            <DetailShell state={state} dispatch={dispatch}/>
          ) : (
            state.view === "inbox" ? <InboxList state={state} dispatch={dispatch}/> : <PlaceholderView view={state.view}/>
          )}
          {/* Snackbar visible across the app */}
          {!opened && state.snackbar && <UndoSnackbar text={state.snackbar.text} onUndo={() => dispatch({type:"undoApprove"})} onDismiss={() => dispatch({type:"dismissSnack"})}/>}
        </main>
      </div>

      {/* Toast (live-product feedback for placeholder actions) */}
      {toast && <div className="toast">{toast}</div>}

      {/* Reversal panel — mounted at app root so it works from Done tab list */}
      {state.reversalForId && <ReversalPanel state={state} dispatch={dispatch}/>}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Density">
          <TweakRadio  label="Row density" value={t.density} options={[["comfortable","Comfortable"],["compact","Compact"]]} onChange={v=>setTweak("density", v)}/>
        </TweakSection>
        <TweakSection label="Theme">
          <TweakColor  label="Accent" value={t.accent} options={[["#465ed5","#3146b0"],["#2563eb","#1d4ed8"],["#7c3aed","#6025c9"],["#0f766e","#0b5c55"],["#b91c1c","#991616"]]} onChange={v=>setTweak("accent", v)}/>
        </TweakSection>
        <TweakSection label="Classifier">
          <TweakSlider label="Confidence threshold" unit="%" value={t.ai_threshold} min={20} max={90} step={5} onChange={v=>setTweak("ai_threshold", v)}/>
        </TweakSection>
        <TweakSection label="Force a state (top row)">
          <TweakSelect label="INB-2041 status" value={t.force_state} options={[["none","— don't force —"],["extracting","Extracting"],["retrying","Retrying"],["failed","Failed (scanned)"],["duplicate-hard","Duplicate (hard block)"],["duplicate-soft","Possible duplicate (soft)"],["low-confidence","Low confidence"],["needs-review","Needs Review"]]} onChange={v=>setTweak("force_state", v)}/>
        </TweakSection>
        <TweakSection label="Jump to demo state">
          <TweakButton label="Reset to empty state" onClick={()=>{ dispatch({type:"setShowEmpty", value:true}); dispatch({type:"closeDetail"}); }}/>
          <TweakButton label="Open Needs Review list" onClick={()=> dispatch({type:"setShowEmpty", value:false})}/>
          <TweakButton label="Open: standard AP bill (INB-2041)" onClick={()=> { dispatch({type:"setShowEmpty", value:false}); dispatch({type:"openDetail", id:"INB-2041"}); }}/>
          <TweakButton label="Open: AP low confidence (INB-2042)" onClick={()=> { dispatch({type:"setShowEmpty", value:false}); dispatch({type:"openDetail", id:"INB-2042"}); }}/>
          <TweakButton label="Open: ambiguous (INB-2047)"        onClick={()=> { dispatch({type:"setShowEmpty", value:false}); dispatch({type:"openDetail", id:"INB-2047"}); }}/>
          <TweakButton label="Open: AR Excel (INB-2044)"          onClick={()=> { dispatch({type:"setShowEmpty", value:false}); dispatch({type:"openDetail", id:"INB-2044"}); }}/>
          <TweakButton label="Open: AR Excel — recognised (INB-2045)" onClick={()=> { dispatch({type:"setShowEmpty", value:false}); dispatch({type:"openDetail", id:"INB-2045"}); }}/>
          <TweakButton label="Open: Banking statement (INB-2043)"  onClick={()=> { dispatch({type:"setShowEmpty", value:false}); dispatch({type:"openDetail", id:"INB-2043"}); }}/>
          <TweakButton label="Open: JV adjustment (INB-2046)"      onClick={()=> { dispatch({type:"setShowEmpty", value:false}); dispatch({type:"openDetail", id:"INB-2046"}); }}/>
          <TweakButton label="Open: Failed — scanned PDF (INB-2049)" onClick={()=> { dispatch({type:"setShowEmpty", value:false}); dispatch({type:"openDetail", id:"INB-2049"}); }}/>
          <TweakButton label="Open: Duplicate hard-block (INB-2051)" onClick={()=> { dispatch({type:"setShowEmpty", value:false}); dispatch({type:"openDetail", id:"INB-2051"}); }}/>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
};

const PlaceholderView = ({view}) => (
  <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:48}}>
    <div style={{maxWidth:480, textAlign:"center"}}>
      <div style={{fontSize:"var(--t-14)", color:"var(--text-muted)", marginBottom:6, textTransform:"capitalize"}}>{view}</div>
      <h2 style={{fontSize:"var(--t-28)", margin:"0 0 8px"}}>Outside scope of this prototype</h2>
      <p style={{color:"var(--text-muted)", lineHeight:"22px"}}>This prototype focuses on the new <strong>Inbox</strong> surface. The {view} screen would live here in the real product.</p>
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
