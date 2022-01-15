const router = require('express').Router();

const auth = require('../middlewares/auth');

const { celebrate, Joi } = require('celebrate');
const {
  offNewsLetterByEmail, create, findByTgId, getOrdersByTgId, connectEmail, verifyEmail, sendDownloadEmail, findUserByOrderId, onNewsLetter, offNewsLetter, sendMessageToAllUsers,
} = require('../controllers/users');

router.post('/create', celebrate({
  body: Joi.object().keys({
    telegram_id: Joi.string().required(),
    phone_number: Joi.string().required(),
    username: Joi.string(),
  }),
}), auth, create);

router.get('/find-by-tg-id', celebrate({
  body: Joi.object().keys({
    telegram_id: Joi.string().required(),
  }),
}), auth, findByTgId);

router.get('/find-by-order-id', celebrate({
  body: Joi.object().keys({
    order_id: Joi.string().required(),
  }),
}), auth, findUserByOrderId);

router.get('/orders-by-tg-id', celebrate({
  body: Joi.object().keys({
    telegram_id: Joi.string().required(),
  }),
}), auth, getOrdersByTgId);

router.post('/connect-email-from-tg', celebrate({
  body: Joi.object().keys({
    telegram_id: Joi.string().required(),
    email: Joi.string().required(),
    order_id: Joi.string(),
  }),
}), auth, connectEmail);

router.get('/email-check/:token', celebrate({
  // валидируем параметры
  params: Joi.object().keys({
    token: Joi.string().min(3).required(),
  }),
}), verifyEmail);

router.get('/newsletter/:token', celebrate({
  // валидируем параметры
  params: Joi.object().keys({
    token: Joi.string().min(3).required(),
  }),
}), offNewsLetterByEmail);

router.post('/send-download-email', celebrate({
  body: Joi.object().keys({
    telegram_id: Joi.string().required(),
    order_id: Joi.string().required(),
  }),
}), auth, sendDownloadEmail);


router.post('/on-newsletter', celebrate({
  body: Joi.object().keys({
    telegram_id: Joi.string().required(),
  }),
}), auth, onNewsLetter);

router.post('/off-newsletter', celebrate({
  body: Joi.object().keys({
    telegram_id: Joi.string().required(),
  }),
}), auth, offNewsLetter);

router.post('/send-message-to-all-users', celebrate({
  body: Joi.object().keys({
    text: Joi.string().required(),
  }),
}), auth, sendMessageToAllUsers);

module.exports = router;
