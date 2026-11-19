const bcrypt = require('bcryptjs');
const { User } = require('../models');

// Menampilkan halaman login
exports.halamanLogin = (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect(req.session.user.role === 'admin' ? '/admin' : '/');
  }
  res.render('login', { error: null });
};

// Memproses form login
exports.prosesLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.render('login', { error: 'Username tidak ditemukan!' });
    }

    const cocok = await bcrypt.compare(password, user.password);
    if (!cocok) {
      return res.render('login', { error: 'Password salah!' });
    }

    // Simpan data user ke dalam session
    req.session.user = {
      id: user.id,
      nama: user.nama,
      username: user.username,
      role: user.role
    };

    // Arahkan sesuai role
    if (user.role === 'admin') {
      return res.redirect('/admin');
    } else {
      return res.redirect('/');
    }
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Terjadi kesalahan pada server.' });
  }
};

// Proses logout
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};