const crypto = require('crypto');
const { DataTypes: T } = require('sequelize');
const sequelize = require('../config/database');

const pk = () => ({ type: T.STRING, primaryKey: true, defaultValue: () => crypto.randomUUID() });
let n = 0;
const urut = () => Date.now() * 1000 + (n++ % 1000); // menjaga urutan produk sesuai waktu dibuat

const Seller = sequelize.define('Seller', {
  id: pk(),
  nama: { type: T.STRING, allowNull: false },
  jarak: { type: T.FLOAT, allowNull: false },
  rating: { type: T.FLOAT, defaultValue: 4.5 },
  racik: T.STRING,
  verif: { type: T.BOOLEAN, defaultValue: false }
}, { tableName: 'sellers' });

const Product = sequelize.define('Product', {
  id: pk(),
  nama: { type: T.STRING(60), allowNull: false },
  harga: { type: T.INTEGER, allowNull: false, validate: { min: 1000, max: 500000 } },
  keluhan: { type: T.JSON, allowNull: false, defaultValue: [] },
  stok: { type: T.INTEGER, allowNull: false, defaultValue: 10, validate: { min: 0, max: 9999 } },
  khasiat: T.TEXT, // keterangan khasiat tradisional, dibaca oleh asisten AI
  urut: { type: T.BIGINT, defaultValue: urut }
}, { tableName: 'products' });

const Order = sequelize.define('Order', {
  id: pk(),
  total: { type: T.INTEGER, allowNull: false },
  jam: T.STRING,
  metode: T.STRING,
  status: { type: T.STRING, defaultValue: 'Dibayar' }
}, { tableName: 'orders' });

const OrderItem = sequelize.define('OrderItem', {
  id: pk(),
  productId: T.STRING, // salinan id produk; sengaja bukan foreign key agar riwayat tetap utuh jika produk dihapus
  nama: { type: T.STRING, allowNull: false },
  harga: { type: T.INTEGER, allowNull: false },
  qty: { type: T.INTEGER, allowNull: false }
}, { tableName: 'order_items' });

const Review = sequelize.define('Review', {
  id: pk(),
  orderId: { type: T.STRING, allowNull: false, unique: true },
  sellerId: { type: T.STRING, allowNull: false },
  rating: { type: T.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
  teks: { type: T.STRING(300), allowNull: false }
}, { tableName: 'reviews' });

// ----- Chat pelanggan <-> AI <-> admin -----
const Conversation = sequelize.define('Conversation', {
  id: pk(),
  nama: { type: T.STRING(40), defaultValue: 'Pelanggan' },
  mode: { type: T.STRING, defaultValue: 'ai' }, // ai | menunggu_admin | admin | selesai
  ringkasan: T.TEXT,                             // ringkasan dari AI untuk admin
  unread: { type: T.INTEGER, defaultValue: 0 },  // pesan pelanggan yang belum dibuka admin
  lastAt: { type: T.DATE, defaultValue: T.NOW }
}, { tableName: 'conversations' });

const Message = sequelize.define('Message', {
  id: pk(),
  role: { type: T.STRING, allowNull: false },    // pelanggan | ai | admin | sistem
  teks: { type: T.TEXT, allowNull: false },
  urut: { type: T.BIGINT, defaultValue: urut }
}, { tableName: 'messages' });

Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages', onDelete: 'CASCADE' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

Seller.hasMany(Product, { foreignKey: 'sellerId', as: 'menu', onDelete: 'CASCADE' });
Product.belongsTo(Seller, { foreignKey: 'sellerId', as: 'seller' });
Seller.hasMany(Order, { foreignKey: 'sellerId' });
Order.belongsTo(Seller, { foreignKey: 'sellerId', as: 'seller' });
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
Order.hasOne(Review, { foreignKey: 'orderId', as: 'ulasan', onDelete: 'CASCADE' });
Review.belongsTo(Order, { foreignKey: 'orderId' });

module.exports = { sequelize, Seller, Product, Order, OrderItem, Review, Conversation, Message };
