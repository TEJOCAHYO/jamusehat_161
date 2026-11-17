// Lapisan data (Sequelize). Bentuk JSON yang dikembalikan sama dengan versi sebelumnya,
// jadi controller, route, dan tampilan tidak perlu diubah.
const { Op } = require('sequelize');
const config = require('../config');
const { sequelize, Seller, Product, Order, OrderItem, Review } = require('./index');

const fail = (status, pesan) => { const e = new Error(pesan); e.status = status; throw e; };
const KELUHAN_VALID = config.keluhan.filter(k => k !== 'Semua');

// ---------- pembentuk respons ----------
const prod = p => ({ id: p.id, nama: p.nama, harga: p.harga, keluhan: p.keluhan, stok: p.stok, khasiat: p.khasiat || null, habis: p.stok <= 0 });
const toProduk = (p, s) => ({ ...prod(p), sellerId: s.id, sellerNama: s.nama, jarak: s.jarak });

const sellerShape = (s, reviews, keluhan) => {
  const r = reviews.filter(x => x.sellerId === s.id);
  const avg = (s.rating * 10 + r.reduce((a, x) => a + x.rating, 0)) / (10 + r.length);
  return {
    id: s.id, nama: s.nama, jarak: s.jarak, rating: +avg.toFixed(1), racik: s.racik, verif: s.verif,
    jumlahUlasan: r.length, ulasanTerbaru: r.length ? r[r.length - 1].teks : null,
    menu: s.menu.filter(m => !keluhan || keluhan === 'Semua' || m.keluhan.includes(keluhan)).map(prod)
  };
};

const orderInclude = [{ model: Seller, as: 'seller' }, { model: OrderItem, as: 'items' }, { model: Review, as: 'ulasan' }];
const orderShape = o => ({
  id: o.id, sellerId: o.sellerId, sellerNama: o.seller.nama,
  items: o.items.map(i => ({ id: i.productId, nama: i.nama, harga: i.harga, qty: i.qty })),
  total: o.total, jam: o.jam, metode: o.metode, status: o.status, waktu: o.createdAt,
  ulasan: o.ulasan ? { orderId: o.id, sellerId: o.sellerId, rating: o.ulasan.rating, teks: o.ulasan.teks } : null
});
const menuOrder = [{ model: Product, as: 'menu' }, 'urut', 'ASC'];

// F-01 + F-02: filter keluhan, radius <= 5 km, urut jarak terdekat
exports.listSellers = async ({ keluhan } = {}) => {
  const sellers = await Seller.findAll({
    where: { jarak: { [Op.lte]: config.radiusKm } },
    include: [{ model: Product, as: 'menu' }],
    order: [['jarak', 'ASC'], menuOrder]
  });
  const reviews = await Review.findAll({ where: { sellerId: sellers.map(s => s.id) }, order: [['createdAt', 'ASC']] });
  return sellers.map(s => sellerShape(s, reviews, keluhan)).filter(s => s.menu.length);
};

exports.getSeller = async id => {
  const s = await Seller.findByPk(id, { include: [{ model: Product, as: 'menu' }], order: [menuOrder] });
  if (!s) fail(404, 'Penjual tidak ditemukan');
  const reviews = await Review.findAll({ where: { sellerId: id }, order: [['createdAt', 'ASC']] });
  return sellerShape(s, reviews);
};

exports.listMenu = async () => (await Product.findAll({ order: [['urut', 'ASC']] })).map(p => ({ ...prod(p), sellerId: p.sellerId }));

// F-03 + F-06: checkout (transaksi database: stok tidak bisa terjual lebih dari yang ada)
exports.createOrder = async ({ items, jam, metode }) => {
  if (!Array.isArray(items) || !items.length) fail(400, 'Keranjang kosong');
  if (!config.jamAntar.includes(jam)) fail(400, 'Jam antar tidak valid');
  if (!config.metodeBayar.includes(metode)) fail(400, 'Metode pembayaran tidak valid');
  const ids = items.map(i => i.id);
  if (new Set(ids).size !== ids.length) fail(400, 'Item duplikat dalam pesanan');

  const id = await sequelize.transaction(async t => {
    const prods = await Product.findAll({ where: { id: ids }, transaction: t, lock: t.LOCK.UPDATE });
    const rows = items.map(i => {
      const p = prods.find(x => x.id === i.id), q = parseInt(i.qty, 10);
      if (!p) fail(400, 'Menu tidak ditemukan');
      if (!(q > 0 && q <= 50)) fail(400, 'Jumlah tidak valid');
      if (p.stok <= 0) fail(409, p.nama + ' sedang habis');
      if (q > p.stok) fail(409, `Stok ${p.nama} tinggal ${p.stok} porsi`);
      return { p, q };
    });
    if (new Set(rows.map(r => r.p.sellerId)).size > 1) fail(400, 'Satu pesanan hanya untuk satu penjual');
    for (const { p, q } of rows) { p.stok -= q; await p.save({ transaction: t }); }
    const o = await Order.create({
      sellerId: rows[0].p.sellerId, total: rows.reduce((a, r) => a + r.p.harga * r.q, 0), jam, metode, status: 'Dibayar'
    }, { transaction: t });
    await OrderItem.bulkCreate(rows.map(({ p, q }) => ({ orderId: o.id, productId: p.id, nama: p.nama, harga: p.harga, qty: q })), { transaction: t });
    return o.id;
  });
  return orderShape(await Order.findByPk(id, { include: orderInclude }));
};

