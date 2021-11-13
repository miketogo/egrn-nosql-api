const router = require('express').Router();
const { celebrate, Joi } = require('celebrate');
const {
  addAddress, findAddress
} = require('../controllers/addresses');

router.post('/add', celebrate({
  body: Joi.object().keys({
    town: Joi.string().required(),
    street: Joi.string().required(),
    region: Joi.string(),
    house: Joi.string().required(),
    cadastral: Joi.string().required(),
    last_flat: Joi.string(),
    last_non_residential_flat: Joi.string(),
  }),
}), addAddress);

router.get('/find', celebrate({
  body: Joi.object().keys({
    town: Joi.string().required(),
    street: Joi.string().required(),
    region: Joi.string(),
    house: Joi.string().required(),
  }),
}), findAddress);


module.exports = router;
