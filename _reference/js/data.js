// Seed inbox items for the Unified Inbox prototype.
// Spans all 4 AI routes, all states, plus ambiguous + failed + AR-Excel batch.

window.SEED = (function(){

  const now = Date.now();
  const m = (n) => now - n*60*1000;        // n minutes ago
  const h = (n) => now - n*60*60*1000;     // n hours ago
  const d = (n) => now - n*24*60*60*1000;  // n days ago

  const items = [
    // 1. Standard AP — high confidence, ready to confirm
    {
      id: "INB-2041",
      file: { name: "Dell India Pvt Ltd · INV-1182.pdf", size: "412 KB", ext: "pdf" },
      source: { channel: "email",    sender: "accounts@dellindia.com",     subject: "Invoice INV-1182 from Dell India" },
      vendor: "Dell India Pvt Ltd",
      voucherType: "Purchase",
      route: "AP",
      ai: { confidence: 0.94, rationale: "Looks like a vendor invoice — supplier GSTIN + 'Tax Invoice' header detected." },
      amount: 76450.00,
      receivedAt: h(2),
      status: "needs-review",
      bill: {
        voucherNo: "PUR/25-26/041",
        supplierInvoiceNo: "INV-1182",
        billDate: "12 May 2026",
        dueDate: "11 Jun 2026",
        gstReg: "Bangalore HQ · 27AAACC1206D1ZY",
        costCentre: "Engineering",
        flagged: [],
        items: [
          { desc: "i7 Workstation, 32GB RAM, 1TB SSD (x2)", ledger: "Fixed Assets - Hardware", amount: 64790 },
          { desc: "Onsite warranty extension — 24 months",   ledger: "Repairs & Maintenance",   amount: 11660 }
        ],
        taxes: { cgst: 5817.6, sgst: 5817.6 },
        subTotal: 64790,
        grandTotal: 76425.20
      }
    },

    // 2. AP — low confidence + flagged fields
    {
      id: "INB-2042",
      file: { name: "AWS-services-may-2026.pdf", size: "1.2 MB", ext: "pdf" },
      source: { channel: "email", sender: "billing@aws.amazon.com", subject: "Your AWS invoice — May 2026" },
      vendor: "Amazon Web Services India",
      voucherType: "Purchase",
      route: "AP",
      ai: { confidence: 0.62, rationale: "Cloud-services bill — likely AP, but vendor not found in masters." },
      amount: 218904.10,
      receivedAt: h(5),
      status: "needs-review",
      bill: {
        voucherNo: "PUR/25-26/042",
        supplierInvoiceNo: "AWS-INV-MAY26-0042",
        billDate: "06 May 2026",
        dueDate: "06 Jun 2026",
        gstReg: "Bangalore HQ · 27AAACC1206D1ZY",
        costCentre: null,
        vendorMissing: true,
        flagged: ["supplierInvoiceNo", "costCentre", "vendor"],
        items: [
          { desc: "Compute (EC2) — c6i / m7i family",       ledger: "Cloud Services",     amount: 142300 },
          { desc: "Storage (S3, EBS)",                       ledger: "Cloud Services",     amount: 38450 },
          { desc: "Data transfer & misc",                    ledger: "Cloud Services",     amount: 24960 }
        ],
        taxes: { cgst: 0, igst: 13194.10 },
        subTotal: 205710,
        grandTotal: 218904.10
      }
    },

    // 3. Banking — long-running, low conf, dropdowns required
    {
      id: "INB-2043",
      file: { name: "HDFC-50100123456-Apr2026.pdf", size: "624 KB", ext: "pdf" },
      source: { channel: "upload", sender: "Sandeep B.", subject: "—" },
      vendor: "—",
      voucherType: "Receipt / Payment",
      route: "Banking",
      ai: { confidence: 0.71, rationale: "PDF matches HDFC statement layout (acct ending 3456). Date range Apr 1 – Apr 30." },
      amount: 0,
      receivedAt: h(8),
      status: "needs-review",
      banking: {
        txnCount: 47,
        dateRange: "01 Apr 2026 – 30 Apr 2026",
        opening: 482310.00,
        closing: 612482.45,
        sample: [
          { date: "01-Apr-26", narration: "NEFT Cr · ACME PVT LTD",     dr: null,     cr: 125000.00 },
          { date: "03-Apr-26", narration: "POS · SPENCER RETAIL",        dr: 4280.00,  cr: null     },
          { date: "07-Apr-26", narration: "UPI Dr · STARBUCKS COFFEE",   dr: 540.00,   cr: null     },
          { date: "10-Apr-26", narration: "IMPS Cr · Tally Solutions",   dr: null,     cr: 18000.00 },
          { date: "15-Apr-26", narration: "Salary Dr · APR SAL BATCH",   dr: 412000.00,cr: null     }
        ]
      }
    },

    // 4. AR Excel — schema-miss, lots of rows
    {
      id: "INB-2044",
      file: { name: "Theta-Hotels — April-sales.xlsx", size: "184 KB", ext: "xlsx" },
      source: { channel: "email", sender: "ar@thetahotels.co.in", subject: "April collections — sales sheet" },
      vendor: "—",
      customer: "Theta Hotels Pvt Ltd",
      voucherType: "Sales",
      route: "AR",
      ai: { confidence: 0.81, rationale: "Excel workbook — 1 sheet, ~1,000 rows. Headers don't match a saved template." },
      amount: 14728300.00,
      receivedAt: h(11),
      status: "needs-review",
      ar: {
        rowCount: 1000,
        sheetName: "April-Sales-2026",
        headers: ["Invoice No","Guest Name","Pax","Source","Arrival","Dept","Nights","Room","Room - 2 bedrooms","Vouc. No","Rate Type","Early Check In (Rs)","Room Rate (Inclusive of Tax)","CGST (Rs)","SGST (Rs)","Commission (Rs)","Total Amount"],
        sheets: [
          { name: "April-Sales-2026", rows: 1000 },
          { name: "Summary",           rows: 34   },
          { name: "Notes",             rows: 12   }
        ],
        template: null,
        rows: makeArRows(28),
        validRows: 982,
        invalidRows: 18
      }
    },

    // 5. AR Excel — schema-match (auto-recognised template)
    {
      id: "INB-2045",
      file: { name: "Theta-Hotels — May-sales.xlsx", size: "192 KB", ext: "xlsx" },
      source: { channel: "email", sender: "ar@thetahotels.co.in", subject: "May collections — same template" },
      customer: "Theta Hotels Pvt Ltd",
      voucherType: "Sales",
      route: "AR",
      ai: { confidence: 0.97, rationale: "Recognised template 'Theta Hotels — Monthly Sales' from prior upload." },
      amount: 16240900.00,
      receivedAt: h(14),
      status: "needs-review",
      ar: {
        rowCount: 1100,
        sheetName: "May-Sales-2026",
        template: "Theta Hotels — Monthly Sales",
        validRows: 1100,
        invalidRows: 0,
        rows: makeArRows(24)
      }
    },

    // 6. JV — adjustment entry
    {
      id: "INB-2046",
      file: { name: "Depreciation-adjustment-Q1.pdf", size: "98 KB", ext: "pdf" },
      source: { channel: "upload", sender: "Sandeep B.", subject: "—" },
      vendor: "—",
      voucherType: "Journal",
      route: "JV",
      ai: { confidence: 0.88, rationale: "Internal adjustment note — debit/credit entries, no vendor." },
      amount: 184500.00,
      receivedAt: h(19),
      status: "needs-review",
      jv: {
        narration: "Quarterly depreciation entry — Q1 FY26 — straight-line, hardware pool",
        lines: [
          { ledger: "Depreciation — Hardware",          dr: 184500, cr: null  },
          { ledger: "Accumulated Depreciation — Hw",    dr: null,   cr: 184500 }
        ]
      }
    },

    // 7. Ambiguous — could be AP or JV, NO pre-selection (disambiguation fork)
    {
      id: "INB-2047",
      file: { name: "Petty-cash-recon-Apr.pdf", size: "210 KB", ext: "pdf" },
      source: { channel: "whatsapp", sender: "+91 98XXX XXX42 (Priya R.)", subject: "—" },
      vendor: "Multiple",
      voucherType: "—",
      route: null,
      ai: { confidence: 0.41, rationale: "Mixed document — partly looks like vendor receipts, partly like an internal reconciliation." },
      amount: 18420.00,
      receivedAt: h(23),
      status: "needs-review",
      ambiguous: true,
      candidates: [
        { route: "AP", evidence: "Page 1 has 4 small vendor receipts — fuel, courier, stationery, snacks." },
        { route: "JV", evidence: "Page 2 has a typed adjustment table balancing petty-cash float." }
      ]
    },

    // 8. Extracting (in-flight)
    {
      id: "INB-2048",
      file: { name: "Acme-Corp — May-bill.pdf", size: "388 KB", ext: "pdf" },
      source: { channel: "email", sender: "billing@acmecorp.in", subject: "May invoice" },
      vendor: "Acme Corp Pvt Ltd",
      voucherType: "Purchase",
      route: "AP",
      ai: { confidence: null, rationale: null },
      amount: null,
      receivedAt: m(2),
      status: "extracting"
    },

    // 9. Failed — scanned-PDF (OCR failed)
    {
      id: "INB-2049",
      file: { name: "Vendor-Quote-Scan.pdf", size: "2.8 MB", ext: "pdf" },
      source: { channel: "email", sender: "ops@kappa-tech.co.in", subject: "Q for warehouse rack — please process" },
      vendor: "Kappa Technologies",
      voucherType: "Purchase",
      route: "AP",
      ai: { confidence: null, rationale: null },
      amount: null,
      receivedAt: h(3),
      status: "failed",
      failure: {
        type: "scanned-pdf",
        title: "Scanned PDF — text not extractable",
        body: "This appears to be a phone-camera scan. Our OCR could read partial text but couldn't reliably identify line items, GST or amount."
      }
    },

    // 10. Failed — password-protected
    {
      id: "INB-2050",
      file: { name: "Iota-Solutions-Apr.pdf", size: "94 KB", ext: "pdf" },
      source: { channel: "email", sender: "ar@iotasol.in", subject: "Invoice — protected" },
      vendor: "Iota Solutions",
      voucherType: "Purchase",
      route: "AP",
      ai: { confidence: null, rationale: null },
      amount: null,
      receivedAt: h(6),
      status: "failed",
      failure: {
        type: "password-protected",
        title: "Password-protected PDF",
        body: "We couldn't open this file. Ask the vendor to share an unlocked copy, or paste the password and we'll retry."
      }
    },

    // 11. Duplicate hard-block — same vendor + invoice no exists
    {
      id: "INB-2051",
      file: { name: "Dell India Pvt Ltd · INV-1182 (1).pdf", size: "412 KB", ext: "pdf" },
      source: { channel: "drive", sender: "Shared drive · auto-import", subject: "—" },
      vendor: "Dell India Pvt Ltd",
      voucherType: "Purchase",
      route: "AP",
      ai: { confidence: 0.94, rationale: "Same as INB-2041 — vendor + invoice no match an existing bill." },
      amount: 76425.20,
      receivedAt: h(1),
      status: "duplicate-hard",
      duplicateOf: "INB-2041",
      bill: {
        voucherNo: "PUR/25-26/041",
        supplierInvoiceNo: "INV-1182",
        billDate: "12 May 2026",
        dueDate: "11 Jun 2026",
        gstReg: "Bangalore HQ · 27AAACC1206D1ZY",
        costCentre: "Engineering",
        flagged: [],
        items: [
          { desc: "i7 Workstation, 32GB RAM, 1TB SSD (x2)", ledger: "Fixed Assets - Hardware", amount: 64790 }
        ],
        taxes: { cgst: 5817.6, sgst: 5817.6 },
        subTotal: 64790,
        grandTotal: 76425.20
      }
    },

    // 12. Aged — sitting > 7 days, soft-warn duplicate
    {
      id: "INB-2052",
      file: { name: "Sigma-Pkg-Mar26.pdf", size: "320 KB", ext: "pdf" },
      source: { channel: "email", sender: "ap@sigmapkg.co.in", subject: "Invoice for March packaging" },
      vendor: "Sigma Packaging Co",
      voucherType: "Purchase",
      route: "AP",
      ai: { confidence: 0.84, rationale: "Vendor bill, identical amount as another bill 6 weeks ago — possible duplicate, soft warning." },
      amount: 42100.00,
      receivedAt: d(9),
      status: "duplicate-soft",
      aged: true,
      bill: {
        voucherNo: "PUR/25-26/038",
        supplierInvoiceNo: "SIG/26/0421",
        billDate: "22 Mar 2026",
        dueDate: "21 Apr 2026",
        gstReg: "Bangalore HQ · 27AAACC1206D1ZY",
        costCentre: "Operations",
        flagged: ["dueDate"],
        items: [
          { desc: "Corrugated boxes — 250 nos",   ledger: "Packing Material", amount: 28200 },
          { desc: "Bubble wrap rolls — 8 nos",     ledger: "Packing Material", amount: 6480 }
        ],
        taxes: { cgst: 1564.20, sgst: 1564.20 },
        subTotal: 34680,
        grandTotal: 42100.00
      }
    },

    // 13. Retrying
    {
      id: "INB-2053",
      file: { name: "Lambda-Innov-Apr.pdf", size: "228 KB", ext: "pdf" },
      source: { channel: "email", sender: "ap@lambda-innov.in", subject: "Monthly invoice" },
      vendor: "Lambda Innovations",
      voucherType: "Purchase",
      route: "AP",
      ai: { confidence: null, rationale: null },
      amount: null,
      receivedAt: m(8),
      status: "retrying",
      retryAttempt: 2,
      retryMax: 3
    },

    // ---------- Bulk-upload batch (10 bills uploaded together) ----------
    // 3 Needs Review, 4 Extracting, 1 Failed (per spec) + 2 already-Needs-Review filler
    {
      id: "BULK-001",
      file: { name: "Orion-Tech — INV-9911.pdf", size: "388 KB", ext: "pdf" },
      source: { channel: "upload", sender: "Sandeep B. · batch upload (10 files)", subject: "—" },
      vendor: "Orion Technologies",
      voucherType: "Purchase",
      route: "AP",
      ai: { confidence: 0.91, rationale: "—" },
      amount: 28400.00,
      receivedAt: m(4),
      status: "needs-review",
      _batchTag: "BATCH-Apr26",
      bill: {
        voucherNo: "PUR/25-26/051", supplierInvoiceNo: "INV-9911",
        billDate: "14 May 2026", dueDate: "13 Jun 2026",
        gstReg: "Bangalore HQ · 27AAACC1206D1ZY", costCentre: "Sales",
        flagged: [],
        items: [{ desc: "Annual marketing licence (CRM)", ledger: "Software Subscriptions", amount: 24067.80 }],
        taxes: { cgst: 2166.10, sgst: 2166.10 },
        subTotal: 24067.80, grandTotal: 28400.00
      }
    },
    {
      id: "BULK-002",
      file: { name: "Nova-Logistics — May-freight.pdf", size: "412 KB", ext: "pdf" },
      source: { channel: "upload", sender: "Sandeep B. · batch upload (10 files)", subject: "—" },
      vendor: "Nova Logistics",
      voucherType: "Purchase",
      route: "AP",
      ai: { confidence: 0.74, rationale: "Freight bill — vendor matched in masters." },
      amount: 54820.00,
      receivedAt: m(4),
      status: "needs-review",
      _batchTag: "BATCH-Apr26",
      bill: {
        voucherNo: "PUR/25-26/052", supplierInvoiceNo: "NL-2826",
        billDate: "11 May 2026", dueDate: "10 Jun 2026",
        gstReg: "Bangalore HQ · 27AAACC1206D1ZY", costCentre: "Operations",
        flagged: ["dueDate"],
        items: [
          { desc: "Hyderabad → Bangalore — 18 consignments", ledger: "Freight Outward", amount: 31000 },
          { desc: "Chennai → Bangalore — 12 consignments",    ledger: "Freight Outward", amount: 15500 }
        ],
        taxes: { cgst: 4180, sgst: 4180 },
        subTotal: 46500, grandTotal: 54820.00
      }
    },
    {
      id: "BULK-003",
      file: { name: "Pulse-Media — Q1 retainer.pdf", size: "276 KB", ext: "pdf" },
      source: { channel: "upload", sender: "Sandeep B. · batch upload (10 files)", subject: "—" },
      vendor: "Pulse Media Group",
      voucherType: "Purchase",
      route: "AP",
      ai: { confidence: 0.86, rationale: "—" },
      amount: 124000.00,
      receivedAt: m(4),
      status: "needs-review",
      _batchTag: "BATCH-Apr26",
      bill: {
        voucherNo: "PUR/25-26/053", supplierInvoiceNo: "PM-Q1-2026-018",
        billDate: "01 Apr 2026", dueDate: "30 Apr 2026",
        gstReg: "Bangalore HQ · 27AAACC1206D1ZY", costCentre: "Marketing",
        flagged: [],
        items: [{ desc: "Q1 FY26 marketing retainer", ledger: "Advertising & Promotion", amount: 105084.75 }],
        taxes: { cgst: 9457.62, sgst: 9457.62 },
        subTotal: 105084.75, grandTotal: 124000.00
      }
    },
    // 4 Extracting
    {
      id: "BULK-004",
      file: { name: "Nimbus-Software — May.pdf", size: "344 KB", ext: "pdf" },
      source: { channel: "upload", sender: "Sandeep B. · batch upload (10 files)", subject: "—" },
      vendor: "—", voucherType: "—", route: "AP",
      ai: { confidence: null, rationale: null },
      amount: null, receivedAt: m(3), status: "extracting", _batchTag: "BATCH-Apr26"
    },
    {
      id: "BULK-005",
      file: { name: "Ridge-Hardware — INV-2284.pdf", size: "510 KB", ext: "pdf" },
      source: { channel: "upload", sender: "Sandeep B. · batch upload (10 files)", subject: "—" },
      vendor: "—", voucherType: "—", route: "AP",
      ai: { confidence: null, rationale: null },
      amount: null, receivedAt: m(3), status: "extracting", _batchTag: "BATCH-Apr26"
    },
    {
      id: "BULK-006",
      file: { name: "Aura-Office-Supplies — Apr.pdf", size: "180 KB", ext: "pdf" },
      source: { channel: "upload", sender: "Sandeep B. · batch upload (10 files)", subject: "—" },
      vendor: "—", voucherType: "—", route: "AP",
      ai: { confidence: null, rationale: null },
      amount: null, receivedAt: m(3), status: "extracting", _batchTag: "BATCH-Apr26"
    },
    {
      id: "BULK-007",
      file: { name: "Vega-Catering — May 9.pdf", size: "92 KB", ext: "pdf" },
      source: { channel: "upload", sender: "Sandeep B. · batch upload (10 files)", subject: "—" },
      vendor: "—", voucherType: "—", route: "AP",
      ai: { confidence: null, rationale: null },
      amount: null, receivedAt: m(3), status: "extracting", _batchTag: "BATCH-Apr26"
    },
    // 1 Failed in the batch
    {
      id: "BULK-008",
      file: { name: "Tundra-Coolers — quote-scan.pdf", size: "3.2 MB", ext: "pdf" },
      source: { channel: "upload", sender: "Sandeep B. · batch upload (10 files)", subject: "—" },
      vendor: "Tundra Coolers Ltd", voucherType: "Purchase", route: "AP",
      ai: { confidence: null, rationale: null },
      amount: null, receivedAt: m(3), status: "failed", _batchTag: "BATCH-Apr26",
      failure: { type: "scanned-pdf", title: "Scanned PDF — text not extractable", body: "Phone-camera scan — couldn't reliably read line items or totals." }
    },
    // 2 more Needs Review filler to reach 10 in the batch (so list shows 10 distinct rows)
    {
      id: "BULK-009",
      file: { name: "Vortex-Cleaning — May.pdf", size: "118 KB", ext: "pdf" },
      source: { channel: "upload", sender: "Sandeep B. · batch upload (10 files)", subject: "—" },
      vendor: "Vortex Cleaning Services",
      voucherType: "Purchase",
      route: "AP",
      ai: { confidence: 0.92, rationale: "—" },
      amount: 18450.00,
      receivedAt: m(3),
      status: "needs-review",
      _batchTag: "BATCH-Apr26",
      bill: {
        voucherNo: "PUR/25-26/054", supplierInvoiceNo: "VCS-1041",
        billDate: "01 May 2026", dueDate: "31 May 2026",
        gstReg: "Bangalore HQ · 27AAACC1206D1ZY", costCentre: "Facilities",
        flagged: [],
        items: [{ desc: "May office cleaning — full month", ledger: "Facilities Expense", amount: 15635.59 }],
        taxes: { cgst: 1407.20, sgst: 1407.20 },
        subTotal: 15635.59, grandTotal: 18450.00
      }
    },
    {
      id: "BULK-010",
      file: { name: "Cinder-Fuel — May 14.pdf", size: "224 KB", ext: "pdf" },
      source: { channel: "upload", sender: "Sandeep B. · batch upload (10 files)", subject: "—" },
      vendor: "Cinder Fuel Stations",
      voucherType: "Purchase",
      route: "AP",
      ai: { confidence: 0.77, rationale: "—" },
      amount: 9840.00,
      receivedAt: m(3),
      status: "needs-review",
      _batchTag: "BATCH-Apr26",
      bill: {
        voucherNo: "PUR/25-26/055", supplierInvoiceNo: "CFS-99412",
        billDate: "14 May 2026", dueDate: "13 Jun 2026",
        gstReg: "Bangalore HQ · 27AAACC1206D1ZY", costCentre: "Fleet",
        flagged: [],
        items: [{ desc: "Fleet fuel — Bangalore depot", ledger: "Vehicle Running Expense", amount: 8338.98 }],
        taxes: { cgst: 750.51, sgst: 750.51 },
        subTotal: 8338.98, grandTotal: 9840.00
      }
    },

    // 14. Done items (the Done tab — items that already went through)
    {
      id: "INB-2030",
      file: { name: "Zeta-Services-Apr.pdf", size: "172 KB", ext: "pdf" },
      source: { channel: "email", sender: "ar@zeta.co", subject: "—" },
      vendor: "Zeta Services LLP",
      voucherType: "Purchase",
      route: "AP",
      ai: { confidence: 0.91, rationale: "—" },
      amount: 12600.00,
      receivedAt: d(2),
      status: "done",
      doneBy: "Sandeep Balaji",
      doneAt: d(2),
      destination: "PUR/25-26/030"
    },
    {
      id: "INB-2031",
      file: { name: "April-collections.xlsx", size: "210 KB", ext: "xlsx" },
      source: { channel: "email", sender: "ar@thetahotels.co.in", subject: "—" },
      customer: "Theta Hotels Pvt Ltd",
      voucherType: "Sales",
      route: "AR",
      ai: { confidence: 0.96, rationale: "—" },
      amount: 14728300.00,
      receivedAt: d(4),
      status: "done",
      doneBy: "Sandeep Balaji",
      doneAt: d(4),
      destination: "Batch · 982 invoices"
    },

    // 15. Deleted
    {
      id: "INB-2020",
      file: { name: "Wrong-attachment.pdf", size: "44 KB", ext: "pdf" },
      source: { channel: "email", sender: "noreply@vendor.com", subject: "Re: order" },
      vendor: "—",
      voucherType: "—",
      route: "AP",
      ai: { confidence: 0.22, rationale: "Couldn't classify — looks like a delivery note, not a bill." },
      amount: null,
      receivedAt: d(3),
      status: "deleted",
      deletedBy: "Sandeep Balaji",
      deletedAt: d(3)
    },

    // ============================================================
    //  Conversion-system seed items
    // ============================================================

    // CONV-001 — Bill ready for Bill→Invoice (vendor NOT in Customer master)
    {
      id: "CONV-001",
      file: { name: "Pegasus-Logistics — INV-7702.pdf", size: "320 KB", ext: "pdf" },
      source: { channel: "email", sender: "ops@pegasus-log.in", subject: "Service invoice — May" },
      vendor: "Pegasus Logistics Pvt Ltd",
      voucherType: "Purchase",
      route: "AP",
      ai: { confidence: 0.92, rationale: "Vendor invoice." },
      amount: 88500.00,
      receivedAt: h(3),
      status: "needs-review",
      bill: {
        voucherNo: "PUR/25-26/061",
        supplierInvoiceNo: "PL-7702",
        billDate: "11 May 2026",
        dueDate:  "10 Jun 2026",
        gstReg: "Bangalore HQ · 27AAACC1206D1ZY",
        costCentre: "Operations",
        flagged: [],
        items: [
          { desc: "Inter-city freight — 22 consignments", ledger: "Freight Inward", amount: 75000 }
        ],
        taxes: { cgst: 6750, sgst: 6750 },
        subTotal: 75000, grandTotal: 88500
      },
      _convertHint: "bill-to-invoice"
    },

    // CONV-002 — JV ready for JV→Bill/Invoice (narration names a candidate party)
    {
      id: "CONV-002",
      file: { name: "Rebill-Rentyx-Mar.pdf", size: "164 KB", ext: "pdf" },
      source: { channel: "upload", sender: "Sandeep B.", subject: "—" },
      vendor: "—",
      voucherType: "Journal",
      route: "JV",
      ai: { confidence: 0.95, rationale: "Internal adjustment note." },
      amount: 41200.00,
      receivedAt: h(6),
      status: "needs-review",
      jv: {
        narration: "Re-bill: pass-through of warehouse rent paid on behalf of Rentyx Stores Pvt Ltd · Mar 2026 — should be raised as a sales invoice on Rentyx.",
        lines: [
          { ledger: "Rentyx Stores Pvt Ltd (Receivable)", dr: 41200, cr: null  },
          { ledger: "Warehouse Rent — Pass-through",       dr: null,  cr: 41200 }
        ]
      },
      _convertHint: "jv-to-invoice"
    },

    // CONV-003 — Cross-type duplicate: Bill whose content-hash matches a posted JV
    {
      id: "CONV-003",
      file: { name: "Adjustment-rebill-Mar.pdf", size: "188 KB", ext: "pdf" },
      source: { channel: "email", sender: "finance@partner.in", subject: "—" },
      vendor: "Internal — Adjustment",
      voucherType: "Purchase",
      route: "AP",
      ai: { confidence: 0.84, rationale: "Looks like a bill but content hashes match a posted JV." },
      amount: 41200.00,
      receivedAt: h(4),
      status: "duplicate-cross-type",
      crossDupOf: { id: "JV/25-26/074", type: "Journal Voucher", postedBy: "Sandeep B.", postedOn: "12 May 2026", amount: 41200 }
    },

    // CONV-004 — AR partial re-upload (clone of INB-2044, dedup-checked at row level)
    {
      id: "CONV-004",
      file: { name: "Theta-Hotels — April-sales (re-upload).xlsx", size: "184 KB", ext: "xlsx" },
      source: { channel: "email", sender: "ar@thetahotels.co.in", subject: "April sales — please re-process" },
      customer: "Theta Hotels Pvt Ltd",
      voucherType: "Sales",
      route: "AR",
      ai: { confidence: 0.97, rationale: "Template recognised — Theta Hotels monthly batch." },
      amount: 14728300.00,
      receivedAt: h(2),
      status: "needs-review",
      ar: {
        rowCount: 1000,
        sheetName: "April-Sales-2026",
        template: "Theta Hotels — Monthly Sales",
        headers: ["Invoice No","Guest Name","Pax","Source","Arrival","Dept","Nights","Room","Vouc. No","Rate Type","Room Rate","CGST","SGST","Commission","Total Amount"],
        rows: makeArRowsWithDedup(36),
        validRows:    972,
        invalidRows:  4,
        skippedRows:  21,
        convertedRows: 3
      },
      _isReupload: true
    },

    // CONV-005 — Multi-user conflict scenario
    {
      id: "CONV-005",
      file: { name: "Crescent-Foods — INV-5510.pdf", size: "224 KB", ext: "pdf" },
      source: { channel: "email", sender: "ar@crescent.in", subject: "—" },
      vendor: "Crescent Foods Pvt Ltd",
      voucherType: "Purchase",
      route: "AP",
      ai: { confidence: 0.89, rationale: "—" },
      amount: 33420.00,
      receivedAt: h(1),
      status: "needs-review",
      bill: {
        voucherNo: "PUR/25-26/062",
        supplierInvoiceNo: "CF-5510",
        billDate: "12 May 2026", dueDate: "11 Jun 2026",
        gstReg: "Bangalore HQ · 27AAACC1206D1ZY",
        costCentre: "Pantry",
        flagged: [],
        items: [{ desc: "Office pantry supplies — May", ledger: "Office Expenses", amount: 28322 }],
        taxes: { cgst: 2549, sgst: 2549 },
        subTotal: 28322, grandTotal: 33420
      },
      _conflictSim: true
    },

    // DONE-001 — Bill→JV (already converted; for Reversal demo)
    {
      id: "DONE-001",
      file: { name: "Stellar-Refunds — credit-note.pdf", size: "142 KB", ext: "pdf" },
      source: { channel: "email", sender: "ar@stellar.co.in", subject: "Credit note" },
      vendor: "Stellar Refunds Pvt Ltd",
      voucherType: "Purchase",
      route: "JV",
      ai: { confidence: 0.91, rationale: "—" },
      amount: 18900.00,
      receivedAt: d(1),
      status: "done",
      doneBy: "Sandeep Balaji",
      doneAt: d(1),
      lineage: {
        sourceType: "Bill",
        sourceId:   "PUR/25-26/047",
        sourcePostedOn: "21 May 2026",
        convertedTo: { type: "Journal Voucher", id: "JV/25-26/088", postedOn: "21 May 2026", actor: "Sandeep B." }
      }
    }
  ];

  function makeArRows(n){
    const customers = ["Anne Corp","Beta Inc","Gamma LC","Delta Co","Epsilon Ltd","Zeta Group","Eta Pvt","Theta Associates","Iota Solutions","Kappa Technologies","Lambda Innov."];
    const states = ["KA","MH","TN","DL","GJ","UP","WB","RJ","KL","HR","PB"];
    const issues = [
      null, null, null, null,                                    // valid (mostly)
      "missing-gstin", "invalid-state", "missing-data",
      null, null, "multiple-issues", null, null
    ];
    const out = [];
    for(let i=0; i<n; i++){
      const c = customers[i % customers.length];
      const s = states[i % states.length];
      const amt = 8000 + Math.round(Math.random()*60000);
      out.push({
        invoiceDate: `${String((i%28)+1).padStart(2,"0")}/05/2026`,
        invoiceNo:   `INV-${2200+i}`,
        customer:    c,
        voucherType: "Sales 18%",
        gstin:       (i%9===2) ? "—" : `27AAAAA${(1000+i)}D1ZY`,
        state:       s,
        ledger:      "SODH GROUP",
        amount:      amt,
        issue:       issues[i % issues.length]
      });
    }
    return out;
  }

  function makeArRowsWithDedup(n){
    // Same shape as makeArRows but with `dedup` markings so the AR grid
    // can render Skipped + Converted states per row.
    const customers = ["Anne Corp","Beta Inc","Gamma LC","Delta Co","Epsilon Ltd","Zeta Group","Eta Pvt","Theta Associates","Iota Solutions","Kappa Technologies","Lambda Innov.","Sigma Ltd","Tau Foods","Phi Logistics"];
    const states = ["KA","MH","TN","DL","GJ","UP","WB","RJ","KL","HR","PB"];
    const issues = [null, null, null, null, "missing-gstin", "invalid-state", "missing-data", null, null, null];
    // dedup markings — distributed across the visible rows
    const dedupPattern = [
      null, null,
      { kind: "skipped-posted",    ref: "INV-S/25-26/441" },
      null, null, null,
      { kind: "skipped-converted", ref: "JV/25-26/091"    },
      null,
      { kind: "skipped-pending",   ref: "INB-2044"        },
      null, null,
      { kind: "converted",         ref: "JV/25-26/094"    },
      null, null,
      { kind: "skipped-posted",    ref: "INV-S/25-26/442" },
      null, null,
      { kind: "converted",         ref: "JV/25-26/098"    },
      null, null, null
    ];
    const out = [];
    for(let i=0; i<n; i++){
      const c = customers[i % customers.length];
      const s = states[i % states.length];
      const amt = 8000 + Math.round(Math.random()*60000);
      out.push({
        invoiceDate: `${String((i%28)+1).padStart(2,"0")}/04/2026`,
        invoiceNo:   `INV-${3000+i}`,
        customer:    c,
        voucherType: "Sales 18%",
        gstin:       (i%9===2) ? "—" : `27AAAAA${(1000+i)}D1ZY`,
        state:       s,
        ledger:      "SODH GROUP",
        amount:      amt,
        issue:       issues[i % issues.length],
        dedup:       dedupPattern[i % dedupPattern.length]
      });
    }
    return out;
  }

  // Channels available globally
  const CHANNELS = {
    email:    { label: "Email",    icon: "envelope", cls: "chan--email"    },
    whatsapp: { label: "WhatsApp", icon: "phone",    cls: "chan--whatsapp" },
    upload:   { label: "Upload",   icon: "upload",   cls: "chan--upload"   },
    drive:    { label: "Drive",    icon: "drive",    cls: "chan--drive"    }
  };

  const ROUTES = {
    AP:      { short: "AP",      label: "Accounts Payable",    icon: "wallet",   verb: "Bill" },
    AR:      { short: "AR",      label: "Accounts Receivable", icon: "receipt",  verb: "Invoice batch" },
    Banking: { short: "Banking", label: "Banking",             icon: "bank",     verb: "Statement" },
    JV:      { short: "JV",      label: "Journal Voucher",     icon: "ledger",   verb: "Journal" }
  };

  return { items, CHANNELS, ROUTES };
})();
