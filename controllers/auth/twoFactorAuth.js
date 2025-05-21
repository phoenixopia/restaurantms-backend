const { Op } = require('sequelize');
const { sequelize, Users } = require('../../models/index');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');


// === Set Up 2FA ===
exports.setup2FA = async (req, res) => {
  if (!req.user.id) {
    return res.status(400).json({ success: false, message: 'Missing required field. Please login.' });
  }

  const t = await sequelize.transaction();
  try{
    const user = await Users.findOne({ where: { id: req.user.id }, transaction: t});
    if (!user) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'No user found.' });
    }
    const secret = speakeasy.generateSecret({
      name: `Restaurant MS (${user.email})`, // app name
    });

    // Generate QR code to display on frontend
    const qrCodeDataURL = await qrcode.toDataURL(secret.otpauth_url);

    // Save secret to DB (only base32)
    user.two_factor_secret = secret.base32;
    user.two_factor_enabled = true;
    user.two_factor_qrCodeURL = qrCodeDataURL
    await user.save({ transaction: t });

    await t.commit()
    return res.status(200).json({sucees: true, data: { qrCode: qrCodeDataURL, secret: secret.base32}})

  } catch(err){
    await t.rollback();
    console.error("Error on Set Up 2FA:", err);
    return res.status(500).json({success: false, message: 'Server Error', error: err.message})
  }
};

