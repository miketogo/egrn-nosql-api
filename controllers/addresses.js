const Address = require('../models/address');

const ConflictError = require('../errors/сonflict-err');
const InvalidDataError = require('../errors/invalid-data-err');
const NotFoundError = require('../errors/not-found-err')
const NotEnoughRightsError = require('../errors/not-enough-rights-err')

const opts = {
    new: true,
    runValidators: true,
};


module.exports.addAddress = (req, res, next) => {
    const {
        town,
        street,
        region = 'Не указан',
        house,
        last_flat,
        last_non_residential_flat,
    } = req.body;
    Address.create({
        town,
        street,
        region,
        house,
        last_flat,
        last_non_residential_flat,
    })
        .then((address) => {
            res.status(200).send({ address })
        })    //!! СДЕЛАТЬ ПЕРЕАДРЕАЦИЮ
        .catch((err) => {
            if (err.name === 'ValidationError' || err.name === 'CastError') {
                throw new InvalidDataError('Переданы некорректные данные при добавления адреса');
            }
        })
        .catch(next);
};

module.exports.findAddress = (req, res, next) => {
    const {
        town,
        street,
        region = 'Не указан',
        house,
    } = req.body;
    Address.find().orFail(() => new Error('NotFound'))
        .then((addresses) => {
            let address = addresses.filter((item) => {
                if (item.town === town && item.street === street && item.region === region && item.house === house) return true
                else return false
            })
            if (address.length === 0) throw new Error('AddressNotFound')

            res.status(200).send({ address: address[0] })
        })    //!! СДЕЛАТЬ ПЕРЕАДРЕАЦИЮ
        .catch((err) => {
            if (err.message === 'NotFound') {
                throw new NotFoundError('Нет адрессов');
            }
            if (err.message === 'AddressNotFound') {
                throw new NotFoundError('Адрес не найден');
            }
            if (err.name === 'ValidationError' || err.name === 'CastError') {
                throw new InvalidDataError('Переданы некорректные данные при добавления адреса');
            }
        })
        .catch(next);
};