const moment = require('moment-timezone');
const TelegramBot = require('node-telegram-bot-api');


const trasferNumber = require('../models/trasferNumber');
const ConflictError = require('../errors/сonflict-err');
const InvalidDataError = require('../errors/invalid-data-err');

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: false });



module.exports.transfer = (req, res, next) => {
  const {
    transferDate,
    transferredNumber,
    userPhone,
    fromMosсow
  } = req.body;
  const realDate = new Date
  let date = moment(realDate.toISOString()).tz("Europe/Moscow").format('D.MM.YYYY HH:mm:ss')
  trasferNumber.create({
    transferDate,
    transferredNumber,
    userPhone,
    fromMosсow,
    date,
  })
    .then((result) => {

      bot.sendMessage(-1001742268685,
        `————————————
        *Новая заявка* 

*Перенос номера*

Дата переноса: *${transferDate}*
Переносимый номер: *${transferredNumber}*

Контактный телефон: *${userPhone}*
Откуда заявка: *${fromMosсow}*
Дата: *${date}*
————————————`, { parse_mode: 'Markdown' });


      res.status(200).send({ result })
    })
    .catch((err) => {
      if (err.name === 'MongoError' && err.code === 11000) {
        throw new ConflictError('При регистрации указан email, который уже существует на сервере');
      }
      if (err.name === 'ValidationError') {
        throw new InvalidDataError('Переданы некорректные данные при создании пользователя');
      }
    })
    .catch(next)
};
