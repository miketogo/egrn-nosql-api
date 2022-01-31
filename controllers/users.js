const moment = require('moment-timezone');
const jwt = require('jsonwebtoken');
const TelegramBot = require('node-telegram-bot-api');

const User = require('../models/user');
const ConflictError = require('../errors/сonflict-err');
const InvalidDataError = require('../errors/invalid-data-err');
const NotFoundError = require('../errors/not-found-err')
const AuthError = require('../errors/auth-err')
const mailer = require('../nodemailer');
const regEmailHtml = require('../emails/regEmail')
const downloadEmailHtml = require('../emails/downloadEmail');
const user = require('../models/user');

const jwtSecretPhrase = process.env.JWT_SECRET;
const jwtEmailSecretPhrase = process.env.JWT_EMAIL_SECRET;

const apiLink = 'https://egrn-api-selenium.ru/'
const botLink = 'https://t.me/EGRN_RosreestrInfo_bot/'

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: false });

const devBotToken = process.env.DEV_TELEGRAM_TOKEN;

const devBot = new TelegramBot(devBotToken, { polling: false });

const opts = {
  new: true,
  runValidators: true,
};


module.exports.create = (req, res, next) => {
  const {
    telegram_id,
    phone_number,
    username = 'Не указан'
  } = req.body;
  const status = 'member'
  const realDate = new Date
  let date = moment(realDate.toISOString()).tz("Europe/Moscow").format('D.MM.YYYY HH:mm:ss')
  let dateMark = moment(realDate.toISOString()).tz("Europe/Moscow").format('x')
  User.create({
    telegram_id,
    phone_number,
    reg_date: date,
    username,
    recent_change: dateMark,
    tg_status: status,
  })
    .then((user) => {
      devBot.sendMessage(-760942865, `
<b>Новый пользователь</b>

<b>id</b>: ${user.id}
<b>Телефон</b>: ${phone_number}   
<b>Имя</b>: ${username}
`, { parse_mode: 'HTML' });

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
          code: item.order_id.code,
          order_date: item.date,
          object_address: item.order_id.object_address,
          flats: item.order_id.flats,
          order_status: item.order_id.status,
          items_length: item.order_id.order_items.length,
          cadastral: item.order_id.cadastral,
          house_internal_letter: item.order_id.house_internal_letter,
          house_internal_number: item.order_id.house_internal_number,
          non_residential_flats: item.order_id.non_residential_flats,

          ready_items: item.order_id.order_items.filter((order_item) => {
            if (order_item.status.toLowerCase() === 'завершена') return true
            else return false
          }).length,

          error_items: item.order_id.order_items.filter((order_item) => {
            if (order_item.status.toLowerCase() === 'не найден') return true
            else return false
          }).length,

          ready_percent: Math.round(item.order_id.order_items.filter((order_item) => {
            if (order_item.status.toLowerCase() === 'завершена') return true
            else return false
          }).length / item.order_id.order_items.length * 100),

          error_percent: Math.round(item.order_id.order_items.filter((order_item) => {
            if (order_item.status.toLowerCase() === 'не найден') return true
            else return false
          }).length / item.order_id.order_items.length * 100),

          ready_wthiout_errors_percent: Math.round(item.order_id.order_items.filter((order_item) => {
            if (order_item.status.toLowerCase() === 'завершена') return true
            else return false
          }).length / (item.order_id.order_items.length - item.order_id.order_items.filter((order_item) => {
            if (order_item.status.toLowerCase() === 'не найден') return true
            else return false
          }).length) * 100)
        }]
      })



      orders = orders.reverse()


      res.status(200).send({
        user_id: user._id,
        email: user.email,
        emailVerified: user.emailVerified,
        orders,
      })
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
        throw new NotFoundError('Отсутствуют заказы');
      }
    })
    .catch(next)
};


