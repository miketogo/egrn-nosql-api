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
    region:{
        type: String,
        default: 'Не указан',
    },
    house: {
        type: String,
        required: true,
    },
    flats: {
        type: String,
    },
    non_residential_flats: {
        type: String,
    },
    status: {
        type: String,
        default: 'Создан',
        required: true,
    },
    cadastral: {
        type: String,
        default: 'Не указан',
    },
    order_items:  [{
            appartment: {
                type: String,
                required: true,
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
