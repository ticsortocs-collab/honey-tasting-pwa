import Alpine from 'alpinejs'
import { openDB } from 'idb'
window.Alpine = Alpine

// ── Update SUBMIT_URL when deployed. Leave null to save locally only. ──────
const SUBMIT_URL = 'https://script.google.com/macros/s/AKfycby-G45nngxIVQVHn8gjotoDkQTcummCw0Sibmm-OuOZuQtaqkMGUnB_JVV3DnkTalR4IA/exec'

const ATTRIBUTES = [
  { key: 'aroma',      label: 'Aroma',       description: 'How does it smell? Floral, earthy, fruity, sweet?' },
  { key: 'sweetness',  label: 'Sweetness',   description: 'Delicate & light (1) vs bold & intense (5)' },
  { key: 'body',       label: 'Body',         description: 'Thin / watery (1) vs thick / syrupy (5)' },
  { key: 'finish',     label: 'Finish',       description: 'Does the flavor fade fast (1) or linger (5)?' },
  { key: 'uniqueness', label: 'Would seek out', description: 'Would you go out of your way to find this vs grocery-store honey?' },
]

const SAMPLE_TEMPLATES = [
  { sampleId: 'STRAW-01', varietal: "Raw Honey",     brand: "Bee's Knees",    note: 'Pure, unprocessed — the benchmark' },
  { sampleId: 'STRAW-02', varietal: "Salted Honey",  brand: "Bee's Knees",    note: 'Sea salt finish — sweet meets savory' },
  { sampleId: 'STRAW-03', varietal: "Wildflower",    brand: 'Homestead Honey', note: 'Mississippi regional mix' },
]

