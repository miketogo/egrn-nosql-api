const moment = require('moment-timezone');
const TelegramBot = require('node-telegram-bot-api');


const buyNumbers = require('../models/buyNumbers');
const ConflictError = require('../errors/сonflict-err');
const InvalidDataError = require('../errors/invalid-data-err');

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: false });



module.exports.order = (req, res, next) => {
  const {
    deliveryDate,
    deliveryTime,
    deliveryAddress,
    deliveryMethod,
    numbersArray,
    userPhone,
    fromMosсow,
  } = req.body;
  const realDate = new Date
  let date = moment(realDate.toISOString()).tz("Europe/Moscow").format('D.MM.YYYY HH:mm:ss')
  if (deliveryMethod === "Доставка") {
    buyNumbers.create({
      deliveryDate,
      deliveryTime,
      deliveryAddress,
      deliveryMethod,
      numbersArray,
      userPhone,
      fromMosсow,
      date
    })
      .then((result) => {

        bot.sendMessage(-1001742268685,
          `————————————
        *Новая заявка*

Способ получения: *${deliveryMethod}*
Дата доставки: *${deliveryDate}*
Время доставки: *${deliveryTime}*
Адрес доставки: *${deliveryAddress}*

${numbersArray.map((item, i) => {
            `____________
*Выбранный номер ${i+1}*

Номер: *${item.ctn}*
Категория: *${item.category}*
Тариф: *${item.tariffName}*
Опции тарифа: *${item.tariffOptions}*
Безлимитный 4G: *${item['Безлимитный 4G']? "Да": "Нет"}*
Раздача интернета: *${item['Раздача интернета']? "Да": "Нет"}*
____________`
          }).join("")}

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
      .catch(next);
  }
  else {
    buyNumbers.create({
      deliveryMethod,
      numbersArray,
      userPhone,
      fromMosсow,
      date
    })
      .then((result) => {

        bot.sendMessage(-1001742268685,
          `————————————
          *Новая заявка*

Способ получения: *${deliveryMethod}*

${numbersArray.map((item, i) => {
  `____________
*Выбранный номер ${i+1}*

Номер: *${item.ctn}*
Категория: *${item.category}*
Тариф: *${item.tariffName}*
Опции тарифа: *${item.tariffOptions}*
Безлимитный 4G: *${item['Безлимитный 4G']? "Да": "Нет"}*
Раздача интернета: *${item['Раздача интернета']? "Да": "Нет"}*
____________`
}).join("")}

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
      .catch(next);
  }
};
