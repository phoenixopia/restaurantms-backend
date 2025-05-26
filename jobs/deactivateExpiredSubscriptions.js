const {
  deactivateExpiredSubscriptions,
  expireTrialRestaurants,
} = require("./../utils/subscriptionUtils");

const runSubscriptionJob = async () => {
  console.log("Running subscription expiration job...");
  await deactivateExpiredSubscriptions();

  console.log("Running trial expiration job. . . .");
  await expireTrialRestaurants();
};

module.exports = runSubscriptionJob;
