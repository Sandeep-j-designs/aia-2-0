// Shared SVG icons + utility helpers + small UI primitives.
// All icon paths sourced from the Lucide icon library (lucide.dev) — MIT.

const Icon = ({name, size=16, stroke=1.8, className=""}) => {
  const s = size; const sw = stroke;
  const props = {
    width:s, height:s, viewBox:"0 0 24 24",
    fill:"none", stroke:"currentColor",
    strokeWidth:sw, strokeLinecap:"round", strokeLinejoin:"round",
    className
  };
  switch(name){

    // ── Sidebar nav ────────────────────────────────────────────
    case "dashboard":     // lucide: layout-dashboard
      return <svg {...props}>
        <rect width="7" height="9" x="3" y="3" rx="1"/>
        <rect width="7" height="5" x="14" y="3" rx="1"/>
        <rect width="7" height="9" x="14" y="12" rx="1"/>
        <rect width="7" height="5" x="3" y="16" rx="1"/>
      </svg>;

    case "inbox":         // lucide: inbox
      return <svg {...props}>
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/>
      </svg>;

    case "bank":          // lucide: landmark
      return <svg {...props}>
        <line x1="3" x2="21" y1="22" y2="22"/>
        <line x1="6" x2="6" y1="18" y2="11"/>
        <line x1="10" x2="10" y1="18" y2="11"/>
        <line x1="14" x2="14" y1="18" y2="11"/>
        <line x1="18" x2="18" y1="18" y2="11"/>
        <polygon points="12 2 20 7 4 7"/>
      </svg>;

    case "sales-cart":    // lucide: shopping-cart
      return <svg {...props}>
        <circle cx="8" cy="21" r="1"/>
        <circle cx="19" cy="21" r="1"/>
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
      </svg>;

    case "purchases":     // lucide: shopping-bag
      return <svg {...props}>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
        <path d="M3 6h18"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>;

    case "accounting":    // lucide: calculator
      return <svg {...props}>
        <rect width="16" height="20" x="4" y="2" rx="2"/>
        <line x1="8" x2="16" y1="6" y2="6"/>
        <line x1="16" x2="16" y1="14" y2="18"/>
        <path d="M16 10h.01"/>
        <path d="M12 10h.01"/>
        <path d="M8 10h.01"/>
        <path d="M12 14h.01"/>
        <path d="M8 14h.01"/>
        <path d="M12 18h.01"/>
        <path d="M8 18h.01"/>
      </svg>;

    case "inventory":     // lucide: package
      return <svg {...props}>
        <path d="M16.5 9.4 7.55 4.24"/>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.29 7 12 12 20.71 7"/>
        <line x1="12" x2="12" y1="22" y2="12"/>
      </svg>;

    case "gst":           // lucide: percent
      return <svg {...props}>
        <line x1="19" x2="5" y1="5" y2="19"/>
        <circle cx="6.5" cy="6.5" r="2.5"/>
        <circle cx="17.5" cy="17.5" r="2.5"/>
      </svg>;

    case "settings":      // lucide: settings
      return <svg {...props}>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>;

    // ── Misc nav / module shortcuts (kept for legacy refs) ────
    case "wallet":        // lucide: wallet
      return <svg {...props}>
        <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4"/>
        <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
      </svg>;

    case "users":         // lucide: users
      return <svg {...props}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>;

    case "file-user":     // lucide: file-user
      return <svg {...props}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <circle cx="12" cy="14" r="2"/>
        <path d="M9 18a3 3 0 0 1 6 0"/>
      </svg>;

    case "building":      // lucide: building-2
      return <svg {...props}>
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
        <path d="M10 6h4"/>
        <path d="M10 10h4"/>
        <path d="M10 14h4"/>
        <path d="M10 18h4"/>
      </svg>;

    case "receipt":       // lucide: receipt
      return <svg {...props}>
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
        <path d="M12 17.5v-11"/>
      </svg>;

    case "ledger":        // lucide: book-open
      return <svg {...props}>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>;

    // ── UI ─────────────────────────────────────────────────────
    case "search":        // lucide: search
      return <svg {...props}>
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.3-4.3"/>
      </svg>;

    case "filter":        // lucide: filter
      return <svg {...props}>
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
      </svg>;

    case "upload":        // lucide: upload
      return <svg {...props}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" x2="12" y1="3" y2="15"/>
      </svg>;

    case "download":      // lucide: download
      return <svg {...props}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" x2="12" y1="15" y2="3"/>
      </svg>;

    case "envelope":      // lucide: mail
      return <svg {...props}>
        <rect width="20" height="16" x="2" y="4" rx="2"/>
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
      </svg>;

    case "phone":         // lucide: phone
      return <svg {...props}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/>
      </svg>;

    case "drive":         // lucide: hard-drive
      return <svg {...props}>
        <line x1="22" x2="2" y1="12" y2="12"/>
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
        <line x1="6" x2="6.01" y1="16" y2="16"/>
        <line x1="10" x2="10.01" y1="16" y2="16"/>
      </svg>;

    // ── Chevrons / arrows ──────────────────────────────────────
    case "chev-l":        return <svg {...props}><path d="m15 18-6-6 6-6"/></svg>;
    case "chev-r":        return <svg {...props}><path d="m9 18 6-6-6-6"/></svg>;
    case "chev-d":        return <svg {...props}><path d="m6 9 6 6 6-6"/></svg>;
    case "chev-u":        return <svg {...props}><path d="m18 15-6-6-6 6"/></svg>;
    case "back":          // lucide: arrow-left
      return <svg {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;

    // ── Affordances ────────────────────────────────────────────
    case "x":             return <svg {...props}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case "check":         return <svg {...props}><path d="M20 6 9 17l-5-5"/></svg>;
    case "minus":         return <svg {...props}><line x1="5" x2="19" y1="12" y2="12"/></svg>;
    case "plus":          return <svg {...props}><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>;

    case "trash":         // lucide: trash-2
      return <svg {...props}>
        <path d="M3 6h18"/>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        <line x1="10" x2="10" y1="11" y2="17"/>
        <line x1="14" x2="14" y1="11" y2="17"/>
      </svg>;

    case "edit":          // lucide: pencil
      return <svg {...props}>
        <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
        <path d="m15 5 4 4"/>
      </svg>;

    case "kebab":         // lucide: more-vertical
      return <svg {...props}>
        <circle cx="12" cy="12" r="1"/>
        <circle cx="12" cy="5" r="1"/>
        <circle cx="12" cy="19" r="1"/>
      </svg>;

    case "swap":          // lucide: arrow-left-right
      return <svg {...props}>
        <path d="M8 3 4 7l4 4"/>
        <path d="M4 7h16"/>
        <path d="m16 21 4-4-4-4"/>
        <path d="M20 17H4"/>
      </svg>;

    case "external":      // lucide: external-link
      return <svg {...props}>
        <path d="M15 3h6v6"/>
        <path d="M10 14 21 3"/>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      </svg>;

    case "refresh":       // lucide: refresh-cw
    case "rotate":        // alias
      return <svg {...props}>
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
      </svg>;

    // ── Pane / viewer ──────────────────────────────────────────
    case "expand":        // lucide: maximize-2
      return <svg {...props}>
        <polyline points="15 3 21 3 21 9"/>
        <polyline points="9 21 3 21 3 15"/>
        <line x1="21" x2="14" y1="3" y2="10"/>
        <line x1="3" x2="10" y1="21" y2="14"/>
      </svg>;

    case "shrink":        // lucide: minimize-2
      return <svg {...props}>
        <polyline points="4 14 10 14 10 20"/>
        <polyline points="20 10 14 10 14 4"/>
        <line x1="14" x2="21" y1="10" y2="3"/>
        <line x1="3" x2="10" y1="21" y2="14"/>
      </svg>;

    case "zoom-in":       // lucide: zoom-in
      return <svg {...props}>
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" x2="16.65" y1="21" y2="16.65"/>
        <line x1="11" x2="11" y1="8" y2="14"/>
        <line x1="8" x2="14" y1="11" y2="11"/>
      </svg>;

    case "zoom-out":      // lucide: zoom-out
      return <svg {...props}>
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" x2="16.65" y1="21" y2="16.65"/>
        <line x1="8" x2="14" y1="11" y2="11"/>
      </svg>;

    case "eye":           // lucide: eye
      return <svg {...props}>
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>;

    // ── File types ─────────────────────────────────────────────
    case "file":          // lucide: file
      return <svg {...props}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>;

    case "file-pdf":      // lucide: file-text — used for PDFs
      return <svg {...props}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" x2="8" y1="13" y2="13"/>
        <line x1="16" x2="8" y1="17" y2="17"/>
        <line x1="10" x2="8" y1="9" y2="9"/>
      </svg>;

    case "file-xls":      // lucide: file-spreadsheet
      return <svg {...props}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <path d="M8 13h2"/>
        <path d="M14 13h2"/>
        <path d="M8 17h2"/>
        <path d="M14 17h2"/>
      </svg>;

    // ── Status / feedback ──────────────────────────────────────
    case "alert-tri":     // lucide: alert-triangle
      return <svg {...props}>
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <line x1="12" x2="12" y1="9" y2="13"/>
        <line x1="12" x2="12.01" y1="17" y2="17"/>
      </svg>;

    case "info":          // lucide: info
      return <svg {...props}>
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" x2="12" y1="16" y2="12"/>
        <line x1="12" x2="12.01" y1="8" y2="8"/>
      </svg>;

    case "sparkle":       // lucide: sparkles
      return <svg {...props}>
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
        <path d="M20 3v4"/>
        <path d="M22 5h-4"/>
        <path d="M4 17v2"/>
        <path d="M5 18H3"/>
      </svg>;

    case "clock":         // lucide: clock
      return <svg {...props}>
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>;

    case "lock":          // lucide: lock
      return <svg {...props}>
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>;

    case "shield":        // lucide: shield
      return <svg {...props}>
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
      </svg>;

    case "save":          // lucide: save
      return <svg {...props}>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>;

    // ── Sidebar toggle: lucide: panel-left-close ──────────────
    case "sidebar-toggle":
      return <svg {...props}>
        <rect width="18" height="18" x="3" y="3" rx="2"/>
        <path d="M9 3v18"/>
        <path d="m16 15-3-3 3-3"/>
      </svg>;

    // ── Default fallback ──────────────────────────────────────
    default:              return <svg {...props}><circle cx="12" cy="12" r="10"/></svg>;
  }
};

// --- helpers
const fmtINR = (n) => {
  if(n==null) return "—";
  if(Math.abs(n) >= 10000000) return "₹ " + (n/10000000).toFixed(2) + " Cr";
  if(Math.abs(n) >= 100000)   return "₹ " + (n/100000).toFixed(2) + " L";
  return "₹ " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const fmtINRplain = (n) => (n==null) ? "—" : "₹ " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ago = (ts) => {
  const diff = (Date.now() - ts)/1000;
  if(diff < 60)       return Math.floor(diff)+"s ago";
  if(diff < 3600)     return Math.floor(diff/60)+"m ago";
  if(diff < 86400)    return Math.floor(diff/3600)+"h ago";
  if(diff < 86400*7)  return Math.floor(diff/86400)+"d ago";
  return new Date(ts).toLocaleDateString("en-IN", { day:"2-digit", month:"short" });
};
const absDate = (ts) => new Date(ts).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"2-digit", hour:"2-digit", minute:"2-digit" });

