const express = require("express");
const router = express.Router();
const TransactionController = require("../../controllers/admin/transaction_controller");
const { protect } = require("../../middleware/protect");
const { permissionCheck } = require("../../middleware/permissionCheck");

router.get(
  "/get-all",
  protect("user"),
  // permissionCheck("view_transaction"),
  TransactionController.getAllTransactions
);

router.get(
  "/get-by-id/:id",
  protect("user"),
  // permissionCheck("view_transaction"),
  TransactionController.getByIdTransaction
);
router.patch(
  "/update-status/:id",
  protect("user"),
  // permissionCheck("update_transaction"),
  TransactionController.updateTransaction
);

// router.delete(
//   "/delete-transaction/:id",
//   protect("user"),
//   // permissionCheck("delete_transaction"),
//   TransactionController.deleteTransaction
// );

module.exports = router;
