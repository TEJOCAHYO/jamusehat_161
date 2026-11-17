require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  radiusKm: 5,
  sellerLogin: 's1', // Bu Siti dipakai di dashboard penjual
  keluhan: ['Semua', 'Pegal linu', 'Datang bulan', 'Batuk/flu', 'Masuk angin', 'Nafsu makan'],
  jamAntar: ['Secepatnya (maks. 45 menit)', '16.00', '17.00', '18.00', '19.00'],
  metodeBayar: ['QRIS', 'Transfer bank'],
  // Chatbot AI (Claude API). Tanpa ANTHROPIC_API_KEY, chatbot memakai mode lokal (tanpa AI).
  ai: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.AI_MODEL || 'claude-haiku-5-5',
    baseUrl: process.env.AI_BASE_URL || 'https://api.anthropic.com'
  },
  admin: { user: process.env.ADMIN_USER || 'admin', password: process.env.ADMIN_PASSWORD || '' }
};
