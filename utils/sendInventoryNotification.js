const { Notification, User, Branch, Customer } = require("../models");
const { getIo } = require("../socket");
const throwError = require("./throwError");

async function sendInventoryNotification(
  branch_id,
  title,
  message,
  created_by = null
) {
  const branch = await Branch.findByPk(branch_id, {
    attributes: ["id", "restaurant_id"],
  });
  if (!branch) throwError("Branch not found", 404);

  const users = await User.findAll({ where: { branch_id } });
  const notifications = [];
  const io = getIo();

  for (const u of users) {
    const notification = await Notification.create({
      title,
      message,
      type: "INVENTORY",
      state: "info",
      data: null,
      created_by,
      target_user_id: u.id,
      restaurant_id: branch.restaurant_id,
      branch_id,
    });
    notifications.push(notification);
    io.to(`user_${u.id}`).emit("notification", notification);
  }

  return notifications;
}

module.exports = sendInventoryNotification;
