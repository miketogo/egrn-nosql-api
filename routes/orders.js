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
    region: Joi.string(),
    house: Joi.string().required(),
    flats: Joi.string(),
    cadastral: Joi.string(),
    non_residential_flats:  Joi.string(),
    house_internal_letter: Joi.string(),
    house_internal_number: Joi.string(),
  }),
}), create);

router.patch('/get-time', celebrate({
  body: Joi.object().keys({
    flats: Joi.string(),
    non_residential_flats:  Joi.string(),
  }),
}), getTime);


module.exports = router;
