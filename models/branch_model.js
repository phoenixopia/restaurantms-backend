"use strict";
module.exports = (sequelize, DataTypes) => {
  const Branch = sequelize.define(
    "Branch",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      restaurant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "restaurants",
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
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      manager_id: {
        type: DataTypes.UUID,
        references: {
          model: "users",
          key: "id",
        },
      },
      phone_number: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("active", "inactive", "under_maintenance"),
        allowNull: false,
      },
      opening_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      closing_time: {
        type: DataTypes.TIME,
        allowNull: false,
      },
    },
    {
      tableName: "branches",
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  Branch.prototype.isCurrentlyOpen = function () {
    const now = new Date();
    const currentTime = now.toTimeString().split(" ")[0];

    return currentTime >= this.opening_time && currentTime < this.closing_time;
  };

  Branch.paginate = async function ({
    page = 1,
    limit = 10,
    where = {},
    order = [["created_at", "DESC"]],
    include = [],
  } = {}) {
    const offset = (page - 1) * limit;

    const { count, rows } = await this.findAndCountAll({
      where,
      limit,
      offset,
      order,
      include,
    });

    const totalPages = Math.ceil(count / limit);

    return {
      data: rows,
      meta: {
        totalItems: count,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    };
  };

  Branch.associate = (models) => {
    Branch.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
      onDelete: "CASCADE",
      hooks: true,
    });
    Branch.belongsTo(models.Location, {
      foreignKey: "location_id",
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    Branch.belongsTo(models.User, {
      foreignKey: "manager_id",
      as: "manager",
    });
    Branch.hasMany(models.MenuCategory, { foreignKey: "branch_id" });
  };

  return Branch;
};
