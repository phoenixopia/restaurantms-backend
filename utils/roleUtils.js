const { Role, User } = require("../models");

async function assignRoleToUser(userId, url, transaction) {
  const roleName = url.includes("/admin") ? "restaurant_admin" : "customer";

  let role = await Role.findOne({ where: { name: roleName }, transaction });

  if (!role) {
    role = await Role.create(
      {
        name: roleName,
        description: `${roleName.replace("_", " ")} role`,
      },
      { transaction }
    );
  }

  await User.update(
    { role_id: role.id },
    {
      where: { id: userId },
      transaction,
    }
  );
}

module.exports = { assignRoleToUser };
