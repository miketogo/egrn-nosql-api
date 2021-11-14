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
<<<<<<< HEAD
    house_internal_number: {
        type: String,
        default: 'Не указан',
    },
    house_internal_letter: {
        type: String,
        default: 'Не указан',
=======
    cadastral: {
        type: String,
        required: true,
>>>>>>> 6f590bafedc72f9c106081b69f6db8a2da714865
    },

});

// создаём модель и экспортируем её
module.exports = mongoose.model('address', addressSchema);
