// const { sequelize, Review, User, MenuItem} = require("../models/index");
// const { Op } = require('sequelize');


// module.exports = {

    
//     // === GET ALL ===
//     async getAllReviews(req, res) {
//         try {
//             const { page = 1, limit = 3 } = req.query;

//             const pageNumber = parseInt(page, 10);
//             const pageSize = parseInt(limit, 10);

//             // const whereClause = { restaurant_id };

//             const totalCount = await Review.count();
//             const totalPages = Math.ceil(totalCount / pageSize);

//             const reviewData = await Review.findAll({
//                 include: [
//                     {
//                         model: MenuItem,
//                         as: 'item',
//                     },
//                     {
//                         model: User,
//                         as: 'customer',
//                     }
//                 ],
//                 limit: pageSize,
//                 offset: (pageNumber - 1) * pageSize,
//                 order: [['updatedAt', 'DESC']],
//             });

//             return res.status(200).json({
//                 success: true,
//                 data: reviewData,
//                 pagination: {
//                     total: totalCount,
//                     page: pageNumber,
//                     pageSize,
//                     totalPages,
//                 }
//             });

//         } catch (error) {
//             console.error("Get Menus Error:", error);
//             return res.status(500).json({
//                 success: false,
//                 message: "Internal server error",
//                 error: error.message
//             });
//         }
//     },


//     // === CREATE NEW ===
//     async createReview(req, res) {
//         const t = await sequelize.transaction();
//         try {
//             const { detail, menu_item_id, rate} = req.body;
//             const customer_id = req.user.id;

//             if (!customer_id || !detail || !menu_item_id || !rate) {
//                 return res.status(400).json({success:false, message: "Missing required fields." });
//             }

//             const menuItem = await MenuItem.findByPk(menu_item_id);
//             if (!menuItem) {
//                 return res.status(404).json({ success:false, message: "Menu Item not found" });
//             }

//             const existingData = await Review.findOne({...req.body});
//             if (existingData) {
//                 return res.status(400).json({success:false, message: "Review already exists." });
//             }

//             const newReview = await Review.create(req.body, { transaction: t });

//             await t.commit();
//             return res.status(201).json({success:true, message: "Review created successfully", data: newReview });

//         } catch (error) {
//             await t.rollback();
//             console.error("Create Review Error:", error);
//             return res.status(500).json({success:false, message: "Internal server error", error: error.message });
//         }
//     },
    

//     // === GET BY ID ===
//     async getReviewById(req, res) {
//         const { id } = req.params;
        
//         if(!id){
//             return res.status(400).json({success: false, message: "Missing required field id." }); 
//         }

//         try {
//             const reviewData = await Review.findByPk(id, {
//                 include: [
//                     {
//                         model: MenuItem,
//                         as: 'item',
//                     },
//                     {
//                         model: User,
//                         as: 'customer',
//                     }
//                 ],
//             });

//             if (!reviewData) {
//                 return res.status(404).json({success: false, message: "Review not found." });
//             }

//             return res.status(200).json({success: true, data: reviewData});
//         } catch (error) {
//             console.error("Get Review By ID Error:", error);
//             return res.status(500).json({ message: "Internal server error", error: error.message });
//         }
//     },


//     // === UPDATE BY ID ===
//     async updateReview(req, res) {
//         const { id } = req.params;

//         if(!id){
//             return res.status(400).json({success: false, message: "Missng required field id." });
//         }

//         const t = await sequelize.transaction();
//         try {
//             const existingReview = await Review.findByPk(id, { 
//                 include: [{ model: MenuItem, as: 'items'}], 
//                 transaction: t, 
//             });
            
//             if (!existingReview) {
//                 await t.rollback();
//                 return res.status(404).json({success: false, message: "Review not found." });
//             }

//             await existingReview.update(req.body, { transaction: t });
//             await t.commit();
//             return res.status(200).json({success:true,  message: "Review updated successfully", data: existingReview });
//         } catch (error) {
//             await t.commit();
//             console.error("Update Review Error:", error);
//             return res.status(500).json({success: false, message: "Internal server error", error: error.message });
//         }
//     },


//     // === DELETE BT ID ===
//     async deleteReview(req, res) {
//         const { id } = req.params;
//         if(!id){
//             return res.status(400).json({success: false, message: "Missng required field id." });
//         }

//         const t = await sequelize.transaction();
//         try {
//             const existingReview = await  Review.findByPk(id, { transaction: t });
//             if (!existingReview) {
//                 await t.rollback();
//                 return res.status(404).json({success: false,  message: "Review not found." });
//             }
//             await existingReview.destroy({ transaction: t });

//             await t.commit();
//             return res.status(200).json({success: true, message: "Review deleted successfully." });
//         } catch (error) {
//             await t.rollback();
//             console.error("Delete Review Error:", error);
//             return res.status(500).json({success: false, message: "Internal server error", error: error.message });
//         }
//     },
//     };
