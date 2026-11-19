// Wajib login sebagai apa saja (untuk halaman pembeli)
exports.wajibLogin = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }
  next();
};

// Wajib login khusus Admin
exports.wajibAdmin = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).send('Akses ditolak: Halaman ini khusus Admin.');
  }
  next();
};

// Wajib login khusus Pembeli (jika admin buka '/', otomatis diarahkan ke '/admin')
exports.wajibPembeli = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }
  if (req.session.user.role === 'admin') {
    return res.redirect('/admin');
  }
  next();
};