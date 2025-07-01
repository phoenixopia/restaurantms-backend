const { ActivityLog, User } = require('../models/index');

// CREAT DATA LOG
exports.logActivity = async ({
  user_id,
  action,
  entity_type = null,
  entity_id = null,
  metadata = null,
  ip_address = null,
  user_agent = null
}) => {
  try {
    await ActivityLog.create({
      user_id,
      action,
      entity_type,
      entity_id,
      metadata,
      ip_address,
      user_agent
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    throw new Error("Error logging activity:", error.message);
  }
};


// === GET ALL DATA ===
exports.getAllActivity = async (req, res, next) => {
    try {
      const { page, limit } = req.query;
      const pageNumber = parseInt(page, 10) || 1;
      const pageSize = parseInt(limit, 10) || 10;
      const dataCount = await ActivityLog.count();
      const totalPages = Math.ceil(dataCount / pageSize);
      const data = await ActivityLog.findAll({
        include: [
          {                    
            model: User,
            as: "user",
          }
        ],
        offset: (pageNumber - 1) * pageSize,
        limit: pageSize,
        order: [['updatedAt', 'DESC']], 
      });
      return res.status(200).json({ 
        success: true, 
        data,
        pagination: { total: dataCount, page: pageNumber, pageSize, totalPages,}
      });
    } catch (error) {
      console.error('Get All Logs Error:', error);
      return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message });}
  };