const cls = (...xs) => xs.filter(Boolean).join(" ");

// Status display
const STATUS_DISPLAY = {
  "needs-review":    { label: "Needs Review",   pill: "pill--info" },
  "extracting":      { label: "Extracting…",    pill: "pill--shimmer" },
  "retrying":        { label: "Retrying",       pill: "pill--warn" },
  "failed":          { label: "Failed",         pill: "pill--danger" },
  "duplicate-hard":  { label: "Duplicate",      pill: "pill--danger" },
  "duplicate-soft":  { label: "Possible dup.",  pill: "pill--warn" },
  "duplicate-cross-type":  { label: "Cross-type duplicate",  pill: "pill--danger" },
  "low-confidence":  { label: "Low confidence", pill: "pill--warn" },
  "done":            { label: "Done",           pill: "pill--success" },
  "approved":        { label: "Done",           pill: "pill--success" },
  "deleted":         { label: "Deleted",        pill: "pill--neutral" },
  "long-running":    { label: "Processing",     pill: "pill--info" }
};

// Channel pill
const ChannelPill = ({channel}) => {
  const meta = window.SEED.CHANNELS[channel] || window.SEED.CHANNELS.upload;
  return (
    <span className={cls("chan", meta.cls)}>
      <Icon name={meta.icon} size={11} stroke={2} />
      {meta.label}
    </span>
  );
};

