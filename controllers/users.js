const moment = require('moment-timezone');


const User = require('../models/user');
const ConflictError = require('../errors/сonflict-err');
const InvalidDataError = require('../errors/invalid-data-err');




module.exports.create = (req, res, next) => {
  const {
    telegram_id,
    phone_number,
  } = req.body;
  const realDate = new Date
  let date = moment(realDate.toISOString()).tz("Europe/Moscow").format('D.MM.YYYY HH:mm:ss')
  User.create({
    telegram_id,
    phone_number,
    reg_date: date,
  })
    .then((result) => {
      res.status(200).send({ user: result })
    })
    .catch((err) => {
      console.log(err)
      if (err.code === 11000) {
        throw new ConflictError('При регистрации указан телефон, который уже существует на сервере');
      }
      if (err.name === 'ValidationError') {
        throw new InvalidDataError('Переданы некорректные данные при создании пользователя');
      }
    })
    .catch(next)
};
