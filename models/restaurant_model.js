"use strict";

module.exports = (sequelize, DataTypes) => {
  const Restaurant = sequelize.define(
    "Restaurant",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      location_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "locations",
          key: "id",
        },
      },
      restaurant_name: DataTypes.STRING(255),
      logo_url: DataTypes.TEXT,
      images: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        allowNull: true,
      },
      primary_color: DataTypes.STRING(7),
      language: DataTypes.STRING(10),
      rtl_enabled: DataTypes.BOOLEAN,
      status: {
        type: DataTypes.ENUM("active", "trial", "cancelled", "expired"),
        defaultValue: "trial",
      },
    },
    {
      tableName: "restaurants",
      timestamps: true,
      underscored: true,
      defaultScope: {
        attributes: {
          exclude: [
            "id",
            "created_by",
            "primary_color",
            "created_at",
            "updated_at",
          ],
        },
      },
    }
  );

  Restaurant.associate = (models) => {
    Restaurant.hasOne(models.Subscription, {
      foreignKey: "restaurant_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    Restaurant.belongsTo(models.User, {
      foreignKey: "created_by",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
    Restaurant.hasMany(models.Branch, {
      foreignKey: "restaurant_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    Restaurant.belongsTo(models.Location, {
      foreignKey: "location_id",
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    //   // One Tenant can have multiple Locations
    //   Restaurant.hasMany(models.Location, { foreignKey: "restaurant_id" });

    //   Restaurant.belongsToMany(models.Menu, {
    //     through: "RestaurantMenu",
    //     foreignKey: "restaurant_id",
    //     otherKey: "menu_id",
    //   });

    //   Restaurant.hasMany(models.Reservation, { foreignKey: "restaurant_id" });
    //   Restaurant.hasMany(models.Feedback, { foreignKey: "restaurant_id" });
    //   Restaurant.hasMany(models.SupportTicket, { foreignKey: "restaurant_id" });
    //   Restaurant.hasOne(models.SystemSetting, { foreignKey: "restaurant_id" });
    //   Restaurant.hasMany(models.AnalyticsSnapshot, {
    //     foreignKey: "restaurant_id",
    //   });
  };

  Restaurant.paginate = async function (page = 1, limit = 10, filter = {}) {
    const offset = (page - 1) * limit;

    const result = await this.findAndCountAll({
      where: filter,
      offset,
      limit,
      order: [["created_at", "DESC"]],
      attributes: {
        exclude: [
          "created_by",
          "primary_color",
          "rtl_enabled",
          "created_at",
          "updated_at",
        ],
      },
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