exports.listOrders = async ({ sellerId } = {}) =>
  (await Order.findAll({ where: sellerId ? { sellerId } : {}, include: orderInclude, order: [['createdAt', 'DESC']] })).map(orderShape);

// F-04: terima / tolak / selesai
const NEXT = { Dibayar: ['Diproses', 'Ditolak'], Diproses: ['Selesai'] };
exports.setStatus = async (id, status) => {
  await sequelize.transaction(async t => {
    const o = await Order.findByPk(id, { include: [{ model: OrderItem, as: 'items' }], transaction: t });
    if (!o) fail(404, 'Pesanan tidak ditemukan');
    if (!(NEXT[o.status] || []).includes(status)) fail(409, `Status ${o.status} tidak bisa diubah ke ${status}`);
    o.status = status;
    await o.save({ transaction: t });
    if (status === 'Ditolak') // stok dikembalikan
      for (const i of o.items) await Product.increment('stok', { by: i.qty, where: { id: i.productId }, transaction: t });
  });
  return orderShape(await Order.findByPk(id, { include: orderInclude }));
};

// F-05: tandai habis / tersedia
exports.toggleStok = async id => {
  const p = await Product.findByPk(id, { include: [{ model: Seller, as: 'seller' }] });
  if (!p) fail(404, 'Menu tidak ditemukan');
  await p.update({ stok: p.stok > 0 ? 0 : 10 });
  return toProduk(p, p.seller);
};

// F-07: rating & ulasan
exports.addReview = async (orderId, { rating, teks }) => {
  const o = await Order.findByPk(orderId);
  if (!o) fail(404, 'Pesanan tidak ditemukan');
  if (o.status !== 'Selesai') fail(409, 'Ulasan hanya untuk pesanan selesai');
  if (await Review.findOne({ where: { orderId } })) fail(409, 'Pesanan sudah diulas');
  const n = parseInt(rating, 10);
  if (!(n >= 1 && n <= 5) || !String(teks || '').trim()) fail(400, 'Rating 1-5 dan ulasan wajib diisi');
  const rv = await Review.create({ orderId, sellerId: o.sellerId, rating: n, teks: String(teks).trim().slice(0, 300) });
  return { orderId, sellerId: o.sellerId, rating: rv.rating, teks: rv.teks };
};

// ===== API Produk: CRUD jamu oleh penjual =====
function cekProduk({ nama, harga, keluhan, stok, khasiat }, parsial = false) {
  const out = {};
  if (!parsial || nama !== undefined) {
    const n = String(nama || '').trim();
    if (!n || n.length > 60) fail(400, 'Nama jamu wajib diisi (maks. 60 karakter)');
    out.nama = n;
  }
  if (!parsial || harga !== undefined) {
    const h = Number(harga);
    if (!Number.isInteger(h) || h < 1000 || h > 500000) fail(400, 'Harga harus bilangan bulat Rp1.000 - Rp500.000');
    out.harga = h;
  }
  if (!parsial || keluhan !== undefined) {
    if (!Array.isArray(keluhan) || !keluhan.length || !keluhan.every(k => KELUHAN_VALID.includes(k)))
      fail(400, 'Keluhan harus berisi salah satu dari: ' + KELUHAN_VALID.join(', '));
    out.keluhan = keluhan;
  }
  if (stok !== undefined) {
    const t = Number(stok);
    if (!Number.isInteger(t) || t < 0 || t > 9999) fail(400, 'Stok harus bilangan bulat 0 - 9999');
    out.stok = t;
  } else if (!parsial) out.stok = 10;
  if (khasiat !== undefined) out.khasiat = String(khasiat).trim().slice(0, 500) || null;
  return out;
}
const withSeller = [{ model: Seller, as: 'seller' }];

// GET /api/produk?keluhan=&q=&sellerId=  (tanpa sellerId: hanya penjual dalam radius 5 km)
exports.listProduk = async ({ keluhan, sellerId, q } = {}) => {
  const list = await Product.findAll({
    include: [{ model: Seller, as: 'seller', required: true, where: sellerId ? { id: sellerId } : { jarak: { [Op.lte]: config.radiusKm } } }],
    order: [['urut', 'ASC']]
  });
  return list.map(p => toProduk(p, p.seller))
    .filter(p => !keluhan || keluhan === 'Semua' || p.keluhan.includes(keluhan))
    .filter(p => !q || p.nama.toLowerCase().includes(String(q).toLowerCase()));
};

exports.getProduk = async id => {
  const p = await Product.findByPk(id, { include: withSeller });
  if (!p) fail(404, 'Produk tidak ditemukan');
  return toProduk(p, p.seller);
};

exports.createProduk = async ({ sellerId, ...data }) => {
  const s = await Seller.findByPk(sellerId || config.sellerLogin);
  if (!s) fail(404, 'Penjual tidak ditemukan');
  const p = await Product.create({ ...cekProduk(data), sellerId: s.id });
  return toProduk(p, s);
};

exports.updateProduk = async (id, data = {}) => {
  const p = await Product.findByPk(id, { include: withSeller });
  if (!p) fail(404, 'Produk tidak ditemukan');
  const baru = cekProduk(data, true);
  if (data.habis !== undefined && data.stok === undefined) baru.stok = data.habis ? 0 : (p.stok > 0 ? p.stok : 10);
  await p.update(baru);
  return toProduk(p, p.seller);
};

exports.deleteProduk = async id => {
  const p = await Product.findByPk(id);
  if (!p) fail(404, 'Produk tidak ditemukan');
  await p.destroy();
  return { pesan: 'Produk dihapus', id };
};
