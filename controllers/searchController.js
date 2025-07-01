// controllers/searchController.js
const db = require('../models');
const { Op } = require('sequelize');

exports.searchAll = async (req, res) => {
//   const keyword = req.query.keyword;
  const { keyword, page, limit } = req.query;
  const result = {};

  try {
    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 20;

    for (const modelName in db) {
      const model = db[modelName];

      // Skip non-model exports like 'sequelize' or 'Sequelize'
      if (!model?.rawAttributes) continue;

      const whereConditions = [];

      // Loop through all fields in the model
      for (const field in model.rawAttributes) {
        const type = model.rawAttributes[field].type.key;

        // Include only string-like fields (TEXT, STRING)
        if (['STRING', 'TEXT'].includes(type)) {
          whereConditions.push({
            [field]: {
              [Op.like]: `%${keyword}%`
            }
          });
        }
      }

      // If the model has searchable fields
      if (whereConditions.length > 0) {
        const records = await model.findAll({
          where: {
            [Op.or]: whereConditions
          },
          offset: (pageNumber - 1) * pageSize,
          limit: pageSize,
        });

        if (records.length > 0) {
          result[modelName] = records;
        }
      }
    }

    return res.status(200).json({success:true, result});
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success:false, message: 'Search failed', error: err.message });
  }
};
