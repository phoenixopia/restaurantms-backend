"use strict";

const {
  Order,
  OrderItem,
  Branch,
  Table,
  Reservation,
  KdsOrder,
  sequelize,
} = require("../../models");
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

      const order = await Order.create(orderPayload, { transaction: t });

      const orderItems = items.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: item.price,
      }));

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
      if (order.customer_id !== user.id) {
        throwError("Unauthorized to cancel this order", 403);
      }

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

      await OrderItem.destroy({
        where: { order_id: order.id },
        transaction: t,
      });

      await KdsOrder.destroy({
        where: { order_id: order.id },
        transaction: t,
      });

      await Order.destroy({ where: { id: order.id }, transaction: t });

      await t.commit();
      return { message: "Order cancelled and deleted successfully." };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async getActiveOrders(customerId) {
    const orders = await Order.findAll({
      where: {
        customer_id: customerId,
        status: ["Pending", "InProgress"],
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

    return formatted;
  },

  async getCustomerOrderHistory(user) {
    const t = await sequelize.transaction();
    try {
      const orders = await Order.findAll({
        where: {
          customer_id: user.id,
          status: ["Served"],
        },
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
    const order = await Order.findOne({
      where: {
        id: orderId,
        customer_id: customerId,
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
          attributes: ["id", "menu_item_id", "quantity", "price"],
          include: [
            {
              model: MenuItem,
              attributes: ["name", "image_url"],
            },
          ],
        },
      ],
    });

    if (!order) throwError("Order not found", 404);

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
      status: order.status,
      type: order.type,
      created_at: order.createdAt,
      items: order.OrderItems.map((item) => ({
        id: item.id,
        name: item.MenuItem?.name,
        image_url: item.MenuItem?.image_url,
        quantity: item.quantity,
        price: item.price,
      })),
    };
  },
};

module.exports = OrderService;
