const mongoose = require('mongoose');
const validator = require('validator');
// Опишем схему:
const trasferNumberSchema = new mongoose.Schema({
    transferDate: {
        type: String,
        required: true,
    },
    transferredNumber: {
        type: String,
        required: true,
    },
    userPhone: {
        type: String,
        required: true,
        minlength: 1,
    },
    date: {
        type: String,
        required: true,
    },
    fromMosсow: {
        type: String,
        required: true,
    }
});

// создаём модель и экспортируем её
module.exports = mongoose.model('trasferNumber', trasferNumberSchema);
