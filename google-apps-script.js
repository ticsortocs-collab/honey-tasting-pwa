// Honeycutt Hives & Harvest — Google Apps Script
// Paste into: Google Sheets → Extensions → Apps Script → replace all → Save → Deploy

const SHEETS = {
  CONSUMER: 'Consumer Responses',
  CATALOG:  'Honey Catalog',
  SUPPLIER: 'Supplier Applications',
  PARTNER:  'Kiosk Partner Applications',
}

// ── runs on sheet open — adds the 🍯 menu ─────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🍯 Honeycutt Marketplace')
    .addItem('Setup all sheets',   'setupSheets')
    .addItem('Print tasting cards','generateCards')
    .addToUi()
}

// ── POST router ───────────────────────────────────────────────────────────
function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const log = getOrCreate(ss, 'Debug Log', ['Time','Type','Email','Status','Error'])
  try {
    const raw  = e && e.postData ? e.postData.contents : null
    if (!raw) throw new Error('e.postData is empty — possible preflight or empty body')
    const data = JSON.parse(raw)
    if      (data.type === 'supplier') appendSupplier(ss, data)
    else if (data.type === 'partner')  appendPartner(ss, data)
    else                               appendTasting(ss, data)
    log.appendRow([new Date(), data.type || 'tasting', data.email || '', 'OK', ''])
    return ContentService.createTextOutput('ok')
  } catch(err) {
    log.appendRow([new Date(), '?', '', 'ERROR', err.message])
    return ContentService.createTextOutput('error: ' + err.message)
  }
}

// ── Consumer tasting results ───────────────────────────────────────────────
function appendTasting(ss, data) {
  const sheet = getOrCreate(ss, SHEETS.CONSUMER, [
    'Session ID','Email','Completed At','Sample ID','Varietal','Brand',
    'Aroma','Sweetness','Body','Finish','Would Seek Out',
    'Overall','Buy Again','Notes',
    'Visitor Type','Taste Drives Buy?','Had Bad Honey?','If Knew Taste — Would You?'
  ])
  const sv = data.survey || {}
  data.samples.forEach(s => {
    sheet.appendRow([
      data.sessionId, data.email, new Date(data.completedAt),
      s.sampleId, s.varietal, s.brand,
      s.ratings?.aroma, s.ratings?.sweetness, s.ratings?.body,
      s.ratings?.finish, s.ratings?.uniqueness,
      s.overall, s.buyAgain ? 'YES' : 'no', s.notes,
      data.visitorType, sv.buyDecision, sv.hadBadHoney, sv.tasteValuedAction
    ])
  })
}

// ── Supplier / beekeeper applications ─────────────────────────────────────
function appendSupplier(ss, data) {
  const sheet = getOrCreate(ss, SHEETS.SUPPLIER, [
    'Submitted','Name','Business','Email','Phone','Location',
    'Years Beekeeping','Hives','Varietals','Zip Code(s)','Harvest',
    'Certifications','Story','Interests',
    'Favorite Parts','Least Favorite Parts','Would Add Hives',
    'Annual Yield','Sells Wholesale','Consumer $/lb','Bulk $/lb'
  ])
  sheet.appendRow([
    new Date(data.submittedAt), data.name, data.business, data.email, data.phone, data.location,
    data.years, data.hives, data.varietals, data.zipCodes, data.harvest,
    data.certifications, data.story, data.interest,
    data.favoriteParts, data.leastFavoriteParts, data.wouldAddHives,
    data.annualYield, data.sellsWholesale, data.consumerPrice, data.bulkPrice
  ])
}

// ── Kiosk partner applications ─────────────────────────────────────────────
function appendPartner(ss, data) {
  const sheet = getOrCreate(ss, SHEETS.PARTNER, [
    'Submitted','Business','Type','Location','Contact Name','Role','Email','Phone',
    'Daily Traffic','Space','Customer Demographic','Partnership Model','Notes'
  ])
  sheet.appendRow([
    new Date(data.submittedAt), data.business, data.biztype, data.location,
    data.name, data.role, data.email, data.phone,
    data.traffic, data.space, data.demographic, data.model, data.notes
  ])
}

