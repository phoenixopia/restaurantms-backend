// utils/roleUtils.js
const { Role, RoleTag, Customer } = require("../models");

async function assignRoleToUser(customerId, url, transaction) {
  const roleTag = await RoleTag.findOne({
    where: { name: "customer" },
    transaction,
  });
  if (!roleTag) throw new Error("RoleTag 'customer' not found");

  const role = await Role.findOne({
    where: { role_tag_id: roleTag.id },
    transaction,
  });
  if (!role) throw new Error("Role for 'customer' role tag not found");

  await Customer.update(
    {
      role_id: role.id,
      role_tag_id: roleTag.id,
    },
    { where: { id: customerId }, transaction }
  );
}

module.exports = { assignRoleToUser };
