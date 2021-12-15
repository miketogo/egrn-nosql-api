const moment = require('moment-timezone');

const AddressLogs = require('../models/addressLog');
const Users = require('../models/user');
const ConflictError = require('../errors/сonflict-err');
const InvalidDataError = require('../errors/invalid-data-err');
const NorFoundError = require('../errors/not-found-err')
const opts = {
    new: true,
    runValidators: true,
};




module.exports.create = (req, res, next) => {
    const {
        user_text,
        google_res = 'Не указан',
        our_res = 'Не указан',
        rosreestr_res = 'Не указан',
        is_ordered = false,
        telegram_id,
    } = req.body;

    const realDate = new Date
    let date = moment(realDate.toISOString()).tz("Europe/Moscow").format('D.MM.YYYY HH:mm:ss')
    Users.findOne({ telegram_id: telegram_id }).orFail(() => new Error('NotFound'))
        .then((user) => {
            AddressLogs.create({
                user_text,
                google_res,
                our_res,
                rosreestr_res,
                is_ordered,
                user_id: user._id.toString(),
                date,
            })
                .then((log) => {
                    res.status(200).send({ log })
                })
                .catch((err) => {
                    console.log(err)
                    if (err.name === 'ValidationError') {
                        throw new InvalidDataError('Переданы некорректные данные при создании лога');
                    }
                })
                .catch(next)
        })
        .catch((err) => {
            console.log(err)
            if (err.message === 'NotFound') {
                throw new NorFoundError('Переданы некорректные данные при создании лога');
            }
            if (err.name === 'ValidationError') {
                throw new InvalidDataError('Переданы некорректные данные при создании лога');
            }
        })
        .catch(next)

};

module.exports.findAll = (req, res, next) => {
    const {

    } = req.body;

    AddressLogs.find()
        .then((logs) => {
            res.status(200).send({ logs })
        })
        .catch((err) => {
            console.log(err)
            if (err.name === 'ValidationError') {
                throw new InvalidDataError('Переданы некорректные данные при создании лога');
            }
        })
        .catch(next)

};
