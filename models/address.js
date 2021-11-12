const mongoose = require('mongoose');

// Опишем схему:
const addressSchema = new mongoose.Schema({
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

});

// создаём модель и экспортируем её
module.exports = mongoose.model('address', addressSchema);
