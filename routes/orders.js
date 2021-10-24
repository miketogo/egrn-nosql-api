const router = require('express').Router();
const { celebrate, Joi } = require('celebrate');
const {
  create, getTime
} = require('../controllers/orders');

router.post('/create', celebrate({
  body: Joi.object().keys({
    telegram_id: Joi.string(),
    user_id: Joi.string(),
    object_address: Joi.string().required(),
    town: Joi.string().required(),
    street: Joi.string().required(),
    house: Joi.string().required(),
    flats: Joi.string().required(),
    single_cadastral: Joi.string(),
  }),
}), create);

router.patch('/get-time', celebrate({
  body: Joi.object().keys({
    flats: Joi.string().required(),
  }),
}), getTime);


module.exports = router;
