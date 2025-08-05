const { Parser } = require("json2csv");
const { Op } = require("sequelize");
const { Subscription, Restaurant, Plan, sequelize } = require("../../models");
const { capitalizeName } = require("../../utils/capitalizeFirstLetter");
const throwError = require("../../utils/throwError");
const { getFileUrl } = require("../../utils/file");
const cleanupUploadedFiles = require("../../utils/cleanUploadedFiles");

const SubscriptionService = {
  async subscribe(data, user_id, receiptFile) {
    const t = await sequelize.transaction();

    try {
      const restaurant = await Restaurant.findByPk(user_id.restaurant_id, {
        transaction: t,
      });

      if (!restaurant) throwError("Restaurant not found", 404);

      const plan = await Plan.findOne({
        where: { name: capitalizeName(data.plan_name) },
        transaction: t,
      });

      if (!plan) throwError("Plan not found", 404);

      const existing = await Subscription.findOne({
        where: { restaurant_id: restaurant.id, status: "active" },
        transaction: t,
      });

      if (existing) throwError("Active subscription already exists", 409);

      const now = new Date();
      const end = new Date(now);
      data.billing_cycle.toLowerCase() === "monthly"
        ? end.setMonth(end.getMonth() + 1)
        : end.setFullYear(end.getFullYear() + 1);

      const subscription = await Subscription.create(
        {
          restaurant_id: restaurant.id,
          plan_id: plan.id,
          start_date: now.toISOString().split("T")[0],
          end_date: end.toISOString().split("T")[0],
          payment_method: data.billing_provider?.toLowerCase() || null,
          receipt: receiptFile
            ? getFileUrl("receipts", receiptFile.filename)
            : null,
          user_id,
          status: "pending",
        },
        { transaction: t }
      );

      await t.commit();
      return subscription;
    } catch (err) {
      await t.rollback();
      if (receiptFile) {
        await cleanupUploadedFiles({ images: [receiptFile] });
      }
      throw err;
    }
  },

  async updateStatus(id, newStatus) {
    const t = await sequelize.transaction();
    try {
      const subscription = await Subscription.findByPk(id, { transaction: t });
      if (!subscription) throwError("Subscription not found", 404);

      subscription.status = newStatus;
      await subscription.save({ transaction: t });

      await t.commit();
      return subscription;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async listSubscriptions(user, query) {
    const {
      status,
      payment_method,
      start_date,
      end_date,
      expiry_start,
      expiry_end,
      page = 1,
      limit = 10,
      sort = "created_at",
      order = "DESC",
    } = query;

    const where = {};

    if (status) where.status = status;

    if (user.role_name === "restaurant_admin") {
      where.restaurant_id = user.restaurant_id;
    }

    if (start_date || end_date) {
      where.start_date = {};
      if (start_date) where.start_date[Op.gte] = start_date;
      if (end_date) where.start_date[Op.lte] = end_date;
    }

    if (expiry_start || expiry_end) {
      where.end_date = {};
      if (expiry_start) where.end_date[Op.gte] = expiry_start;
      if (expiry_end) where.end_date[Op.lte] = expiry_end;
    }

    const offset = (page - 1) * limit;

    const result = await Subscription.findAndCountAll({
      where,
      offset,
      limit: Number(limit),
      order: [[sort, order.toUpperCase() === "ASC" ? "ASC" : "DESC"]],
      include: [
        { model: Restaurant, attributes: ["restaurant_name"] },
        { model: Plan, attributes: ["name", "price", "billing_cycle"] },
      ],
    });

    return {
      currentPage: +page,
      totalPages: Math.ceil(result.count / limit),
      totalItems: result.count,
      data: result.rows,
    };
  },

  async getFilteredSubscriptions(filters = {}, options = {}) {
    const where = {};

    if (filters.status) where.status = filters.status;
    if (filters.payment_method) where.payment_method = filters.payment_method;
    if (filters.expiry_date) where.end_date = { [Op.lte]: filters.expiry_date };
    if (filters.payment_date)
      where.start_date = { [Op.gte]: filters.payment_date };

    const subscriptions = await Subscription.findAll({
      where,
      include: [
        { model: Restaurant, attributes: ["restaurant_name"] },
        { model: Plan, attributes: ["name"] },
      ],
      ...options,
    });

    return subscriptions.map((sub) => ({
      id: sub.id,
      restaurant_id: sub.restaurant_id,
      restaurant_name: sub.Restaurant?.restaurant_name || "",
      plan_id: sub.plan_id,
      plan_name: sub.Plan?.name || "",
      start_date: sub.start_date,
      end_date: sub.end_date,
      payment_method: sub.payment_method,
      status: sub.status,
    }));
  },

  async exportToCSV(filters) {
    const data = await this.getFilteredSubscriptions(filters);

    const dataWithSequentialIds = data.map((item, index) => ({
      ...item,
      id: index + 1,
    }));

    const fields = [
      { label: "Subscription ID", value: "id" },
      { label: "Restaurant ID", value: "restaurant_id" },
      { label: "Restaurant Name", value: "restaurant_name" },
      { label: "Plan ID", value: "plan_id" },
      { label: "Plan Name", value: "plan_name" },
      { label: "Start Date", value: "start_date" },
      { label: "End Date", value: "end_date" },
      { label: "Payment Method", value: "payment_method" },
      { label: "Status", value: "status" },
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(dataWithSequentialIds);

    return {
      csvData: csv,
      filename: `subscriptions_${Date.now()}.csv`,
    };
  },
};

module.exports = SubscriptionService;
