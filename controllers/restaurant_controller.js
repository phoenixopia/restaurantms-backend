const { Restaurant, Subscription, Plan, RestaurantUser, sequelize } = require("../models/index");
const { cloudinary } = require('../utils/cloudinary');
const streamifier = require('streamifier');

// === GET ALL ===
exports.getRestaurants = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 10;

    const dataCount = await Restaurant.count();
    const totalPages = Math.ceil(dataCount / pageSize);
    const data = await Restaurant.findAll({
      include: [
        {
          model: Subscription,
          as: "subscription",
          // attributes: ["name", "price", "billing_cycle"],
          include: [
            {
              model: Plan,
              as: "plan",
              attributes: ["name", "price", "billing_cycle"],
            },
          ],
        },
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
    console.error('Get All Restaurants Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message });}
};


// get by id
exports.getRestaurantById = async (req, res) => {
  try {
    const id = req.params.id;
    if(!id){
      return res.status(400).json({success: false, message: "Missing required field id." });
    }

    const restaurant = await Restaurant.findByPk(id, {
      include: [
        {
          model: Subscription,
          as: "subscriptions",
          // attributes: ["name", "price", "billing_cycle"],
          include: [
            {
              model: Plan,
              as: "plans",
              attributes: ["name", "price", "billing_cycle"],
            },
          ],
        },
      ],
    });

    return res.status(200).json({ success: true, data: restaurant });
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// === CREATE NEW DATA ===
exports.createRestaurant = async (req, res) => {
  const {
    name,
    logo_url,
    primary_color,
    language,
    rtl_enabled,
    subscription_id,
    user_ids // optional array
  } = req.body;

  const t = await sequelize.transaction();
  let uploadedImage = null;

  try {
    // === Validate required fields ===
    if (!name || !subscription_id) {
      return res.status(400).json({ success: false, message: 'Name and subscription ID are required.' });
    }

    // === Validate subscription exists ===
    const subscription = await Subscription.findByPk(subscription_id);
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found.' });
    }

    // === Optional: Validate user_ids if provided ===
    if (Array.isArray(user_ids) && user_ids.length > 0) {
      const users = await User.findAll({ where: { id: user_ids } });
      if (users.length !== user_ids.length) {
        return res.status(404).json({ success: false, message: 'One or more user_ids are invalid.' });
      }
    }

    let finalLogoUrl = logo_url;

    // === Handle base64 logo upload ===
    if (typeof logo_url === "string" && logo_url.trim().startsWith("data:")) {
      const base64Data = logo_url.replace(/^data:[A-Za-z-+/]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      uploadedImage = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "ImpactAcross/images" },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        streamifier.createReadStream(buffer).pipe(uploadStream);
      });

      finalLogoUrl = uploadedImage.secure_url;
    }

    // === Create restaurant ===
    const newRestaurant = await Restaurant.create({
      name,
      logo_url: finalLogoUrl,
      primary_color,
      language,
      rtl_enabled,
      subscription_id
    }, { transaction: t });

    // === Link users if provided ===
    if (Array.isArray(user_ids) && user_ids.length > 0) {
      const restaurantUsers = user_ids.map(user_id => ({
        user_id,
        restaurant_id: newRestaurant.id
      }));
      await RestaurantUser.bulkCreate(restaurantUsers, { transaction: t });
    }

    await t.commit();

    return res.status(201).json({
      success: true,
      message: 'Restaurant created successfully.',
      restaurant: newRestaurant
    });

  } catch (error) {
    await t.rollback();

    if (uploadedImage?.public_id) {
      await cloudinary.uploader.destroy(uploadedImage.public_id);
    }

    console.error('Create Restaurant Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error.',
      error: error.message
    });
  }
};



// === UPDATE DATA BY ID ===
exports.updateRestaurant = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    const link = await RestaurantUser.findOne({
      where: { user_id: userId, restaurant_id: id },
    });

    if (!link) {
      return res.status(403).json({success: true, message: "You have no assigned restaurant." });
    }

    await Restaurant.update(updates, { where: { id } });

    res.status(200).json({ message: "Restaurant updated successfully" });
  } catch (error) {
    console.error("Error updating restaurant:", error);
    res.status(500).json({ message: "Server error" });
  }
};



// === DELETE USER BY ID ===
exports.deleteRestaurant = async (req, res) => {
    const { id } = req.params;
    const t = await sequelize.transaction();
    try {
        const restaurant = await Restaurant.findByPk(id, { transaction: t });

        if (!restaurant) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Restaurant not found.' });
        }

        // await UserRole.destroy({ where: { user_id: id }, transaction: t });
        await restaurant.destroy({ transaction: t });
        await t.commit();
        return res.status(200).json({ success: true, message: 'Restaurant deleted successfully.' });
    }
    catch (error) {
        await t.rollback();
        console.error('Delete Restaurant By ID Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error.', error: error.message });
    }
}

