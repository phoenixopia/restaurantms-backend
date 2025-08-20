"use strict";

module.exports = (sequelize, DataTypes) => {
  const VideoComment = sequelize.define(
    "VideoComment",
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

      comment_text: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
    },
    {
      tableName: "video_comments",
      timestamps: true,
      underscored: true,
    }
  );

  VideoComment.associate = (models) => {
    VideoComment.belongsTo(models.Video, {
      foreignKey: "video_id",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    VideoComment.belongsTo(models.Customer, {
      foreignKey: "customer_id",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  };

  return VideoComment;
};
