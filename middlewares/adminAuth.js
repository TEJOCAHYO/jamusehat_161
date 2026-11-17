// Login admin sederhana (HTTP Basic). Atur ADMIN_USER dan ADMIN_PASSWORD di .env
const crypto = require('crypto');
const config = require('../config');

const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

module.exports = (req, res, next) => {
  if (!config.admin.password) return res.status(503).send('ADMIN_PASSWORD belum diisi di file .env');
  const [tipe, isi] = (req.headers.authorization || '').split(' ');
  if (tipe === 'Basic' && isi) {
    const [u, ...p] = Buffer.from(isi, 'base64').toString().split(':');
    if (same(u, config.admin.user) && same(p.join(':'), config.admin.password)) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Admin Jamuku"').status(401).send('Login admin diperlukan');
};
