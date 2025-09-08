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

const OrderService = {
  async createOrder(data, user) {
    const t = await sequelize.transaction();

    try {
      const {
        items,
        total_price,
        branch_id,
        type,
        start_time,
        end_time,
        table_id,
        typeAddress,
        address_id,
        address,
        latitude,
        longitude,
      } = data;

      if (!items || items.length === 0) {
        throwError("Order must contain at least one item", 400);
      }

      if (!["dine-in", "takeaway", "delivery"].includes(type)) {
        throwError("Invalid order type", 400);
      }

      const branch = await Branch.findByPk(branch_id, { transaction: t });
      if (!branch) throwError("Branch not found", 404);

      const restaurant_id = branch.restaurant_id;

      const orderPayload = {
        customer_id: user.id,
        branch_id,
        restaurant_id,
        total_amount: total_price,
        status: "Pending",
        type,
        payment_status: "Unpaid",
      };

      if (type === "dine-in") {
        if (!start_time || !end_time) {
          throwError("Start time and end time are required for dine-in", 400);
        }

        if (!table_id) throwError("Table required for dine-in orders", 400);

        const table = await Table.findByPk(table_id, { transaction: t });
        if (!table) throwError("Selected table not found", 404);

        await table.update({ is_active: false }, { transaction: t });

        await Reservation.create(
          {
            restaurant_id,
            branch_id,
            customer_id: user.id,
            table_id,
            start_time,
            end_time,
            guest_count: table.capacity,
            status: "pending",
          },
          { transaction: t }
        );

        orderPayload.table_id = table_id;
        orderPayload.start_time = start_time;
        orderPayload.end_time = end_time;
        orderPayload.guest_count = table.capacity;
      }

      if (type === "delivery") {
        if (!typeAddress) {
          throwError("Address type is required for delivery orders", 400);
        }

        let location;

        if (["home", "office"].includes(typeAddress)) {
          if (!address_id) {
            throwError(
              `Address ID is required when address type is '${typeAddress}'`,
              400
            );
          }

          location = await Location.findByPk(address_id, { transaction: t });
          if (!location) throwError("Address not found", 404);
        } else if (typeAddress === "custom") {
          if (!address || !latitude || !longitude) {
            throwError(
              "Custom address, latitude, and longitude are required",
              400
            );
          }

          location = await Location.create(
            {
              address,
              latitude,
              longitude,
            },
            { transaction: t }
          );
        } else {
          throwError(
            "Invalid address type. Must be 'home', 'office', or 'custom'",
            400
          );
        }

        orderPayload.delivery_location_id = location.id;
      }

      const order = await Order.create(orderPayload, { transaction: t });

      const groupedItems = {};
      for (const item of items) {
        const key = item.menu_item_id;
        if (!groupedItems[key]) {
          groupedItems[key] = {
            quantity: 0,
            price: item.price,
          };
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
          branch_id,
          order_id: order.id,
          status: "Pending",
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

      if (
        paymentStatus === "Unpaid" &&
        ["InProgress", "Preparing", "Ready", "Served"].includes(order.status)
      ) {
        throwError(
          "Cannot revert payment to Unpaid for orders already in progress",
          400
        );
      }

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

  async getActiveOrders(customerId, page = 1, limit = 10) {
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const activeStatuses = [
      "Pending",
      "InProgress",
      "Preparing",
      "Ready",
      "Served",
    ];

    const { count, rows: orders } = await Order.findAndCountAll({
      where: {
        customer_id: customerId,
        [Op.or]: [
          { status: { [Op.in]: activeStatuses.slice(0, -1) } },
          {
            status: "Served",
            is_seen_by_customer: false,
          },
        ],
      },
      include: [
        {
          model: Restaurant,
          attributes: ["restaurant_name"],
          include: [
            {
              model: SystemSetting,
              attributes: ["logo_url"],
            },
          ],
        },
        {
          model: OrderItem,
          attributes: ["quantity"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    const formatted = orders.map((order) => {
      const totalItems = order.OrderItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      return {
        id: order.id,
        restaurant_name: order.Restaurant?.restaurant_name,
        logo_url: order.Restaurant?.SystemSetting?.logo_url || null,
        total_amount: order.total_amount,
        total_items: totalItems,
        type: order.type,
        status: order.status,
        created_at: order.createdAt,
      };
    });

    const servedOrderIds = orders
      .filter((order) => order.status === "Served")
      .map((order) => order.id);

    if (servedOrderIds.length > 0) {
      await Order.update(
        { is_seen_by_customer: true },
        {
          where: {
            id: { [Op.in]: servedOrderIds },
          },
        }
      );
    }

    return {
      totalItems: count,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      data: formatted,
    };
  },

  async getCustomerOrderHistory(user, page = 1, limit = 10) {
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const { count, rows: orders } = await Order.findAndCountAll({
      where: {
        customer_id: user.id,
        status: "Served",
        is_seen_by_customer: true,
      },
      include: [
        {
          model: Restaurant,
          attributes: ["restaurant_name"],
          include: [
            {
              model: SystemSetting,
              attributes: ["logo_url"],
            },
          ],
        },
        {
          model: OrderItem,
          attributes: ["quantity"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });

    const formatted = orders.map((order) => {
      const totalItems = order.OrderItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      return {
        id: order.id,
        restaurant_name: order.Restaurant?.restaurant_name,
        logo_url: order.Restaurant?.SystemSetting?.logo_url || null,
        total_amount: order.total_amount,
        total_items: totalItems,
        type: order.type,
        status: order.status,
        created_at: order.createdAt,
      };
    });

    return {
      totalItems: count,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      data: formatted,
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
      orderWhere.created_at = { [Op.between]: [new Date(from), new Date(to)] };
    } else if (from) {
      orderWhere.created_at = { [Op.gte]: new Date(from) };
    } else if (to) {
      orderWhere.created_at = { [Op.lte]: new Date(to) };
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
      order: [["created_at", "DESC"]],
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
        created_at: order.created_at,

        restaurant_name: order.Restaurant?.restaurant_name || null,
        branch_name: order.Branch?.name || null,
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
      created_at: order.created_at,

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

  async getOrderByIdForCustomer(orderId, customerId) {
    const baseOrder = await Order.findOne({
      where: { id: orderId, customer_id: customerId },
      attributes: ["id", "type", "status"],
    });

    if (!baseOrder) throwError("Order not found", 404);

    const isDineIn = baseOrder.type === "dine-in";
    const isDelivery = baseOrder.type === "delivery";
    const isServed = baseOrder.status === "Served";

    let deliveryLocation = null;
    if (isDelivery && baseOrder.delivery_location_id) {
      deliveryLocation = await Location.findByPk(
        baseOrder.delivery_location_id,
        {
          attributes: ["address", "latitude", "longitude"],
        }
      );
    }

    const include = [
      {
        model: Restaurant,
        attributes: ["restaurant_name"],
        include: [
          {
            model: SystemSetting,
            attributes: ["logo_url"],
          },
        ],
      },
      {
        model: Branch,
        attributes: ["name"],
        include: [
          {
            model: Location,
            attributes: ["address", "latitude", "longitude"],
          },
        ],
      },
      {
        model: OrderItem,
        attributes: ["id", "menu_item_id", "quantity", "unit_price"],
        include: [
          {
            model: MenuItem,
            attributes: [
              "id",
              "name",
              "image",
              ...(isServed ? ["is_active"] : []),
            ],
          },
        ],
      },
    ];

    if (isDineIn) {
      include.push({
        model: Table,
        attributes: [
          "id",
          "table_number",
          "capacity",
          ...(isServed ? ["is_active"] : []),
        ],
      });
    }

    const order = await Order.findOne({
      where: { id: orderId, customer_id: customerId },
      include,
    });

    if (!order) throwError("Order not found", 404);

    const groupedItemsMap = new Map();
    for (const item of order.OrderItems) {
      const existing = groupedItemsMap.get(item.menu_item_id);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        groupedItemsMap.set(item.menu_item_id, {
          id: item.id,
          menu_item_id: item.menu_item_id,
          name: item.MenuItem?.name,
          image: item.MenuItem?.image,
          is_active: isServed ? item.MenuItem?.is_active ?? null : undefined,
          quantity: item.quantity,
          unit_price: item.unit_price,
        });
      }
    }

    const items = Array.from(groupedItemsMap.values());

    const result = {
      id: order.id,
      restaurant_name: order.Restaurant?.restaurant_name,
      logo_url: order.Restaurant?.SystemSetting?.logo_url || null,
      total_amount: order.total_amount,
      total_items: items.reduce((sum, item) => sum + item.quantity, 0),
      status: order.status,
      type: order.type,
      created_at: order.createdAt,
      items,
      branch: {
        name: order.Branch?.name,
        location: order.Branch?.Location
          ? {
              address: order.Branch.Location.address,
              latitude: order.Branch.Location.latitude,
              longitude: order.Branch.Location.longitude,
            }
          : null,
      },
    };

    if (isDelivery && deliveryLocation) {
      result.delivery_location = {
        address: deliveryLocation.address,
        latitude: deliveryLocation.latitude,
        longitude: deliveryLocation.longitude,
      };
    }

    if (isDineIn && order.Table) {
      result.table_info = {
        table_number: order.Table.table_number,
        capacity: order.Table.capacity,
        ...(isServed && { is_active: order.Table.is_active }),
      };
    }

    return result;
  },
};

module.exports = OrderService;