// ── Setup: creates all tabs with headers + sample catalog rows ─────────────
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()

  // Honey Catalog
  let cat = ss.getSheetByName(SHEETS.CATALOG)
  if (!cat) {
    cat = ss.insertSheet(SHEETS.CATALOG)
    cat.appendRow(['Sample ID','Varietal','Brand','Region','Tasting Note','Type','Active'])
    cat.appendRow(['STRAW-01', "Raw Honey",    "Bee's Knees",    'USA',         'Pure, unprocessed — the benchmark',      'artisan', true])
    cat.appendRow(['STRAW-02', "Salted Honey", "Bee's Knees",    'USA',         'Sea salt finish — sweet meets savory',   'artisan', true])
    cat.appendRow(['STRAW-03', 'Wildflower',   'Homestead Honey','Mississippi', 'Regional mix',                           'local',   true])
    // Add your new honeys below — set Active=TRUE to include in tastings
    cat.appendRow(['STRAW-04', '(your next honey)', '(brand)', '(region)', '(flavor note)', 'local/store/artisan', false])
    // Format header row
    cat.getRange(1,1,1,7).setFontWeight('bold').setBackground('#92400e').setFontColor('#fde68a')
    cat.setFrozenRows(1)
  }

  // Other tabs
  getOrCreate(ss, SHEETS.CONSUMER, [
    'Session ID','Email','Completed At','Sample ID','Varietal','Brand',
    'Aroma','Sweetness','Body','Finish','Would Seek Out','Overall','Buy Again','Notes'
  ])
  getOrCreate(ss, SHEETS.SUPPLIER, [
    'Submitted','Name','Business','Email','Phone','Location',
    'Years Beekeeping','Hives','Varietals','Production (lbs)','Harvest',
    'Certifications','Wholesale Price','Story','Interests'
  ])
  getOrCreate(ss, SHEETS.PARTNER, [
    'Submitted','Business','Type','Location','Contact Name','Role','Email','Phone',
    'Daily Traffic','Space','Customer Demographic','Partnership Model','Notes'
  ])

  SpreadsheetApp.getUi().alert('✅ All sheets ready!\n\nAdd honeys to the "Honey Catalog" tab.\nSet Active=TRUE to include in tasting cards.')
}

// ── Generate printable tasting cards from the Honey Catalog ───────────────
function generateCards() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getSheetByName(SHEETS.CATALOG)
  if (!sheet) { SpreadsheetApp.getUi().alert('Run "Setup all sheets" first.'); return }

  const data    = sheet.getDataRange().getValues()
  const headers = data[0].map(h => String(h).toLowerCase().replace(/ /g,''))
  const col     = k => headers.indexOf(k)

  const honeys = data.slice(1).filter(r => {
    const active = r[col('active')]
    return active === true || String(active).toUpperCase() === 'TRUE'
  })

  if (!honeys.length) {
    SpreadsheetApp.getUi().alert('No active honeys found.\nSet Active=TRUE on at least one row in the Honey Catalog.')
    return
  }

  const cards = honeys.map((r, i) => `
    <div class="card">
      <div class="card-header">
        <div class="brand-top">Honeycutt Hives &amp; Harvest <span class="sid">${r[col('sampleid')] || 'STRAW-0'+(i+1)}</span></div>
        <div class="varietal">${r[col('varietal')]}</div>
        <div class="brand">${r[col('brand')]}</div>
        <div class="note">${r[col('tastingnote')] || ''}</div>
      </div>
      <div class="card-body">
        <div class="guide">
          <div class="guide-title">Rate 1–5 on each:</div>
          <div class="gi"><span class="dot"></span><b>Aroma</b> — smell before tasting</div>
          <div class="gi"><span class="dot"></span><b>Sweetness</b> — light vs bold</div>
          <div class="gi"><span class="dot"></span><b>Body</b> — thin vs syrupy</div>
          <div class="gi"><span class="dot"></span><b>Finish</b> — fades vs lingers</div>
          <div class="gi"><span class="dot"></span><b>Would seek out</b> — vs grocery honey</div>
        </div>
        <div class="num">0${i+1}</div>
      </div>
      <div class="card-footer">
        <span>Scan QR on display to rate</span>
        <span class="type">${r[col('type')] || ''}</span>
      </div>
    </div>`).join('')

  const html = `<!DOCTYPE html><html><head><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;background:#f5f0eb;padding:16px}
    h2{text-align:center;color:#92400e;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-width:860px;margin:0 auto}
    .card{background:#fffbeb;border:1.5px solid #fcd34d;border-radius:10px;overflow:hidden;page-break-inside:avoid}
    .card-header{background:linear-gradient(135deg,#92400e,#d97706);padding:12px 14px 10px;color:#fff}
    .brand-top{font-size:8px;letter-spacing:1px;text-transform:uppercase;color:#fde68a;font-weight:700}
    .sid{float:right;color:rgba(255,255,255,.5);font-family:monospace}
    .varietal{font-size:18px;font-weight:900;margin-top:3px}
    .brand{font-size:11px;color:#fcd34d;margin-top:1px}
    .note{font-size:9px;color:rgba(255,255,255,.7);font-style:italic;margin-top:3px}
    .card-body{display:flex;justify-content:space-between;align-items:flex-end;padding:12px 14px}
    .guide-title{font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#d97706;font-weight:700;margin-bottom:5px}
    .gi{font-size:9px;color:#1c1917;margin-bottom:3px;display:flex;gap:5px;align-items:baseline}
    .dot{width:4px;height:4px;background:#d97706;border-radius:50%;flex-shrink:0;margin-top:1px}
    .num{font-size:36px;font-weight:900;color:#fcd34d;line-height:1}
    .card-footer{background:#fef3c7;border-top:1px solid #fcd34d;padding:6px 14px;display:flex;justify-content:space-between;font-size:9px;color:#92400e}
    .type{font-style:italic;color:#b45309}
    .btn{display:block;margin:16px auto 0;padding:10px 28px;background:#d97706;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer}
    @media print{.btn{display:none}body{background:#fff;padding:4px}}
  </style></head><body>
  <h2>🍯 Honeycutt Hives &amp; Harvest — Tasting Cards</h2>
  <div class="grid">${cards}</div>
  <button class="btn" onclick="window.print()">🖨 Print Cards</button>
  </body></html>`

  const output = HtmlService.createHtmlOutput(html).setWidth(920).setHeight(600).setTitle('Tasting Cards — Print')
  SpreadsheetApp.getUi().showModelessDialog(output, 'Tasting Cards')
}

