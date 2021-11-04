const moment = require('moment-timezone');
const voucher_codes = require('voucher-code-generator');

const User = require('../models/user');
const PromoCode = require('../models/promoCode');
const ConflictError = require('../errors/сonflict-err');
const InvalidDataError = require('../errors/invalid-data-err');
const opts = {
  new: true,
  runValidators: true,
};




module.exports.create = (req, res, next) => {
  const {
    amount,
    customCode,
  } = req.body;
  let code
  if (customCode) code = customCode
  else {
    code = voucher_codes.generate({
      length: 8,
      count: 1,
    })[0];
  }
  
  const realDate = new Date
  let date = moment(realDate.toISOString()).tz("Europe/Moscow").format('D.MM.YYYY HH:mm:ss')
  PromoCode.create({
    code: code,
    amount,
    date,
  })
    .then((code) => {
      res.status(200).send({ code })
    })
    .catch((err) => {
      console.log(err)
      if (err.code === 11000) {
        throw new ConflictError('Код уже существует на сервере');
      }
      if (err.name === 'ValidationError') {
        throw new InvalidDataError('Переданы некорректные данные при создании кода');
      }
    })
    .catch(next)
};


module.exports.useCode = (req, res, next) => {
  const realDate = new Date
  let date = moment(realDate.toISOString()).tz("Europe/Moscow").format('D.MM.YYYY HH:mm:ss')
  const {
    telegram_id,
    code
  } = req.body;
  User.findOne({
    telegram_id
  }).orFail(() => new Error('NotFound'))
    .then((user) => {
      PromoCode.findOne({
        code
      }).orFail(() => new Error('NotFound'))
        .then((code) => {
          if (code.isUsed === true) throw new Error('CodeIsUsed')
          User.findByIdAndUpdate(user._id, {
            balance: user.balance + code.amount,
            payment_history: [...user.payment_history , {
              date: date,
              type: `Активация промокода ${code.code} на сумму ${code.amount}`,
              amount: code.amount,
            }]
          }, opts)
            .then((UPDUser) => {
              PromoCode.findByIdAndUpdate(code._id, {
                isUsed: true
              }, opts)
              .then((UPDCode) => {
                res.status(200).send({ UPDUser })
              })
                .catch((err) => {
                  console.log(err)
                  if (err.code === 11000) {
                    throw new ConflictError('MongoError');
                  }
                })
                .catch(next)
            })
            .catch((err) => {
              console.log(err)
              if (err.code === 11000) {
                throw new ConflictError('MongoError');
              }
            })
            .catch(next)
        })
        .catch((err) => {
          console.log(err)
          if (err.code === 11000) {
            throw new ConflictError('MongoError');
          }
          if (err.name === 'ValidationError') {
            throw new InvalidDataError('Переданы некорректные данные');
          }
          if (err.message === 'NotFound') {
            throw new InvalidDataError('Код не найден');
          }
          if (err.message === 'CodeIsUsed') {
            throw new InvalidDataError('Код уже использован');
          }
        })
        .catch(next)
    })
    .catch((err) => {
      console.log(err)
      if (err.code === 11000) {
        throw new ConflictError('MongoError');
      }
      if (err.name === 'ValidationError') {
        throw new InvalidDataError('Переданы некорректные данные');
      }
      if (err.message === 'NotFound') {
        throw new InvalidDataError('Пользователь по указанному id не найден');
      }
    })
    .catch(next)
};
