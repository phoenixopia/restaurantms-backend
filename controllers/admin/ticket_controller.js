const TicketService = require("../../services/admin/ticket_service");
const asyncHandler = require("../../utils/asyncHandler");
const { success } = require("../../utils/apiResponse");

exports.createTicket = asyncHandler(async (req, res) => {
  const ticket = await TicketService.createTicket(req.body, req.user);
  return success(res, "Support ticket created successfully", ticket, 201);
});

exports.getAllTickets = asyncHandler(async (req, res) => {
  const result = await TicketService.getAllTickets(req.query);
  return success(res, "Tickets retrieved successfully", result);
});

exports.getTicketById = asyncHandler(async (req, res) => {
  const ticket = await TicketService.getTicketById(req.params.id);
  return success(res, "Ticket retrieved successfully", ticket);
});

exports.updateTicketStatus = asyncHandler(async (req, res) => {
  const ticket = await TicketService.updateTicketStatus(
    req.params.id,
    req.body
  );
  return success(res, "Ticket status updated successfully", ticket);
});

exports.deleteTicket = asyncHandler(async (req, res) => {
  await TicketService.deleteTicket(req.params.id);
  return success(res, "Ticket deleted successfully", null);
});
