"use strict";

module.exports = (sequelize, DataTypes) => {
  const VideoLike = sequelize.define(
    "VideoLike",
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
      tableName: "video_likes",
      timestamps: true,
      updatedAt: false,
      createdAt: "createdAt",
      underscored: true,
    }
  );

  VideoLike.associate = (models) => {
    VideoLike.belongsTo(models.Video, {
      foreignKey: "video_id",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    VideoLike.belongsTo(models.Customer, {
      foreignKey: "customer_id",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  };

  return VideoLike;
};
