const { ActivityLog } = require("../models");

const logActivity = async ({
  user_id = null,
  module,
  action,
  details = null,
  transaction = null,
}) => {
  try {
    if (!module || !action) {
      throw new Error("Activity log requires both 'module' and 'action'.");
    }

    await ActivityLog.create(
      {
        user_id,
        module,
        action,
        details,
      },
      { transaction }
    );
  } catch (error) {
    console.error("ActivityLog Error:", error.message);
  }
};

module.exports = logActivity;
