const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.USER_1,
    pass: process.env.PASS_1,
  },
});

exports.sendConfirmationEmail = async (
  to,
  firstName,
  lastName,
  confirmationCode
) => {
  const mailOptions = {
    from: `"Phoenixopia Solutions" <${process.env.USER_1}>`,
    to,
    subject: "Your Verification Code",
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; color: #555; line-height: 1.6;">
          <p style="font-size: 16px;">Hey ${firstName} ${lastName},</p>
          <p>Your verification code is:</p>
          <h2 style="margin: 25px 0; font-size: 32px; color: #1a73e8;">
            ${confirmationCode}
          </h2>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
          <p>Thanks,</p>
          <p><strong>Phoenixopia Team</strong></p>
          <footer style="font-size: 14px; color: #888; text-align: center;">
            <p>© ${new Date().getFullYear()} Phoenixopia Solutions. All rights reserved.</p>
          </footer>
        </body>
      </html>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Confirmation email sent to:", to);
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    throw new Error("Error sending confirmation email.");
  }
};

exports.sendPasswordResetEmail = async (to, firstName, lastName, resetCode) => {
  const mailOptions = {
    from: `"Phoenixopia Solutions" <${process.env.USER_1}>`,
    to,
    subject: "Password Reset Code",
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; color: #555; line-height: 1.6;">
          <p style="font-size: 16px;">Hey ${firstName} ${lastName},</p>
          <p>Your password reset code is:</p>
          <h2 style="margin: 25px 0; font-size: 32px; color: #1a73e8;">
            ${resetCode}
          </h2>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
          <p>Thanks,</p>
          <p><strong>Phoenixopia Team</strong></p>
          <footer style="font-size: 14px; color: #888; text-align: center;">
            <p>© ${new Date().getFullYear()} Phoenixopia Solutions. All rights reserved.</p>
          </footer>
        </body>
      </html>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Password reset email sent to:", to);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Error sending password reset email.");
  }
};
