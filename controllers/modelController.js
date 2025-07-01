// Similar controller structure applies for: 
const { sequelize, Role, Restaurant, RestaurantUser } = require("../models/index");
const { getPublicIdFromUrl, cloudinary } = require("../utils/cloudinary");
const streamifier = require('streamifier');
const { logActivity } = require("./activityController");


// === GET ALL DATA ===
exports.getAllModels = ( Model, include = [], restrictByRestaurant = false, customWhere = null) => {
    return async (req, res) => {
      console.log("Model name:", Model?.name);
      try {
        const { page = 1, limit = 10 } = req.query;
        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);
  
        let whereClause = {};
  
        // 1. Role-based restriction for Restaurant-linked models
        if (restrictByRestaurant) {
          const role = await Role.findByPk(req.user.role_id);
  
          if (role.name !== 'super_admin') {
            const userRestaurants = await RestaurantUser.findAll({
              where: { user_id: req.user.id },
              attributes: ['restaurant_id']
            });
  
            const restaurantIds = userRestaurants.map(r => r.restaurant_id);
  
            if (restaurantIds.length === 0) {
              return res.status(200).json({
                success: true,
                data: [],
                pagination: {
                  total: 0,
                  page: pageNumber,
                  pageSize,
                  totalPages: 0
                }
              });
            }
  
            whereClause.restaurant_id = { [Op.in]: restaurantIds };
          }
        }
  
        // 2. Allow override of whereClause with a custom function
        if (typeof customWhere === 'function') {
          whereClause = await customWhere(req);
        }
  
        // 3. Count + fetch paginated data
        const totalCount = await Model.count({ where: whereClause });
        const totalPages = Math.ceil(totalCount / pageSize);
  
        const data = await Model.findAll({
          where: whereClause,
          include,
          offset: (pageNumber - 1) * pageSize,
          limit: pageSize,
          order: [['updatedAt', 'DESC']]
        });
  
        return res.status(200).json({
          success: true,
          data,
          pagination: {
            total: totalCount,
            page: pageNumber,
            pageSize,
            totalPages
          }
        });
      } catch (error) {
        console.error(`Get All ${Model?.name}s Error:`, error);
        return res.status(500).json({
          success: false,
          message: 'Internal Server Error.',
          error: error.message
        });
      }
    };
};


