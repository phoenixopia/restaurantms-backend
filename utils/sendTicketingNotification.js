
const { Notification, User } = require('../models');
const { getIo } = require('../sockets');

async function sendTicketingNotification(restaurant_id, title, message, created_by = null) {
  const users = await User.findAll({ where: { restaurant_id } });
  const notifications = [];
  const io = getIo();

  for (const u of users) {
    const notification = await Notification.create({
      title,
      message,
      type: 'TICKET',
      state: 'info',
      data: null,
      created_by,
      target_user_id: u.id,
      restaurant_id,
      branch_id:null
    });
    notifications.push(notification);
    io.to(`user_${u.id}`).emit('notification', notification);
  }

  return notifications;
}

module.exports = sendTicketingNotification;
