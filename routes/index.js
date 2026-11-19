const router = require('express').Router();
const authController = require('../controllers/authController');
const { wajibAdmin, wajibPembeli } = require('../middlewares/authRole');

// Route Autentikasi (Bebas diakses sebelum login)
router.get('/login', authController.halamanLogin);
router.post('/login', authController.prosesLogin);
router.get('/logout', authController.logout);

// Route API (Tetap berjalan untuk fetch frontend)
router.use('/api/chat', require('./chat'));
router.use('/api', require('./api'));

// Route Khusus Admin
router.use('/admin', wajibAdmin, require('./admin'));

// Route Khusus Pembeli
router.use('/', wajibPembeli, require('./web'));

module.exports = router;