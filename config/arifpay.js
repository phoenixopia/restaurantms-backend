require("dotenv").config();

module.exports = {
  apiKey: process.env.ARIFPAY_API_KEY,
  baseUrl: process.env.ARIFPAY_BASE_URL,
  notifyUrl: process.env.ARIFPAY_NOTIFY_URL,
  successUrl: process.env.ARIFPAY_SUCCESS_URL,
  cancelUrl: process.env.ARIFPAY_CANCEL_URL,
  errorUrl: process.env.ARIFPAY_ERROR_URL,
  beneficiaryBankCode: process.env.ARIFPAY_BENEFICIARY_BANK_CODE,
};
