const { Subscription, Restaurant, sequelize } = require("../models");
const { Op } = require("sequelize");

const GRACE_PERIOD_DAYS = 2;

const deactivateExpiredSubscriptions = async () => {
  const transaction = await sequelize.transaction();
  try {
    const today = new Date();
    const graceDate = new Date(today);
    graceDate.setDate(today.getDate() - GRACE_PERIOD_DAYS);

    const expiredSubscriptions = await Subscription.findAll({
      where: {
        status: "active",
        end_date: {
          [Op.lt]: graceDate,
        },
      },
      transaction,
    });

    for (const subscription of expiredSubscriptions) {
      await subscription.update({ status: "expired" }, { transaction });

      await Restaurant.update(
        {
          status: "expired",
          subscription_id: null,
        },
        {
          where: { id: subscription.restaurant_id },
          transaction,
        }
      );
    }
    await transaction.commit();
    console.log(`${expiredSubscriptions.length} subscriptions deactivated.`);
  } catch (err) {
    await transaction.rollback();
    console.error("Failed to deactivate subscriptions:", err);
  }
};

module.exports = {
  deactivateExpiredSubscriptions,
};
