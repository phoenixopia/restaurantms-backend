const { User, SystemSetting, ContactInfo } = require("../models");

exports.getBranchUsers = async (branch_id) => {
  return await User.findAll({
    where: {
      branch_id,
    },
  });
};

exports.getRestaurantAdmin = async (restaurant_id) => {
  return await User.findOne({
    where: {
      restaurant_id,
    },
  });
};

exports.getBranchContactEmail = async (branch_id) => {
  const contact = await ContactInfo.findOne({
    where: {
      module_type: "branch",
      module_id: branch_id,
      type: "email",
    },
    attributes: ["value"],
  });

  return contact?.value || null;
};
