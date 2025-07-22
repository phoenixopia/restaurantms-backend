"use strict";

module.exports = (sequelize, DataTypes) => {
  const VideoFavorite = sequelize.define(
    "VideoFavorite",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      video_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "videos",
          key: "id",
        },
      },

      customer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "customers",
          key: "id",
        },
      },
    },
    {
      tableName: "video_favorites",
      timestamps: true,
      updatedAt: false,
      createdAt: "created_at",
      underscored: true,
    }
  );

  VideoFavorite.associate = (models) => {
    VideoFavorite.belongsTo(models.Video, {
      foreignKey: "video_id",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    VideoFavorite.belongsTo(models.Customer, {
      foreignKey: "customer_id",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  };

  return VideoFavorite;
};
