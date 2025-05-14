const twilio = require('twilio');


// Function to send an SMS
exports.sendSMS = async (firstName, lastName, phone, message) => {
    try {
        const { accountSid, authToken, twilioPhoneNumber } = process.env;
        if (!accountSid || !authToken || !twilioPhoneNumber) {
            throw new Error("Twilio credentials are missing in environment variables.");
        }
        const client = require('twilio')(accountSid, authToken);
        const smsBody = `Dear ${firstName} ${lastName},\n\n${message}\n\nThank you.`;
        const response = await client.messages.create({
          body: smsBody,
          from: twilioPhoneNumber,
          to: phone
        });
  
        console.log(`SMS sent successfully. Message SID: ${response.sid}`);
        // return response;
    } catch (error) {
        console.error(`Error sending SMS: ${error.message}`);
        throw new Error("Failed to send SMS. Please try again later.");
    }
  };