const { User, Role } = require("../models");

async function validateManagerByEmail(
  managerEmail,
  adminId,
  transaction = null
) {
  if (!managerEmail) {
    throw new Error("Manager email is required");
  }

  const manager = await User.findOne({
    where: { email: managerEmail.toLowerCase() },
    include: [
      {
        model: Role,
        attributes: ["name"],
      },
    ],
    transaction,
  });

  if (!manager) {
    throw new Error("No user found with that email");
  }

  if (manager.Role.name !== "staff") {
    throw new Error("User is not a branch manager");
  }

  if (manager.created_by !== adminId) {
    throw new Error("You can only assign managers created by you");
  }

  return manager;
}

module.exports = { validateManagerByEmail };
