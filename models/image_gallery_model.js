"use strict";

module.exports = (sequelize, DataTypes) => {
  const ImageGallery = sequelize.define(
    "ImageGallery",
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
      image_url: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      caption: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "image_galleries",
      timestamps: true,
      underscored: true,
    }
  );

  ImageGallery.associate = (models) => {
    ImageGallery.belongsTo(models.Restaurant, {
      foreignKey: "restaurant_id",
    });
  };

  return ImageGallery;
};
