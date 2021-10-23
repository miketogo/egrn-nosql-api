const moment = require('moment-timezone');


const rosReesterKey = require('../models/rosReesterKey')
const ConflictError = require('../errors/сonflict-err');
const InvalidDataError = require('../errors/invalid-data-err');
const NotFoundError = require('../errors/not-found-err')

const opts = {
  new: true,
  runValidators: true,
};



module.exports.create = (req, res, next) => {
  const {
    key,
    balance = 0,
    owner,
  } = req.body;
  const realDate = new Date
  let date = moment(realDate.toISOString()).tz("Europe/Moscow").format('D.MM.YYYY HH:mm:ss')
  rosReesterKey.create({
    key,
    balance,
    key_owner: owner,
    date,
  })
    .then((key) => {
      res.status(200).send({ key })
    })
    .catch((err) => {
      console.log(err)
      if (err.code === 11000) {
        throw new ConflictError('Этот ключ уже существует на сервере');
      }
      if (err.name === 'ValidationError') {
        throw new InvalidDataError('Переданы некорректные данные при создании ключа');
      }
    })
    .catch(next)
};


module.exports.addBalance = (req, res, next) => {
  const {
    key = null,
    deposit,
    id = null,
  } = req.body;
  if (id !== null && key !== null) {
    throw new InvalidDataError('Можно отправить либо ключ либо id');
  } else
    if (id !== null) {
      rosReesterKey.findById(id).orFail(() => new Error('NotFound'))
        .then((key) => {

          rosReesterKey.findByIdAndUpdate(key._id, {
            balance: key.balance + deposit
          }, opts)
            .then((key) => {
              res.status(200).send({ key })
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
          if (err.message === 'NotFound') {
            throw new NotFoundError('Нет ключа с таким id');
          }
        })
        .catch(next)



    } else
      if (key !== null) {
        rosReesterKey.findOne({ key }).orFail(() => new Error('NotFound'))
          .then((key) => {

            rosReesterKey.findByIdAndUpdate(key._id, {
              balance: key.balance + deposit
            }, opts)
              .then((key) => {
                res.status(200).send({ key })
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
            if (err.message === 'NotFound') {
              throw new NotFoundError('Нет такого ключа');
            }
          })
          .catch(next)



      }
}

module.exports.withdrawBalance = (req, res, next) => {
  const {
    key = null,
    withdraw,
    id = null,
  } = req.body;
  if (id !== null && key !== null) {
    throw new InvalidDataError('Можно отправить либо ключ либо id');
  } else
    if (id !== null) {
      rosReesterKey.findById(id).orFail(() => new Error('NotFound'))
        .then((key) => {
          if (key.balance === 0) throw new Error('ZeroBalance')
          if (key.balance - withdraw < 0) throw new Error('UncorrectWithdraw')
          rosReesterKey.findByIdAndUpdate(key._id, {
            balance: key.balance - withdraw
          }, opts)
            .then((key) => {
              res.status(200).send({ key })
            })
            .catch((err) => {
              console.log(err)
              if (err.code === 11000) {
                throw new ConflictError('MongoError');
              }
              if (err.message === 'UncorrectWithdraw') {
                throw new ConflictError('Слишком большая сумма списания');
              }
              if (err.message === 'ZeroBalance') {
                throw new ConflictError('Баланс ключа равен нулю, невозможно списать средства');
              }
            })
            .catch(next)


        })
        .catch((err) => {
          console.log(err)
          if (err.code === 11000) {
            throw new ConflictError('MongoError');
          }
          if (err.message === 'NotFound') {
            throw new NotFoundError('Нет ключа с таким id');
          }
          if (err.message === 'ZeroBalance') {
            throw new ConflictError('Баланс ключа равен нулю, невозможно списать средства');
          }
          if (err.message === 'UncorrectWithdraw') {
            throw new ConflictError('Слишком большая сумма списания');
          }
        })
        .catch(next)



    } else
      if (key !== null) {
        rosReesterKey.findOne({ key }).orFail(() => new Error('NotFound'))
          .then((key) => {
            if (key.balance === 0) throw new Error('ZeroBalance')
            if (key.balance - withdraw < 0) throw new Error('UncorrectWithdraw')
            rosReesterKey.findByIdAndUpdate(key._id, {
              balance: key.balance - withdraw
            }, opts)
              .then((key) => {
                res.status(200).send({ key })
              })
              .catch((err) => {
                console.log(err)
                if (err.code === 11000) {
                  throw new ConflictError('MongoError');
                }
                if (err.message === 'UncorrectWithdraw') {
                  throw new ConflictError('Слишком большая сумма списания');
                }
                if (err.message === 'ZeroBalance') {
                  throw new ConflictError('Баланс ключа равен нулю, невозможно списать средства');
                }
              })
              .catch(next)


          })
          .catch((err) => {
            console.log(err)
            if (err.code === 11000) {
              throw new ConflictError('MongoError');
            }
            if (err.message === 'NotFound') {
              throw new NotFoundError('Нет такого ключа');
            }
            if (err.message === 'UncorrectWithdraw') {
              throw new ConflictError('Слишком большая сумма списания');
            }
            if (err.message === 'ZeroBalance') {
              throw new ConflictError('Баланс ключа равен нулю, невозможно списать средства');
            }
          })
          .catch(next)



      }
}