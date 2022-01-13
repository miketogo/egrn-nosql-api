const AuthError = require('../errors/auth-err');
require('dotenv').config();

const jwtSecretPhrase = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
  const { authorization } = req.headers;
  const { chat_id } = req.params;

  const token = authorization.replace('Bearer ', '');

  if (token === jwtSecretPhrase){
    next(); 
  }
  else {
    throw new AuthError('Необходима авторизация');
  }
  // try {
  //   // попытаемся верифицировать токен
  //   payload = jwt.verify(token, jwtSecretPhrase);

  // } catch (err) {
  //   // отправим ошибку, если не получилось
  //   throw new AuthError('Необходима авторизация');
  // }

  // req.user = payload; // записываем пейлоуд в объект запроса

  // next();


  // // извлечём токен

};
