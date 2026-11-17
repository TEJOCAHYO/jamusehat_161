const router = require('express').Router();
const c = require('../controllers/chatController');
const limit = require('../middlewares/rateLimit');

router.post('/', limit({ max: 15 }), c.kirim);
router.get('/:id', c.ambil);

module.exports = router;