// === GET BY Value ===
exports.getModelByValue = (Model, fieldName, include = []) => async (req, res) => {
    const { value } = req.params;
    const fieldName = req.query.field || 'key';

    if (!value) {
      return res.status(400).json({success: false, error: 'Missing a required field ID.' });
    }

    try {
      // const data = await Model.findOne({
        const data = await Model.findAll({
        where: { [fieldName]: value },
        include,
      });
  
      if (!data) {
        return res.status(404).json({ success: false, message: `${Model.name} not found for ${fieldName}: ${value}` });
      }
  
      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error("Error occurred while getting model by value:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };


  
// === GET BY ID ===
exports.getModelById = (Model, include = []) => async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({success: false, error: 'Missing a required field ID.' });
  }
  
  try {
    const data = await Model.findByPk(id,{ include});

    if (!data) {
      return res.status(404).json({ success: false, message: `${Model.name} not found for ${fieldName}: ${value}` });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error occurred while getting model by value:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};


  // === GET LATEST ===
exports.getLatestModel = (Model, include = []) => async (req, res) => {
  try {
    // const data = await Model.findOne({
      const data = await Model.findOne({
        order: [['createdAt', 'DESC']],
        include,
    });

    if (!data) {
      return res.status(404).json({ success: false, message: `${Model.name} not found for ${fieldName}: ${value}` });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error occurred while getting model by value:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
  


// === CREATE A NEW DATA ===
exports.createModel = (Model) => async (req, res) => {
  let uploadedImage = null;

  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ success: false, error: "Missing required fields." });
    }

    const { image,image_url,imageURL,user_id, restaurant_id,menu_id,menu_category_id,role_id,location_id, manager_id, customer_id,branch_id,...rest} = req.body;

    //  Validate foreign keys
    const idFields = {user_id, restaurant_id,menu_id,menu_category_id,role_id, location_id, manager_id, customer_id,branch_id};
    const validationResult = await validateForeignKeys(idFields);

    if (!validationResult.success) {
      return res.status(404).json({
        success: false,
        message: validationResult.message
      });
    }

    // Check if item exists with other fields
    const existingItem = await Model.findOne({ where: rest });
    if (existingItem) {
      return res.status(400).json({ success: false, message: "Item already exists." });
    }

    // Find the field key which has base64 string (data URL)
    const imageFields = {image,image_url,imageURL};

    let fieldKey = null;
    let directUrl = null;

    for (const key of Object.keys(imageFields)) {
      const val = imageFields[key];
      if (val && typeof val === "string") {
        if (val.startsWith("https://")) {
          directUrl = { key, url: val };
          break;
        } else if (val.trim().startsWith("data:")) {
          fieldKey = key;
          break;
        }
      }
    }

    if (fieldKey) {
      const base64Str = imageFields[fieldKey];
      const base64Data = base64Str.replace(/^data:[A-Za-z-+/]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Upload via streamifier and cloudinary upload_stream
      uploadedImage = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "ImpactAcross/images" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        streamifier.createReadStream(buffer).pipe(uploadStream);
      });
    }

    const itemData = { ...rest };
    if (uploadedImage?.secure_url && fieldKey) {
      itemData[fieldKey] = uploadedImage.secure_url;
    }

    if (directUrl) {
      itemData[directUrl.key] = directUrl.url;
    }  

    const item = await Model.create(itemData);

    await logActivity({
      user_id: req.user.id,
      action: `create-${Model?.name || 'UnknownModel'}`,
      entity_type: `${Model?.name || 'UnknownModel'}`,
      entity_id: item.id,
      // metadata: { changed_fields: ['password'] },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    }); 

    return res.status(201).json({
      success: true,
      message: "Successfully Created.",
      data: item,
    });
  } catch (error) {
    console.error("Error while creating item:", error);
    if (uploadedImage?.public_id) {
      await cloudinary.uploader.destroy(uploadedImage.public_id);
    }
    return res.status(500).json({ success: false, error: error.message });
  }
};
  

// === UPDATE ===
exports.updateModel = (Model) => async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ success: false, error: 'Missing a required field ID.' });
  }

  const t = await sequelize.transaction();
  let uploadedImage = null;

  try {
    const record = await Model.findByPk(id, { lock: t.LOCK.UPDATE, transaction: t });
    if (!record) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    const { image,image_url,imageURL,user_id, restaurant_id,menu_id,menu_category_id,role_id, location_id, manager_id, customer_id,branch_id,...rest} = req.body;
    
    //  Validate foreign keys
    const idFields = {user_id, restaurant_id,menu_id,menu_category_id,role_id, location_id, manager_id, customer_id,branch_id};
    const validationResult = await validateForeignKeys(idFields);

    if (!validationResult.success) {
      return res.status(404).json({
        success: false,
        message: validationResult.message
      });
    }

    // images
    const imageFields = {image,image_url,imageURL,};

    let fieldKey = null;
    let directUrl = null;

    for (const key of Object.keys(imageFields)) {
      const val = imageFields[key];
      if (val && typeof val === "string") {
        if (val.startsWith("https://")) {
          directUrl = { key, url: val };
          break;
        } else if (val.trim().startsWith("data:")) {
          fieldKey = key;
          break;
        }
      }
    }

    if (fieldKey) {
      const base64Str = imageFields[fieldKey];
      const base64Data = base64Str.replace(/^data:[A-Za-z-+/]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      uploadedImage = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "ImpactAcross/images" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        streamifier.createReadStream(buffer).pipe(uploadStream);
      });

      // Delete old image if exists
      const oldImageUrl = record[fieldKey];
      if (oldImageUrl) {
        const publicId = oldImageUrl.split("/").slice(-1)[0].split(".")[0];
        await cloudinary.uploader.destroy(publicId);
        // await cloudinary.uploader.destroy(`ImpactAcross/images/${publicId}`);
      }

      rest[fieldKey] = uploadedImage.secure_url;
    }

    if (directUrl) {
      rest[directUrl.key] = directUrl.url;
    } 
    
    const [count, rows] = await Model.update(rest, {
      where: { id }, transaction: t, returning: true
    });

    await t.commit();

    if (count === 0 || !rows[0]) {
      return res.status(409).json({ success: false, message: "No changes were applied."});
    }

    await logActivity({
      user_id: req.user.id,
      action: `create-${Model?.name || 'UnknownModel'}`,
      entity_type: `${Model?.name || 'UnknownModel'}`,
      entity_id: updatedItem.id,
      // metadata: { changed_fields: ['password'] },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    }); 

    return res.status(200).json({
      success: true, message: "Successfully updated.", data: rows[0]
    });

  } catch (error) {
    await t.rollback();
    console.error("Error during update:", error);

    if (uploadedImage?.public_id) {
      await cloudinary.uploader.destroy(uploadedImage.public_id);
      // await cloudinary.uploader.destroy(`ImpactAcross/images/${uploadedImage.public_id}`);
    }

    return res.status(500).json({ success: false, error: error.message });
  }
};

  
  
  // === DELETE AN ITEM ====
  exports.deleteModel = (Model) => async (req, res) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({success: false, error: 'Missing a required field ID.' });
    }

    const t = await sequelize.transaction();
    try {
      const record = await Model.findByPk(id, {lock: t.LOCK.UPDATE, transaction: t});
      if (!record) {
        await t.rollback();
        return res.status(404).json({success: false, error: 'Item not found' });
      }

      await record.destroy({ where: { id }, transaction: t});

      const imageUrl = record.image_url || record.imageURL;
      if (imageUrl) {
        const publicId = getPublicIdFromUrl(imageUrl);
        await cloudinary.uploader.destroy(publicId);
      }

      await t.commit();

      await logActivity({
        user_id: req.user.id,
        action: `create-${Model?.name || 'UnknownModel'}`,
        entity_type: `${Model?.name || 'UnknownModel'}`,
        entity_id: record.id,
        // metadata: { changed_fields: ['password'] },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      }); 

      return res.status(200).send({sucess: true, message: 'Successfully Deleted.'});
    
    } catch (error) {
      await t.rollback();
      console.log("Error occur on delete:", error)
      return res.status(500).json({success: false, error: error.message });
    }
  };
  