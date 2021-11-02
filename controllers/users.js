const moment = require('moment-timezone');


const User = require('../models/user');
const ConflictError = require('../errors/сonflict-err');
const InvalidDataError = require('../errors/invalid-data-err');
const NotFoundError = require('../errors/not-found-err')



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
    .then((user) => {
      res.status(200).send({ user })
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


module.exports.findByTgId = (req, res, next) => {
  const {
    telegram_id
  } = req.body;
  User.findOne({
    telegram_id
  }).orFail(() => new Error('NotFound'))
    .then((user) => {
      res.status(200).send({ user })
    })
    .catch((err) => {
      console.log(err)
      if (err.code === 11000) {
        throw new ConflictError('MongoError');
      }
      if (err.name === 'ValidationError') {
        throw new InvalidDataError('Переданы некорректные данные при поиске пользователя');
      }
      if (err.message === 'NotFound') {
        throw new NotFoundError('Пользователь по указанному id не найден');
      }
    })
    .catch(next)
};


module.exports.getOrdersByTgId = (req, res, next) => {
  const {
    telegram_id
  } = req.body;
  User.findOne({
    telegram_id
  }).orFail(() => new Error('NotFound'))
    .populate('order_history.order_id')
    .then((user) => {
      if (user.order_history.length === 0) throw new Error('NullOrders');
      let orders = []
      user.order_history.forEach((item) => {
        orders = [...orders, {
          order_id: item.order_id._id,
          order_date: item.date,
          object_address: item.order_id.object_address,
          flats: item.order_id.flats,
          order_status: item.order_id.status,
          items_length: item.order_id.order_items.length,
          ready_items: item.order_id.order_items.filter((order_item)=>{
            if (order_item.status.toLowerCase() === 'завершена') return true
            else return false
          }).length,
          ready_percent: Math.round(item.order_id.order_items.filter((order_item)=>{
            if (order_item.status.toLowerCase() === 'завершена') return true
            else return false
          }).length / item.order_id.order_items.length * 100 )
        }]
      })

      console.log(orders)


      orders = orders.reverse()


      res.status(200).send({ orders })
    })
    .catch((err) => {
      console.log(err)
      if (err.code === 11000) {
        throw new ConflictError('MongoError');
      }
      if (err.name === 'ValidationError') {
        throw new InvalidDataError('Переданы некорректные данные при поиске пользователя');
      }
      if (err.message === 'NotFound') {
        throw new NotFoundError('Пользователь по указанному id не найден');
      }
      if (err.message === 'NullOrders') {
        throw new NotFoundError('Осутствуют заказы');
      }
    })
    .catch(next)
};
