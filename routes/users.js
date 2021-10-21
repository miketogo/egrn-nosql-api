const router = require('express').Router();
const { celebrate, Joi } = require('celebrate');
const {
  create, findByTgId
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


module.exports = router;
