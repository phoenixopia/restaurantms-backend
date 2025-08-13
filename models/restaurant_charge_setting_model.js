"use strict";

module.exports = (sequelize, DataTypes) => {
  const ChargeSetting = sequelize.define(
    "ChargeSetting",
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

      service_charge_fee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      package_charge_fee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      delivery_fee_type: {
        type: DataTypes.ENUM("fixed", "dynamic"),
        allowNull: true,
      },
      delivery_fee_fixed: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      delivery_fee_dynamic: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {
          starting_fee: 0,
          price_per_meter: 0,
          minimum_fee: 0,
        },
      },
      dine_in_fee_type: {
        type: DataTypes.ENUM("fixed", "dynamic"),
        allowNull: true,
      },
      dine_in_fee_fixed: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      dine_in_fee_dynamic: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {
          price_per_guest: 0,
          price_per_hour: 0,
          minimum_fee: 0,
        },
      },
    },
    {
      tableName: "charge_settings",
      timestamps: true,
      underscored: true,
    }
  );

  ChargeSetting.associate = (models) => {
    ChargeSetting.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
      onDelete: "CASCADE",
    });
  };

  return ChargeSetting;
};
