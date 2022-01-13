const router = require('express').Router();
const { celebrate, Joi } = require('celebrate');
const {
  create, useCode
} = require('../controllers/promoCodes');

router.post('/create', celebrate({
  body: Joi.object().keys({
    amount: Joi.number().required().min(1),
    customCode: Joi.string().min(3).max(15)
  }),
}), create);

router.post('/use', celebrate({
  body: Joi.object().keys({
    code: Joi.string().required(),
    telegram_id: Joi.string().required(),
  }),
}), useCode);



module.exports = router;
