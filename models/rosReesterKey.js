const mongoose = require('mongoose');

// Опишем схему:
const rosReesterKeySchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
    },
    balance: {
        type: Number,
        default: 0,
        required: true,
    },
    key_owner: {
        type: String,
        required: true,
    },
    date: {
        type: String,
        required: true,
    },
    recent_change: {
        type: String,
    }
});

// создаём модель и экспортируем её
module.exports = mongoose.model('rosReesterKey', rosReesterKeySchema);
