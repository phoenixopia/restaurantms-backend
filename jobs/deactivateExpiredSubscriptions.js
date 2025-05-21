const deactivateExpiredSubscriptions = require("./../utils/subscriptionUtils");

const runSubscriptionJob = async () => {
  console.log("Running subscription expiration job...");
  await deactivateExpiredSubscriptions();
};

module.exports = runSubscriptionJob;
