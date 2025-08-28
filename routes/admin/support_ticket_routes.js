const express = require("express");
const router = express.Router();
const TicketController = require("../../controllers/admin/ticket_controller");
const { protect } = require("../../middleware/protect");
const { permissionCheck } = require("../../middleware/permissionCheck");
const { authorize } = require("../../middleware/authorize");

// Create a support ticket
router.post(
  "/create-support-ticket",
  protect("user"),
  // permissionCheck("create_ticket"),
  TicketController.createTicket
);

// Get all support tickets (filtered by user scope)
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

// Update ticket status (super admin only)
router.put(
  "/update-ticket-status/:id",
  protect("user"),
  authorize("super_admin"),
  TicketController.updateTicketStatus
);

router.put(
  "/update-ticket/:id",
  protect("user"),
  permissionCheck("update_ticket"),
  TicketController.updateTicket
);

// Delete a ticket
router.delete(
  "/delete-ticket/:id",
  protect("user"),
  // permissionCheck("delete_ticket"),
  TicketController.deleteTicket
);

// Ticket KPIs
router.get("/ticket-kpis", protect("user"), TicketController.getTicketKPIs);

module.exports = router;
