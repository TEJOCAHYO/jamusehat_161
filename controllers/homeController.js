const config = require('../config');

exports.index = (req, res) => {
  res.render('index', {
    title: 'Jamuku - Etalase Pembeli',
    keluhan: config.keluhan,
    jamAntar: config.jamAntar
  });
};