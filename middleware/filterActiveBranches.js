const { Branch, Location } = require("../models");

const filterActiveBranches = async (req, res, next) => {
  try {
    const restaurantId = req.params.restaurantId;
    if (!restaurantId) {
      return res
        .status(400)
        .json({ success: false, message: "Restaurant ID is required." });
    }

    const branches = await Branch.findAll({
      where: {
        restaurant_id: restaurantId,
        status: "active",
      },
      attributes: [
        "id",
        "opening_time",
        "closing_time",
        "email",
        "phone_number",
        "name",
      ],
      include: [
        {
          model: Location,
          attributes: ["name", "address"],
        },
      ],
    });

    req.branches = branches; // attach to req
    next(); // pass control to next middleware/controller
  } catch (error) {
    console.error("Error filtering active branches:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to filter active branches.",
    });
  }
};

module.exports = filterActiveBranches;
