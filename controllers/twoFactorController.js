"use strict";
const { User, TwoFA } = require("../../models");
const sequelize = require("../../models").sequelize;
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");

exports.setup2FA = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(400).json({
      success: false,
      message: "Missing required field. Please login.",
    });
  }

  const t = await sequelize.transaction();
  try {
    const user = await User.findByPk(req.user.id, { transaction: t });

    if (!user) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const secret = speakeasy.generateSecret({
      name: `Restaurant MS (${user.email})`,
    });

    const qrCodeDataURL = await qrcode.toDataURL(secret.otpauth_url);

    const [twoFA, created] = await TwoFA.findOrCreate({
      where: { user_id: user.id },
      defaults: {
        secret_key: secret.base32,
        qrCode_url: qrCodeDataURL,
        is_enabled: true,
      },
      transaction: t,
    });

    if (!created) {
      twoFA.secret_key = secret.base32;
      twoFA.qrCode_url = qrCodeDataURL;
      twoFA.is_enabled = true;
      await twoFA.save({ transaction: t });
    }

    await t.commit();

    return res.status(200).json({
      success: true,
      message: "2FA setup successful",
      data: {
        qrCode: qrCodeDataURL,
        secret: secret.base32,
      },
    });
  } catch (err) {
    await t.rollback();
    console.error("Error on Set Up 2FA:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error during 2FA setup.",
    });
  }
};
