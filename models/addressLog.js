const mongoose = require('mongoose');

// Опишем схему:
const addressLogSchema = new mongoose.Schema({
    user_text: {
        type: String,
        required: true,
    },
    google_res: {
        type: String,
    },
    our_res: {
        type: String,
    },
    rosreestr_res: {
        type: String,
    },
    is_ordered: {
        type: Boolean,
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    date: {
        type: String,
        required: true,
    },
});

// создаём модель и экспортируем её
module.exports = mongoose.model('addressLog', addressLogSchema);
