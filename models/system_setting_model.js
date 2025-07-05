"use strict";

module.exports = (sequelize, DataTypes) => {
  const SystemSetting = sequelize.define(
    "SystemSetting",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
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

      logo_url: {
        type: DataTypes.STRING(2083),
        allowNull: true,
      },

      images: {
        type: DataTypes.ARRAY(DataTypes.STRING(2083)),
        allowNull: true,
      },

      default_theme: {
        type: DataTypes.ENUM("Light", "Dark"),
        defaultValue: "Light",
      },

      default_language: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },

      recaptcha_key: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      email_smtp_settings: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      primary_color: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },

      font_family: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      sms_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      rtl_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "system_settings",
      timestamps: true,
      underscored: true,
    }
  );

  SystemSetting.associate = (models) => {
    SystemSetting.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  };

  return SystemSetting;
};
