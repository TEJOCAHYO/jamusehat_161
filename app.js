const express = require('express');
const path = require('path');
const session = require('express-session');
const config = require('./config');
const logger = require('./middlewares/logger');
const routes = require('./routes');
const { sequelize } = require('./models');
const seed = require('./seeders/seed');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'jamuku-rahasia-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// Kirim data user ke semua file EJS agar navbar bisa menampilkan nama/tombol logout
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

app.use(logger);
app.use('/', routes);
app.use((req, res) => res.status(404).json({ pesan: 'Halaman tidak ditemukan' }));

// ----- JALANKAN SERVER DAN DATABASE -----
(async () => {
  try {
    await sequelize.authenticate();
    const baru = await seed(); 
    if (baru) console.log('Tabel dibuat dan data contoh dimasukkan.');
    
    app.listen(config.port, () => {
      console.log(`Jamuku berjalan di http://localhost:${config.port}`);
    });

  } catch (e) {
    console.error('Gagal terhubung ke database:', e.message);
    console.error('Cek file .env (DB_DIALECT, DB_HOST, DB_NAME, DB_USER, DB_PASSWORD) dan pastikan PostgreSQL sedang berjalan.');
    process.exit(1);
  }
})();