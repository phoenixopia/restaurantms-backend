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

const CustomerOrderService = {
  // Create order
  async createOrder(data, customer) {
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
        customer_id: customer.id,
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
            customer_id: customer.id,
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
            unit_price: item.unit_price || item.price,
          };
        }
        groupedItems[key].quantity += item.quantity;
      }

      const orderItems = Object.entries(groupedItems).map(
        ([menu_item_id, value]) => ({
          order_id: order.id,
          menu_item_id,
          quantity: value.quantity,
          unit_price: value.unit_price | value.price,
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

      // Send create notifications to both staff/admin and customer
      await SendNotification.sendOrderCreatedNotification(order);
    
      return order;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async cancelOrder(orderId, customer) {
    const t = await sequelize.transaction();
    try {
      const order = await Order.findOne({
        where: { id: orderId },
        transaction: t,
      });

      if (!order) throwError("Order not found", 404);

      if (order.status !== "Pending")
        throwError("Only pending orders can be cancelled", 400);

      if (order.customer_id !== customer.id)
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

      // Send cancellation notifications to both staff/admin and customer
      await SendNotification.sendOrderCancelledNotification(order);

      return { message: "Order cancelled and deleted successfully." };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },



  // Get all orders for customer service 
  async getllCustomerOrders(customerId, page = 1, limit = 10) {
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    // const activeStatuses = [
    //   "Pending",
    //   "InProgress",
    //   "Preparing",
    //   "Ready",
    //   "Served",
    // ];

    const { count, rows: orders } = await Order.findAndCountAll({
      where: {
        customer_id: customerId,
        // [Op.or]: [
        //   { status: { [Op.in]: activeStatuses.slice(0, -1) } },
        // ],
      },
      include: [
        {
          model: Restaurant,
          attributes: ["id", "restaurant_name"],
          include: [
            {
              model: SystemSetting,
              attributes: ["id", "logo_url"],
            },
          ],
        },
        {
          model: OrderItem,
          attributes: ["id", "quantity"],
        },
      ],
      order: [["createdAt", "DESC"]],
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
        restaurant_id: order.Restaurant?.id,
        logo_url: order.Restaurant?.SystemSetting?.logo_url || null,
        total_amount: order.total_amount,
        total_items: totalItems,
        type: order.type,
        status: order.status,
        createdAt: order.createdAt,
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


  // Get active orders service
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
          attributes: ["id", "restaurant_name"],
          include: [
            {
              model: SystemSetting,
              attributes: ["id", "logo_url"],
            },
          ],
        },
        {
          model: OrderItem,
          include: [
            { model: MenuItem }
          ]
        },
        {
          model: Location,
          attributes: ["id", "address", "latitude", "longitude"],
        }
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const formatted = orders.map((order) => {
      const totalItems = order.OrderItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      // match items structure: order.OrderItems,
      const items = order.OrderItems.map((item) => ({
        id: item.id,
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        name: item.MenuItem?.name || null,
        quantity: item.quantity,
        price: item.unit_price,
        image_url: item.MenuItem?.image || null,
      }));


      return {
        id: order.id,
        order_id: order.id,
        customer_id: customerId,
        restaurant_name: order.Restaurant?.restaurant_name,
        restaurant_id: order.Restaurant?.id,
        restaurant_logo_url: order.Restaurant?.SystemSetting?.logo_url || null,
        total_amount: order.total_amount,
        total_items: totalItems,
        order_type: order.type,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items ,
        payment_status: order.payment_status,
        delivery_address: order.Location?.address,
        estimated_delivery_time: order.Location?.timestamp,
        // estimated_delivery_time: order.createdAt ? new Date(order.createdAt.getTime() + 30*60000) : null, // assuming 30 mins delivery time
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


  // Get order history
  async getCustomerOrderHistory(customer, page = 1, limit = 10) {
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const { count, rows: orders } = await Order.findAndCountAll({
      where: {
        customer_id: customer.id,
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
          include: [{ model: MenuItem}]
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const formatted = orders.map((order) => {
      const totalItems = order.OrderItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      const items = order.OrderItems.map((item) => ({
        id: item.id,
        name: item.MenuItem?.name || 'Unknown'
      }));

      return {
        id: order.id,
        restaurant_name: order.Restaurant?.restaurant_name,
        logo_url: order.Restaurant?.SystemSetting?.logo_url || null,
        total_amount: order.total_amount,
        total_items: totalItems,
        type: order.type,
        status: order.status,
        createdAt: order.createdAt,
        items,
      };
    });


    return {
      totalItems: count,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      data: formatted,
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
      { model: Customer },
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
        // attributes: ["name"],
        include: [
          {
            model: Location,
            attributes: ["id", "address", "latitude", "longitude"],
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
          price: item.unit_price,
        });
      }
    }

    const items = Array.from(groupedItemsMap.values());
    const typeAddress = order.Customer?.office_address_id === order.Branch?.id  
        ? 'office'
        : order.Customer?.home_address_id === order.Branch?.id
        ? 'home'
        : 'custom';

    const result = {
      id: order.id,
      branch_id: order.Branch.id || null,
      address: order.Branch.Location.address,
      address_id: order.Branch.Location.id || null,
      restaurant_name: order.Restaurant?.restaurant_name,
      logo_url: order.Restaurant?.SystemSetting?.logo_url || null,
      total_amount: order.total_amount,
      total_items: items.reduce((sum, item) => sum + item.quantity, 0),
      status: order.status,
      type: order.type,
      typeAddress,
      latitude: order.Branch.Location.latitude,
      longitude: order.Branch.Location.longitude,
      payment_status: order.payment_status,
      // unit_price: order.OrderItem.unit_price,
      createdAt: order.createdAt,
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
      result.branch_id = deliveryLocation?.id || null;
      result.delivery_location = {
        address: deliveryLocation.address,
        latitude: deliveryLocation.latitude,
        longitude: deliveryLocation.longitude,
      };
    }

    if (isDineIn && order.Table) {
      result.table_id = order.Table.id,
      result.table_info = {
        table_number: order.Table.table_number,
        capacity: order.Table.capacity,
        ...(isServed && { is_active: order.Table.is_active }),
      };
    }

    return result;
  },

//   async deleteOrder(kdsId, customer) {
//     const t = await sequelize.transaction();
//     try {
//     } catch (err) {
//       await t.rollback();
//       throw err;
//     }
//   },


  // Get Orders with Table for Customer
  async getOrdersWithTable(customerId, query) {
    const { page, limit, offset, order } = buildPagination(query);

    const totalItems = await Order.count({
      where: { customer_id: customerId, type: 'dine-in' },
    });

    const tables = await Order.findAll({
      where: { customer_id: customerId, type: 'dine-in' },
      include: [
        { model: Table, attributes: ["id", "table_number", "capacity"] },
        { model: Branch, attributes: ["id", "name"] },
        { model: Restaurant, attributes: ["id", "restaurant_name"] },
        { model: Customer, attributes: ["id", "first_name", "last_name", "email", "phone_number", "profile_picture",],},
        // { model: User, attributes: ["id", "first_name", "last_name", "email", "phone_number", "profile_picture",],},
        { model: Location, attributes: ["id", "address", "latitude", "longitude"],},
      ],
      order,
      offset,
      limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
        orderTable: tables,
        pagination: {
          totalItems,
          totalPages,
          currentPage: page,
          pageSize: limit,
        },
      };
  },

};

module.exports = CustomerOrderService;
