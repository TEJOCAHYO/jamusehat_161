const router = require('express').Router();
const c = require('../controllers/adminController');

router.use(require('../middlewares/adminAuth')); // semua route admin wajib login

router.get('/', c.halaman);
router.get('/api/percakapan', c.daftar);
router.get('/api/percakapan/:id', c.detail);
router.post('/api/percakapan/:id/balas', c.balas);
router.patch('/api/percakapan/:id/mode', c.ubahMode);

module.exports = router;
