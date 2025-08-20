const cron = require("node-cron");
const runSubscriptionJob = require("./jobs/deactivateExpiredSubscriptions");

// run every day at 2 AM
cron.schedule("0 2 * * *", () => {
  runSubscriptionJob();
});
