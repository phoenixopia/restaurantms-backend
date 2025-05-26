const { Branch } = require("../models");
const getBranchStatusByTime = require("../utils/getBranchStatusByTime");

const runBranchStatusJob = async () => {
  console.log("Running branch status job...");

  try {
    const branches = await Branch.findAll();

    for (const branch of branches) {
      const currentStatus = getBranchStatusByTime(
        branch.opening_time,
        branch.closing_time
      );

      if (branch.status !== currentStatus) {
        branch.status = currentStatus;
        await branch.save();
        console.log(
          `Updated status for branch ${branch.name} to ${currentStatus}`
        );
      }
    }
  } catch (error) {
    console.error("Branch status update job failed:", error.message);
  }
};

module.exports = runBranchStatusJob;
