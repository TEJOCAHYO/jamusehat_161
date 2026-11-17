// Pembatas sederhana per IP agar chat AI tidak disalahgunakan (menghemat biaya API)
const hits = new Map();
module.exports = ({ max = 15, windowMs = 60000 } = {}) => (req, res, next) => {
  const now = Date.now(), k = req.ip;
  const arr = (hits.get(k) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) return res.status(429).json({ pesan: 'Terlalu banyak pesan. Coba lagi sebentar lagi.' });
  arr.push(now); hits.set(k, arr); next();
};
