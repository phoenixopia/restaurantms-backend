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
      gallery_image_ids: {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: true,
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
    Catering.hasMany(models.CateringQuote, {
      foreignKey: "catering_id",
    });

    Catering.hasMany(models.CateringMenuItem, {
      foreignKey: "catering_id",
    });
  };

  return Catering;
};
