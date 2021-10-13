const mongoose = require('mongoose');
const validator = require('validator');
// Опишем схему:
const orderServiceSchema = new mongoose.Schema({
    serviceName: {
        type: String,
        required: true,
        minlength: 1,
    },
    userPhone: {
        type: String,
        required: true,
        minlength: 1,
    },
    date:{
        type: String,
        required: true,
    },
    fromMosсow:{
        type: String,
        required: true,
    }
});

// создаём модель и экспортируем её
module.exports = mongoose.model('orderService', orderServiceSchema);
