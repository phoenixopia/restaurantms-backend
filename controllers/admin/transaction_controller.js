"use strict";

const asyncHandler = require("../../utils/asyncHandler");
const TransactionService = require("../../services/admin/transaction_service");
const { success } = require("../../utils/apiResponse");

exports.getAllTransactions = asyncHandler(async (req, res) => {
  const result = await TransactionService.getAllTransactions(
    req.user,
    req.query
  );
  return success(res, "Transactions fetched successfully", result);
});

exports.getByIdTransaction = asyncHandler(async (req, res) => {
  const result = await TransactionService.getByIdTransaction(
    req.user,
    req.params.id
  );
  return success(res, "Transaction fetched successfully", result);
});

// exports.deleteTransaction = asyncHandler(async (req, res) => {
//   const result = await TransactionService.deleteTransaction(
//     req.user,
//     req.params.id
//   );
//   return success(res, "Transaction deleted successfully", result);
// });

exports.updateTransaction = asyncHandler(async (req, res) => {
  const result = await TransactionService.updateTransaction(
    req.user,
    req.params.id,
    req.body
  );
  return success(res, "Transaction updated successfully", result);
});
