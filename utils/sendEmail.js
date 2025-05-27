const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    // service: 'Gmail', 
    // auth: {
    //     "user": process.env.USER_1,
    //     "pass": process.env.PASS_1
    // },
    host: 'phoenixopia.com',
    port: 465,
    secure: true, 
    auth: {
        user: process.env.USER_1, 
        pass: process.env.PASS_1
    },
    tls: {
        rejectUnauthorized: false // optional but helps with self-signed certs
    }
});


// Send confirmation email to the new user
exports.sendConfirmationEmail = async (to, firstName, lastName, confirmationLink) => {
    const mailOptions = {
        from: `"Phoenixopia Solutions" <${process.env.USER_1}>`,
        to: to,
        subject: 'Please Confirm Your Email Address',
        html: `
            <html>
                <body style="font-family: Arial, sans-serif; color: #555; line-height: 1.6;">
                    <p style="font-size: 16px; margin-bottom: 15px;">Hey ${firstName} ${lastName},</p>
                    
                    <p style="font-size: 16px; margin-bottom: 15px;">
                        Thank you for signing up with <strong>Phoenixopia Solutions</strong>. 
                        To complete your registration, we need you to confirm your email address.
                    </p>
                    <p style="font-size: 16px; margin-bottom: 30px;">
                        Please click the link below to confirm your email address:
                    </p>
                    <p style="margin-left: 40px; margin-bottom: 30px;">
                        <a href="${confirmationLink}" style="font-size: 16px; color: #1a73e8; text-decoration: none; font-weight: bold;">Confirm Email Address</a>
                    </p>
                    <p style="font-size: 16px; margin-bottom: 30px;">
                        If you did not sign up for this account, please disregard this email.
                    </p>
                    <p style="font-size: 16px; margin-bottom: 15px;">Thanks,</p>
                    <p style="font-size: 16px; font-weight: bold; margin-bottom: 30px;">Phoenixopia Team</p>
                    <footer style="font-size: 14px; color: #888; text-align: center;">
                        <p style="margin-top: 20px;">© ${new Date().getFullYear()} Phoenixopia Solutions. All rights reserved.</p>
                    </footer>
                </body>
            </html>`
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log('Confirmation email sent to: ' + to);
    } catch (error) {
        console.error('Error sending confirmation email:', error);
        throw new Error('Error sending confirmation email.');
    }
};

// Send reset email
exports.sendPasswordResetEmail = async (to, resetLink) => {
    const mailOptions = {
        from: `"Phoenixopia Solutions" <${process.env.USER_1}>`,
        to: to,
        subject: 'Password Reset Request',
        html: `
            <html>
                <body style="font-family: Arial, sans-serif; color: #555; line-height: 1.6;">
                    <p style="font-size: 16px; margin-bottom: 15px;">Hi dear,</p>
                    
                    <p style="font-size: 16px; margin-bottom: 15px;">
                        We received a request to reset your password for your account at <strong>Phoenixopia Solutions</strong>.
                    </p>
                    <p style="font-size: 16px; margin-bottom: 30px;">
                        Please click the link below to reset your password:
                    </p>
                    <p style="margin-left: 40px; margin-bottom: 30px;">
                        <a href="${resetLink}" style="font-size: 16px; color: #1a73e8; text-decoration: none; font-weight: bold;">Reset Password</a>
                    </p>
                    <p style="font-size: 16px; margin-bottom: 30px;">
                        If you did not request a password reset, please ignore this email.
                    </p>
                    <p style="font-size: 16px; margin-bottom: 15px;">Thank you,</p>
                    <p style="font-size: 16px; font-weight: bold; margin-bottom: 30px;">The Phoenixopia Team</p>
                    <footer style="font-size: 14px; color: #888; text-align: center;">
                        <p style="margin-top: 20px;">© ${new Date().getFullYear()} Phoenixopia Solutions. All rights reserved.</p>
                    </footer>
                </body>
            </html>`
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log('Password reset email sent to: ' + to);
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw new Error('Error sending password reset email.');
    }
};
