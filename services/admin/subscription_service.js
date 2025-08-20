const ExcelJS = require("exceljs");

const { Subscription, Restaurant, Plan, sequelize } = require("../../models");
const throwError = require("../../utils/throwError");
const { getFileUrl } = require("../../utils/file");
const cleanupUploadedFiles = require("../../utils/cleanUploadedFiles");
const { Op, fn, col, where: sequelizeWhere } = require("sequelize");

const VALID_PAYMENT_METHODS = [
  "card",
  "wallet",
  "cash",
  "bank_transfer",
  "other",
];

const SubscriptionService = {
  async subscribe(data, user_id, receiptFile) {
    const t = await sequelize.transaction();

    try {
      const restaurant = await Restaurant.findByPk(user_id.restaurant_id, {
        transaction: t,
      });

      if (!restaurant) throwError("Restaurant not found", 404);

      const plan = await Plan.findByPk(data.plan_id, {
        transaction: t,
      });

      if (!plan) throwError("Plan not found", 404);

      const existing = await Subscription.findOne({
        where: { restaurant_id: restaurant.id, status: "active" },
        transaction: t,
      });

      if (existing) throwError("Active subscription already exists", 409);

      const pendingSub = await Subscription.findOne({
        where: { restaurant_id: restaurant.id, status: "pending" },
        transaction: t,
      });

      if (pendingSub) {
        throwError(
          "There is already a pending subscription. Please wait until it is approved.",
          409
        );
      }

      const now = new Date();
      const end = new Date(now);

      const billingCycle = plan.billing_cycle.toLowerCase();

      if (billingCycle === "monthly") {
        end.setMonth(end.getMonth() + 1);
      } else if (billingCycle === "yearly") {
        end.setFullYear(end.getFullYear() + 1);
      } else {
        throwError("Invalid billing cycle in plan", 400);
      }

      const paymentMethod = data.billing_provider?.toLowerCase();
      if (paymentMethod && !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
        throwError("Invalid payment method", 400);
      }

      const subscription = await Subscription.create(
        {
          restaurant_id: restaurant.id,
          plan_id: plan.id,
          start_date: now.toISOString().split("T")[0],
          end_date: end.toISOString().split("T")[0],
          payment_method: paymentMethod || null,
          receipt: receiptFile
            ? getFileUrl("receipts", receiptFile.filename)
            : null,
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
      const subscription = await Subscription.findByPk(id, {
        transaction: t,
      });

      if (!subscription) throwError("Subscription not found", 404);

      if (newStatus === "active") {
        const plan = await Plan.findByPk(subscription.plan_id, {
          transaction: t,
        });

        if (!plan) throwError("Associated plan not found", 404);

        const now = new Date();
        const end = new Date(now);

        const billingCycle = plan.billing_cycle?.toLowerCase();

        if (billingCycle === "monthly") {
          end.setMonth(end.getMonth() + 1);
        } else if (billingCycle === "yearly") {
          end.setFullYear(end.getFullYear() + 1);
        } else {
          throwError("Invalid billing cycle in plan", 400);
        }

        subscription.start_date = now.toISOString().split("T")[0];
        subscription.end_date = end.toISOString().split("T")[0];
      }

      subscription.status = newStatus;
      await subscription.save({ transaction: t });

      const syncStatuses = ["active", "inactive", "cancelled", "expired"];
      if (syncStatuses.includes(newStatus)) {
        const restaurant = await Restaurant.findByPk(
          subscription.restaurant_id,
          {
            transaction: t,
          }
        );

        if (!restaurant) throwError("Associated restaurant not found", 404);

        restaurant.status = newStatus;
        await restaurant.save({ transaction: t });
      }

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
      billing_cycle,
      restaurant_name,
      page = 1,
      limit = 10,
      sort = "created_at",
      order = "DESC",
    } = query;

    const where = {};
    const restaurantWhere = {};
    const planWhere = {};

    if (status) {
      where.status = status;
    }

    if (user.role_name === "restaurant_admin") {
      where.restaurant_id = user.restaurant_id;
    }

    if (billing_cycle) {
      planWhere.billing_cycle = billing_cycle;
    }

    if (restaurant_name) {
      restaurantWhere.restaurant_name = sequelizeWhere(
        fn("LOWER", col("restaurant.restaurant_name")),
        "LIKE",
        `%${restaurant_name.toLowerCase()}%`
      );
    }

    const offset = (page - 1) * limit;

    const result = await Subscription.findAndCountAll({
      where,
      offset,
      limit: Number(limit),
      order: [[sort, order.toUpperCase() === "ASC" ? "ASC" : "DESC"]],
      include: [
        {
          model: Restaurant,
          attributes: ["restaurant_name"],
          where: restaurantWhere,
        },
        {
          model: Plan,
          attributes: ["name", "price", "billing_cycle"],
          where: planWhere,
        },
      ],
    });

    const formattedData = result.rows.map((sub) => ({
      id: sub.id,
      restaurant_name: sub.Restaurant?.restaurant_name || null,
      plan_name: sub.Plan?.name || null,
      billing_cycle: sub.Plan?.billing_cycle || null,
      payment_method: sub.payment_method || null,
      start_date: sub.start_date,
      end_date: sub.end_date,
      receipt: sub.receipt || null,
      status: sub.status,
      created_at: sub.created_at,
    }));

    return {
      currentPage: +page,
      totalPages: Math.ceil(result.count / limit),
      totalItems: result.count,
      data: formattedData,
    };
  },

  async getFilteredSubscriptions(filters = {}, user = {}, options = {}) {
    const where = {};

    if (filters.status) where.status = filters.status;
    if (filters.payment_method) where.payment_method = filters.payment_method;
    if (filters.expiry_date) where.end_date = { [Op.lte]: filters.expiry_date };
    if (filters.payment_date)
      where.start_date = { [Op.gte]: filters.payment_date };

    if (user.role_name === "restaurant_admin") {
      where.restaurant_id = user.restaurant_id;
    }

    const subscriptions = await Subscription.findAll({
      where,
      include: [
        { model: Restaurant, attributes: ["restaurant_name"] },
        { model: Plan, attributes: ["name", "billing_cycle"] },
      ],
      ...options,
    });

    return subscriptions.map((sub) => ({
      id: sub.id,
      restaurant_name: sub.Restaurant?.restaurant_name || "",
      plan_name: sub.Plan?.name || "",
      billing_cycle: sub.Plan?.billing_cycle || "",
      start_date: sub.start_date,
      end_date: sub.end_date,
      payment_method: sub.payment_method,
      receipt: sub.receipt || "",
      status: sub.status,
    }));
  },

  async exportToExcel(filters, user) {
    const isRestaurantAdmin = user?.role === "restaurant_admin";

    const subscriptions = await this.getFilteredSubscriptions(filters, {
      ...(isRestaurantAdmin && {
        where: { restaurant_id: user.restaurant_id },
      }),
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Subscriptions");

    worksheet.columns = [
      { header: "Subscription ID", key: "id" },
      { header: "Restaurant Name", key: "restaurant_name" },
      { header: "Plan Name", key: "plan_name" },
      { header: "Billing Cycle", key: "billing_cycle" },
      { header: "Start Date", key: "start_date" },
      { header: "End Date", key: "end_date" },
      { header: "Payment Method", key: "payment_method" },
      { header: "Receipt", key: "receipt" },
      { header: "Status", key: "status" },
    ];

    subscriptions.forEach((sub, index) => {
      const row = worksheet.addRow({
        id: index + 1,
        restaurant_name: sub.restaurant_name,
        plan_name: sub.plan_name,
        billing_cycle: sub.billing_cycle,
        start_date: sub.start_date
          ? new Date(sub.start_date).toISOString().split("T")[0]
          : "",
        end_date: sub.end_date
          ? new Date(sub.end_date).toISOString().split("T")[0]
          : "",
        payment_method: sub.payment_method,
        receipt: "", // Will set below
        status: sub.status,
      });

      const receiptCell = row.getCell("receipt");
      if (sub.receipt) {
        receiptCell.value = {
          text: "View Receipt",
          hyperlink: sub.receipt,
        };
      } else {
        receiptCell.value = "No receipt uploaded";
      }
    });

    worksheet.getRow(1).font = { bold: true };

    worksheet.columns.forEach((col) => {
      let maxLength = col.header.length;
      col.eachCell({ includeEmpty: true }, (cell) => {
        const cellLength =
          cell.value?.text?.length || cell.value?.toString().length || 0;
        if (cellLength > maxLength) maxLength = cellLength;
      });
      col.width = maxLength + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();

    const filename = `subscriptions_${Date.now()}.xlsx`;

    return { excelBuffer: buffer, filename };
  },
};

module.exports = SubscriptionService;
