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
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
      menu_summary: {
        type: DataTypes.TEXT,
      },
      base_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      min_guest_count: {
        type: DataTypes.INTEGER,
      },
      max_guest_count: {
        type: DataTypes.INTEGER,
      },
      min_advance_days: {
        type: DataTypes.INTEGER,
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
        type: DataTypes.STRING(255),
      },
      cover_image_url: {
        type: DataTypes.STRING,
      },
      gallery_url: {
        type: DataTypes.ARRAY(DataTypes.STRING),
      },
      contact_person: {
        type: DataTypes.STRING(100),
      },
      contact_phone: {
        type: DataTypes.STRING(50),
      },
      contact_email: {
        type: DataTypes.STRING(100),
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

    Catering.hasMany(models.CateringMenuItem, {
      foreignKey: "catering_id",
    });
  };

  return Catering;
};
