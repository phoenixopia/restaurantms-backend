const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const arifpayConfig = require("../../config/arifpay");
const {
  RestaurantBankAccount,
  Payment,
  Order,
  KdsOrder,
} = require("../../models");
const throwError = require("../../utils/throwError");

const ArifpayService = {
  async createCheckoutSession(order, customer) {
    const payment = await Payment.create({
      id: uuidv4(),
      restaurant_id: order.restaurant_id,
      order_id: order.id,
      customer_id: customer.id,
      amount: order.totalAmount,
      status: "pending",
      payment_method: "arifpay", // for test change don't forget
    });

    const bankAccount = await RestaurantBankAccount.findOne({
      where: {
        restaurant_id: order.restaurant_id,
        is_default: true,
        is_active: true,
      },
    });

    if (!bankAccount) {
      throwError(
        "No active default bank account found for this restaurant",
        400
      );
    }

    const payload = {
      phone: customer.phone,
      email: customer.email,
      nonce: payment.id,
      cancelUrl: arifpayConfig.cancelUrl,
      errorUrl: arifpayConfig.errorUrl,
      notifyUrl: arifpayConfig.notifyUrl,
      successUrl: arifpayConfig.successUrl,
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
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        description: item.description || "",
        image: item.image || "",
      })),
      beneficiaries: [
        {
          accountNumber: bankAccount.account_number,
          bank: arifpayConfig.beneficiaryBankCode,
          amount: order.totalAmount,
        },
      ],
    };

    try {
      const response = await axios.post(
        `${arifpayConfig.baseUrl}/checkout/session`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            "x-arifpay-key": arifpayConfig.apiKey,
          },
          timeout: 10000,
        }
      );

      const resData = response.data;

      if (resData.error) {
        await payment.update({ status: "failed" });
        throwError(resData.msg || "Failed to initiate payment session", 400);
      }

      await payment.update({ session_id: resData.data.sessionId });

      return {
        sessionId: resData.data.sessionId,
        paymentUrl: resData.data.paymentUrl,
        totalAmount: resData.data.totalAmount,
      };
    } catch (err) {
      if (err.response) {
        const { status, data } = err.response;

        let message = "Arifpay Error";
        if (status === 400)
          message = "Invalid payload or missing required fields";
        else if (status === 404) {
          message = "Missing or invalid API Key";
          console.log(err);
        } else if (status === 415)
          message = "Missing or invalid Content-Type header";
        else if (status === 500) message = "Invalid or missing phone number";
        else message = data?.msg || "Unexpected error from Arifpay";

        throwError(message, status);
      }

      throwError("Unable to connect to Arifpay service", 500);
    }
  },

  async cancelCheckoutSession(sessionId) {
    try {
      const response = await axios.delete(
        `${arifpayConfig.baseUrl}/checkout/session/${sessionId}`,
        {
          headers: {
            "x-arifpay-key": arifpayConfig.apiKey,
          },
        }
      );

      const resData = response.data;

      if (resData.error) {
        throwError(resData.msg || "Failed to cancel payment session", 400);
      }

      const payment = await Payment.findOne({
        where: { session_id: sessionId },
      });
      if (payment) {
        await payment.update({ status: "cancelled" });
      }

      return resData;
    } catch (err) {
      if (err.response) {
        const { status, data } = err.response;

        let message = "Arifpay Error";
        if (status === 400)
          message = "Invalid request or missing required fields";
        else if (status === 404) message = "Missing or invalid API Key";
        else if (status === 415)
          message = "Missing or invalid Content-Type header";
        else if (status === 500) message = "Server error";
        else message = data?.msg || "Unexpected error from Arifpay";

        throwError(message, status);
      }

      throwError("Unable to connect to Arifpay service", 500);
    }
  },

  async handleNotification(notificationData) {
    const { sessionId, nonce, transactionStatus, transaction } =
      notificationData;

    const payment = await Payment.findOne({
      where: { id: nonce, session_id: sessionId },
    });

    if (!payment) {
      throwError("Payment not found for notification", 404);
    }

    const isSuccess = transactionStatus === "SUCCESS";

    await payment.update({
      status: isSuccess ? "completed" : "failed",
      transaction_id: transaction?.transactionId || null,
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
      }
    }

    return payment;
  },
};

module.exports = ArifpayService;
