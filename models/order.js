const mongoose = require('mongoose');
const validator = require('validator');
// Опишем схему:
const orderSchema = new mongoose.Schema({
    object_address: {
        type: String,
        required: true,
    },
    town: {
        type: String,
        required: true,
    },
    street: {
        type: String,
        required: true,
    },
    house: {
        type: String,
        required: true,
    },
    flats: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        default: 'Создан',
        required: true,
    },
    order_items:  [{
            appartment: {
                type: Number,
                required: true,
            },
            cadastral: {
                type: String,
                default: 'Не указан',
            },
            rosreestr_key: {
                type: String,
                default: 'Не указан',
            },
            response_id: {
                type: String,
                default: 'Не указан',
            },
            status: {
                type: String,
                default: 'Не указан',
            },
        }
    ]
});

// создаём модель и экспортируем её
module.exports = mongoose.model('order', orderSchema);
