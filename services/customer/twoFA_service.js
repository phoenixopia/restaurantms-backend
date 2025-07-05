const { sequelize, Customer, TwoFA } = require("../../models");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const throwError = require("../../utils/throwError");

exports.setup2FA = async (user) => {
  if (!user?.id) {
    throwError("Authentication required. Please login.", 400);
  }

  const t = await sequelize.transaction();
  try {
    const customer = await Customer.findByPk(user.id, { transaction: t });
    if (!customer) {
      throwError("User not found.", 404);
    }

    // Generate 2FA secret
    const secret = speakeasy.generateSecret({
      name: `Restaurant MS (${
        customer.email || customer.phone_number || "User"
      })`,
    });

    // Generate QR code from OTP auth URL
    const qrCodeDataURL = await qrcode.toDataURL(secret.otpauth_url);

    // Upsert TwoFA record
    const [twoFA, created] = await TwoFA.findOrCreate({
      where: { customer_id: customer.id },
      defaults: {
        secret_key: secret.base32,
        qrCode_url: qrCodeDataURL,
      },
      transaction: t,
    });

    if (!created) {
      twoFA.secret_key = secret.base32;
      twoFA.qrCode_url = qrCodeDataURL;
      await twoFA.save({ transaction: t });
    }

    customer.two_factor_enabled = true;
    await customer.save({ transaction: t });

    await t.commit();

    return {
      qrCode_url: qrCodeDataURL,
      secret: secret.base32,
    };
  } catch (err) {
    await t.rollback();
    console.error("2FA Setup Error:", err);
    throwError(err.message || "Failed to set up 2FA.", 500);
  }
};
