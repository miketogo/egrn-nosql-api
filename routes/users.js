const router = require('express').Router();
const { celebrate, Joi } = require('celebrate');
const {
  create,
} = require('../controllers/users');

router.post('/create', celebrate({
  body: Joi.object().keys({
    telegram_id: Joi.string().required(),
    phone_number: Joi.string().required(),
  }),
}), create);


module.exports = router;
