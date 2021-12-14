const mongoose = require('mongoose');

// Опишем схему:
const addressSchema = new mongoose.Schema({
    failed_verification: {
        type: Boolean,
        required: true,
        default: true,
    },
    town: {
        type: String,
        required: true,
    },
    street: {
        type: String,
        required: true,
    },
    region: {
        type: String,
        default: 'Не указан',
    },
    house: {
        type: String,
        required: true,
    },
    last_flat: {
        type: String,
        default: '0',
    },
    last_non_residential_flat: {
        type: String,
        default: '0',
    },
    house_internal_number: {
        type: String,
        default: 'Не указан',
    },
    house_internal_letter: {
        type: String,
        default: 'Не указан',
    },
    house_internal_building: {
        type: String,
        default: 'Не указан',
    },
    cadastral: {
        type: String,
        required: true,
    },

});

// создаём модель и экспортируем её
module.exports = mongoose.model('address', addressSchema);
