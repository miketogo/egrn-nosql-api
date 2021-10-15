const router = require('express').Router();
const { celebrate, Joi } = require('celebrate');
const {
  transfer,
} = require('../controllers/trasferNumber');

router.post('/', celebrate({
  body: Joi.object().keys({
    transferDate: Joi.string().required(),
    transferredNumber: Joi.string().required(),
    userPhone: Joi.string().required(),
    fromMosсow: Joi.string().required(),
  }),
}), transfer);


module.exports = router;
