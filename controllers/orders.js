const moment = require('moment-timezone');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));


const rosReesterKey = require('../models/rosReesterKey')
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


  async function fetchToSelenium(user_id, order_id) {

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
    region,
    house,
    flats = '',
    non_residential_flats = '',
    single_cadastral = null,
  } = req.body;
  if (flats === '' && non_residential_flats === '') throw new Error('NoFlatsInOrder')
  if (flats !== '' && non_residential_flats === '') {
    rosReesterKey.find({}).orFail(() => new Error('NotFound')).then((keys) => {
      let notZeroKeys = keys.filter((key) => {
        if (key.balance <= 0 || key.inactive) return false
        else return true
      })
      if (notZeroKeys.length === 0) throw new Error('AllZeroKeys')

      console.log(notZeroKeys)
      const realDate = new Date
      let user
      let date = moment(realDate.toISOString()).tz("Europe/Moscow").format('D.MM.YYYY HH:mm:ss')
      let order_items = []

      let keyWithdraws = []
      let keyIndex = 0
      for (let index = 0; index < notZeroKeys.length; index++) {
        keyWithdraws = [...keyWithdraws, {
          _id: notZeroKeys[index]._id,
          key: notZeroKeys[index].key,
          balance: notZeroKeys[index].balance,
        }]

      }
      keyWithdraws = keyWithdraws.sort(function (a, b) {

        if (a.balance < b.balance) return 1;
        if (b.balance < a.balance) return -1;

        return 0;
      })
      console.log('sort', keyWithdraws)

      if (flats.replace(/\d/g, '').length === 0) {
        let item = {
          appartment: Number(flats),
          cadastral: single_cadastral,
          rosreestr_key: keyWithdraws[0].key
        }
        keyWithdraws = keyWithdraws.map((item, i) => {
          if (item.key === keyWithdraws[0].key) {
            return {
              _id: item._id,
              key: item.key,
              balance: item.balance - 1
            }
          } return item
        })
        order_items = [item]


      } else if (flats.split(';').length > 1) {
        let multiplyFlats = flats.split(';')
        console.log(multiplyFlats.length)

        console.log('withdrawkeys', keyWithdraws)
        for (let index = 0; index < multiplyFlats.length; index++) {
          let faltsRange = multiplyFlats[index].split('-')
          for (let flatNumber = faltsRange[0]; flatNumber <= faltsRange[1]; flatNumber++) {
            console.log('item', keyWithdraws)
            if (keyWithdraws.filter((item) => {

              if (item && item.balance === 0) return false
              else return true
            }).length === 0) {
              throw new Error('NotEnoughtBalance')
            }
            if (keyWithdraws[keyIndex].balance === 0) {

              if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
              else keyIndex = keyIndex + 1
              flatNumber = flatNumber - 1
              continue
            }

            keyWithdraws = keyWithdraws.map((item, i) => {
              if (item.key === keyWithdraws[keyIndex].key) {
                return {
                  _id: item._id,
                  key: item.key,
                  balance: item.balance - 1
                }
              } return item
            })
            console.log(keyWithdraws)
            let item = {
              rosreestr_key: keyWithdraws[keyIndex].key,
              appartment: flatNumber
            }
            order_items = [...order_items, item]
            if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
            else keyIndex = keyIndex + 1
          }
        }

      } else {

        let faltsRange = flats.split('-')
        for (let flatNumber = faltsRange[0]; flatNumber <= faltsRange[1]; flatNumber++) {
          if (keyWithdraws.filter((item) => {

            if (item && item.balance === 0) return false
            else return true
          }).length === 0) {
            throw new Error('NotEnoughtBalance')
          }
          if (keyWithdraws[keyIndex].balance === 0) {

            if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
            else keyIndex = keyIndex + 1
            flatNumber = flatNumber - 1
            continue
          }

          keyWithdraws = keyWithdraws.map((item, i) => {
            if (item.key === keyWithdraws[keyIndex].key) {
              return {
                _id: item._id,
                key: item.key,
                balance: item.balance - 1
              }
            } return item
          })
          console.log(keyWithdraws)
          let item = {
            rosreestr_key: keyWithdraws[keyIndex].key,
            appartment: flatNumber
          }
          order_items = [...order_items, item]
          if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
          else keyIndex = keyIndex + 1
        }

      }
      if (telegram_id) {
        User.findOne({ telegram_id: telegram_id }).orFail(() => new Error('NotFound'))
          .then((user) => {
            if (user.balance < order_items.length) {
              throw new Error('InsufficientFunds')
            } else {
              keyWithdraws.forEach((item, i) => {
                let prevKeyData = notZeroKeys.filter((notzerokey) => {
                  if (notzerokey.key === item.key) return true
                  else return false
                })
                if (prevKeyData[0].balance === item.balance) return
                rosReesterKey.findById(item._id)
                  .then((realKeyData) => {
                    rosReesterKey.findByIdAndUpdate(item._id, {
                      balance: realKeyData.balance - (prevKeyData[0].balance - item.balance)
                    })
                      .then((key) => {
                        console.log("multiFlatRes", key)
                      })
                      .catch((err) => {
                        console.log(err)
                      })
                  })
                  .catch((err) => {
                    console.log(err)
                  })

              })
              User.findByIdAndUpdate(user._id, {
                balance: user.balance - order_items.length,
                payment_history: [...user.payment_history, {
                  date: date,
                  type: `Оплата заказа по адресу ${object_address}, колличество отчетов ${order_items.length}`,
                  amount: - order_items.length,
                }]
              }, opts)
                .then(() => {

                  Order.create({
                    object_address,
                    town,
                    street,
                    region,
                    house,
                    flats,
                    non_residential_flats,
                    order_items,
                    date,
                  })
                    .then((order) => {
                      order_history = [...user.order_history, {
                        order_id: order._id,
                        date
                      }]

                      User.findByIdAndUpdate(user._id, {
                        order_history
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
                        throw new InvalidDataError('Переданы некорректные данные при создании заказа');
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

    })
      .catch((err) => {
        console.log(err)
        if (err.code === 11000) {
          throw new ConflictError('MongoError');
        }
        if (err.message === 'NotFound') {
          throw new NotFoundError('Нет ключей');
        }
        if (err.message === 'AllZeroKeys') {
          throw new ConflictError('Все ключи с нулевым балансом, пополните балансы ключей');
        }
        if (err.message === 'NotEnoughtBalance') {
          throw new ConflictError('Недостаточно суммарного баланса на ключах для составления заказа');
        }
      })
      .catch(next)

  }
  else if (flats === '' && non_residential_flats !== '') {
    rosReesterKey.find({}).orFail(() => new Error('NotFound')).then((keys) => {
      let notZeroKeys = keys.filter((key) => {
        if (key.balance <= 0 || key.inactive) return false
        else return true
      })
      if (notZeroKeys.length === 0) throw new Error('AllZeroKeys')

      console.log(notZeroKeys)
      const realDate = new Date
      let user
      let date = moment(realDate.toISOString()).tz("Europe/Moscow").format('D.MM.YYYY HH:mm:ss')
      let order_items = []

      let keyWithdraws = []
      let keyIndex = 0
      for (let index = 0; index < notZeroKeys.length; index++) {
        keyWithdraws = [...keyWithdraws, {
          _id: notZeroKeys[index]._id,
          key: notZeroKeys[index].key,
          balance: notZeroKeys[index].balance,
        }]

      }
      keyWithdraws = keyWithdraws.sort(function (a, b) {

        if (a.balance < b.balance) return 1;
        if (b.balance < a.balance) return -1;

        return 0;
      })
      console.log('sort', keyWithdraws)

      if (non_residential_flats.replace(/\d/g, '').length === 0) {
        let item = {
          appartment: Number(non_residential_flats) + '-Н',
          cadastral: single_cadastral,
          rosreestr_key: keyWithdraws[0].key
        }
        keyWithdraws = keyWithdraws.map((item, i) => {
          if (item.key === keyWithdraws[0].key) {
            return {
              _id: item._id,
              key: item.key,
              balance: item.balance - 1
            }
          } return item
        })
        order_items = [item]


      } else if (non_residential_flats.split(';').length > 1) {
        let non_residential_flats = non_residential_flats.split(';')
        console.log(multiplyFlats.length)

        console.log('withdrawkeys', keyWithdraws)
        for (let index = 0; index < multiplyFlats.length; index++) {
          let faltsRange = multiplyFlats[index].split('-')
          for (let flatNumber = faltsRange[0]; flatNumber <= faltsRange[1]; flatNumber++) {
            console.log('item', keyWithdraws)
            if (keyWithdraws.filter((item) => {

              if (item && item.balance === 0) return false
              else return true
            }).length === 0) {
              throw new Error('NotEnoughtBalance')
            }
            if (keyWithdraws[keyIndex].balance === 0) {

              if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
              else keyIndex = keyIndex + 1
              flatNumber = flatNumber - 1
              continue
            }

            keyWithdraws = keyWithdraws.map((item, i) => {
              if (item.key === keyWithdraws[keyIndex].key) {
                return {
                  _id: item._id,
                  key: item.key,
                  balance: item.balance - 1
                }
              } return item
            })
            console.log(keyWithdraws)
            let item = {
              rosreestr_key: keyWithdraws[keyIndex].key,
              appartment: flatNumber + '-Н'
            }
            order_items = [...order_items, item]
            if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
            else keyIndex = keyIndex + 1
          }
        }

      } else {

        let faltsRange = non_residential_flats.split('-')
        for (let flatNumber = faltsRange[0]; flatNumber <= faltsRange[1]; flatNumber++) {
          if (keyWithdraws.filter((item) => {

            if (item && item.balance === 0) return false
            else return true
          }).length === 0) {
            throw new Error('NotEnoughtBalance')
          }
          if (keyWithdraws[keyIndex].balance === 0) {

            if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
            else keyIndex = keyIndex + 1
            flatNumber = flatNumber - 1
            continue
          }

          keyWithdraws = keyWithdraws.map((item, i) => {
            if (item.key === keyWithdraws[keyIndex].key) {
              return {
                _id: item._id,
                key: item.key,
                balance: item.balance - 1
              }
            } return item
          })
          console.log(keyWithdraws)
          let item = {
            rosreestr_key: keyWithdraws[keyIndex].key,
            appartment: flatNumber + '-Н'
          }
          order_items = [...order_items, item]
          if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
          else keyIndex = keyIndex + 1
        }

      }
      if (telegram_id) {
        User.findOne({ telegram_id: telegram_id }).orFail(() => new Error('NotFound'))
          .then((user) => {
            if (user.balance < order_items.length) {
              throw new Error('InsufficientFunds')
            } else {
              keyWithdraws.forEach((item, i) => {
                let prevKeyData = notZeroKeys.filter((notzerokey) => {
                  if (notzerokey.key === item.key) return true
                  else return false
                })
                if (prevKeyData[0].balance === item.balance) return
                rosReesterKey.findById(item._id)
                  .then((realKeyData) => {
                    rosReesterKey.findByIdAndUpdate(item._id, {
                      balance: realKeyData.balance - (prevKeyData[0].balance - item.balance)
                    })
                      .then((key) => {
                        console.log("multiFlatRes", key)
                      })
                      .catch((err) => {
                        console.log(err)
                      })
                  })
                  .catch((err) => {
                    console.log(err)
                  })

              })
              User.findByIdAndUpdate(user._id, {
                balance: user.balance - order_items.length,
                payment_history: [...user.payment_history, {
                  date: date,
                  type: `Оплата заказа по адресу ${object_address}, колличество отчетов ${order_items.length}`,
                  amount: - order_items.length,
                }]
              }, opts)
                .then(() => {

                  Order.create({
                    object_address,
                    town,
                    street,
                    region,
                    house,
                    flats,
                    non_residential_flats,
                    order_items,
                    date,
                  })
                    .then((order) => {
                      order_history = [...user.order_history, {
                        order_id: order._id,
                        date
                      }]

                      User.findByIdAndUpdate(user._id, {
                        order_history
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
                        throw new InvalidDataError('Переданы некорректные данные при создании заказа');
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

    })
      .catch((err) => {
        console.log(err)
        if (err.code === 11000) {
          throw new ConflictError('MongoError');
        }
        if (err.message === 'NotFound') {
          throw new NotFoundError('Нет ключей');
        }
        if (err.message === 'AllZeroKeys') {
          throw new ConflictError('Все ключи с нулевым балансом, пополните балансы ключей');
        }
        if (err.message === 'NotEnoughtBalance') {
          throw new ConflictError('Недостаточно суммарного баланса на ключах для составления заказа');
        }
      })
      .catch(next)

  }
  else if (flats !== '' && non_residential_flats !== '') {
    rosReesterKey.find({}).orFail(() => new Error('NotFound')).then((keys) => {
      let notZeroKeys = keys.filter((key) => {
        if (key.balance <= 0 || key.inactive) return false
        else return true
      })
      if (notZeroKeys.length === 0) throw new Error('AllZeroKeys')

      console.log(notZeroKeys)
      const realDate = new Date
      let user
      let date = moment(realDate.toISOString()).tz("Europe/Moscow").format('D.MM.YYYY HH:mm:ss')
      let order_items = []

      let keyWithdraws = []
      let keyIndex = 0
      for (let index = 0; index < notZeroKeys.length; index++) {
        keyWithdraws = [...keyWithdraws, {
          _id: notZeroKeys[index]._id,
          key: notZeroKeys[index].key,
          balance: notZeroKeys[index].balance,
        }]

      }
      keyWithdraws = keyWithdraws.sort(function (a, b) {

        if (a.balance < b.balance) return 1;
        if (b.balance < a.balance) return -1;

        return 0;
      })
      console.log('sort', keyWithdraws)
      if (flats.replace(/\d/g, '').length === 0) {
        let item = {
          appartment: Number(flats),
          cadastral: single_cadastral,
          rosreestr_key: keyWithdraws[0].key
        }
        keyWithdraws = keyWithdraws.map((item, i) => {
          if (item.key === keyWithdraws[0].key) {
            return {
              _id: item._id,
              key: item.key,
              balance: item.balance - 1
            }
          } return item
        })
        order_items = [item]


      } else if (flats.split(';').length > 1) {
        let multiplyFlats = flats.split(';')
        console.log(multiplyFlats.length)

        console.log('withdrawkeys', keyWithdraws)
        for (let index = 0; index < multiplyFlats.length; index++) {
          let faltsRange = multiplyFlats[index].split('-')
          for (let flatNumber = faltsRange[0]; flatNumber <= faltsRange[1]; flatNumber++) {
            console.log('item', keyWithdraws)
            if (keyWithdraws.filter((item) => {

              if (item && item.balance === 0) return false
              else return true
            }).length === 0) {
              throw new Error('NotEnoughtBalance')
            }
            if (keyWithdraws[keyIndex].balance === 0) {

              if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
              else keyIndex = keyIndex + 1
              flatNumber = flatNumber - 1
              continue
            }

            keyWithdraws = keyWithdraws.map((item, i) => {
              if (item.key === keyWithdraws[keyIndex].key) {
                return {
                  _id: item._id,
                  key: item.key,
                  balance: item.balance - 1
                }
              } return item
            })
            console.log(keyWithdraws)
            let item = {
              rosreestr_key: keyWithdraws[keyIndex].key,
              appartment: flatNumber
            }
            order_items = [...order_items, item]
            if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
            else keyIndex = keyIndex + 1
          }
        }

      } else {

        let faltsRange = flats.split('-')
        for (let flatNumber = faltsRange[0]; flatNumber <= faltsRange[1]; flatNumber++) {
          if (keyWithdraws.filter((item) => {

            if (item && item.balance === 0) return false
            else return true
          }).length === 0) {
            throw new Error('NotEnoughtBalance')
          }
          if (keyWithdraws[keyIndex].balance === 0) {

            if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
            else keyIndex = keyIndex + 1
            flatNumber = flatNumber - 1
            continue
          }

          keyWithdraws = keyWithdraws.map((item, i) => {
            if (item.key === keyWithdraws[keyIndex].key) {
              return {
                _id: item._id,
                key: item.key,
                balance: item.balance - 1
              }
            } return item
          })
          console.log(keyWithdraws)
          let item = {
            rosreestr_key: keyWithdraws[keyIndex].key,
            appartment: flatNumber
          }
          order_items = [...order_items, item]
          if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
          else keyIndex = keyIndex + 1
        }

      }



      if (non_residential_flats.replace(/\d/g, '').length === 0) {
        let item = {
          appartment: Number(non_residential_flats) + '-Н',
          cadastral: single_cadastral,
          rosreestr_key: keyWithdraws[0].key
        }
        keyWithdraws = keyWithdraws.map((item, i) => {
          if (item.key === keyWithdraws[0].key) {
            return {
              _id: item._id,
              key: item.key,
              balance: item.balance - 1
            }
          } return item
        })
        order_items = [item]


      } else if (non_residential_flats.split(';').length > 1) {
        let non_residential_flats = non_residential_flats.split(';')
        console.log(multiplyFlats.length)

        console.log('withdrawkeys', keyWithdraws)
        for (let index = 0; index < multiplyFlats.length; index++) {
          let faltsRange = multiplyFlats[index].split('-')
          for (let flatNumber = faltsRange[0]; flatNumber <= faltsRange[1]; flatNumber++) {
            console.log('item', keyWithdraws)
            if (keyWithdraws.filter((item) => {

              if (item && item.balance === 0) return false
              else return true
            }).length === 0) {
              throw new Error('NotEnoughtBalance')
            }
            if (keyWithdraws[keyIndex].balance === 0) {

              if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
              else keyIndex = keyIndex + 1
              flatNumber = flatNumber - 1
              continue
            }

            keyWithdraws = keyWithdraws.map((item, i) => {
              if (item.key === keyWithdraws[keyIndex].key) {
                return {
                  _id: item._id,
                  key: item.key,
                  balance: item.balance - 1
                }
              } return item
            })
            console.log(keyWithdraws)
            let item = {
              rosreestr_key: keyWithdraws[keyIndex].key,
              appartment: flatNumber + '-Н'
            }
            order_items = [...order_items, item]
            if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
            else keyIndex = keyIndex + 1
          }
        }

      } else {

        let faltsRange = non_residential_flats.split('-')
        for (let flatNumber = faltsRange[0]; flatNumber <= faltsRange[1]; flatNumber++) {
          if (keyWithdraws.filter((item) => {

            if (item && item.balance === 0) return false
            else return true
          }).length === 0) {
            throw new Error('NotEnoughtBalance')
          }
          if (keyWithdraws[keyIndex].balance === 0) {

            if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
            else keyIndex = keyIndex + 1
            flatNumber = flatNumber - 1
            continue
          }

          keyWithdraws = keyWithdraws.map((item, i) => {
            if (item.key === keyWithdraws[keyIndex].key) {
              return {
                _id: item._id,
                key: item.key,
                balance: item.balance - 1
              }
            } return item
          })
          console.log(keyWithdraws)
          let item = {
            rosreestr_key: keyWithdraws[keyIndex].key,
            appartment: flatNumber + '-Н'
          }
          order_items = [...order_items, item]
          if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
          else keyIndex = keyIndex + 1
        }

      }
      if (telegram_id) {
        User.findOne({ telegram_id: telegram_id }).orFail(() => new Error('NotFound'))
          .then((user) => {
            if (user.balance < order_items.length) {
              throw new Error('InsufficientFunds')
            } else {
              keyWithdraws.forEach((item, i) => {
                let prevKeyData = notZeroKeys.filter((notzerokey) => {
                  if (notzerokey.key === item.key) return true
                  else return false
                })
                if (prevKeyData[0].balance === item.balance) return
                rosReesterKey.findById(item._id)
                  .then((realKeyData) => {
                    rosReesterKey.findByIdAndUpdate(item._id, {
                      balance: realKeyData.balance - (prevKeyData[0].balance - item.balance)
                    })
                      .then((key) => {
                        console.log("multiFlatRes", key)
                      })
                      .catch((err) => {
                        console.log(err)
                      })
                  })
                  .catch((err) => {
                    console.log(err)
                  })

              })
              User.findByIdAndUpdate(user._id, {
                balance: user.balance - order_items.length,
                payment_history: [...user.payment_history, {
                  date: date,
                  type: `Оплата заказа по адресу ${object_address}, колличество отчетов ${order_items.length}`,
                  amount: - order_items.length,
                }]
              }, opts)
                .then(() => {

                  Order.create({
                    object_address,
                    town,
                    street,
                    region,
                    house,
                    flats,
                    non_residential_flats,
                    order_items,
                    date,
                  })
                    .then((order) => {
                      order_history = [...user.order_history, {
                        order_id: order._id,
                        date
                      }]

                      User.findByIdAndUpdate(user._id, {
                        order_history
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
                        throw new InvalidDataError('Переданы некорректные данные при создании заказа');
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

    })
      .catch((err) => {
        console.log(err)
        if (err.code === 11000) {
          throw new ConflictError('MongoError');
        }
        if (err.message === 'NotFound') {
          throw new NotFoundError('Нет ключей');
        }
        if (err.message === 'AllZeroKeys') {
          throw new ConflictError('Все ключи с нулевым балансом, пополните балансы ключей');
        }
        if (err.message === 'NotEnoughtBalance') {
          throw new ConflictError('Недостаточно суммарного баланса на ключах для составления заказа');
        }
      })
      .catch(next)

  }



};

module.exports.getTime = (req, res, next) => {

  const {
    flats,

  } = req.body;
  rosReesterKey.find({}).orFail(() => new Error('NotFound')).then((keys) => {
    let notZeroKeys = keys.filter((key) => {
      if (key.balance <= 0 || key.inactive) return false
      else return true
    })
    if (notZeroKeys.length === 0) throw new Error('AllZeroKeys')

    console.log(notZeroKeys)
    const realDate = new Date
    let date = moment(realDate.toISOString()).tz("Europe/Moscow").format('D.MM.YYYY HH:mm:ss')

    let keyWithdraws = []
    let keyIndex = 0
    for (let index = 0; index < notZeroKeys.length; index++) {
      keyWithdraws = [...keyWithdraws, {
        _id: notZeroKeys[index]._id,
        key: notZeroKeys[index].key,
        balance: notZeroKeys[index].balance,
        operationsCount: 0,
      }]

    }
    keyWithdraws = keyWithdraws.sort(function (a, b) {

      if (a.balance < b.balance) return 1;
      if (b.balance < a.balance) return -1;

      return 0;
    })
    console.log('sort', keyWithdraws)

    if (flats.replace(/\d/g, '').length === 0) {
      keyWithdraws = keyWithdraws.map((item, i) => {
        if (item.key === keyWithdraws[0].key) {
          return {
            _id: item._id,
            key: item.key,
            balance: item.balance - 1,
            operationsCount: item.operationsCount + 1,
          }
        } return item
      })



    } else if (flats.split(';').length > 1) {
      let multiplyFlats = flats.split(';')
      console.log(multiplyFlats.length)

      console.log('withdrawkeys', keyWithdraws)
      for (let index = 0; index < multiplyFlats.length; index++) {
        let faltsRange = multiplyFlats[index].split('-')
        for (let flatNumber = faltsRange[0]; flatNumber <= faltsRange[1]; flatNumber++) {
          console.log('item', keyWithdraws)
          if (keyWithdraws.filter((item) => {

            if (item && item.balance === 0) return false
            else return true
          }).length === 0) {
            throw new Error('NotEnoughtBalance')
          }
          if (keyWithdraws[keyIndex].balance === 0) {


            if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
            else keyIndex = keyIndex + 1
            flatNumber = flatNumber - 1
            continue
          }

          keyWithdraws = keyWithdraws.map((item, i) => {
            if (item.key === keyWithdraws[keyIndex].key) {
              return {
                _id: item._id,
                key: item.key,
                balance: item.balance - 1,
                operationsCount: item.operationsCount + 1,
              }
            } return item
          })
          console.log(keyWithdraws)
          if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
          else keyIndex = keyIndex + 1
        }
      }

    } else {

      let faltsRange = flats.split('-')
      for (let flatNumber = faltsRange[0]; flatNumber <= faltsRange[1]; flatNumber++) {
        if (keyWithdraws.filter((item) => {

          if (item && item.balance <= 0) return false
          else return true
        }).length === 0) {
          throw new Error('NotEnoughtBalance')
        }
        if (keyWithdraws[keyIndex].balance === 0) {
          // if (keyWithdraws.filter((item) => {

          //   if (item && item.balance === 0) return false
          //   else return true
          // }).length === 0) {
          //   throw new Error('NotEnoughtBalance')
          // }

          if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
          else keyIndex = keyIndex + 1
          flatNumber = flatNumber - 1
          continue

        }

        keyWithdraws = keyWithdraws.map((item, i) => {
          if (item.key === keyWithdraws[keyIndex].key) {
            return {
              _id: item._id,
              key: item.key,
              balance: item.balance - 1,
              operationsCount: item.operationsCount + 1,
            }
          } return item
        })
        console.log(keyWithdraws)
        if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
        else keyIndex = keyIndex + 1
      }

    }
    keyWithdraws = keyWithdraws.sort(function (a, b) {

      if (a.operationsCount < b.operationsCount) return 1;
      if (b.operationsCount < a.operationsCount) return -1;

      return 0;
    })

    res.status(200).send({ time_min: keyWithdraws[0].operationsCount * 5 + 180 })


  })
    .catch((err) => {
      console.log(err)
      if (err.code === 11000) {
        throw new ConflictError('MongoError');
      }
      if (err.message === 'NotFound') {
        throw new NotFoundError('Нет ключей');
      }
      if (err.message === 'AllZeroKeys') {
        throw new ConflictError('Все ключи с нулевым балансом, пополните балансы ключей');
      }
      if (err.message === 'NotEnoughtBalance') {
        throw new ConflictError('Недостаточно суммарного баланса на ключах для составления заказа');
      }
    })
    .catch(next)


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
