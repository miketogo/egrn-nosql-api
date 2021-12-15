const router = require('express').Router();
const { celebrate, Joi } = require('celebrate');
const {
    create, findAll
} = require('../controllers/addressLogs');

router.post('/create', celebrate({
    body: Joi.object().keys({
        user_text: Joi.string().required(),
        google_res: Joi.string(),
        our_res: Joi.string(),
        is_ordered: Joi.boolean(),
        telegram_id: Joi.string().required(),
    }),
}), create);

router.get('/', findAll);


module.exports = router;