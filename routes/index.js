const router = require('express').Router();

router.use('/api/chat', require('./chat'));
router.use('/admin', require('./admin'));
router.use('/api', require('./api'));
router.use('/', require('./web'));

module.exports = router;
