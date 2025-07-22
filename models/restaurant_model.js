"use strict";

const { DataTypes } = require("sequelize");
module.exports = (sequelize) => {
  const Restaurant = sequelize.define(
    "Restaurant",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      restaurant_name: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: false,
      },

      status: {
        type: DataTypes.ENUM(
          "active",
          "trial",
          "cancelled",
          "expired",
          "pending"
        ),
        defaultValue: "trial",
      },
    },
    {
      tableName: "restaurants",
      timestamps: true,
      underscored: true,
    }
  );

  Restaurant.associate = (models) => {
    Restaurant.hasOne(models.SystemSetting, {
      foreignKey: "restaurant_id",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
    // to show restaurant owned contact info
    Restaurant.hasMany(models.ContactInfo, {
      foreignKey: "restaurant_id",
      as: "owned_contact_info",
    });
    // to show contact info of restaurant branches
    Restaurant.hasMany(models.ContactInfo, {
      foreignKey: "module_id",
      constraints: false,
      scope: {
        module_type: "restaurant",
      },
    });

    Restaurant.hasMany(models.Subscription, {
      foreignKey: "restaurant_id",
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });

    Restaurant.hasMany(models.Branch, {
      foreignKey: "restaurant_id",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Restaurant.hasOne(models.Branch, {
      as: "mainBranch",
      foreignKey: "restaurant_id",
      scope: { main_branch: true },
    });

    Restaurant.hasOne(models.Menu, {
      foreignKey: "restaurant_id",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Restaurant.hasMany(models.LoyaltyPoint, {
      foreignKey: "restaurant_id",
    });

    Restaurant.hasMany(models.UserPermission, {
      foreignKey: "restaurant_id",
    });

    Restaurant.hasMany(models.MenuCategory, {
      foreignKey: "restaurant_id",
    });

    Restaurant.hasMany(models.Order, {
      foreignKey: "restaurant_id",
    });

    Restaurant.hasMany(models.Table, {
      foreignKey: "restaurant_id",
    });
    Restaurant.hasMany(models.Reservation, {
      foreignKey: "restaurant_id",
    });
    Restaurant.hasMany(models.KdsOrder, {
      foreignKey: "restaurant_id",
    });
    Restaurant.hasMany(models.Review, {
      foreignKey: "restaurant_id",
    });
    Restaurant.hasMany(models.SupportTicket, {
      foreignKey: "restaurant_id",
    });
    Restaurant.hasMany(models.AnalyticsSnapshot, {
      foreignKey: "restaurant_id",
    });
    Restaurant.hasMany(models.Payment, {
      foreignKey: "restaurant_id",
    });
    Restaurant.hasMany(models.Promotion, {
      foreignKey: "restaurant_id",
    });
    Restaurant.hasMany(models.Video, {
      foreignKey: "restaurant_id",
    });
    Restaurant.hasMany(models.RestaurantFollower, {
      foreignKey: "restaurant_id",
    });

    Restaurant.belongsToMany(models.Customer, {
      through: models.RestaurantFollower,
      foreignKey: "restaurant_id",
      otherKey: "customer_id",
    });
  };

  Restaurant.paginate = async function (page = 1, limit = 10, filter = {}) {
    const offset = (page - 1) * limit;

    const result = await this.findAndCountAll({
      where: filter,
      offset,
      limit,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: sequelize.models.Location,
          attributes: ["name", "address"],
        },
      ],
    });

    return {
      currentPage: page,
      totalPages: Math.ceil(result.count / limit),
      totalItems: result.count,
      data: result.rows,
    };
  };

  return Restaurant;
};
