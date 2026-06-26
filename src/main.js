import Alpine from 'alpinejs'
import { openDB } from 'idb'
window.Alpine = Alpine
Alpine.start()
const ATTRIBUTES = [
  { key: 'floral', label: 'Floral Intensity', description: 'How prominent are the flower/nectar aromas?' },
  { key: 'fruit', label: 'Fruit Notes', description: 'Stone fruit, citrus, berry, or dried fruit flavors' },
  { key: 'herbal', label: 'Herbal/Earthy', description: 'Mint, thyme, woody, hay, or mineral notes' },
  { key: 'caramel', label: 'Caramel/Sweet', description: 'Toffee, butterscotch, molasses, brown sugar' },
  { key: 'spice', label: 'Spice/Warmth', description: 'Cinnamon, clove, pepper, ginger warmth' },
  { key: 'viscosity', label: 'Thickness', description: 'Thin/watery ↔ Thick/syrupy' },
  { key: 'crystallization', label: 'Texture', description: 'Smooth/creamy ↔ Grainy/crunchy crystals' },
  { key: 'finish', label: 'Finish Length', description: 'How long the flavor lingers after swallowing' },
  { key: 'balance', label: 'Balance', description: 'Harmonious ↔ Sharp or cloying' },
  { key: 'defects', label: 'Off-Notes', description: 'Fermentation, smoke, metallic, burnt (0 = none)' }
]
const SAMPLE_TEMPLATES = [
  { sampleId: 'STRAW-01', varietal: 'Clover', region: 'Midwest US', producerId: 'BEE-001', producerName: 'Miller Apiaries' },
  { sampleId: 'STRAW-02', varietal: 'Wildflower', region: 'Appalachia', producerId: 'BEE-002', producerName: 'Mountain Bee Co' },
  { sampleId: 'STRAW-03', varietal: 'Orange Blossom', region: 'Florida', producerId: 'BEE-003', producerName: 'Sunshine Honey' },
  { sampleId: 'STRAW-04', varietal: 'Tupelo', region: 'Georgia/Florida', producerId: 'BEE-004', producerName: 'Swamp Gold' },
  { sampleId: 'STRAW-05', varietal: 'Buckwheat', region: 'Northeast', producerId: 'BEE-005', producerName: 'Dark Ridge' },
  { sampleId: 'STRAW-06', varietal: 'Sourwood', region: 'Appalachia', producerId: 'BEE-006', producerName: 'Highland Hives' }
]
function tastingApp() {
  return {
    currentSample: 0, showComplete: false, attributes: ATTRIBUTES, samples: [],
    sessionId: null, hotelId: null, locationType: 'home',
    async init() {
      this.sessionId = 'SESSION-' + Date.now().toString(36).toUpperCase()
      const params = new URLSearchParams(window.location.search)
      if (params.get('hotel')) this.hotelId = params.get('hotel')
      if (params.get('kit')) this.sessionId = params.get('kit')
      if (params.get('loc')) this.locationType = params.get('loc')
      if (params.get('new')) this.clearSession()
      this.samples = SAMPLE_TEMPLATES.map(t => ({ ...t, ratings: {}, overall: 0, buyAgain: false, notes: '' }))
      await this.restoreSession()
      if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(reg => console.log('SW ready:', reg.scope))
    },
    async getDB() { return openDB('honey-tasting', 1, { upgrade(db) { db.createObjectStore('sessions', { keyPath: 'sessionId' }); db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true }) } }) },
    async saveSession() { const db = await this.getDB(); await db.put('sessions', { sessionId: this.sessionId, hotelId: this.hotelId, locationType: this.locationType, currentSample: this.currentSample, showComplete: this.showComplete, samples: this.samples, updatedAt: Date.now() }) },
    async restoreSession() { const db = await this.getDB(); const saved = await db.get('sessions', this.sessionId); if (saved && saved.samples) { this.currentSample = saved.currentSample || 0; this.showComplete = saved.showComplete || false; this.samples = saved.samples.map((s, i) => ({ ...this.samples[i], ...s })) } },
    async clearSession() { const db = await this.getDB(); await db.delete('sessions', this.sessionId) },
    getRating(sampleId, attr) { const s = this.samples.find(x => x.sampleId === sampleId); return s?.ratings?.[attr] || 0 },
    setRating(sampleId, attr, value) { const s = this.samples.find(x => x.sampleId === sampleId); if (!s.ratings) s.ratings = {}; s.ratings[attr] = value; this.saveSession() },
    ratingClass(sampleId, attr, value) { const selected = this.getRating(sampleId, attr) === value; return selected ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50' },
    getOverall(sampleId) { const s = this.samples.find(x => x.sampleId === sampleId); return s?.overall || 0 },
    setOverall(sampleId, value) { const s = this.samples.find(x => x.sampleId === sampleId); s.overall = value; this.saveSession() },
    overallClass(sampleId, value) { const selected = this.getOverall(sampleId) === value; return selected ? 'bg-amber-600 text-white border-amber-600 shadow-lg' : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50' },
    getBuyAgain(sampleId) { return this.samples.find(x => x.sampleId === sampleId)?.buyAgain || false },
    toggleBuyAgain(sampleId) { const s = this.samples.find(x => x.sampleId === sampleId); s.buyAgain = !s.buyAgain; this.saveSession() },
    getNotes(sampleId) { return this.samples.find(x => x.sampleId === sampleId)?.notes || '' },
    prevSample() { if (this.currentSample > 0) { this.currentSample--; this.saveSession() } },
    nextSample() { if (this.currentSample < this.samples.length - 1) { this.currentSample++; this.saveSession() } else { this.finish() } },
    finish() { this.showComplete = true; this.saveSession() },
    async submitResults() { const payload = { sessionId: this.sessionId, hotelId: this.hotelId, locationType: this.locationType, completedAt: new Date().toISOString(), samples: this.samples.map(s => ({ sampleId: s.sampleId, varietal: s.varietal, region: s.region, producerId: s.producerId, ratings: s.ratings, overall: s.overall, buyAgain: s.buyAgain, notes: s.notes })) }; const db = await this.getDB(); await db.add('pending', { type: 'tasting_results', payload, createdAt: Date.now() }); await this.syncPending(); alert('Tasting saved! Your honey profile will be ready soon.') },
    async syncPending() { try { const db = await this.getDB(); const pending = await db.getAll('pending'); for (const item of pending) { const res = await fetch('https://api.honeyhive.com/api/tasting/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.payload) }); if (res.ok) await db.delete('pending', item.id) } } catch (e) { console.log('Offline - queued for sync:', e.message) } }
  }
}