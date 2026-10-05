// Global shell — the house arrangement, carried from the Sync Queue and Bill
// Upload prototypes: one dark topbar across the full width, a white sidebar
// beneath it holding nav only.
//
// Brand, company switcher and user moved out of the sidebar and into the dark
// bar, which is where the other prototypes keep them. The breadcrumb rides in
// that same bar rather than in a second light strip below it — two stacked
// bars is a weight the house shell doesn't carry.

const Topbar = ({crumbs}) => (
  <header className="topbar" data-screen-label="Topbar">
    <div className="topbar__left">
      {/* The real lockup, carried from the Bill Upload prototype
          (assets/logo.png, exported from Karbon — AI Accountant). It is the
          white-on-dark variant, which is why it lives in the chrome bar and
          nowhere else. Mark and wordmark are one artwork — no separate text. */}
      <div className="brand">
        <img className="brand__logo" src="assets/logo.png" alt="AI Accountant"
             width="121" height="24"/>
      </div>

      <span className="topbar__div"/>

      <nav className="topbar__crumbs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Icon name="chev-r" size={12}/>}
            {i === crumbs.length - 1
              ? <strong title={c}>{c}</strong>
              : <span>{c}</span>}
          </React.Fragment>
        ))}
      </nav>
    </div>

    <div className="topbar__right">
      <button className="cosw__btn" title="Switch company">
        <span className="cosw__badge">SO</span>
        <span className="cosw__name">Shakunthalam Oil &amp; Refin…</span>
        <Icon name="chev-r" size={12}/>
      </button>
      <span className="topbar__div"/>
      <button className="topbar__link" title="Help"><Icon name="info" size={16}/></button>
      <button className="avatar" title="sandeep.balaji@…">SB</button>
    </div>
  </header>
);

const Sidebar = ({active, onNavigate, needsReviewCount, collapsed, onToggleCollapse}) => {
  const navMain = [
    { id: "dashboard", icon: "dashboard", label: "Dashboard" },
    { id: "inbox",     icon: "inbox",     label: "Inbox", badge: needsReviewCount },
    { id: "banking",   icon: "bank",      label: "Banking" },
    { id: "sales",     icon: "sales-cart",label: "Sales",       chevron: true },
    { id: "purchases", icon: "purchases", label: "Purchases",   chevron: true },
    { id: "accounting",icon: "accounting",label: "Accounting",  chevron: true },
    { id: "inventory", icon: "inventory", label: "Inventory",   chevron: true }
  ];
  const navSecondary = [
    { id: "gst",      icon: "gst",      label: "GST",      chevron: true },
    { id: "settings", icon: "settings", label: "Settings", chevron: true }
  ];

  const renderItem = (n) => (
    <button
      key={n.id}
      type="button"
      className="nav__item"
      aria-current={active === n.id ? "page" : undefined}
      onClick={() => onNavigate(n.id)}
      data-label={n.label}
    >
      <span className="ico ico-18"><Icon name={n.icon} size={18}/></span>
      <span className="nav__label">{n.label}</span>
      {!!n.badge && <span className="nav__badge">{n.badge}</span>}
      {n.chevron && <span className="ico ico--tail"><Icon name="chev-r" size={14}/></span>}
    </button>
  );

  return (
    <aside className={cls("sidebar", collapsed && "is-collapsed")} data-screen-label="Sidebar">
      <nav className="nav">
        {navMain.map(renderItem)}
        <div className="nav__divider"/>
        {navSecondary.map(renderItem)}
      </nav>

      <div className="sidebar__foot">
        <button
          className="collapse"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2"/>
            <line x1="9" y1="4" x2="9" y2="20"/>
            <polyline points="15 9 12 12 15 15"/>
          </svg>
        </button>
      </div>
    </aside>
  );
};

Object.assign(window, { Sidebar, Topbar });
