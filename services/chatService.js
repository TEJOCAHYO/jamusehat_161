// Logika percakapan: pelanggan -> AI -> (bila perlu) admin
const { Conversation, Message, Product } = require('../models');
const ai = require('./aiService');

const fail = (status, pesan) => { const e = new Error(pesan); e.status = status; throw e; };
const pesanJSON = m => ({ id: m.id, role: m.role, teks: m.teks, waktu: m.createdAt });

async function thread(id) {
  const msgs = await Message.findAll({ where: { conversationId: id }, order: [['urut', 'ASC']] });
  return msgs.map(pesanJSON);
}
const tambah = (conversationId, role, teks) => Message.create({ conversationId, role, teks });

// ---------- sisi pelanggan ----------
exports.kirimPesan = async ({ conversationId, pesan, nama }) => {
  const teks = String(pesan || '').trim();
  if (!teks || teks.length > 500) fail(400, 'Pesan wajib diisi (maks. 500 karakter)');
  let c = conversationId ? await Conversation.findByPk(conversationId) : null;
  if (!c) c = await Conversation.create({ nama: String(nama || 'Pelanggan').trim().slice(0, 40) || 'Pelanggan' });

  await tambah(c.id, 'pelanggan', teks);
  c.unread += 1; c.lastAt = new Date();
  if (c.mode === 'selesai') c.mode = 'ai'; // pelanggan menulis lagi -> dibuka kembali

  if (c.mode === 'ai') {
    const katalog = (await Product.findAll({ order: [['urut', 'ASC']] })).map(p => p.get({ plain: true }));
    const terbaru = await Message.findAll({ where: { conversationId: c.id }, order: [['urut', 'DESC']], limit: 12 });
    const hasil = await ai.tanya({ katalog, riwayat: terbaru.reverse().map(m => ({ role: m.role, teks: m.teks })) });
    await tambah(c.id, 'ai', hasil.balasan);
    if (hasil.eskalasi) { c.mode = 'menunggu_admin'; c.ringkasan = hasil.ringkasan || teks.slice(0, 200); }
  } // mode menunggu_admin / admin: AI diam, admin yang membalas
  await c.save();
  return exports.ambil(c.id);
};

exports.ambil = async id => {
  const c = await Conversation.findByPk(id);
  if (!c) fail(404, 'Percakapan tidak ditemukan');
  return { id: c.id, mode: c.mode, messages: await thread(c.id) };
};

// ---------- sisi admin ----------
exports.daftarAdmin = async () => {
  const list = await Conversation.findAll({ order: [['lastAt', 'DESC']] });
  const msgs = await Message.findAll({ where: { conversationId: list.map(c => c.id) }, order: [['urut', 'DESC']] });
  const terakhir = {}; for (const m of msgs) if (!terakhir[m.conversationId]) terakhir[m.conversationId] = m;
  const hasil = list.map(c => ({
    id: c.id, nama: c.nama, mode: c.mode, ringkasan: c.ringkasan, unread: c.unread, lastAt: c.lastAt,
    pesanTerakhir: terakhir[c.id] ? { role: terakhir[c.id].role, teks: terakhir[c.id].teks } : null
  }));
  return hasil.sort((a, b) => (b.mode === 'menunggu_admin') - (a.mode === 'menunggu_admin'));
};

exports.detailAdmin = async id => {
  const c = await Conversation.findByPk(id);
  if (!c) fail(404, 'Percakapan tidak ditemukan');
  if (c.unread) await c.update({ unread: 0 });
  return { id: c.id, nama: c.nama, mode: c.mode, ringkasan: c.ringkasan, messages: await thread(c.id) };
};

exports.balasAdmin = async (id, pesan) => {
  const teks = String(pesan || '').trim();
  if (!teks || teks.length > 1000) fail(400, 'Balasan wajib diisi (maks. 1000 karakter)');
  const c = await Conversation.findByPk(id);
  if (!c) fail(404, 'Percakapan tidak ditemukan');
  await tambah(c.id, 'admin', teks);
  await c.update({ mode: 'admin', unread: 0, lastAt: new Date() });
  return exports.detailAdmin(id);
};

const NOTE = {
  ai: 'Admin mengembalikan percakapan ke asisten AI. Silakan lanjut bertanya.',
  selesai: 'Percakapan ditutup oleh admin. Tulis pesan baru kapan saja untuk memulai lagi.',
  admin: 'Admin mengambil alih percakapan ini.'
};
exports.ubahMode = async (id, mode) => {
  if (!NOTE[mode]) fail(400, 'Mode harus ai, admin, atau selesai');
  const c = await Conversation.findByPk(id);
  if (!c) fail(404, 'Percakapan tidak ditemukan');
  await tambah(c.id, 'sistem', NOTE[mode]);
  await c.update({ mode, lastAt: new Date() });
  return exports.detailAdmin(id);
};
