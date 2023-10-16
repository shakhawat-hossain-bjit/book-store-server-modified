let nodemailer = require("nodemailer");
let transport = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "d2927ee7e15d61",
    pass: "80ea1eaaf1a493",
  },
});
module.exports = transport;
