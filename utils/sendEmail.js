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
  confirmationLink
) => {
  const mailOptions = {
    from: `"Phoenixopia Solutions" <${process.env.USER_1}>`,
    to,
    subject: "Please Confirm Your Email Address",
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; color: #555; line-height: 1.6;">
          <p style="font-size: 16px;">Hey ${firstName} ${lastName},</p>
          <p>Thank you for signing up with <strong>Phoenixopia Solutions</strong>. To complete your registration, please confirm your email:</p>
          <p style="margin-left: 40px; margin-bottom: 30px;">
            <a href="${confirmationLink}" style="font-size: 16px; color: #1a73e8; text-decoration: none; font-weight: bold;">Confirm Email Address</a>
          </p>
          <p>If you did not sign up, please ignore this email.</p>
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

exports.sendPasswordResetEmail = async (to, resetLink) => {
  const mailOptions = {
    from: `"Phoenixopia Solutions" <${process.env.USER_1}>`,
    to,
    subject: "Password Reset Request",
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; color: #555; line-height: 1.6;">
          <p style="font-size: 16px;">Hi there,</p>
          <p>We received a request to reset your password for your <strong>Phoenixopia Solutions</strong> account.</p>
          <p style="margin-left: 40px; margin-bottom: 30px;">
            <a href="${resetLink}" style="font-size: 16px; color: #1a73e8; text-decoration: none; font-weight: bold;">Reset Password</a>
          </p>
          <p>If you did not request this, please ignore this email.</p>
          <p>Thanks,</p>
          <p><strong>The Phoenixopia Team</strong></p>
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
