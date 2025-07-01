"use strict";
const { getGeneratedId } = require('../utils/idGenerator');

module.exports = (sequelize, DataTypes) => {
  const Branch = sequelize.define(
    "Branch",
    {
      id: {
        type: DataTypes.STRING,
        defaultValue: getGeneratedId,
        primaryKey: true,
        allowNull: false,
      },
      restaurant_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "restaurants",
          key: "id",
        },
        onDelete: 'CASCADE'
      },
      location_id: {
        type: DataTypes.STRING,
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
        type: DataTypes.STRING,
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

  Branch.associate = (models) => {
    Branch.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id", onDelete: 'CASCADE',
      // onDelete: "CASCADE",
      hooks: true,
      as: "restaurant",
    });
    Branch.belongsTo(models.Location, {
      foreignKey: "location_id",
      onUpdate: "CASCADE",
      // onDelete: "SET NULL",
      as: "location",
    });
    Branch.belongsTo(models.User, {
      foreignKey: "manager_id",
      as: "manager",
    });
  };

  return Branch;
};
