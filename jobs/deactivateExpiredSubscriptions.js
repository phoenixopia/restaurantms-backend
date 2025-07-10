const {
  deactivateExpiredSubscriptions,
  expireTrialRestaurants,
} = require("../utils/subscriptionUtils");

const runSubscriptionJob = async (io = null) => {
  console.log("Running subscription expiration job...");
  await deactivateExpiredSubscriptions(io);

  console.log("Running trial expiration job...");
  await expireTrialRestaurants();
};

module.exports = runSubscriptionJob;