// ── Self-test: run this from the editor BEFORE deploying ──────────────────
// Dropdown → select testDoPost → click Run.
// Then check the "Debug Log" tab — you should see three OK rows.
// If you see errors, the problem is in the code, not the deployment.
function testDoPost() {
  const fakeE = contents => ({ postData: { contents: JSON.stringify(contents) } })

  doPost(fakeE({
    type: 'tasting',
    sessionId: 'TEST-001', email: 'test@example.com',
    locationType: 'event', visitorType: 'consumer',
    completedAt: new Date().toISOString(),
    survey: { buyDecision: 'yes', hadBadHoney: 'yes', tasteValuedAction: 'buy it' },
    samples: [{
      sampleId: 'STRAW-01', varietal: 'Raw Honey', brand: "Bee's Knees",
      ratings: { aroma: 4, sweetness: 3, body: 3, finish: 4, uniqueness: 4 },
      overall: 4, buyAgain: true, notes: 'test note'
    }]
  }))

  doPost(fakeE({
    type: 'supplier',
    name: 'Test Beekeeper', business: 'Test Farm', email: 'bees@example.com',
    phone: '555-1234', location: 'Vicksburg MS', years: '5', hives: '10',
    varietals: 'Wildflower', zipCodes: '39180', harvest: 'Fall',
    certifications: 'raw, local', story: 'Love bees',
    interest: 'marketplace', favoriteParts: 'tending, eating',
    leastFavoriteParts: 'selling', wouldAddHives: 'yes',
    annualYield: '100-250 lbs', sellsWholesale: 'yes',
    consumerPrice: '12', bulkPrice: '8',
    submittedAt: new Date().toISOString()
  }))

  doPost(fakeE({
    type: 'partner',
    business: 'Test Café', biztype: 'café/coffee shop', location: 'Jackson MS',
    name: 'Jane Owner', role: 'Owner', email: 'jane@example.com',
    phone: '555-9876', traffic: '100-200/day', space: '2 sq ft on counter',
    demographic: 'foodie locals', model: 'consignment',
    notes: 'Love local honey', submittedAt: new Date().toISOString()
  }))
}

// ── helper: get sheet or create it with headers ───────────────────────────
function getOrCreate(ss, name, headers) {
  let sheet = ss.getSheetByName(name)
  if (!sheet) {
    sheet = ss.insertSheet(name)
    sheet.appendRow(headers)
    sheet.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#92400e').setFontColor('#fde68a')
    sheet.setFrozenRows(1)
  }
  return sheet
}
