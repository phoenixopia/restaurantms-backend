// const twilio = require("twilio");

function sendInAppNotification(io, roomId, title, body) {
  if (!io) {
    console.warn("Socket.IO instance not available for in-app notification.");
    return;
  }
  if (!roomId) {
    console.warn("Room ID missing for in-app notification.");
    return;
  }

  io.to(roomId).emit("newNotification", {
    title,
    body,
    timestamp: new Date(),
  });

  console.log(`💬 In-App notification sent to room ${roomId}`);
}

async function sendSMSNotification(toPhoneNumber, message) {
  // if (
  //   !process.env.TWILIO_ACCOUNT_SID ||
  //   !process.env.TWILIO_AUTH_TOKEN ||
  //   !process.env.TWILIO_PHONE_NUMBER
  // ) {
  //   console.warn("Twilio configuration is missing, cannot send SMS.");
  //   return;
  // }
  // const client = twilio(
  //   process.env.TWILIO_ACCOUNT_SID,
  //   process.env.TWILIO_AUTH_TOKEN
  // );
  // try {
  //   const messageResponse = await client.messages.create({
  //     body: message,
  //     from: process.env.TWILIO_PHONE_NUMBER,
  //     to: toPhoneNumber,
  //   });
  //   console.log(`SMS sent successfully to ${toPhoneNumber}`);
  //   return messageResponse;
  // } catch (error) {
  //   console.error("Failed to send SMS:", error.message);
  //   throw new Error("Failed to send SMS.");
  // }
}

module.exports = { sendInAppNotification, sendSMSNotification };
