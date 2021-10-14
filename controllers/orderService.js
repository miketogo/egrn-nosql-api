const moment = require('moment-timezone');
const TelegramBot = require('node-telegram-bot-api');


const orderService = require('../models/orderService');
const ConflictError = require('../errors/сonflict-err');
const InvalidDataError = require('../errors/invalid-data-err');

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: false });



module.exports.order = (req, res, next) => {
  const {
    serviceName, userPhone, fromMosсow
  } = req.body;
  const realDate = new Date
  let date = moment(realDate.toISOString()).tz("Europe/Moscow").format('D.MM.YYYY HH:mm:ss')
  orderService.create({
    serviceName, userPhone, fromMosсow, date
  })
    .then((result) => {
      // const opts = {
      //   reply_markup: {
      //     inline_keyboard: [
      //       [
      //         {
      //           text: 'Нажми на меня',
      //           callback_data: 'delete_notification'
      //         }
      //       ]
      //     ]
      //   }
      // };
      if (serviceName === "Подключение eSim") {
        bot.sendMessage(-1001742268685,
          `Новая заявка на подключение eSIM
          
*${serviceName}*
          
Телефон: *${userPhone}*
Откуда заявка: *${fromMosсow}*
Дата: *${date}*
`, { parse_mode: 'Markdown' });
      } else {
        bot.sendMessage(-1001742268685,
          `Новая заявка на подключение услуги
          
Название услуги: *${serviceName}*
Телефон: *${userPhone}*
Откуда заявка: *${fromMosсow}*
Дата: *${date}*
`, { parse_mode: 'Markdown' });
      }

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
    .catch(next);
};
