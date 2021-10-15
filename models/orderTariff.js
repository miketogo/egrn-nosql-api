const mongoose = require('mongoose');
const validator = require('validator');
// Опишем схему:
const orderTariffSchema = new mongoose.Schema({
    tariffName: {
        type: String,
        required: true,
        minlength: 1,
    },
    tariffOptions: {
        type: String,
        required: true,
        minlength: 1,
    },
    unlimitedInternet: {
        type: Boolean,
        required: true,
    },
    modem: {
        type: Boolean,
        required: true,
    },
    productionMethod: {
        type: String,
        required: true,
        minlength: 1,
    },
    selectedNumber:
    {
        ctn: {
            type: String,
        },
        category: {
            type: String,
        },
        price: {
            type: String,
        },
    },
    deliveryMethod: {
        type: String,
    },
    deliveryDate: {
        type: String,
    },
    deliveryTime: {
        type: String,
    },
    deliveryAddress: {
        type: String,
    },
    transferredNumber: {
        type: String,
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
module.exports = mongoose.model('orderTariff', orderTariffSchema);
