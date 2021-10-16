const router = require('express').Router();
const { celebrate, Joi } = require('celebrate');
const {
  order,
} = require('../controllers/buyNumbers');

router.post('/', celebrate({
  body: Joi.object().keys({
    deliveryDate: Joi.string(),
    deliveryTime: Joi.string(),
    deliveryAddress: Joi.string(),
    deliveryMethod: Joi.string(),
    numbersArray: Joi.array().required(),
    userPhone: Joi.string().required(),
    fromMosсow: Joi.string().required(),
  }),
}), order);


module.exports = router;
