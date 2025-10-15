const {
  Review,
  Order,
  Customer,
  Branch,
  sequelize,
  Restaurant,
} = require("../../models");
const throwError = require("../../utils/throwError");

const ReviewService = {

  // create review
  async createReview(
    { order_id, restaurant_id, rating, comment },
    customer_id
  ) {
    const t = await sequelize.transaction();
    try {
      const order = await Order.findOne({
        where: {
          id: order_id,
          customer_id,
          // restaurant_id,
        },
        transaction: t,
      });

      if (!order) {
        throwError("Order not found or not associated with this customer", 404);
      }

      if (order.status !== "Served") {
        throwError("Only served orders can be reviewed", 400);
      }

      const alreadyReviewed = await Review.findOne({
        where: { order_id },
        transaction: t,
      });

      if (alreadyReviewed) {
        throwError("This order has already been reviewed", 409);
      }

      const review = await Review.create(
        {
          order_id,
          restaurant_id: order.restaurant_id,
          customer_id,
          rating,
          comment,
        },
        { transaction: t }
      );

      await t.commit();
      return review;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },


  // update review
  async updateReview({ review_id, rating, comment }, customer_id) {
    const t = await sequelize.transaction();
    try {
      const review = await Review.findOne({
        where: { id: review_id, customer_id },
        transaction: t,
      });

      if (!review) {
        throwError(
          "Review not found or not associated with this customer",
          404
        );
      }

      review.rating = rating ?? review.rating;
      review.comment = comment ?? review.comment;

      await review.save({ transaction: t });
      await t.commit();
      return review;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async deleteReview(review_id, customer_id) {
    const t = await sequelize.transaction();
    try {
      const review = await Review.findOne({
        where: { id: review_id, customer_id },
        transaction: t,
      });

      if (!review) {
        throwError(
          "Review not found or not associated with this customer",
          404
        );
      }

      await review.destroy({ transaction: t });
      await t.commit();
      return { message: "Review deleted successfully" };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  // Get Reviews by Customer user
 async getReviewsByCustomerUser(customerId, page = 1, limit = 10) {
    if (!customerId) throwError("User ID is required", 400);

    const offset = (page - 1) * limit;

    const { count: total, rows: reviews } = await Review.findAndCountAll({
      where: { customer_id: customerId },
      include: [
        {
          model: Customer,
          attributes: ["id", "first_name", "last_name", "profile_picture"],
        },
        { model: Restaurant, },
        { model: Order, },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    // const formattedReviews = reviews.map((review) => ({
    //   comment: review.comment,
    //   rating: parseInt(review.rating),
    //   createdAt: review.createdAt,
    //   customer: {
    //     id: review.Customer.id,
    //     first_name: review.Customer.first_name,
    //     last_name: review.Customer.last_name,
    //     profile_picture: review.Customer.profile_picture,
    //   },
    // }));

    return {
      reviews: reviews,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  },


  // get Reviews by Restaurant
  async getReviewsByRestaurant(restaurantId, page = 1, limit = 10) {
    if (!restaurantId) throwError("Restaurant ID is required", 400);

    const offset = (page - 1) * limit;

    const { count: total, rows: reviews } = await Review.findAndCountAll({
      where: { restaurant_id: restaurantId },
      include: [
        {
          model: Customer,
          attributes: ["first_name", "last_name", "profile_picture"],
        },
        { model: Restaurant, attributes: ["id", "restaurant_name"] },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    // const formattedReviews = reviews.map((review) => ({
    //   comment: review.comment,
    //   rating: parseInt(review.rating),
    //   createdAt: review.createdAt,
    //   customer: {
    //     first_name: review.Customer.first_name,
    //     last_name: review.Customer.last_name,
    //     profile_picture: review.Customer.profile_picture,
    //   },
    //   restaurants: reviews.Restaurant
    // }));

    return {
      reviews: reviews,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  },

  async getReview(user, page = 1, limit = 10) {
    let restaurantId = null;

    if (user.restaurant_id) {
      restaurantId = user.restaurant_id;
    } else if (user.branch_id) {
      const branch = await Branch.findByPk(user.branch_id);
      if (!branch) throwError("Branch not found", 404);
      restaurantId = branch.restaurant_id;
    } else {
      throwError("User is not associated with any restaurant or branch", 400);
    }

    if (!restaurantId) throwError("Restaurant ID is required", 400);

    const offset = (page - 1) * limit;

    const { count: total, rows: reviews } = await Review.findAndCountAll({
      where: { restaurant_id: restaurantId },
      include: [
        {
          model: Customer,
          attributes: ["first_name", "last_name", "profile_picture"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const formattedReviews = reviews.map((review) => ({
      comment: review.comment,
      rating: parseInt(review.rating),
      createdAt: review.createdAt,
      customer: {
        first_name: review.Customer.first_name,
        last_name: review.Customer.last_name,
        profile_picture: review.Customer.profile_picture,
      },
    }));

    return {
      reviews: formattedReviews,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  },

  async calculateRestaurantRating(restaurantId) {
    const reviews = await Review.findAll({
      where: { restaurant_id: restaurantId },
      attributes: ["rating"],
    });

    const totalReviews = reviews.length;
    if (totalReviews === 0) {
      return {
        rating: 0,
        total_reviews: 0,
      };
    }

    const sum = reviews.reduce(
      (acc, review) => acc + parseInt(review.rating),
      0
    );
    const average = parseFloat((sum / totalReviews).toFixed(1));

    return {
      rating: average,
      total_reviews: totalReviews,
    };
  },

  async seeTotalCaluclatedRating(user) {
    let restaurantId = null;

    if (user.restaurant_id) {
      restaurantId = user.restaurant_id;
    } else if (user.branch_id) {
      const branch = await Branch.findByPk(user.branch_id);
      if (!branch) throwError("Branch not found", 404);
      restaurantId = branch.restaurant_id;
    } else {
      throwError("User is not associated with any restaurant or branch", 400);
    }

    if (!restaurantId) throwError("Restaurant ID is required", 400);

    const reviews = await Review.findAll({
      where: { restaurant_id: restaurantId },
      attributes: ["rating"],
    });

    const totalReviews = reviews.length;
    if (totalReviews === 0) {
      return {
        rating: 0,
        total_reviews: 0,
      };
    }

    const sum = reviews.reduce(
      (acc, review) => acc + parseInt(review.rating),
      0
    );
    const average = parseFloat((sum / totalReviews).toFixed(1));

    return {
      rating: average,
      total_reviews: totalReviews,
    };
  },
};

module.exports = ReviewService;
