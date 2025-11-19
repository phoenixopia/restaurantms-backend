const axios = require("axios");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const sendTelegramOTP = async (phoneNumber, otp) => {
  if (!BOT_TOKEN) {
    console.log("Telegram bot not configured");
    return false;
  }

  const cleanPhone = phoneNumber.replace(/[^0-9]/g, ""); // "0911223344"
  const fullPhone = cleanPhone.startsWith("251")
    ? `+${cleanPhone}`
    : `+251${cleanPhone.replace(/^0/, "")}`;

  const message = `
Verification Code

*${otp}*

Valid for 5 minutes
Do not share this code
`.trim();

  try {
    // Step 1: Search user by phone number
    const searchUrl = `https://api.telegram.org/bot${BOT_TOKEN}/searchPublicChat`;
    const searchResponse = await axios.post(searchUrl, {
      query: fullPhone,
    });

    const user = searchResponse.data.result;
    if (!user || user.type !== "private") {
      console.log(`User with phone ${fullPhone} not found on Telegram`);
      return false;
    }

    const chatId = user.id;

    // Step 2: Send OTP
    const sendUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    await axios.post(sendUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    });

    console.log(`OTP ${otp} sent to Telegram user: ${user.first_name} (${fullPhone})`);
    return true;
  } catch (error) {
    if (error.response?.data?.description?.includes("chat not found")) {
      console.log(`No Telegram account with phone ${fullPhone}`);
    } else {
      console.error("Telegram send error:", error.response?.data || error.message);
    }
    return false;
  }
};

module.exports = { sendTelegramOTP };