const router = require('express').Router();
const { celebrate, Joi } = require('celebrate');
const {
  order,
} = require('../controllers/orderTariff');

router.post('/', celebrate({
  body: Joi.object().keys({
    tariffName: Joi.string().required(),
    tariffOptions: Joi.string().required(),
    unlimitedInternet: Joi.boolean().required(),
    modem: Joi.boolean().required(),
    productionMethod: Joi.string().required(),
    selectedNumber: Joi.object(),
    deliveryDate: Joi.string(),
    deliveryTime: Joi.string(),
    deliveryAddress: Joi.string(),
    transferredNumber: Joi.string(),
    deliveryMethod: Joi.string(),
    userPhone: Joi.string().required(),
    fromMosсow: Joi.string().required(),
  }),
}), order);


module.exports = router;
