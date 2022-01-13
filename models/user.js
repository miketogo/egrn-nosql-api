const mongoose = require('mongoose');
const validator = require('validator');
// Опишем схему:
const userSchema = new mongoose.Schema({
    phone_number: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        default: 'Не указан',
    },
    username: {
        type: String,
        default: 'Не указан',
    },
    tg_status: {
        type: String,
        default: 'Не указан',
    },
    emailVerified: {
        type: Boolean,
        required: true,
        default: false,
    },
    newsletter: {
        type: Boolean,
        required: true,
        default: true,
    },
    telegram_id: {
        type: String,
        default: 'Не указан',
    },
    balance: {
        type: Number,
        default: 0,
    },
    reg_date: {
        type: String,
        required: true,
    },
    payment_history: {
        type: Array,
        default: [],
        items: {
            amount: {
                type: Number,
            },
            type: {
                type: String,
            },
            date: {
                type: String,
            },
        }
    },
    order_history: [{
        order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'order'
        },
        date: {
            type: String,
        },
    }
    ],
    recent_change: {
        type: String,
    }
});

// создаём модель и экспортируем её
module.exports = mongoose.model('user', userSchema);
