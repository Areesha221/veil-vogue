import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

console.log('📧 Testing Email Configuration...');
console.log('User:', process.env.EMAIL_USER);
console.log('Pass Length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 'MISSING');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const mailOptions = {
  from: process.env.EMAIL_FROM,
  to: process.env.EMAIL_USER, // Khud ko hi bhej rahe hain test ke liye
  subject: '✅ Test Email Successful - Veil & Vogue',
  html: '<h2 style="color: #d4af37;">Agar ye email aapko dikh rahi hai, toh Email System 100% Perfect Hai!</h2><p>Veil & Vogue Team</p>'
};

transporter.sendMail(mailOptions)
  .then(info => {
    console.log('✅ SUCCESS! Email bhej di gayi hai. Apna Inbox/Spam check karein.');
    console.log('Message ID:', info.messageId);
  })
  .catch(error => {
    console.error('❌ FAILED! Email nahi gayi. Error ye hai:');
    console.error(error.message);
  });