const router = require('express').Router();
const { celebrate, Joi } = require('celebrate');
const {
  create,
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

router.patch('/update', celebrate({
  body: Joi.object().keys({
    order_id: Joi.string().required(),
    order_item_id: Joi.string().required(),
    rosreestr_key: Joi.string().required(),
    response_id: Joi.string().required(),
    status: Joi.string().required(),
  }),
}), create);


module.exports = router;
