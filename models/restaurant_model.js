"use strict";
const validator = require("validator");
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
      restaurant_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      logo_url: {
        type: DataTypes.STRING(500),
        validate: {
          isUrl: {
            msg: "Invalid logo URL",
            args: {
              protocols: ["http", "https"],
              require_protocol: true,
              allow_underscores: true,
              allow_localhost: true,
            },
          },
        },
      },
      images: {
        type: DataTypes.ARRAY(DataTypes.STRING(500)),
        defaultValue: [],
        validate: {
          isUrlArray(value) {
            if (!Array.isArray(value))
              throw new Error("Images must be an array");
            value.forEach((url) => {
              if (
                !validator.isURL(url, {
                  protocols: ["http", "https"],
                  require_protocol: true,
                  allow_underscores: true,
                  allow_localhost: true,
                })
              ) {
                throw new Error("Invalid URL in images array");
              }
            });
          },
        },
      },
      primary_color: DataTypes.STRING(7),
      language: DataTypes.STRING(10),
      rtl_enabled: DataTypes.BOOLEAN,
      status: {
        type: DataTypes.ENUM("active", "trial", "cancelled", "expired"),
        defaultValue: "trial",
      },
      has_branch: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "restaurants",
      timestamps: true,
      underscored: true,
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
    });
    Restaurant.belongsTo(models.Location, {
      foreignKey: "location_id",
    });
    Restaurant.hasMany(models.Branch, {
      foreignKey: "restaurant_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    Restaurant.belongsToMany(models.User, {
      through: "RestaurantUser",
      foreignKey: "restaurant_id",
      otherKey: "user_id",
    });
    Restaurant.hasOne(models.Menu, {
      foreignKey: "restaurant_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
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
