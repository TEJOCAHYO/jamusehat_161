const bcrypt = require('bcryptjs');
const { DataTypes } = require('sequelize');
const { sequelize, User, Seller, Product } = require('../models');

const DATA = [
  { 
    id: 's1', 
    nama: 'Jamu Sehat Bu Siti', 
    jarak: 1.2, 
    rating: 4.7, 
    racik: 'Diracik pagi hari', 
    verif: true,
    menu: [
      { 
        id: 'm1', 
        nama: 'Beras kencur', 
        harga: 8000, 
        keluhan: ['Pegal linu', 'Masuk angin'], 
        stok: 20,
        khasiat: 'Secara tradisional dipercaya menyegarkan badan, membantu meredakan pegal, dan menghangatkan tubuh saat masuk angin.' 
      },
      { 
        id: 'm2', 
        nama: 'Kunyit asam', 
        harga: 8000, 
        keluhan: ['Datang bulan'], 
        stok: 20,
        khasiat: 'Secara tradisional diminum perempuan saat datang bulan; dipercaya membantu menyegarkan badan dan meredakan rasa tidak nyaman.' 
      },
      { 
        id: 'm3', 
        nama: 'Cabe puyang', 
        harga: 9000, 
        keluhan: ['Pegal linu'], 
        stok: 20,
        khasiat: 'Rasanya hangat dan pedas; secara tradisional dipercaya membantu meredakan pegal linu dan menghangatkan badan setelah lelah.' 
      },
      { 
        id: 'm4', 
        nama: 'Temulawak', 
        harga: 10000, 
        keluhan: ['Nafsu makan'], 
        stok: 20,
        khasiat: 'Secara tradisional dipercaya membantu menambah nafsu makan dan menjaga stamina.' 
      }
    ] 
  }
];

// Menambah kolom baru pada tabel lama jika belum ada (sync() tidak mengubah tabel yang sudah ada)
async function migrasi() {
  const qi = sequelize.getQueryInterface();
  const kolom = await qi.describeTable('products');
  if (!kolom.khasiat) {
    await qi.addColumn('products', 'khasiat', { type: DataTypes.TEXT });
  }
}

async function isiKhasiatAwal() {
  for (const s of DATA) {
    for (const m of s.menu) {
      await Product.update({ khasiat: m.khasiat }, { where: { id: m.id, khasiat: null } });
    }
  }
}

// Fungsi Seeder Utama
async function seed({ reset = false } = {}) {
  // Membuat tabel yang belum ada (termasuk users, conversations, & messages)
  await sequelize.sync({ force: reset, alter: true }); 
  await migrasi();

  // 1. Seed Akun User Default (Admin & Pembeli) jika tabel masih kosong
  const jumlahUser = await User.count();
  if (jumlahUser === 0) {
    const hashAdmin = await bcrypt.hash('admin123', 10);
    const hashPembeli = await bcrypt.hash('pembeli123', 10);
    await User.bulkCreate([
      { nama: 'Admin Jamuku', username: 'admin', password: hashAdmin, role: 'admin' },
      { nama: 'Pembeli Setia', username: 'pembeli', password: hashPembeli, role: 'pembeli' }
    ]);
  }

  // 2. Seed Data Seller & Produk
  if (await Seller.count() > 0) { 
    await isiKhasiatAwal(); 
    return false; 
  }

  for (const { menu, ...s } of DATA) {
    await Seller.create(s);
    for (const m of menu) {
      await Product.create({ ...m, sellerId: s.id });
    }
  }
  
  return true;
}

module.exports = seed;

// Menjalankan seeder langsung via terminal: npm run seed
if (require.main === module) {
  seed({ reset: true })
    .then(() => { 
      console.log('Seeder selesai: tabel dibuat ulang dan diisi data contoh.'); 
      return sequelize.close(); 
    })
    .catch(e => { 
      console.error('Seeder gagal:', e.message); 
      process.exit(1); 
    });
}