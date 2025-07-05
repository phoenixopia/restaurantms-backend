const { Role, User, Customer } = require("../models");

async function assignRoleToUser(userId, url, transaction) {
  let roleName;
  let ModelToUpdate;

  if (url.includes("/admin")) {
    roleName = "restaurant_admin";
    ModelToUpdate = User;
  } else {
    roleName = "customer";
    ModelToUpdate = Customer;
  }

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

  await ModelToUpdate.update(
    { role_id: role.id },
    {
      where: { id: userId },
      transaction,
    }
  );
}

module.exports = { assignRoleToUser };
