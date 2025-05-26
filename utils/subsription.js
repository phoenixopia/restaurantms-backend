const { Subscription, Restaurant, Plan, sequelize } = require("../models/index");
const { Op } = require("sequelize");

const GRACE_PERIOD_DAYS = 2;
const TRIAL_DAYS = 15;

const deactivateExpiredSubscriptions = async () => {
  const transaction = await sequelize.transaction();
  try {
    const today = new Date();
    const graceCutoff = new Date(today);
    graceCutoff.setDate(today.getDate() - GRACE_PERIOD_DAYS);

    const isFirstDayOfMonth = today.getDate() === 1;

    // Decide which billing cycles to include
    const billingCyclesToCheck = ["monthly"];
    if (isFirstDayOfMonth) {
      billingCyclesToCheck.push("yearly");
    }

    const expiredSubscriptions = await Subscription.findAll({
      where: {
        status: "active",
        end_date: { [Op.lt]: graceCutoff },
        billing_cycle: { [Op.in]: billingCyclesToCheck },
      },
      transaction,
    });

    for (const subscription of expiredSubscriptions) {
      const restaurantId = subscription.restaurant_id;

      await subscription.update({ status: "expired" }, { transaction });

      await Restaurant.update(
        {
          status: "expired",
          subscription_id: null,
        },
        {
          where: { id: restaurantId },
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

const expireTrialRestaurants = async () => {
  const transaction = await sequelize.transaction();
  try {
    const today = new Date();

    const trialExpirationDate = new Date(today);
    trialExpirationDate.setDate(trialExpirationDate.getDate() - TRIAL_DAYS);

    const expiredTrials = await Restaurant.findAll({
      where: {
        status: "trial",
        created_at: { [Op.lte]: trialExpirationDate }, // trial started at created_at
      },
      transaction,
    });

    for (const restaurant of expiredTrials) {
      await restaurant.update({ status: "expired" }, { transaction });
    }

    await transaction.commit();

    console.log(`${expiredTrials.length} trial restaurants expired.`);
  } catch (err) {
    await transaction.rollback();
    console.error("Failed to expire trial restaurants:", err);
  }
};

module.exports = {
  deactivateExpiredSubscriptions,
  expireTrialRestaurants,
};