// Route pill (in table)
const RoutePill = ({route}) => {
  if(!route) return <span className="pill pill--neutral"><span className="pill__dot"/>Unclassified</span>;
  const meta = window.SEED.ROUTES[route];
  const tones = { AP: "pill--info", AR: "pill--info", Banking: "pill--soft", JV: "pill--soft" };
  return (
    <span className={cls("pill", tones[route] || "pill--info")}>
      <Icon name={meta.icon} size={11} stroke={2} />
      {meta.short}
    </span>
  );
};

// Status pill with optional aged chip
const StatusPill = ({status, aged}) => {
  const meta = STATUS_DISPLAY[status] || { label: status, pill: "pill--neutral" };
  return (
    <span style={{display:"inline-flex", gap:6, alignItems:"center"}}>
      <span className={cls("pill", meta.pill)}>
        {status==="extracting" && <span className="spin"/>}
        {meta.label}
      </span>
      {aged && <span className="pill pill--warn" title="In queue 7+ days">7d</span>}
    </span>
  );
};

// Checkbox
const Checkbox = ({checked, indeterminate, onChange}) => {
  return (
    <span
      className={cls("checkbox", (checked || indeterminate) && (indeterminate ? "is-indeterminate" : "is-checked"))}
      onClick={(e) => { e.stopPropagation(); onChange && onChange(!checked); }}
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : !!checked}
    >
      {checked && !indeterminate && <Icon name="check" size={12} stroke={3}/>}
      {indeterminate && <Icon name="minus" size={12} stroke={3}/>}
    </span>
  );
};

// File-type icon
const FileIcon = ({ext}) => {
  const color = ext === "xlsx" ? "#047857" : "#dc2626";
  return (
    <span style={{display:"inline-flex", alignItems:"center", justifyContent:"center", width:28, height:28, background:"#fff", border:"1px solid var(--stroke)", borderRadius:6, color}}>
      <Icon name={ext === "xlsx" ? "file-xls" : "file-pdf"} size={16} stroke={1.5}/>
    </span>
  );
};

// Confidence chip
const Confidence = ({conf}) => {
  if(conf == null) return null;
  const tone = conf >= 0.8 ? "conf--high" : conf >= 0.6 ? "conf--med" : "conf--low";
  const label = conf >= 0.8 ? "High confidence" : conf >= 0.6 ? "Medium confidence" : "Low confidence";
  return <span className={cls("conf", tone)}><Icon name="sparkle" size={11} stroke={2}/>{label} · {Math.round(conf*100)}%</span>;
};

Object.assign(window, { Icon, fmtINR, fmtINRplain, ago, absDate, cls, STATUS_DISPLAY, ChannelPill, RoutePill, StatusPill, Checkbox, FileIcon, Confidence });
