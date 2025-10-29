"use strict";
const axios = require("axios");

async function sendSMS(to, message) {
  const apiSecret = process.env.HAHU_API_SECRET;
  const deviceId = process.env.HAHU_DEVICE_ID;
  const simSlot = process.env.HAHU_SIM_SLOT || 1;
  const priority = process.env.HAHU_SMS_PRIORITY || 1;

  try {
    const response = await axios.post(
      "https://hahu.io/api/send/sms",
      new URLSearchParams({
        secret: apiSecret,
        mode: "devices",
        device: deviceId,
        sim: simSlot,
        priority: priority,
        phone: to,
        message: message,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    console.log("SMS sent attempt:", response.data);

    if (!response.data.data) {
      console.warn(
        `⚠️ Message may not have been delivered. Reason: ${
          response.data.message || "Unknown"
        }`
      );
    }

    return response.data.data;
  } catch (error) {
    console.error("❌ Error sending SMS:", error.response?.data || error.message);
    return false;
  }
}

module.exports = { sendSMS };
