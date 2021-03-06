const moment = require('moment-timezone');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const TelegramBot = require('node-telegram-bot-api');
const voucher_codes = require('voucher-code-generator');

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

const FAST_API_KEY = process.env.FAST_API_KEY;

const devBotToken = process.env.DEV_TELEGRAM_TOKEN;
const devBot = new TelegramBot(devBotToken, { polling: false });




module.exports.create = (req, res, next) => {


  async function fetchToSelenium({ user_id, order_id, time }) {

    const body = {
      user_id: user_id,
      order_id: order_id,
      time: time,
    }
    const response = await fetch('http://egrn-api-selenium.ru/create', {
      method: 'post',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': `${FAST_API_KEY}`,
      }
    });
    const data = await response.json();

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
    cadastral = null,
    house_internal_letter = 'Не указан',
    house_internal_number = 'Не указан',
    house_internal_building = 'Не указан',
  } = req.body;
  let code = voucher_codes.generate({
    length: 6,
    count: 1,
  })[0].toUpperCase();
  const nowDate = new Date
  let dateMark = moment(nowDate.toISOString()).tz("Europe/Moscow").format('x')
  if (flats === '' && non_residential_flats === '') throw new Error('NoFlatsInOrder')
  if (flats !== '' && non_residential_flats === '') {
    rosReesterKey.find({}).orFail(() => new Error('NotFound')).then((keys) => {
      let notZeroKeys = keys.filter((key) => {
        if (key.balance <= 0 || key.inactive) return false
        else return true
      })
      if (notZeroKeys.length === 0) throw new Error('AllZeroKeys')


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


      if (flats.replace(/\d/g, '').length === 0) {
        let item = {
          appartment: `${Number(flats)}`.trim(),
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


        for (let index = 0; index < multiplyFlats.length; index++) {
          let faltsRange = multiplyFlats[index].split('-')
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

            let item = {
              rosreestr_key: keyWithdraws[keyIndex].key,
              appartment: `${flatNumber}`.trim()
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

          let item = {
            rosreestr_key: keyWithdraws[keyIndex].key,
            appartment: `${flatNumber}`.trim()
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
                      balance: realKeyData.balance - (prevKeyData[0].balance - item.balance),
                      recent_change: dateMark,
                    })
                      .then(() => {

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
                  type: `Оплата заказа по адресу ${object_address}.
Заказано выписок: ${order_items.length}`,
                  amount: - order_items.length,
                }],
                recent_change: dateMark,
              }, opts)
                .then(() => {



                  Order.create({
                    date: date,
                    object_address,
                    town,
                    cadastral,
                    street,
                    region,
                    house,
                    flats,
                    non_residential_flats,
                    order_items,
                    date,
                    house_internal_number,
                    house_internal_letter,
                    house_internal_building,
                    code,
                  })
                    .then((order) => {
                      order_history = [...user.order_history, {
                        order_id: order._id,
                        date
                      }]
                      devBot.sendMessage(-760942865, `
<b>Новый заказ</b> ${code}
<b>id</b>: ${order._id}
                      
<b>Адрес</b>: ${object_address}
<b>Жилые</b>: ${flats}
<b>Нежилые</b>: ${non_residential_flats}
<b>id пользователя</b>: ${user._id}
<b>Телефон</b>: ${user.phone_number}
<b>Usename</b>: ${user.username}
<b>Баланс пользователя</b>: ${user.balance - order_items.length}             
                                                          `, { parse_mode: 'HTML' });
                      User.findByIdAndUpdate(user._id, {
                        order_history
                      }, opts)
                        .then(() => {




                          let prevKeyData2 = notZeroKeys.filter((notzerokey) => {
                            if (notzerokey.key === keyWithdraws[0].key) return true
                            else return false
                          })
                          fetchToSelenium({ user_id: user._id, order_id: order._id, time: (prevKeyData2[0].balance - keyWithdraws[0].balance) * 5 + 180 })


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


      if (non_residential_flats.replace(/\d/g, '').length === 0) {
        let item = {
          appartment: `${Number(non_residential_flats) + '-Н'}`.trim(),
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


        for (let index = 0; index < multiplyFlats.length; index++) {
          let faltsRange = multiplyFlats[index].split('-')
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

            let item = {
              rosreestr_key: keyWithdraws[keyIndex].key,
              appartment: `${flatNumber + '-Н'}`.trim()
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

          let item = {
            rosreestr_key: keyWithdraws[keyIndex].key,
            appartment: `${flatNumber + '-Н'}`.trim()
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
                      balance: realKeyData.balance - (prevKeyData[0].balance - item.balance),
                      recent_change: dateMark,
                    })
                      .then(() => {

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
                  type: `Оплата заказа по адресу ${object_address}.
Заказано выписок: ${order_items.length}`,
                  amount: - order_items.length,
                }],
                recent_change: dateMark,
              }, opts)
                .then(() => {



                  Order.create({
                    date: date,
                    object_address,
                    town,
                    street,
                    cadastral,
                    region,
                    house,
                    flats,
                    non_residential_flats,
                    order_items,
                    date,
                    house_internal_number,
                    house_internal_letter,
                    house_internal_building,
                    code,
                  })
                    .then((order) => {
                      order_history = [...user.order_history, {
                        order_id: order._id,
                        date
                      }]
                      devBot.sendMessage(-760942865, `
<b>Новый заказ</b> ${code}
<b>id</b>: ${order._id}
                      
<b>Адрес</b>: ${object_address}
<b>Жилые</b>: ${flats}
<b>Нежилые</b>: ${non_residential_flats}
<b>id пользователя</b>: ${user._id}
<b>Телефон</b>: ${user.phone_number}
<b>Usename</b>: ${user.username}
<b>Баланс пользователя</b>: ${user.balance - order_items.length}             
                                                          `, { parse_mode: 'HTML' });
                      User.findByIdAndUpdate(user._id, {
                        order_history
                      }, opts)
                        .then(() => {




                          let prevKeyData2 = notZeroKeys.filter((notzerokey) => {
                            if (notzerokey.key === keyWithdraws[0].key) return true
                            else return false
                          })
                          fetchToSelenium({ user_id: user._id, order_id: order._id, time: (prevKeyData2[0].balance - keyWithdraws[0].balance) * 5 + 180 })


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

      if (flats.replace(/\d/g, '').length === 0) {
        let item = {
          appartment: `${Number(flats)}`.trim(),
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

        for (let index = 0; index < multiplyFlats.length; index++) {
          let faltsRange = multiplyFlats[index].split('-')
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
            let item = {
              rosreestr_key: keyWithdraws[keyIndex].key,
              appartment: `${flatNumber}`.trim()
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
          let item = {
            rosreestr_key: keyWithdraws[keyIndex].key,
            appartment: `${flatNumber}`.trim()
          }
          order_items = [...order_items, item]
          if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
          else keyIndex = keyIndex + 1
        }

      }



      if (non_residential_flats.replace(/\d/g, '').length === 0) {
        let item = {
          appartment: `${Number(non_residential_flats) + '-Н'}`.trim(),

          rosreestr_key: keyWithdraws[1].key
        }
        keyWithdraws = keyWithdraws.map((item, i) => {
          if (item.key === keyWithdraws[1].key) {
            return {
              _id: item._id,
              key: item.key,
              balance: item.balance - 1
            }
          } return item
        })
        order_items = [...order_items, item]


      } else if (non_residential_flats.split(';').length > 1) {
        let multiplyFlats = non_residential_flats.split(';')

        for (let index = 0; index < multiplyFlats.length; index++) {
          let faltsRange = multiplyFlats[index].split('-')
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
            let item = {
              rosreestr_key: keyWithdraws[keyIndex].key,
              appartment: `${flatNumber + '-Н'}`.trim()
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

          let item = {
            rosreestr_key: keyWithdraws[keyIndex].key,
            appartment: `${flatNumber + '-Н'}`.trim()
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
                      balance: realKeyData.balance - (prevKeyData[0].balance - item.balance),
                      recent_change: dateMark,
                    })
                      .then(() => {

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
                  type: `Оплата заказа по адресу ${object_address}.
Заказано выписок: ${order_items.length}`,
                  amount: - order_items.length,
                }],
                recent_change: dateMark,
              }, opts)
                .then(() => {


                  Order.create({
                    date: date,
                    object_address,
                    cadastral,
                    town,
                    street,
                    region,
                    house,
                    flats,
                    non_residential_flats,
                    order_items,
                    date,
                    house_internal_number,
                    house_internal_letter,
                    house_internal_building,
                    code,
                  })
                    .then((order) => {
                      order_history = [...user.order_history, {
                        order_id: order._id,
                        date
                      }]
                      devBot.sendMessage(-760942865, `
<b>Новый заказ</b> ${code}
<b>id</b>: ${order._id}
                      
<b>Адрес</b>: ${object_address}
<b>Жилые</b>: ${flats}
<b>Нежилые</b>: ${non_residential_flats}
<b>id пользователя</b>: ${user._id}
<b>Телефон</b>: ${user.phone_number}
<b>Usename</b>: ${user.username}
<b>Баланс пользователя</b>: ${user.balance - order_items.length}             
                                                          `, { parse_mode: 'HTML' });
                      User.findByIdAndUpdate(user._id, {
                        order_history
                      }, opts)
                        .then(() => {



                          let prevKeyData2 = notZeroKeys.filter((notzerokey) => {
                            if (notzerokey.key === keyWithdraws[0].key) return true
                            else return false
                          })
                          fetchToSelenium({ user_id: user._id, order_id: order._id, time: (prevKeyData2[0].balance - keyWithdraws[0].balance) * 5 + 180 })


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
    flats = '',
    non_residential_flats = '',

  } = req.body;
  if (flats === '' && non_residential_flats === '') throw new Error('NoFlatsInOrder')
  if (flats !== '' && non_residential_flats === '') {
    rosReesterKey.find({}).orFail(() => new Error('NotFound')).then((keys) => {
      let notZeroKeys = keys.filter((key) => {
        if (key.balance <= 0 || key.inactive) return false
        else return true
      })
      if (notZeroKeys.length === 0) throw new Error('AllZeroKeys')
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

        for (let index = 0; index < multiplyFlats.length; index++) {
          let faltsRange = multiplyFlats[index].split('-')
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
                  balance: item.balance - 1,
                  operationsCount: item.operationsCount + 1,
                }
              } return item
            })

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

  }
  else if (flats === '' && non_residential_flats !== '') {
    rosReesterKey.find({}).orFail(() => new Error('NotFound')).then((keys) => {
      let notZeroKeys = keys.filter((key) => {
        if (key.balance <= 0 || key.inactive) return false
        else return true
      })
      if (notZeroKeys.length === 0) throw new Error('AllZeroKeys')


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


      if (non_residential_flats.replace(/\d/g, '').length === 0) {
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



      } else if (non_residential_flats.split(';').length > 1) {
        let multiplyFlats = non_residential_flats.split(';')

        for (let index = 0; index < multiplyFlats.length; index++) {
          let faltsRange = multiplyFlats[index].split('-')
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
                  balance: item.balance - 1,
                  operationsCount: item.operationsCount + 1,
                }
              } return item
            })
            if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
            else keyIndex = keyIndex + 1
          }
        }

      } else {

        let faltsRange = non_residential_flats.split('-')
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

  }
  else if (flats !== '' && non_residential_flats !== '') {
    rosReesterKey.find({}).orFail(() => new Error('NotFound')).then((keys) => {
      let notZeroKeys = keys.filter((key) => {
        if (key.balance <= 0 || key.inactive) return false
        else return true
      })
      if (notZeroKeys.length === 0) throw new Error('AllZeroKeys')


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

        for (let index = 0; index < multiplyFlats.length; index++) {
          let faltsRange = multiplyFlats[index].split('-')
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
                  balance: item.balance - 1,
                  operationsCount: item.operationsCount + 1,
                }
              } return item
            })

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

          if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
          else keyIndex = keyIndex + 1
        }

      }
      if (non_residential_flats.replace(/\d/g, '').length === 0) {
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



      } else if (non_residential_flats.split(';').length > 1) {
        let multiplyFlats = non_residential_flats.split(';')

        for (let index = 0; index < multiplyFlats.length; index++) {
          let faltsRange = multiplyFlats[index].split('-')
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
                  balance: item.balance - 1,
                  operationsCount: item.operationsCount + 1,
                }
              } return item
            })

            if (keyIndex === keyWithdraws.length - 1) keyIndex = 0
            else keyIndex = keyIndex + 1
          }
        }

      } else {

        let faltsRange = non_residential_flats.split('-')
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

  }



};
