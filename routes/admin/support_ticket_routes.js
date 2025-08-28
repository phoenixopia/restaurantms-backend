const express = require("express");
const router = express.Router();
const TicketController = require("../../controllers/admin/ticket_controller");
const { protect } = require("../../middleware/protect");
const { permissionCheck } = require("../../middleware/permissionCheck"); // Uncomment if needed

// Create a support ticket
router.post(
  "/create-support-ticket",
  protect("user"),
  // permissionCheck("create_ticket"),
  TicketController.createTicket
);

// Get all support tickets
router.get(
  "/list-all-ticket",
  protect("user"),
  // permissionCheck("view_ticket"),
  TicketController.getAllTickets
);

// Get a single ticket by ID
router.get(
  "/get-ticket/:id",
  protect("user"),
  // permissionCheck("view_ticket"),
  TicketController.getTicketById
);

// Update ticket status
router.put(
  "/update-ticket-status/:id",
  protect("user"),
  // permissionCheck("change_ticket_status"),
  TicketController.updateTicketStatus
);

// Delete a ticket
router.delete(
  "/delete-ticket/:id",
  protect("user"),
  // permissionCheck("delete_ticket"),
  TicketController.deleteTicket
);

module.exports = router;
