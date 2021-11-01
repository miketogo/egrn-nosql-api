const router = require('express').Router();
const { celebrate, Joi } = require('celebrate');
const {
  create, findByTgId, getOrdersByTgId
} = require('../controllers/users');

router.post('/create', celebrate({
  body: Joi.object().keys({
    telegram_id: Joi.string().required(),
    phone_number: Joi.string().required(),
  }),
}), create);
router.get('/find-by-tg-id', celebrate({
  body: Joi.object().keys({
    telegram_id: Joi.string().required(),
  }),
}), findByTgId);


router.get('/orders-by-tg-id', celebrate({
  body: Joi.object().keys({
    telegram_id: Joi.string().required(),
  }),
}), getOrdersByTgId);

module.exports = router;
