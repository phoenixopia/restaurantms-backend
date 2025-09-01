const { Notification, User, Customer } = require("../../models");
const { sendNotificationEmail } = require("../../utils/sendEmail");
// const {
//   sendSMSNotification,
//   sendInAppNotification,
// } = require("../../utils/send_notification");
// const Info = require("../../utils/info");
const throwError = require("../../utils/throwError");

const MAX_RETRIES = 3;

const NotificationService = {};

module.exports = NotificationService;

/*

*/
