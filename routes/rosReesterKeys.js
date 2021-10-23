const router = require('express').Router();
const { celebrate, Joi } = require('celebrate');
const {
  create, addBalance, withdrawBalance
} = require('../controllers/rosReesterKeys');

router.post('/create', celebrate({
  body: Joi.object().keys({
    key: Joi.string().required(),
    balance: Joi.number(),
    owner: Joi.string().required(),
  }),
}), create);

router.patch('/deposit', celebrate({
  body: Joi.object().keys({
    key: Joi.string(),
    deposit: Joi.number().min(0),
    id: Joi.string().hex().max(24).min(24),
  }),
}), addBalance);

router.patch('/withdraw', celebrate({
  body: Joi.object().keys({
    key: Joi.string(),
    withdraw: Joi.number().min(0),
    id: Joi.string().hex().max(24).min(24),
  }),
}), withdrawBalance);


module.exports = router;
