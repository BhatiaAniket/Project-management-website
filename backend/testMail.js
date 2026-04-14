require('dotenv').config();
const nodemailer = require('nodemailer');

async function test() {
  try {
    console.log("Trying to connect with user:", process.env.EMAIL_USER);
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log("Verifying connection to SMTP server...");
    await transporter.verify();
    console.log("✓ Connection successful!");
  } catch (err) {
    console.error("✗ SMTP Connection failed:", err.message);
  }
}
test();
