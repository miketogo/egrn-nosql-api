const moment = require('moment-timezone');
const TelegramBot = require('node-telegram-bot-api');


const orderTariff = require('../models/orderTariff');
const ConflictError = require('../errors/сonflict-err');
const InvalidDataError = require('../errors/invalid-data-err');

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: false });



module.exports.order = (req, res, next) => {
  const {
    tariffName,
    tariffOptions,
    unlimitedInternet,
    modem,
    productionMethod,
    selectedNumber = false,
    deliveryDate = false,
    deliveryTime = false,
    deliveryAddress = false,
    transferredNumber = false,
    deliveryMethod = false,
    userPhone,
    fromMosсow
  } = req.body;
  const realDate = new Date
  let date = moment(realDate.toISOString()).tz("Europe/Moscow").format('D.MM.YYYY HH:mm:ss')
  if (productionMethod === "Купить новую SIM") {
    if (deliveryMethod === "Доставка") {
      orderTariff.create({
        tariffName,
        tariffOptions,
        unlimitedInternet,
        modem,
        productionMethod,
        selectedNumber,
        deliveryMethod,
        deliveryDate,
        deliveryTime,
        deliveryAddress,
        userPhone,
        fromMosсow,
        date,
      })
        .then((result) => {

          bot.sendMessage(-665556054,
            `Новая заявка на подключение тарифа
              
Способ подключения: *${productionMethod}*
Способ получения: *${deliveryMethod}*
Дата доставки: *${deliveryDate}*
Время доставки: *${deliveryTime}*
Адрес доставки: *${deliveryAddress}*


Название тарифа: *${tariffName}*
Опции тарифа: *${tariffOptions}*
Безлимитный 4G: *${unlimitedInternet? "Да": "Нет"}*
Раздача интернета: *${modem? "Да": "Нет"}*
Выбранный номер: *${selectedNumber.number}*
Категория выбранного номера: *${selectedNumber.category}*

Контактный телефон: *${userPhone}*
Откуда заявка: *${fromMosсow}*
Дата: *${date}*
    `, { parse_mode: 'Markdown' });


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
    }

    else {
      orderTariff.create({
        tariffName,
        tariffOptions,
        unlimitedInternet,
        modem,
        productionMethod,
        selectedNumber,
        deliveryMethod,
        userPhone,
        fromMosсow,
        date,
      })
        .then((result) => {

          bot.sendMessage(-665556054,
            `Новая заявка на подключение тарифа
              
Способ подключения: *${productionMethod}*
Способ получения: *${deliveryMethod}*
            
            
Название тарифа: *${tariffName}*
Опции тарифа: *${tariffOptions}*
Безлимитный 4G: *${unlimitedInternet? "Да": "Нет"}*
Раздача интернета: *${modem? "Да": "Нет"}*
Выбранный номер: *${selectedNumber.number}*
Категория выбранного номера: *${selectedNumber.category}*
            
Контактный телефон: *${userPhone}*
Откуда заявка: *${fromMosсow}*
Дата: *${date}*
    `, { parse_mode: 'Markdown' });


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
    }

  }
  else {
    orderTariff.create({
      tariffName,
      tariffOptions,
      unlimitedInternet,
      modem,
      productionMethod,
      transferredNumber,
      userPhone,
      fromMosсow,
      date,
    })
      .then((result) => {

        bot.sendMessage(-665556054,
                      `Новая заявка на подключение тарифа
              
Способ подключения: *${productionMethod}*
Переносимый номер: *${transferredNumber}*           
            
Название тарифа: *${tariffName}*
Опции тарифа: *${tariffOptions}*
Безлимитный 4G: *${unlimitedInternet? "Да": "Нет"}*
Раздача интернета: *${modem? "Да": "Нет"}*

            
Контактный телефон: *${userPhone}*
Откуда заявка: *${fromMosсow}*
Дата: *${date}*
    `, { parse_mode: 'Markdown' });


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
  }
  ;
};