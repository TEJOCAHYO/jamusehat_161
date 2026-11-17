const chat = require('../services/chatService');
const wrap = require('../middlewares/wrap');

exports.kirim = wrap(req => chat.kirimPesan(req.body || {}), 201);
exports.ambil = wrap(req => chat.ambil(req.params.id));