function tastingApp() {
  return {
    currentSample: 0, showComplete: false,
    attributes: ATTRIBUTES, samples: [],
    sessionId: null, locationType: 'chamber-event',
    email: '', emailSaved: false, surveyDone: false, visitorType: '', submitting: false,
    survey: { buyDecision: '', hadBadHoney: '', tasteValuedAction: '' },

    async init() {
      this.sessionId = 'SESSION-' + Date.now().toString(36).toUpperCase()
      const params = new URLSearchParams(window.location.search)
      if (params.get('kit'))  this.sessionId   = params.get('kit')
      if (params.get('loc'))  this.locationType = params.get('loc')
      if (params.get('new'))  await this.clearSession()
      this.samples = SAMPLE_TEMPLATES.map(t => ({
        ...t, ratings: {}, overall: 0, buyAgain: false, notes: ''
      }))
      await this.restoreSession()
    },

    async getDB() {
      return openDB('honey-tasting', 1, {
        upgrade(db) {
          db.createObjectStore('sessions', { keyPath: 'sessionId' })
          db.createObjectStore('pending',  { keyPath: 'id', autoIncrement: true })
        }
      })
    },

    async saveSession() {
      const db = await this.getDB()
      await db.put('sessions', {
        sessionId: this.sessionId, locationType: this.locationType,
        currentSample: this.currentSample, showComplete: this.showComplete,
        email: this.email, emailSaved: this.emailSaved,
        visitorType: this.visitorType,
        survey: { ...this.survey },
        samples: JSON.parse(JSON.stringify(this.samples)), updatedAt: Date.now()
      })
    },

    async restoreSession() {
      const db = await this.getDB()
      const saved = await db.get('sessions', this.sessionId)
      if (saved?.samples) {
        this.currentSample = saved.currentSample || 0
        this.showComplete  = saved.showComplete  || false
        this.email         = saved.email         || ''
        this.emailSaved       = saved.emailSaved       || false
        this.visitorType = saved.visitorType || ''
        this.survey        = { ...this.survey, ...(saved.survey || {}) }
        this.samples = this.samples.map((s, i) => ({ ...s, ...saved.samples[i] }))
      }
    },

    async clearSession() {
      const db = await this.getDB()
      await db.delete('sessions', this.sessionId)
    },

    // ── ratings ────────────────────────────────────────────────────────────
    getRating(sampleId, attr) {
      return this.samples.find(x => x.sampleId === sampleId)?.ratings?.[attr] || 0
    },
    setRating(sampleId, attr, value) {
      const s = this.samples.find(x => x.sampleId === sampleId)
      if (!s.ratings) s.ratings = {}
      s.ratings[attr] = value
      this.saveSession()
    },
    ratingClass(sampleId, attr, value) {
      return this.getRating(sampleId, attr) === value
        ? 'bg-amber-600 text-white border-amber-600 shadow-md'
        : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
    },

    getOverall(sampleId)      { return this.samples.find(x => x.sampleId === sampleId)?.overall || 0 },
    setOverall(sampleId, v)   { this.samples.find(x => x.sampleId === sampleId).overall = v; this.saveSession() },
    overallClass(sampleId, v) {
      return this.getOverall(sampleId) === v
        ? 'bg-amber-600 text-white border-amber-600 shadow-lg'
        : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
    },

    getBuyAgain(sampleId)    { return this.samples.find(x => x.sampleId === sampleId)?.buyAgain || false },
    toggleBuyAgain(sampleId) { const s = this.samples.find(x => x.sampleId === sampleId); s.buyAgain = !s.buyAgain; this.saveSession() },

    setNotes(sampleId, val)  { this.samples.find(x => x.sampleId === sampleId).notes = val; this.saveSession() },
    getNotes(sampleId)       { return this.samples.find(x => x.sampleId === sampleId)?.notes || '' },

    // ── navigation ─────────────────────────────────────────────────────────
    prevSample() { if (this.currentSample > 0)                          { this.currentSample--; this.saveSession() } },
    nextSample() { if (this.currentSample < this.samples.length - 1)    { this.currentSample++; this.saveSession() }
                   else                                                  { this.finish() } },
    finish()     { this.showComplete = true; this.saveSession() },

    // ── favorite ───────────────────────────────────────────────────────────
    get topPick() {
      return [...this.samples].sort((a, b) => (b.overall || 0) - (a.overall || 0))[0]
    },

    // ── submit + CSV download ───────────────────────────────────────────────
    async submitResults() {
      if (!this.email) return
      this.submitting = true
      const payload = {
        sessionId: this.sessionId, locationType: this.locationType,
        email: this.email, visitorType: this.visitorType,
        completedAt: new Date().toISOString(),
        survey: { ...this.survey },
        samples: this.samples.map(s => ({
          sampleId: s.sampleId, varietal: s.varietal, brand: s.brand,
          ratings: s.ratings, overall: s.overall, buyAgain: s.buyAgain, notes: s.notes
        }))
      }
      if (SUBMIT_URL) {
        try {
          await fetch(SUBMIT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) })
        } catch (e) {
          console.log('Submit error:', e.message)
        }
      }
      const db = await this.getDB()
      await db.put('sessions', { ...payload, sessionId: this.sessionId, updatedAt: Date.now() })
      this.emailSaved = true
      this.surveyDone = true
      this.submitting = false
      this.saveSession()
    },

    rateAnother() {
      const firstUnrated = this.samples.findIndex(s => !s.overall)
      this.currentSample = firstUnrated >= 0 ? firstUnrated : 0
      this.showComplete = false
      this.saveSession()
    },

    downloadCSV() {
      const header = ['sessionId','email','sampleId','varietal','brand','overall','buyAgain',
                      ...ATTRIBUTES.map(a => a.key),'notes'].join(',')
      const rows = this.samples.map(s =>
        [this.sessionId, this.email, s.sampleId, s.varietal, s.brand,
         s.overall, s.buyAgain,
         ...ATTRIBUTES.map(a => s.ratings?.[a.key] || 0),
         `"${(s.notes || '').replace(/"/g, '""')}"`
        ].join(',')
      )
      const csv  = [header, ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const a    = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: `honey-tasting-${this.sessionId}.csv`
      })
      a.click()
    }
  }
}

Alpine.data('tastingApp', tastingApp)
Alpine.start()
