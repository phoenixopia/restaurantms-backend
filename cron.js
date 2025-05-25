const cron = require("node-cron");
const runSubscriptionJob = require("./jobs/deactivateExpiredSubscriptions");
// const runBranchStatusJob = require("./jobs/branchStatus");

cron.schedule("0 2 * * *", () => {
  runSubscriptionJob();
});

// check its availability every hour
// cron.schedule("0 * * * *", () => {
//   runBranchStatusJob();
// });
