"use strict";

const { Op, fn, col, literal, QueryTypes, where } = require("sequelize");
const ReviewService = require("../admin/review_service");
const throwError = require("../../utils/throwError");

const { buildPagination } = require("../../utils/pagination");
const {
  Review,
  SystemSetting,
  ContactInfo,
  Restaurant,
  RestaurantFollower,
  Catering,
  VideoLike,
  VideoView,
  Location,
  Menu,
  Branch,
  MenuCategory,
  MenuItem,
  sequelize,
  Sequelize,
  Video,
} = require("../../models/index");

const MAX_NEARBY_DISTANCE_KM = 5;

const CustomerRestaurantService = {

async getFilteredRestaurants(query) {
  const { page, limit, offset, order } = buildPagination(query);
  const { hasDelivery, hasCatering, minRating, sortBy = 'popularity' } = query;

  // Build relations
  const include = [
    {
      model: Branch,
      include: [
        {
          model: Location,
          attributes: ["id", "latitude", "longitude", "address"],
        },
      ],
    },
    { model: Review },
    // { model: RestaurantFollower },
    {
      model: Catering,
      required: hasCatering === "true",
      attributes: ["id"],

    },
  ];

  const where = { status: "active" }; 

  if (hasDelivery === "true") where.delivery_available = true;
    // {
    // include[0].required = true;
    // include[0].where = { delivery_available: true };
  // }

  // Execute query with pagination and relations
  const result = await Restaurant.findAndCountAll({
    where,
    include,
    order,
    limit,
    offset,
    distinct: true, // Important when using includes with count
  });

  // let filteredRestaurants = result.rows;
  // if (minRating !== undefined) {
  //   filteredRestaurants = result.rows.filter(restaurant => {
  //     // If restaurant has a rating field, use that
  //     if (restaurant.Reviews.rating) {
  //       return restaurant.Reviews.rating >= parseFloat(minRating);
  //     }
  //   });
  // }

  return {
    pagination: {
      page,
      limit,
      total: result.count,
      totalPages: Math.ceil(result.count / limit)
    },
    restaurants: result.rows,
  };
},

  // // Get filtered restaurants
  // async getFilteredRestaurants(query) {
  //   const { page, limit, offset, order: defaultOrder } = buildPagination(query);

  //   const {
  //     hasDelivery,
  //     hasCatering,
  //     minRating,
  //     userLat,
  //     userLng,
  //     sortBy,
  //   } = query;

  //   const where = { status: "active" }; // only active restaurants

  //   // Base include
  //   const include = [
  //     { 
  //       model: Branch, 
  //       // attributes: ["id", "latitude", "longitude", "name", "delivery_available"],
  //       include: [
  //         {
  //           model: Location,
  //           attributes: ["latitude", "longitude", "address"],
  //         },
  //       ],
  //     },
  //     { model: Review, attributes: [] },
  //     { model: RestaurantFollower, attributes: [] },
  //     { model: Catering, attributes: [] },
  //   ];

  //   if (hasDelivery === "true") where["$Branches.delivery_available$"] = true;
  //   if (hasCatering === "true") where["$Caterings.id$"] = { [Op.ne]: null };

  //   const attributes = {
  //     include: [
  //       [fn("AVG", col("Reviews.rating")), "avgRating"],
  //       [fn("COUNT", col("RestaurantFollowers.id")), "popularity"],
  //     ],
  //   };

  //   const queryOptions = {
  //     where,
  //     include,
  //     distinct: true,
  //     subQuery: false,
  //     offset,
  //     limit,
  //     attributes,
  //     // group: ["Restaurant.id", "Branches.id"],
  //     group: [
  //       "Restaurant.id",
  //       "Branches.id",
  //       "Branches->Location.id",
  //       "Branches->Location.latitude",
  //       "Branches->Location.longitude",
  //       "Branches->Location.address",
  //     ],
  //   };

  //   // Apply minRating filter using HAVING
  //   if (minRating) {
  //     queryOptions.having = literal(`AVG("Reviews"."rating") >= ${parseFloat(minRating)}`);
  //   }

  //   // Sorting
  //   if (sortBy === "rating") queryOptions.order = [[literal('"avgRating"'), "DESC"]];
  //   else if (sortBy === "popularity") queryOptions.order = [[literal('"popularity"'), "DESC"]];
  //   else if (sortBy === "distance" && userLat && userLng) {
  //     queryOptions.order = [
  //       [
  //         literal(`
  //           6371 * acos(
  //             cos(radians(${userLat}))
  //             * cos(radians("Branches->Location"."latitude"))
  //             * cos(radians("Branches->Location"."longitude") - radians(${userLng}))
  //             + sin(radians(${userLat})) * sin(radians("Branches->Location"."latitude"))
  //           )
  //         `), "ASC",
  //       ],
  //     ];
  //   } else {
  //     queryOptions.order = defaultOrder; // fallback from buildPagination
  //   }

  //   const { count, rows } = await Restaurant.findAndCountAll(queryOptions);

  //   return {
  //     currentPage: page,
  //     totalPages: Math.ceil(count.length / limit),
  //     totalItems: count.length,
  //     data: rows,
  //   };
  // },

  //  // Get filtered restaurants
  // async getFilteredRestaurants(query) {
  //   const { page, limit, offset, order: defaultOrder } = buildPagination(query);

  //   const {
  //     hasDelivery,
  //     hasCatering,
  //     minRating,
  //     userLat,
  //     userLng,
  //     sortBy,
  //   } = query;

  //   const where = { status: "active" }; // only active restaurants

  //   // Base include
  //   const include = [
  //     { model: Branch, as: "mainBranch", attributes: ["id", "latitude", "longitude", "name", "delivery_available"] },
  //     { model: Review, attributes: [] },
  //     { model: RestaurantFollower, attributes: [] },
  //     { model: Catering, attributes: [] },
  //   ];

  //   if (hasDelivery === "true") where["$mainBranch.delivery_available$"] = true;
  //   if (hasCatering === "true") where["$Caterings.id$"] = { [Op.ne]: null };

  //   const attributes = {
  //     include: [
  //       [fn("AVG", col("Reviews.rating")), "avgRating"],
  //       [fn("COUNT", col("RestaurantFollowers.id")), "popularity"],
  //     ],
  //   };

  //   const queryOptions = {
  //     where,
  //     include,
  //     distinct: true,
  //     subQuery: false,
  //     offset,
  //     limit,
  //     attributes,
  //     group: ["Restaurant.id", "mainBranch.id"],
  //   };

  //   // Sorting
  //   if (sortBy === "rating") queryOptions.order = [[literal('"avgRating"'), "DESC"]];
  //   else if (sortBy === "popularity") queryOptions.order = [[literal('"popularity"'), "DESC"]];
  //   else if (sortBy === "distance" && userLat && userLng) {
  //     queryOptions.order = [
  //       [
  //         literal(`
  //           6371 * acos(
  //             cos(radians(${userLat}))
  //             * cos(radians("mainBranch"."latitude"))
  //             * cos(radians("mainBranch"."longitude") - radians(${userLng}))
  //             + sin(radians(${userLat})) * sin(radians("mainBranch"."latitude"))
  //           )
  //         `),
  //         "ASC",
  //       ],
  //     ];
  //   } else {
  //     queryOptions.order = defaultOrder; // fallback from buildPagination
  //   }

  //   const { count, rows } = await Restaurant.findAndCountAll(queryOptions);

  //   return {
  //     currentPage: page,
  //     totalPages: Math.ceil(count.length / limit),
  //     totalItems: count.length,
  //     data: rows,
  //   };
  // },



  // Get all restaurants
  async getAllRestaurants(query) {
    const { page, limit, offset, order } = buildPagination(query);

    const totalItems = await Restaurant.count({
      where: { status: { [Op.in]: ["active"] } },
    });

    const rows = await Restaurant.findAll({
      where: { status: { [Op.in]: ["active"] } },
      offset,
      limit,
      order,
      attributes: ["id", "restaurant_name"],
      include: [
        {
          model: Branch,
          required: false,
          where: { main_branch: true },
          attributes: ["id", "name"],
          include: [
            {
              model: Location,
              attributes: ["address", "latitude", "longitude"],
            },
          ],
        },
        {
          model: SystemSetting,
          attributes: ["logo_url", "images"],
          required: false,
        },
        {
          model: ContactInfo,
          as: "owned_contact_info",
          where: { module_type: "restaurant" },
          required: false,
          attributes: ["type", "value", "is_primary"],
        },
        {
          model: MenuCategory,
          required: false,
          distinct: true,
          limit: 3,
          attributes: ["name"],
        },
      ],
    });

    const restaurants = await Promise.all(
      rows.map(async (r) => {
        const plain = r.get({ plain: true });

        plain.MenuCategories = plain.MenuCategories?.map((cat) => ({
          id: cat.id,
          name: cat.name,
        }));

        plain.location =
          (plain.Branches && plain.Branches[0]?.Location) || null;
        delete plain.Branches;

        const { rating, total_reviews } =
          await ReviewService.calculateRestaurantRating(plain.id);
        plain.rating = rating;
        plain.total_reviews = total_reviews;

        return plain;
      })
    );

    const totalPages = Math.ceil(totalItems / limit);

    return {
      restaurants,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    };
  },

  async getRestaurantById(id, page = 1, limit = 10) {
    const restaurant = await Restaurant.findByPk(id, {
      attributes: ["id", "restaurant_name"],
      include: [
        {
          model: SystemSetting,
          attributes: ["logo_url", "images"],
          required: false,
        },
        {
          model: Branch,
          as: "mainBranch",
          where: { main_branch: true },
          required: false,
          attributes: ["id", "name"],
          include: [
            {
              model: Location,
              attributes: ["address", "latitude", "longitude"],
            },
            {
              model: MenuCategory,
              required: false,
              attributes: ["id", "name", "branch_id"],
              include: [
                {
                  model: MenuItem,
                  required: false,
                  attributes: { exclude: ["createdAt", "updatedAt"] },
                },
              ],
            },
          ],
        },
        {
          model: Branch,
          required: false,
          attributes: ["id", "name"],
        },
      ],
    });

    if (!restaurant) throwError("Restaurant not found", 404);

    const plain = restaurant.get({ plain: true });

    const mainBranch = plain.mainBranch || null;
    const allBranches = plain.Branches || [];

    const { rating, total_reviews } =
      await ReviewService.calculateRestaurantRating(plain.id);

    return {
      id: plain.id,
      restaurant_name: plain.restaurant_name,
      logo_url: plain.SystemSetting?.logo_url || null,
      images: plain.SystemSetting?.images || [],
      rating,
      total_reviews,
      main_branch_location: mainBranch?.Location || null,
      branches: allBranches.map((b) => ({
        id: b.id,
        name: b.name,
      })),
      menu_categories:
        (mainBranch?.MenuCategories || []).map((cat) => {
          const totalItems = cat.MenuItems.length;
          const offset = (page - 1) * limit;
          const paginatedItems = cat.MenuItems.slice(offset, offset + limit);

          return {
            id: cat.id,
            name: cat.name,
            branch_id: cat.branch_id,
            menu_items: paginatedItems,
            pagination: {
              totalItems,
              totalPages: Math.ceil(totalItems / limit),
              currentPage: page,
              pageSize: limit,
            },
          };
        }) || [],
    };
  },

  async getBranchMenus(
    restaurantId,
    branchId,
    page = 1,
    limit = 10,
    categoryName = ""
  ) {
    const branch = await Branch.findOne({
      where: {
        id: branchId,
        restaurant_id: restaurantId,
      },
      attributes: ["id", "name"],
      include: [
        {
          model: Location,
          attributes: ["address", "latitude", "longitude"],
        },
      ],
    });
    if (!branch) {
      throwError("Branch not found", 404);
    }

    if (categoryName) {
      const category = await MenuCategory.findOne({
        where: { name: categoryName, branch_id: branchId },
        attributes: ["id", "name", "branch_id"],
      });

      if (!category) {
        return {
          menu_items: [],
          pagination: {
            totalItems: 0,
            totalPages: 0,
            currentPage: 1,
            pageSize: limit,
          },
        };
      }

      const totalItems = await MenuItem.count({
        where: { menu_category_id: category.id },
      });

      const items = await MenuItem.findAll({
        where: { menu_category_id: category.id },
        attributes: { exclude: ["createdAt", "updatedAt"] },
        limit: limit,
        offset: (page - 1) * limit,
        order: [["createdAt", "ASC"]],
      });

      return {
        menu_items: items,
        pagination: {
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
          currentPage: page,
          pageSize: limit,
        },
      };
    } else {
      const allCategories = await MenuCategory.findAll({
        where: { branch_id: branchId },
        attributes: ["id", "name"],
        order: [["id", "ASC"]],
      });

      const menuCategories = await Promise.all(
        allCategories.map(async (cat) => {
          const totalItems = await MenuItem.count({
            where: { menu_category_id: cat.id },
          });

          const items = await MenuItem.findAll({
            where: { menu_category_id: cat.id },
            attributes: { exclude: ["createdAt", "updatedAt"] },
            limit: limit,
            offset: (page - 1) * limit,
            order: [["createdAt", "ASC"]],
          });

          return {
            id: cat.id,
            name: cat.name,
            branch_id: cat.branch_id,
            menu_items: items,
            pagination: {
              totalItems,
              totalPages: Math.ceil(totalItems / limit),
              currentPage: page,
              pageSize: limit,
            },
          };
        })
      );

      return {
        branch: {
          id: branch.id,
          name: branch.name,
          location: branch.Location || null,
        },
        menu_categories: menuCategories,
      };
    }
  },

  async getAllRestaurantsWithCheapestItem({ page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const totalItems = await Restaurant.count({
      where: { status: "active" },
    });

    const restaurants = await Restaurant.findAll({
      where: { status: "active" },
      offset,
      limit,
      attributes: ["id", "restaurant_name"],
      include: [
        {
          model: SystemSetting,
          attributes: ["logo_url", "images"],
          required: false,
        },
        {
          model: Menu,
          attributes: ["id", "name"],
          required: false,
        },
      ],
    });

    const data = await Promise.all(
      restaurants.map(async (restaurant) => {
        const cheapestItem = await MenuItem.findOne({
          include: [
            {
              model: MenuCategory,
              required: true,
              where: { restaurant_id: restaurant.id },
              attributes: { exclude: ["createdAt", "updatedAt"] },
            },
          ],
          order: [["unit_price", "ASC"]],
          attributes: {
            exclude: ["createdAt", "updatedAt"],
          },
        });

        let categoryInfo = null;
        if (cheapestItem?.MenuCategory) {
          categoryInfo = {
            id: cheapestItem.MenuCategory.id,
            name: cheapestItem.MenuCategory.name,
          };
        }

        const restaurantImage = restaurant.SystemSetting?.images?.[0] || null;

        return {
          id: restaurant.id,
          restaurant_name: restaurant.restaurant_name,
          restaurant_logo: restaurant.SystemSetting?.logo_url || null,
          restaurant_image: restaurantImage,
          menu_name: restaurant.Menu?.name || null,
          cheapest_menu_item: cheapestItem
            ? {
                ...cheapestItem.get({ plain: true }),
                category: categoryInfo,
              }
            : null,
        };
      })
    );

    return {
      data,
      meta: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        pageSize: limit,
      },
    };
  },

  async searchRestaurants({
    query,
    nearby,
    lat,
    lng,
    sort = "createdAt",
    order = "DESC",
    page = 1,
    limit = 10,
    filter,
  }) {
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    let data = [];
    let totalItems = 0;

    if (nearby === "true" && lat && lng) {
      const replacements = {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        maxDistance: MAX_NEARBY_DISTANCE_KM,
        limit,
        offset,
      };

      const baseCondition = query ? "AND r.restaurant_name ILIKE :query" : "";

      const selectQuery = `
        WITH nearby_restaurants AS (
          SELECT
            r.*,
            ss.logo_url,
            ss.images,
            l.address,
            l.latitude,
            l.longitude,
            (
              6371 * acos(
                cos(radians(:latitude)) * cos(radians(l.latitude)) *
                cos(radians(l.longitude) - radians(:longitude)) +
                sin(radians(:latitude)) * sin(radians(l.latitude))
              )
            ) AS distance
          FROM restaurants r
          LEFT JOIN system_settings ss ON ss.restaurant_id = r.id
          JOIN branches b ON r.id = b.restaurant_id AND b.main_branch = TRUE
          JOIN locations l ON b.location_id = l.id
          WHERE r.status = 'active'
          ${baseCondition}
        )
        SELECT *
        FROM nearby_restaurants
        WHERE distance <= :maxDistance
        ORDER BY distance ASC
        LIMIT :limit OFFSET :offset
      `;

      const countQuery = `
        WITH nearby_restaurants AS (
          SELECT
            r.id,
            (
              6371 * acos(
                cos(radians(:latitude)) * cos(radians(l.latitude)) *
                cos(radians(l.longitude) - radians(:longitude)) +
                sin(radians(:latitude)) * sin(radians(l.latitude))
              )
            ) AS distance
          FROM restaurants r
          JOIN branches b ON r.id = b.restaurant_id AND b.main_branch = TRUE
          JOIN locations l ON b.location_id = l.id
          WHERE r.status = 'active'
          ${baseCondition}
        )
        SELECT COUNT(*) FROM nearby_restaurants WHERE distance <= :maxDistance
      `;

      const replacementsWithQuery = {
        ...replacements,
        ...(query ? { query: `%${query}%` } : {}),
      };

      const rawRestaurants = await sequelize.query(selectQuery, {
        replacements: replacementsWithQuery,
        type: QueryTypes.SELECT,
      });

      const countResult = await sequelize.query(countQuery, {
        replacements: replacementsWithQuery,
        type: QueryTypes.SELECT,
      });

      totalItems = parseInt(countResult[0].count);

      const restaurantIds = rawRestaurants.map((r) => r.id);

      const menuCategories = await sequelize.models.MenuCategory.findAll({
        where: {
          restaurant_id: restaurantIds,
        },
        attributes: ["id", "name", "restaurant_id"],
        order: [["name", "ASC"]],
      });

      const categoriesByRestaurant = {};
      menuCategories.forEach((cat) => {
        if (!categoriesByRestaurant[cat.restaurant_id]) {
          categoriesByRestaurant[cat.restaurant_id] = [];
        }
        if (
          !categoriesByRestaurant[cat.restaurant_id].some(
            (c) => c.name === cat.name
          )
        ) {
          categoriesByRestaurant[cat.restaurant_id].push({
            id: cat.id,
            name: cat.name,
          });
        }
      });

      data = await Promise.all(
        rawRestaurants.map(async (r) => {
          const categories = categoriesByRestaurant[r.id] || [];

          const { rating, total_reviews } =
            await ReviewService.calculateRestaurantRating(r.id);

          return {
            id: r.id,
            restaurant_name: r.restaurant_name,
            location: {
              address: r.address,
              latitude: r.latitude,
              longitude: r.longitude,
            },
            menu_categories: categories.slice(0, 3),
            rating,
            total_reviews,
            logo_url: r.logo_url || null,
            images: r.images || [],
          };
        })
      );

      if (filter === "top_rated") {
        data.sort((a, b) => b.rating - a.rating);
      }
    } else {
      const { rows, count } = await Restaurant.findAndCountAll({
        where: {
          status: "active",
          ...(query
            ? {
                restaurant_name: {
                  [Op.iLike]: `%${query}%`,
                },
              }
            : {}),
        },
        offset,
        limit,
        order: [[sort, order]],
        include: [
          {
            model: SystemSetting,
            attributes: ["logo_url", "images"],
            required: false,
          },
          {
            model: ContactInfo,
            as: "owned_contact_info",
            where: { module_type: "restaurant" },
            required: false,
            attributes: ["type", "value", "is_primary"],
          },
          {
            model: Branch,
            as: "mainBranch",
            where: { main_branch: true },
            required: true,
            include: [
              {
                model: Location,
                attributes: ["address", "latitude", "longitude"],
              },
            ],
          },
          {
            model: MenuCategory,
            distinct: true,
            limit: 3,
            attributes: ["id", "name"],
          },
        ],
      });

      totalItems = count;

      data = await Promise.all(
        rows.map(async (r) => {
          const plain = r.get({ plain: true });

          const { rating, total_reviews } =
            await ReviewService.calculateRestaurantRating(plain.id);

          return {
            id: plain.id,
            restaurant_name: plain.restaurant_name,
            logo_url: plain.SystemSetting?.logo_url || null,
            images: plain.SystemSetting?.images || [],
            location: plain.mainBranch?.Location || null,
            menu_categories: (plain.MenuCategories || []).map((cat) => ({
              id: cat.id,
              name: cat.name,
            })),
            rating,
            total_reviews,
          };
        })
      );

      if (filter === "top_rated") {
        data.sort((a, b) => b.rating - a.rating);
      }
    }

    const totalPages = Math.ceil(totalItems / limit);

    return {
      restaurants: data,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    };
  },

  async getRestaurantProfileWithVideos(
    restaurantId,
    customerId,
    { page = 1, limit = 10, filter = "latest" }
  ) {
    const restaurant = await Restaurant.findByPk(restaurantId, {
      attributes: ["id", "restaurant_name"],
      include: [
        {
          model: SystemSetting,
          attributes: ["logo_url"],
        },
        {
          model: Branch,
          as: "mainBranch",
          required: false,
          where: { main_branch: true },
          attributes: ["id", "name"],
          include: [
            {
              model: Location,
              attributes: ["address", "latitude", "longitude"],
            },
          ],
        },
        {
          model: ContactInfo,
          where: {
            module_type: "restaurant",
            module_id: restaurantId,
          },
          attributes: ["type", "value", "is_primary"],
          required: false,
        },
      ],
    });

    const total_followers = await FollowService.getFollowerCount(restaurantId);
    const is_following = await FollowService.isFollowing(
      customerId,
      restaurantId
    );

    const total_posts = await Video.count({
      where: {
        restaurant_id: restaurantId,
        status: "approved",
      },
    });

    const total_likes_result = await VideoLike.findAll({
      where: { "$Video.restaurant_id$": restaurantId },
      include: [{ model: Video, as: "Video", attributes: [] }],
      attributes: [[fn("COUNT", col("VideoLike.id")), "total_likes"]],
      raw: true,
    });
    const total_likes = parseInt(total_likes_result[0]?.total_likes || 0);

    const offset = (page - 1) * limit;

    const orderOptions = {
      latest: [["createdAt", "DESC"]],
      most_viewed: [[literal("total_views"), "DESC"]],
      most_liked: [[literal("total_likes"), "DESC"]],
    };

    const videos = await Video.findAll({
      where: {
        restaurant_id: restaurantId,
        status: "approved",
      },
      attributes: {
        include: [
          [fn("COUNT", literal(`DISTINCT("VideoLikes"."id")`)), "total_likes"],
          [fn("COUNT", literal(`DISTINCT("VideoViews"."id")`)), "total_views"],
        ],
      },
      include: [
        { model: VideoLike, as: "VideoLikes", attributes: [], required: false },
        { model: VideoView, as: "VideoViews", attributes: [], required: false },
      ],
      group: ["Video.id"],
      order: orderOptions[filter] || orderOptions.latest,
      offset,
      limit: parseInt(limit),
      subQuery: false,
    });

    return {
      restaurant: {
        id: restaurant.id,
        name: restaurant.restaurant_name,
        logo_url: restaurant.SystemSetting?.logo_url || null,
        main_branch: restaurant.mainBranch
          ? {
              id: restaurant.mainBranch.id,
              name: restaurant.mainBranch.name,
              location: restaurant.mainBranch.Location
                ? {
                    address: restaurant.mainBranch.Location.address,
                    latitude: restaurant.mainBranch.Location.latitude,
                    longitude: restaurant.mainBranch.Location.longitude,
                  }
                : null,
            }
          : null,
        contacts: (restaurant.ContactInfos || []).map((contact) => ({
          type: contact.type,
          value: contact.value,
          is_primary: contact.is_primary,
        })),
      },
      stats: {
        total_posts,
        total_likes,
        total_followers,
        is_following,
      },
      videos: videos.map((video) => ({
        id: video.id,
        title: video.title,
        video_url: video.video_url,
        thumbnail_url: video.thumbnail_url,
        total_likes: Number(video.getDataValue("total_likes") || 0),
        total_views: Number(video.getDataValue("total_views") || 0),
        createdAt: video.createdAt,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
      },
    };
  },
};

module.exports = CustomerRestaurantService;
