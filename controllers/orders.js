const moment = require('moment-timezone');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));


const User = require('../models/user');
const Order = require('../models/order');
const ConflictError = require('../errors/сonflict-err');
const InvalidDataError = require('../errors/invalid-data-err');
const NotFoundError = require('../errors/not-found-err')
const NotEnoughRightsError = require('../errors/not-enough-rights-err')

const opts = {
  new: true,
  runValidators: true,
};


module.exports.create = (req, res, next) => {


  async function fetchToSelenium(user_id, order_id){

    const body = {
      user_id: user_id,
      order_id: order_id
    }
    const response = await fetch('http://egrn-api-selenium.ru/create', {
      method: 'post',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    console.log(data);
  }


  const {
    telegram_id = null,
    user_id = null,
    object_address,
    town,
    street,
    house,
    flats,
    single_cadastral = null,
  } = req.body;
  const realDate = new Date
  let user
  let date = moment(realDate.toISOString()).tz("Europe/Moscow").format('D.MM.YYYY HH:mm:ss')
  let order_items = []
  if (flats.replace(/\d/g, '').length === 0) {
    let item = {
      appartment: Number(flats),
      cadastral: single_cadastral
    }
    order_items = [item]



  } else if (flats.split(';').length > 1) {
    let multiplyFlats = flats.split(';')
    console.log(multiplyFlats.length)
    for (let index = 0; index < multiplyFlats.length; index++) {
      let faltsRange = multiplyFlats[index].split('-')
      for (let flatNumber = faltsRange[0]; flatNumber <= faltsRange[1]; flatNumber++) {
        let item = {
          appartment: flatNumber
        }
        order_items = [...order_items, item]
      }
    }

  } else {
    let faltsRange = flats.split('-')
    for (let flatNumber = faltsRange[0]; flatNumber <= faltsRange[1]; flatNumber++) {
      let item = {
        appartment: flatNumber
      }
      order_items = [...order_items, item]
    }

  }
  if (telegram_id) {
    User.findOne({ telegram_id: telegram_id }).orFail(() => new Error('NotFound'))
      .then((user) => {
        if (user.balance < order_items.length) {
          throw new Error('InsufficientFunds')
        } else {
          User.findByIdAndUpdate(user._id, {
            balance: user.balance - order_items.length
          }, opts)
            .then(() => {

              Order.create({
                object_address,
                town,
                street,
                house,
                flats,
                order_items,
                date,
              })
                .then((order) => {
                  order_history = [...user.order_history, {
                    order_id: order._id,
                    date
                  }]
                  payment_history = [...user.payment_history, {
                    amount: - order_items.length,
                    date
                  }]
                  User.findByIdAndUpdate(user._id, {
                    order_history,
                    payment_history
                  }, opts)
                    .then(() => {

                      

                      
                      fetchToSelenium(user._id, order._id)

                      
                      res.status(200).send({ order_created: true })
                    })
                    .catch(next)


                })
                .catch((err) => {
                  console.log(err)
                  if (err.code === 11000) {
                    throw new ConflictError('MongoError');
                  }
                  if (err.name === 'ValidationError') {
                    throw new InvalidDataError('Переданы некорректные данные при создании пользователя');
                  }
                })
                .catch(next)


            })
            .catch(next)
        }

      })
      .catch((err) => {
        if (err.message === 'InsufficientFunds') {
          throw new NotEnoughRightsError('Недостаточно средств');
        }
        if (err.message === 'NotFound') {
          throw new NotFoundError('Нет пользователя с таким id');
        }
        console.log(err)
      })
      .catch(next)
  }

  // res.status(200).send({
  //   telegram_id,
  //   object_address,
  //   town,
  //   street,
  //   house,
  //   flats,
  //   order_items,
  //   date,
  // })

  // for (let index = 0; index < array.length; index++) {


  // }


};


module.exports.updateOrderItem = (req, res, next) => {
  const {
    order_id,
    order_item_id,
    rosreestr_key,
    response_id,
    status,
  } = req.body;
  Order.findById(order_id).orFail(() => new Error('NotFound'))
    .then((order) => {
      order_item = order.order_items.filter((itm) => {
        if (itm._id !== null && itm._id === order_item_id) {
          return item
        } return false
      })
    })

    .catch((err) => {
      if (err.message === 'InsufficientFunds') {
        throw new NotEnoughRightsError('Недостаточно средств');
      }
      if (err.message === 'NotFound') {
        throw new NotFoundError('Нет пользователя с таким id');
      }
      console.log(err)
    })
    .catch(next)
}