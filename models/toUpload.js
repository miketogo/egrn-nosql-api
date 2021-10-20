const mongoose = require('mongoose');
const validator = require('validator');
// Опишем схему:
const toUploadSchema = new mongoose.Schema({
    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'order',
        required: true,
    },
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
    appartment: {
        type: String,
        default: 'Не указан'
    },
    cadastral: {
        type: String,
        default: 'Не указан'
    },
    last_appartment: {
        type: String,
        default: 'Не указан'
    },
    on_check: {
        type: Boolean,
        default: false,
    },
});

// создаём модель и экспортируем её
module.exports = mongoose.model('toUpload', toUploadSchema);
