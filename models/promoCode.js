const mongoose = require('mongoose');

// Опишем схему:
const promoCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
    },
    amount: {
        type: Number,
        default: 0,
        required: true,
    },
    isUsed: {
        type: Boolean,
        required: true,
        default: false,
    },
    date: {
        type: String,
        required: true,
    }
});

// создаём модель и экспортируем её
module.exports = mongoose.model('promoCode', promoCodeSchema);
