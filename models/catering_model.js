"use strict";

module.exports = (sequelize, DataTypes) => {
  const Catering = sequelize.define(
    "Catering",
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
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      menu_summary: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      base_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      min_guest_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      max_guest_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      min_advance_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      prepayment_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
      },
      include_service: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      delivery_available: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      service_area_description: {
        type: DataTypes.TEXT,
      },
      cover_image_url: {
        type: DataTypes.STRING,
      },
      contact_person: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      contact_info: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "caterings",
      timestamps: true,
      underscored: true,
    }
  );

  Catering.associate = (models) => {
    Catering.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    Catering.hasMany(models.CateringRequest, {
      foreignKey: "catering_id",
    });
    Catering.hasMany(models.CateringQuote, {
      foreignKey: "catering_id",
    });
  };

  return Catering;
};
