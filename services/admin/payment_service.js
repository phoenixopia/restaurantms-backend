const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const arifpayConfig = require("../../config/arifpay");
const {
  RestaurantBankAccount,
  Payment,
  Order,
  KdsOrder,
  OrderItem,
  MenuItem,
  Customer,
  Table,
  sequelize,
  Reservation,
} = require("../../models");
const throwError = require("../../utils/throwError");
const asyncHandler = require("../../utils/asyncHandler");
const { buildPagination } = require("../../utils/pagination");

const ArifpayService = {
  async createCheckoutSession(orderId, phoneNumber, customerId) {
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      throwError("Customer not found", 404);
    }

    const cleanedPhone = phoneNumber.replace(/\D/g, "");
    let formattedPhone;

    if (cleanedPhone.startsWith("0") && cleanedPhone.length === 10) {
      formattedPhone = "251" + cleanedPhone.slice(1);
    } else if (cleanedPhone.startsWith("9") && cleanedPhone.length === 9) {
      formattedPhone = "251" + cleanedPhone;
    } else if (cleanedPhone.startsWith("251") && cleanedPhone.length === 12) {
      formattedPhone = cleanedPhone;
    } else {
      throwError(
        "Invalid phone number format. Use something like 09xxxxxxxx",
        400
      );
    }

    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: OrderItem,
          include: [
            {
              model: MenuItem,
              attributes: ["name", "unit_price", "description", "image"],
            },
          ],
        },
      ],
    });

    if (!order) {
      throwError("Order not found", 404);
    }

    if (order.customer_id !== customer.id) {
      throwError("Unauthorized access to this order", 403);
    }

    const payment = await Payment.create({
      id: uuidv4(),
      restaurant_id: order.restaurant_id,
      order_id: order.id,
      customer_id: customer.id,
      amount: order.total_amount,
      status: "pending",
    });

    const bankAccount = await RestaurantBankAccount.findOne({
      where: {
        restaurant_id: order.restaurant_id,
        is_default: true,
        is_active: true,
      },
    });

    console.log(bankAccount.account_number);

    if (!bankAccount) {
      throwError(
        "No active default bank account found for this restaurant",
        400
      );
    }

    const payload = {
      phone: formattedPhone,
      email: customer.email,
      nonce: payment.id,
      cancelUrl: `${arifpayConfig.cancelUrl}/${order.id}`,
      errorUrl: `${arifpayConfig.errorUrl}/${order.id}`,
      notifyUrl: `${arifpayConfig.notifyUrl}/${order.id}`,
      successUrl: `${arifpayConfig.successUrl}/${order.id}`,
      lang: "EN",
      expireDate: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      paymentMethods: [
        "TELEBIRR",
        "AWASH",
        "AWASH_WALLET",
        "PSS",
        "CBE",
        "AMOLE",
        "BOA",
        "KACHA",
        "TELEBIRR_USSD",
        "HELLOCASH",
        "MPESSA",
      ],
      items: order.OrderItems.map((item) => ({
        name: item.MenuItem.name,
        quantity: item.quantity,
        price: item.MenuItem.unit_price,
        description: item.MenuItem.description || "",
        image: item.MenuItem.image || "",
      })),
      beneficiaries: [
        {
          accountNumber: bankAccount.account_number,
          bank: arifpayConfig.beneficiaryBankCode,
          amount: payment.amount,
        },
      ],
    };

    try {
      const response = await axios.post(
        `${arifpayConfig.baseUrl}/checkout/session`,
        payload,
        {
          headers: {
            "x-arifpay-key": arifpayConfig.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      const resData = response.data;

      if (resData.error) {
        await payment.update({ status: "failed" });
        throwError(resData.msg || "Failed to initiate payment session", 400);
      }

      return {
        sessionId: resData.data.sessionId,
        paymentUrl: resData.data.paymentUrl,
        cancelUrl: resData.data.cancelUrl,
        totalAmount: resData.data.totalAmount,
      };
    } catch (err) {
      if (err.response) {
        const { status, data } = err.response;
        let message = data?.msg || "Arifpay Error";

        if (status === 400)
          message = "Invalid payload or missing required fields";
        else if (status === 404) message = "Missing or invalid API Key";
        else if (status === 415)
          message = "Missing or invalid Content-Type header";
        else if (status === 500) message = "Invalid or missing phone number";

        throwError(message, status);
      }

      throwError("Unable to connect to Arifpay service", 500);
    }
  },

  async cancelCheckoutSession(orderId) {
    const t = await sequelize.transaction();

    try {
      const order = await Order.findByPk(orderId, { transaction: t });
      if (!order) {
        throwError("Order not found", 404);
      }

      const payment = await Payment.findOne({
        where: { order_id: order.id },
        transaction: t,
      });

      if (!payment) {
        throwError("Payment not found for this order", 404);
      }

      await payment.update({ status: "cancelled" }, { transaction: t });
      await order.update({ status: "Cancelled" }, { transaction: t });

      await KdsOrder.update(
        { status: "Cancelled" },
        { where: { order_id: order.id }, transaction: t }
      );

      if (order.type === "dine-in" && order.table_id) {
        await Table.update(
          { is_active: true },
          { where: { id: order.table_id }, transaction: t }
        );

        await Reservation.update(
          { status: "cancelled" },
          {
            where: {
              customer_id: order.customer_id,
              table_id: order.table_id,
            },
            transaction: t,
          }
        );
      }

      await t.commit();
      return { orderId, status: "cancelled" };
    } catch (error) {
      await t.rollback();

      if (error.response) {
        const { status, data } = error.response;
        let message = data?.msg || "Arifpay API error";

        switch (status) {
          case 400:
            message = "Bad Request: Missing or invalid fields";
            break;
          case 404:
            message = "Not Found: Invalid API key or session";
            break;
          case 415:
            message = "Unsupported Media Type: Invalid Content-Type";
            break;
          case 500:
            message = "Server Error: Arifpay internal issue";
            break;
          case 401:
            message = "Unauthorized: Invalid or missing API key";
            break;
        }

        throwError(message, status);
      }

      throw error;
    }
  },
  async handleNotification(orderId, notificationData) {
    const { nonce, transactionStatus, transaction, paymentMethod } =
      notificationData;

    const payment = await Payment.findOne({
      where: { id: nonce, order_id: orderId },
    });

    if (!payment) {
      throwError("Payment not found", 404);
    }

    const isSuccess = transactionStatus === "SUCCESS";

    await payment.update({
      status: isSuccess ? "completed" : "failed",
      transaction_id: transaction?.transactionId,
      payment_method: paymentMethod,
      payment_date: new Date(),
    });

    if (isSuccess) {
      const order = await Order.findOne({ where: { id: payment.order_id } });

      if (order) {
        await order.update({
          status: "InProgress",
          payment_status: "Paid",
        });

        const kdsOrder = await KdsOrder.findOne({
          where: { order_id: order.id },
        });

        if (kdsOrder) {
          await kdsOrder.update({ status: "InProgress" });
        }
        if (order.type === "dine-in" && order.table_id) {
          await Reservation.update(
            { status: "confirmed" },
            {
              where: {
                customer_id: order.customer_id,
                table_id: order.table_id,
              },
            }
          );
        }
      }
    }

    return payment;
  },

  async errorCheckoutSession(orderId) {
    const t = await sequelize.transaction();

    try {
      const order = await Order.findByPk(orderId, { transaction: t });
      if (!order) {
        throwError("Order not found", 404);
      }

      const payment = await Payment.findOne({
        where: { order_id: order.id },
        transaction: t,
      });

      if (!payment) {
        throwError("Payment not found for this order", 404);
      }

      await payment.update({ status: "failed" }, { transaction: t });
      await order.update({ status: "Cancelled" }, { transaction: t });

      await KdsOrder.update(
        { status: "Cancelled" },
        { where: { order_id: order.id }, transaction: t }
      );

      if (order.type === "dine-in" && order.table_id) {
        await Table.update(
          { is_active: true },
          { where: { id: order.table_id }, transaction: t }
        );

        await Reservation.update(
          { status: "cancelled" },
          {
            where: {
              customer_id: order.customer_id,
              table_id: order.table_id,
            },
            transaction: t,
          }
        );
      }

      await t.commit();

      return { orderId, status: "failed" };
    } catch (error) {
      await t.rollback();

      if (error.response) {
        const { status, data } = error.response;
        let message = data?.msg || "Arifpay API error";

        switch (status) {
          case 400:
            message = "Bad Request: Missing or invalid fields";
            break;
          case 404:
            message = "Not Found: Invalid API key or session";
            break;
          case 415:
            message = "Unsupported Media Type: Invalid Content-Type";
            break;
          case 500:
            message = "Server Error: Arifpay internal issue";
            break;
          case 401:
            message = "Unauthorized: Invalid or missing API key";
            break;
        }

        throwError(message, status);
      }

      throw error;
    }
  },


  // Get Payments by customer ID with pagination
  async PaymentByCustomerId(customerId, query) {
    const { page, limit, offset, order } = buildPagination(query);

    const totalItems = await Payment.count({
      where: { customer_id: customerId },
    });

    const payments = await Payment.findAll({
      where: { customer_id: customerId },
      include: [
        { model: Order, attributes: ["id", "status", "total_amount"] },
        {
          model: Customer,
          attributes: [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "profile_picture",
          ],
        },
      ],
      order,
      offset,
      limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
        payments,
        pagination: {
          totalItems,
          totalPages,
          currentPage: page,
          pageSize: limit,
        },
      };
  },

  
  // Get Payments by customer ID with pagination
  async getAllPayments(query) {
    const { page, limit, offset, order } = buildPagination(query);

    const totalItems = await Payment.count({
    });

    const payments = await Payment.findAll({
      include: [
        { model: Order, attributes: ["id", "status", "total_amount"] },
          {
            model: Customer,
            attributes: [
              "id",
              "first_name",
              "last_name",
              "email",
              "phone_number",
              "profile_picture",
            ],
          },
      ],
      order,
      offset,
      limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
        payments,
        pagination: {
          totalItems,
          totalPages,
          currentPage: page,
          pageSize: limit,
        },
      };
  }
};


module.exports = ArifpayService;