module.exports.connectEmail = (req, res, next) => {
  const {
    telegram_id,
    email,
    order_id = null
  } = req.body;
  User.findOne({
    telegram_id
  }).orFail(() => new Error('NotFound'))
    .then((user) => {
      // if (user.emailVerified) throw new Error('EmailAlreadyVerified');
      User.findOneAndUpdate({
        telegram_id
      }, {
        email: email,
        emailVerified: false,
      }, opts).orFail(() => new Error('NotFound'))
        .then((upd_user) => {
          let emailToken
          if (order_id !== null) {
            emailToken = jwt.sign({ _id: upd_user._id, order_id: order_id, email: email }, jwtEmailSecretPhrase, { expiresIn: '7d' });

          }
          else emailToken = jwt.sign({ _id: upd_user._id, email: email }, jwtEmailSecretPhrase, { expiresIn: '7d' });
          const title = 'Подтвердите адресс электронной почты'
          const text = `Подтвердите адрес электронной почты
              
  Пожалуйста нажмите кнопку или перейдите по ссылке ниже для подтверждения адреса электронной почты
  ${apiLink}main-api/users/email-check/${emailToken}`

          const massage = {
            to: email,
            subject: title,
            text: text,
            html: `${regEmailHtml({ token: emailToken, link: apiLink })}`
          }
          mailer(massage)
          res.status(200).send({ email_sent: true })
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
      if (err.message === 'EmailAlreadyVerified') {
        throw new ConflictError('Пользователь уже подтвердил email');
      }
    })
    .catch(next)

};

module.exports.verifyEmail = (req, res, next) => {
  const { token } = req.params
  try {
    // попытаемся верифицировать токен
    payload = jwt.verify(token, jwtEmailSecretPhrase);
  } catch (err) {
    // отправим ошибку, если не получилось
    throw new AuthError('Неправильный токен');
  }
  User.findById(payload._id).orFail(() => new Error('USERNotFound'))
    .then((user) => {
      if (user.emailVerified) throw new Error('EmailVerified')
      if (user.email !== payload.email) throw new Error('NotRealMail');
      else {
        User.findByIdAndUpdate(payload._id, { emailVerified: true }, opts).orFail(() => new Error('NotFound'))
          .populate('order_history.order_id')
          .then((user) => {
            bot.sendMessage(user.telegram_id, `email подтвержден`);
            if (payload.order_id) {
              if (!user.emailVerified) throw new Error('EmailNotVerified');
              const order = user.order_history.filter((item) => {

                if (item.order_id._id.toString() === payload.order_id) return true
                else return false
              })

              let flats = order[0].order_id.flats
              let non_res_flats = order[0].order_id.non_residential_flats
              const title = `Отчёт из ЕГРН по адресу "${order[0].order_id.object_address}"`
              const text = `Отчёт из ЕГРН
Дата: ${order[0].date}
Адрес: "${order[0].order_id.object_address}"
${!flats ? '' : flats.split(';').length > 1 || flats.split('-').length > 1 ? `Квартиры: ${flats}` : `Квартира: ${flats}`}
${!non_res_flats ? '' : non_res_flats.split(';').length > 1 || non_res_flats.split('-').length > 1 ? `Помещения: ${non_res_flats}` : `Помещение: ${non_res_flats}`}
                  
Перейдите по ссылке чтобы скачать документ EXCEL
${apiLink}download/${payload.order_id}`

              const massage = {
                to: user.email,
                subject: title,
                text: text,
                html: `${downloadEmailHtml({
                  order_id: payload.order_id,
                  link: apiLink,
                  date: order[0].date,
                  address: order[0].order_id.object_address,
                  flats,
                  non_res_flats,
                })}`
              }
              mailer(massage)

            }
            res.redirect(botLink)
          })    //!! СДЕЛАТЬ ПЕРЕАДРЕАЦИЮ
          .catch((err) => {
            if (err.message === 'EmailVerified') {
              throw new ConflictError('Email уже подтвержден');
            }
            if (err.message === 'NotRealMail') {
              throw new ConflictError(`Не правильный email. Пожалуйста подтвердите новый email по письму отправленному на ${payload.email}`);
            }
            if (err.message === 'NotFound') {
              throw new NotFoundError('Нет пользователя с таким id');
            }
            if (err.name === 'ValidationError' || err.name === 'CastError') {
              throw new InvalidDataError('Переданы некорректные данные при поиске пользователя по id');
            }
          })
          .catch(next);
      }
    })
    .catch((err) => {
      if (err.message === 'EmailVerified') {
        throw new ConflictError('Email уже подтвержден');
      }
      if (err.message === 'NotRealMail') {
        throw new ConflictError(`Не правильный email. Пожалуйста подтвердите новый email по письму отправленному на ${payload.email}`);
      }
      if (err.message === 'NotFound') {
        throw new NotFoundError('Нет пользователя с таким id');
      }
      if (err.name === 'ValidationError' || err.name === 'CastError') {
        throw new InvalidDataError('Переданы некорректные данные при поиске пользователя по id');
      }
    })
    .catch(next);

};

module.exports.sendDownloadEmail = (req, res, next) => {
  const {
    telegram_id,
    order_id
  } = req.body;

  User.findOne({
    telegram_id
  }).orFail(() => new Error('NotFound'))
    .populate('order_history.order_id')
    .then((user) => {
      if (!user.emailVerified) throw new Error('EmailNotVerified');
      const order = user.order_history.filter((item) => {

        if (item.order_id._id.toString() === order_id) return true
        else return false
      })
      let emailToken = jwt.sign({ _id: user._id, email: user.email, type: 'newsletter' }, jwtEmailSecretPhrase, { expiresIn: '7d' });

      let flats = order[0].order_id.flats
      let non_res_flats = order[0].order_id.non_residential_flats
      const title = `Отчёт из ЕГРН по адресу "${order[0].order_id.object_address}"`
      const text = `Отчёт из ЕГРН
Дата: ${order[0].date}
Адрес: "${order[0].order_id.object_address}"
${!flats ? '' : flats.split(';').length > 1 || flats.split('-').length > 1 ? `Квартиры: ${flats}` : `Квартира: ${flats}`}
${!non_res_flats ? '' : non_res_flats.split(';').length > 1 || non_res_flats.split('-').length > 1 ? `Помещения: ${non_res_flats}` : `Помещение: ${non_res_flats}`}
            
Перейдите по ссылке чтобы скачать документ EXCEL
${apiLink}download/${order_id}`

      const massage = {
        to: user.email,
        subject: title,
        text: text,
        html: `${downloadEmailHtml({
          order_id,
          link: apiLink,
          date: order[0].date,
          address: order[0].order_id.object_address,
          flats,
          non_res_flats,
          token: emailToken,
        })}`
      }
      mailer(massage)
      res.status(200).send({ email_sent: true })
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
      if (err.message === 'EmailNotVerified') {
        throw new AuthError('Email не подтвержден');
      }
    })
    .catch(next)
};


module.exports.findUserByOrderId = (req, res, next) => {
  const {
    order_id
  } = req.body;
  User.find().orFail(() => new Error('NotFound'))
    .then((users) => {
      let user = users.filter((user) => {
        if (user.order_history.length === 0) return false
        else if (user.order_history.filter((order) => {
          if (order.order_id.toString() === order_id) return true
          else return false
        }).length !== 0) return true
        else return false
      })
      if (user.length === 0) throw new Error('NotFoundOrder');
      if (user.length > 1) throw new Error('MoreThenOneOrder');
      res.status(200).send({ user: user[0] })
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
        throw new NotFoundError('Нет пользователей');
      }
      if (err.message === 'NotFoundOrder') {
        throw new NotFoundError('Не найден заказ');
      }
      if (err.message === 'MoreThenOneOrder') {
        throw new ConflictError('Найдено несколько заказов с таким id');
      }
    })
    .catch(next)
};


module.exports.offNewsLetter = (req, res, next) => {
  const {
    telegram_id
  } = req.body;
  User.findOneAndUpdate({ telegram_id: telegram_id }, { newsletter: false }, opts).orFail(() => new Error('NotFound'))
    .then((user) => {
      res.status(200).send({ user })
    })    //!! СДЕЛАТЬ ПЕРЕАДРЕАЦИЮ
    .catch((err) => {
      if (err.message === 'NotFound') {
        throw new NotFoundError('Нет пользователя с таким id');
      }
      if (err.name === 'ValidationError' || err.name === 'CastError') {
        throw new InvalidDataError('Переданы некорректные данные при поиске пользователя по id');
      }
    })
    .catch(next);
};


module.exports.onNewsLetter = (req, res, next) => {
  const {
    telegram_id
  } = req.body;
  User.findOneAndUpdate({ telegram_id: telegram_id }, { newsletter: true }, opts).orFail(() => new Error('NotFound'))
    .then((user) => {
      res.status(200).send({ user })
    })    //!! СДЕЛАТЬ ПЕРЕАДРЕАЦИЮ
    .catch((err) => {
      if (err.message === 'NotFound') {
        throw new NotFoundError('Нет пользователя с таким id');
      }
      if (err.name === 'ValidationError' || err.name === 'CastError') {
        throw new InvalidDataError('Переданы некорректные данные при поиске пользователя по id');
      }
    })
    .catch(next);
};

module.exports.offNewsLetterByEmail = (req, res, next) => {
  const { token } = req.params
  try {
    // попытаемся верифицировать токен
    payload = jwt.verify(token, jwtEmailSecretPhrase);
  } catch (err) {
    // отправим ошибку, если не получилось
    throw new AuthError('Неправильный токен');
  }
  User.findById(payload._id).orFail(() => new Error('NotFound'))
    .then((user) => {
      if (user.email !== payload.email) throw new Error('NotRealMail');
      else {
        User.findByIdAndUpdate(payload._id, { newsletter: false }, opts).orFail(() => new Error('NotFound'))

          .then((user) => {
            bot.sendMessage(user.telegram_id, `Рассылка отключена`);
            res.redirect(botLink)
          })
          .catch((err) => {
            if (err.message === 'EmailVerified') {
              throw new ConflictError('Email уже подтвержден');
            }
            if (err.message === 'NotRealMail') {
              throw new ConflictError(`Не правильный email.`);
            }
            if (err.message === 'NotFound') {
              throw new NotFoundError('Нет пользователя с таким id');
            }
            if (err.name === 'ValidationError' || err.name === 'CastError') {
              throw new InvalidDataError('Переданы некорректные данные при поиске пользователя по id');
            }
          })
          .catch(next);
      }
    })
    .catch((err) => {
      if (err.message === 'EmailVerified') {
        throw new ConflictError('Email уже подтвержден');
      }
      if (err.message === 'NotRealMail') {
        throw new ConflictError(`Не правильный email.`);
      }
      if (err.message === 'NotFound') {
        throw new NotFoundError('Нет пользователя с таким id');
      }
      if (err.name === 'ValidationError' || err.name === 'CastError') {
        throw new InvalidDataError('Переданы некорректные данные при поиске пользователя по id');
      }
    })
    .catch(next);
}


module.exports.sendMessageToAllUsers = (req, res, next) => {
  const {
    text
  } = req.body;

  let counter = {
    sent: 0,
    error: 0,
    kicked: 0,
  }

  function timer(ms) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        resolve();
      }, ms);
    });
  }

  async function sendMsg(user, text, counter) {

    if (user.tg_status !== 'kicked') {
      await timer(300)
        .then(() => {

          bot.sendMessage(user.telegram_id, `${text.trim()}`, { parse_mode: 'HTML' })
            .then(() => {
              counter.sent = counter.sent + 1
            })
            .catch(() => {
              counter.error = counter.error + 1
            })
        })
    } else {
      counter.kicked = counter.kicked + 1
    }
  }

  User.find().orFail(() => new Error('NotFound'))
    .then((users) => {
      users.reduce(async (a, user) => {
        // Wait for the previous item to finish processing
        await a;
        // Process this item
        await sendMsg(user, text, counter);
      }, Promise.resolve())
        .then(() => {
          res.status(200).send({ counter: counter })
        })



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
        throw new NotFoundError('Нет пользователей');
      }
    })
    .catch(next)
};