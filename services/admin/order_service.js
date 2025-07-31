"use strict";

const {
  Order,
  OrderItem,
  Branch,
  Table,
  Reservation,
  KdsOrder,
  Location,
  Restaurant,
  SystemSetting,
  MenuItem,
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
              `address id is required when address type is '${typeAddress}'`,
              400
            );
          }

          location = await Location.findByPk(address_id, { transaction: t });

          if (!location) {
            throwError("Address not found", 404);
          }
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

  async listOrders(user) {
    const t = await sequelize.transaction();
    try {
      const { role_name, restaurant_id, branch_id } = user;

      let filter = {};

      if (role_name === "restaurant_admin") {
        if (!restaurant_id) throwError("restaurant_id is missing", 400);
        filter.restaurant_id = restaurant_id;
      } else if (role_name === "staff") {
        if (!branch_id) throwError("branch_id is missing", 400);
        filter.branch_id = branch_id;
      } else {
        throwError("Unauthorized role to list orders", 403);
      }

      const orders = await Order.findAll({
        where: filter,
        include: [{ model: OrderItem }],
        order: [["created_at", "DESC"]],
        transaction: t,
      });

      await t.commit();
      return orders;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async updateOrderStatus(id, status, user) {
    const t = await sequelize.transaction();
    try {
      const order = await Order.findByPk(id, {
        include: [{ model: KdsOrder }],
        transaction: t,
      });

      if (!order) throwError("Order not found", 404);

      const { role_name, restaurant_id, branch_id } = user;

      if (role_name === "restaurant_admin") {
        const branch = await Branch.findByPk(order.branch_id, {
          transaction: t,
        });
        if (!branch || branch.restaurant_id !== restaurant_id) {
          throwError("Unauthorized to modify this order", 403);
        }
      } else if (role_name === "staff") {
        if (order.branch_id !== branch_id) {
          throwError("Unauthorized to modify this order", 403);
        }
      } else {
        throwError("Unauthorized role", 403);
      }

      order.status = status;
      await order.save({ transaction: t });

      if (order.KdsOrder) {
        order.KdsOrder.status = status;
        await order.KdsOrder.save({ transaction: t });
      }

      await t.commit();

      return {
        id: order.id,
        status: order.status,
        branch_id: order.branch_id,
        restaurant_id: order.restaurant_id,
        customer_id: order.customer_id,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async getSingleOrder(id, user) {
    const t = await sequelize.transaction();
    try {
      const order = await Order.findByPk(id, {
        include: [{ model: OrderItem }],
        transaction: t,
      });

      if (!order) throwError("Order not found", 404);

      const { role_name, restaurant_id, branch_id } = user;

      if (role_name === "restaurant_admin") {
        const branch = await Branch.findByPk(order.branch_id, {
          transaction: t,
        });
        if (!branch || branch.restaurant_id !== restaurant_id) {
          throwError("Unauthorized to view this order", 403);
        }
      } else if (role_name === "staff") {
        if (order.branch_id !== branch_id) {
          throwError("Unauthorized to view this order", 403);
        }
      } else {
        throwError("Unauthorized role", 403);
      }

      await t.commit();
      return order;
    } catch (error) {
      await t.rollback();
      throw error;
    }
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
