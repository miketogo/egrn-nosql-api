const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const { errors, celebrate, Joi } = require('celebrate');

const auth = require('./middlewares/auth');
const NotFoundError = require('./errors/not-found-err');
const { requestLogger, errorLogger } = require('./middlewares/logger');

require('dotenv').config();
console.log(process.env.NODE_ENV);
const { PORT = 3003 } = process.env; //PORT

const CORS_WHITELIST = [
  'http://localhost:3000',
  'https://localhost:3000',
  'https://www.localhost:3000',
  'http://www.localhost:3000',
];
const app = express();
app.use(helmet());
const corsOption = {
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  allowedHeaders: ['Content-Type', 'origin', 'Authorization'],
  credentials: true,
  origin: [
    'http://localhost:3000',
    'https://localhost:3000',
    'https://www.localhost:3000',
    'http://www.localhost:3000',
  ],
};
app.use('*', cors(corsOption));
app.use(cookieParser());
mongoose.connect('mongodb://localhost:27017/egrn', {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

app.use(express.json());
app.use(requestLogger);
// app.use(cors(corsOption));
app.use('/main-api/promo-code', auth, require('./routes/promoCodes'));
app.use('/main-api/users', require('./routes/users'));
app.use('/main-api/orders', auth, require('./routes/orders'));
app.use('/main-api/ros-key', auth, require('./routes/rosReesterKeys'));
app.use('/main-api/address', auth, require('./routes/addresses'));
app.use('/main-api/address-logs', auth, require('./routes/addressLogs'));
// eslint-disable-next-line no-unused-vars
app.use((req, res) => {
  throw new NotFoundError('Запрашиваемый ресурс не найден');
});
app.use(errorLogger);
app.use(errors());

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // если у ошибки нет статуса, выставляем 500
  console.log(err)
  const { statusCode = 500, message } = err;
  console.log(err)
  res
    .status(statusCode)
    .send({
      message: statusCode === 500
        ? 'На сервере произошла ошибка'
        : message,
    });
});

app.listen(PORT, () => {

});
