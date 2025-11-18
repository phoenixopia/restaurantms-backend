"use strict";

const {
  User,
  Order,
  OrderItem,
  Branch,
  Table,
  Reservation,
  KdsOrder,
  Location,
  Restaurant,
  SystemSetting,
  Customer,
  MenuItem,
  Payment,
  sequelize,
} = require("../../models");
const { Op, fn, col, literal, QueryTypes, where } = require("sequelize");
const throwError = require("../../utils/throwError");
const { buildPagination } = require("../../utils/pagination");
const SendNotification = require("../../utils/send_notification");

const OrderService = {

  async createOrderByAdmin(data, user) {
    const t = await sequelize.transaction();
    try {
      const {
        items,
        total_price,
        branch_id: bodyBranchId,
        type,
        table_id,
      } = data;

      if (!items || items.length === 0) {
        throwError("Order must contain at least one item", 400);
      }

      if (!["dine-in", "takeaway"].includes(type)) {
        throwError("Invalid order type for admin order", 400);
      }

      let branchIdToUse;
      if (user.branch_id) {
        branchIdToUse = user.branch_id;
      } else if (user.restaurant_id) {
        if (!bodyBranchId)
          throwError("Branch ID is required for users with restaurant_id", 400);
        branchIdToUse = bodyBranchId;
      } else {
        throwError("Invalid user context", 403);
      }

      const branch = await Branch.findByPk(branchIdToUse, { transaction: t });
      if (!branch) throwError("Branch not found", 404);

      const restaurant_id = branch.restaurant_id;

      const orderPayload = {
        user_id: user.id,
        branch_id: branchIdToUse,
        restaurant_id,
        total_amount: total_price,
        status: "Pending",
        type,
        payment_status: "Unpaid",
      };

      if (type === "dine-in") {
        if (!table_id) throwError("Table is required for dine-in orders", 400);

        const table = await Table.findByPk(table_id, { transaction: t });
        if (!table) throwError("Selected table not found", 404);

        await table.update({ is_active: false }, { transaction: t });
        orderPayload.table_id = table_id;
      }

      const order = await Order.create(orderPayload, { transaction: t });

      const groupedItems = {};
      for (const item of items) {
        const key = item.menu_item_id;
        if (!groupedItems[key]) {
          groupedItems[key] = { quantity: 0, price: item.price };
        }
        groupedItems[key].quantity += item.quantity;
      }

      const orderItems = Object.entries(groupedItems).map(
        ([menu_item_id, value]) => ({
          order_id: order.id,
          menu_item_id,
          quantity: value.quantity,
          unit_price: value.price,
        })
      );

      await OrderItem.bulkCreate(orderItems, { transaction: t });

      await KdsOrder.create(
        {
          restaurant_id,
          branch_id: branchIdToUse,
          order_id: order.id,
          status: "Pending",
        },
        { transaction: t }
      );

      await Payment.create(
        {
          restaurant_id,
          order_id: order.id,
          user_id: user.id,
          amount: total_price,
          payment_method: "cash",
          status: "pending",
        },
        { transaction: t }
      );

      await t.commit();
      return order;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async updateOrderPaymentStatus(kdsId, paymentStatus, user) {
    const t = await sequelize.transaction();
    try {
      const kdsOrder = await KdsOrder.findByPk(kdsId, { transaction: t });
      if (!kdsOrder) throwError("KDS order not found", 404);

      if (user.restaurant_id && kdsOrder.restaurant_id !== user.restaurant_id) {
        throwError("Not authorized to update this order", 403);
      }
      if (user.branch_id && kdsOrder.branch_id !== user.branch_id) {
        throwError("Not authorized to update this order", 403);
      }

      // Find linked order
      const order = await Order.findByPk(kdsOrder.order_id, { transaction: t });
      if (!order) throwError("Order not found", 404);

      // if (
      //   paymentStatus === "Unpaid" &&
      //   ["InProgress", "Preparing", "Ready", "Served"].includes(order.status)
      // ) {
        
      //   // throwError(
      //   //   "Cannot revert payment to Unpaid for orders already in progress",
      //   //   400
      //   // );
      // }

      order.payment_status = paymentStatus;

      if (paymentStatus === "Paid") {
        order.status = "InProgress";
        kdsOrder.status = "InProgress";

        await Payment.update(
          { status: "completed", payment_date: new Date() },
          { where: { order_id: order.id }, transaction: t }
        );
      } else if (paymentStatus === "Unpaid") {
        order.status = "Pending";
        kdsOrder.status = "Pending";

        await Payment.update(
          { status: "pending", payment_date: null },
          { where: { order_id: order.id }, transaction: t }
        );
      }

      await order.save({ transaction: t });
      await kdsOrder.save({ transaction: t });

      await t.commit();
      return order;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },
  async cancelOrder(orderId, user) {
    const t = await sequelize.transaction();
    try {
      const order = await Order.findOne({
        where: { id: orderId },
        transaction: t,
      });

      if (!order) throwError("Order not found", 404);

      if (order.status !== "Pending")
        throwError("Only pending orders can be cancelled", 400);

      if (order.customer_id !== user.id)
        throwError("Unauthorized to cancel this order", 403);

      if (order.type === "dine-in" && order.table_id) {
        await Table.update(
          { is_active: true },
          { where: { id: order.table_id }, transaction: t }
        );

        const reservation = await Reservation.findOne({
          where: {
            table_id: order.table_id,
            customer_id: order.customer_id,
            status: "pending",
          },
          transaction: t,
        });

        if (reservation) {
          await Reservation.destroy({
            where: { id: reservation.id },
            transaction: t,
          });
        }
      }

      if (order.type === "delivery" && order.delivery_location_id) {
        await Location.destroy({
          where: { id: order.delivery_location_id },
          transaction: t,
        });
      }

      await OrderItem.destroy({
        where: { order_id: order.id },
        transaction: t,
      });

      await KdsOrder.destroy({
        where: { order_id: order.id },
        transaction: t,
      });

      await Order.destroy({
        where: { id: order.id },
        transaction: t,
      });

      await t.commit();
      return { message: "Order cancelled and deleted successfully." };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

async  getKitchenDisplayOrders(branchId) {
  if (!branchId) throw new Error("branchId is required");

  const activeKdsOrders = await KdsOrder.findAll({
    where: {
      branch_id: branchId,
      status: { [Op.in]: ["Pending", "InProgress", "Preparing", "Ready"] },
    },
    include: [
      {
        model: Order,
        attributes: ["id", "type", "total_amount", "order_date"],
        required: true,
        include: [
          { model: Table, attributes: ["table_number"], required: false },
          { model: Customer, attributes: ["first_name"], required: false },
          {
            model: OrderItem,
            attributes: ["quantity"],
            required: false,
            include: [
              { model: MenuItem, attributes: ["name", "image"], required: false },
            ],
          },
        ],
      },
    ],
  
    order: [["created_at", "DESC"]],  
    limit: 100,
    subQuery: false,
  });

  const formatted = activeKdsOrders.map(kds => {
    const order = kds.Order;


    const createdAt = kds.created_at || kds.createdAt;
    const minutesWaiting = createdAt 
      ? Math.floor((Date.now() - new Date(createdAt)) / 60000)
      : 0;

    const priority = minutesWaiting > 15 ? "urgent"
                   : minutesWaiting > 10 ? "warning"
                   : "normal";

    return {
      kds_id: kds.id,
      order_id: order.id,
      status: kds.status,
      priority,
      minutes_waiting: minutesWaiting,  

      table: order.type === "dine-in"
        ? order.Table?.table_number ? `Table ${order.Table.table_number}` : "No Table"
        : order.type === "takeaway" ? "Takeaway" : "Delivery",

      customer: order.Customer?.first_name?.trim() || "Guest",

      total_amount: parseFloat(order.total_amount || 0).toFixed(2),

      items: (order.OrderItems || []).map(item => ({
        name: item.MenuItem?.name || "Unknown Item",
        quantity: item.quantity || 1,
        image: item.MenuItem?.image || null,
      })),

      created_at: kds.created_at,
    };
  });


  formatted.sort((a, b) => {
    if (a.priority === "urgent" && b.priority !== "urgent") return -1;
    if (b.priority === "urgent" && a.priority !== "urgent") return 1;
    return b.minutes_waiting - a.minutes_waiting;
  });

  return {
    branch_id: branchId,
    total_active: formatted.length,
    refreshed_at: new Date().toISOString(),
    orders: formatted,
  };
},



 async listOrders(query, user) {
    const { page = 1, limit = 10, status, from, to, branchId } = query;
    const offset = (page - 1) * limit;

    let where = {};

    if (user.restaurant_id) {
      where.restaurant_id = user.restaurant_id;
      if (branchId) where.branch_id = branchId;
    } else if (user.branch_id) {
      where.branch_id = user.branch_id;
    } else {
      throwError("Access denied", 403);
    }

    if (status) where.status = status;

    let orderWhere = {};
    if (from && to) {
      orderWhere.createdAt = { [Op.between]: [new Date(from), new Date(to)] };
    } else if (from) {
      orderWhere.createdAt = { [Op.gte]: new Date(from) };
    } else if (to) {
      orderWhere.createdAt = { [Op.lte]: new Date(to) };
    }

    const { rows: kdsOrders, count } = await KdsOrder.findAndCountAll({
      where,
      include: [
        {
          model: Order,
          where: orderWhere,
          include: [
            { model: Restaurant, attributes: ["id", "restaurant_name"] },
            { model: Branch, attributes: ["id", "name"] },
            { model: Customer, attributes: ["id", "first_name", "last_name"] },
            { model: User, attributes: ["id", "first_name", "last_name"] },
            { model: Table, attributes: ["id", "table_number"] },
            {
              model: Location,
              attributes: ["id", "address", "latitude", "longitude"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true, // important when using include
    });

    const formattedOrders = kdsOrders.map((kds) => {
      const order = kds.Order;

      const personName = order.Customer
        ? `${order.Customer.first_name} ${order.Customer.last_name}`
        : order.User
        ? `${order.User.first_name} ${order.User.last_name}`
        : null;

      return {
        kds_id: kds.id,
        order_id: order.id,
        type: order.type,
        status: kds.status,
        total_amount: order.total_amount,
        payment_status: order.payment_status,
        order_date: order.order_date,
        createdAt: order.createdAt,

        restaurant_name: order.Restaurant?.restaurant_name || null,
        branch_name: order.Branch?.name || null,
        branch_id: order.Branch?.id || null,
        // customer_name: personName,
        customer_name: `${order?.Customer?.first_name} ${order?.Customer?.last_name}` || null,
        customer_id: order?.Customer?.id || null,
        user_name: `${order?.User?.first_name} ${order?.User?.last_name}` || null,
        user_id: order.User?.id || null,

        table_number:
          order.type === "dine-in" ? order.Table?.table_number || null : null,

        delivery_location:
          order.type === "delivery"
            ? {
                address: order.Location?.address || null,
                latitude: order.Location?.latitude || null,
                longitude: order.Location?.longitude || null,
              }
            : null,
      };
    });

    const totalPages = Math.ceil(count / limit);

    return {
      orders: formattedOrders,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
      },
    };
  },




  async updateOrderStatus(id, status, user) {
    const t = await sequelize.transaction();
    try {
      const kdsOrder = await KdsOrder.findByPk(id, { transaction: t });
      if (!kdsOrder) throwError("KDS order not found", 404);

      if (user.restaurant_id) {
        if (kdsOrder.restaurant_id !== user.restaurant_id)
          throwError("Not authorized to update this order", 403);
      } else if (user.branch_id) {
        if (kdsOrder.branch_id !== user.branch_id) {
          throwError("Not authorized to update this order", 403);
        }
      } else {
        throwError("Access denied", 403);
      }

      kdsOrder.status = status;
      await kdsOrder.save({ transaction: t });

      const order = await Order.findByPk(kdsOrder.order_id, { transaction: t });
      if (order) {
        order.status = status;
        await order.save({ transaction: t });
      }
      if (status === "Served" && order.type === "dine-in" && order.table_id) {
        const table = await Table.findByPk(order.table_id, { transaction: t });
        if (table) {
          table.is_active = true;
          await table.save({ transaction: t });
        }
      }
      if (
        status === "Cancelled" &&
        order.type === "dine-in" &&
        order.table_id
      ) {
        const table = await Table.findByPk(order.table_id, { transaction: t });
        if (table) {
          table.is_active = true;
          await table.save({ transaction: t });
        }
      }

      await t.commit();

      // ========== Send Notifications ==========
      try {
        // Notify for both staff/admin abd customer about the status update
        await SendNotification.sendOrderStatusUpdatedNotification(order, status);

      } catch (notifyErr) {
        console.error("Notification Error:", notifyErr.message);
      }

      return order;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async getSingleOrder(kdsId, user) {
    const kdsOrder = await KdsOrder.findOne({
      where: { id: kdsId },
      include: [
        {
          model: Order,
          include: [
            { model: Restaurant, attributes: ["id", "restaurant_name"] },
            { model: Branch, attributes: ["id", "name"] },
            { model: Customer, attributes: ["id", "first_name", "last_name"] },
            { model: User, attributes: ["id", "first_name", "last_name"] },
            { model: Table, attributes: ["id", "table_number"] },
            {
              model: Location,
              attributes: ["id", "address", "latitude", "longitude"],
            },
            {
              model: OrderItem,
              include: [
                {
                  model: MenuItem,
                  attributes: ["id", "name", "description", "unit_price"],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!kdsOrder) throwError("Order not found.", 404);

    const order = kdsOrder.Order;

    // Authorization
    if (user.restaurant_id && order.restaurant_id !== user.restaurant_id)
      throwError("Not authorized to view this order.", 403);
    if (user.branch_id && order.branch_id !== user.branch_id)
      throwError("Not authorized to view this order.", 403);
    if (!user.restaurant_id && !user.branch_id)
      throwError("Invalid user context.", 403);

    const personName = order.Customer
      ? `${order.Customer.first_name} ${order.Customer.last_name}`
      : order.User
      ? `${order.User.first_name} ${order.User.last_name}`
      : null;

    // Map menu items
    const orderedItems = order.OrderItems.map((item) => ({
      id: item.id,
      menu_item_id: item.menu_item_id,
      name: item.MenuItem?.name,
      description: item.MenuItem?.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));

    return {
      id: order.id,
      kds_id: kdsOrder.id,
      type: order.type,
      status: kdsOrder.status,
      total_amount: order.total_amount,
      payment_status: order.payment_status,
      order_date: order.order_date,
      createdAt: order.createdAt,

      restaurant: {
        id: order.Restaurant?.id || null,
        name: order.Restaurant?.restaurant_name || null,
      },
      branch: {
        id: order.Branch?.id || null,
        name: order.Branch?.name || null,
      },
      customer_name: personName,

      table_number:
        order.type === "dine-in" ? order.Table?.table_number || null : null,

      delivery_location:
        order.type === "delivery"
          ? {
              address: order.Location?.address || null,
              latitude: order.Location?.latitude || null,
              longitude: order.Location?.longitude || null,
            }
          : null,

      items: orderedItems,
    };
  },


  async deleteOrder(kdsId, user) {
    const t = await sequelize.transaction();
    try {
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

};

module.exports = OrderService;
