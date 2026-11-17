const chat = require('../services/chatService');
const wrap = require('../middlewares/wrap');

exports.halaman = (req, res) => res.render('admin');
exports.daftar = wrap(() => chat.daftarAdmin());
exports.detail = wrap(req => chat.detailAdmin(req.params.id));
exports.balas = wrap(req => chat.balasAdmin(req.params.id, (req.body || {}).teks));
exports.ubahMode = wrap(req => chat.ubahMode(req.params.id, (req.body || {}).mode));
