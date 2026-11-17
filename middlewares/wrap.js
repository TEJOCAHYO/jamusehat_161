// Membungkus handler async: hasil jadi JSON, error jadi respons rapi
module.exports = (fn, ok = 200) => async (req, res) => {
  try { res.status(ok).json(await fn(req)); }
  catch (e) {
    const s = e.status || 500;
    if (s === 500) console.error(e);
    res.status(s).json({ pesan: s === 500 ? 'Terjadi kesalahan pada server' : e.message });
  }
};
