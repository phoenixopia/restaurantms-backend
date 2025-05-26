const cron = require("node-cron");
const runSubscriptionJob = require("./jobs/deactivateExpiredSubscriptions");
const runBranchStatusJob = require("./jobs/branchStatus");

// run every day at 2 AM
cron.schedule("0 2 * * *", () => {
  runSubscriptionJob();
});

// every hour
cron.schedule("0 * * * *", () => {
  runBranchStatusJob();
});
