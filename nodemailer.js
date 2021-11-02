const nodemailer = require('nodemailer')

require('dotenv').config();
const emailPass = process.env.MAIL_PASS;

const transporter = nodemailer.createTransport(
    {
        host: 'smtp.mail.ru',
        port: 465,
        secure: true,
        auth: {
            user: 'no-reply@egrn-api-selenium.ru',
            pass: emailPass,
        }
    },
    {
        from: 'Отчёты ЕГРН <no-reply@egrn-api-selenium.ru>',
    }

)

const mailer = message => {
    transporter.sendMail(message, (err, info) => {
        if(err) return console.log(err)
        console.log('Email sent: ', info)
    })
}

module.exports = mailer 