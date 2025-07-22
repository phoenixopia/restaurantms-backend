"use strict";

const fs = require("fs/promises");
const {
  Video,
  Branch,
  MenuItem,
  MenuCategory,
  sequelize,
} = require("../../models");
const throwError = require("../../utils/throwError");
const cleanupUploadedFiles = require("../../utils/cleanUploadedFiles");
const { getFileUrl } = require("../../utils/file");

const VIDEO_UPLOAD_FOLDER = "videos";

const VideoService = {
  async uploadVideo(user, body, files = {}) {
    const { title, description, menu_item_id } = body;
    const videoFile = files.video?.[0];
    const thumbnailFile = files.thumbnail?.[0];

    if (!videoFile || !thumbnailFile) {
      await cleanupUploadedFiles([videoFile, thumbnailFile].filter(Boolean));
      throwError("Both video and thumbnail are required", 400);
    }

    const t = await sequelize.transaction();
    try {
      let restaurantId = null;
      let branchId = null;

      if (menu_item_id) {
        const menuItem = await MenuItem.findByPk(menu_item_id, {
          include: {
            model: MenuCategory,
          },
          transaction: t,
        });

        if (!menuItem) {
          await cleanupUploadedFiles([videoFile, thumbnailFile]);
          throwError("Menu item not found", 404);
        }

        const category = menuItem.menu_category;
        if (!category || !category.branch_id) {
          await cleanupUploadedFiles([videoFile, thumbnailFile]);
          throwError("Menu category or branch information is missing", 400);
        }

        const branch = await Branch.findByPk(category.branch_id, {
          transaction: t,
        });
        if (!branch) {
          await cleanupUploadedFiles([videoFile, thumbnailFile]);
          throwError("Associated branch not found", 404);
        }

        branchId = branch.id;
        restaurantId = branch.restaurant_id;
      } else {
        if (user.restaurant_id && !user.branch_id) {
          restaurantId = user.restaurant_id;
          branchId = null;
        } else if (user.branch_id) {
          const branch = await Branch.findByPk(user.branch_id, {
            transaction: t,
          });
          if (!branch) {
            await cleanupUploadedFiles([videoFile, thumbnailFile]);
            throwError("Branch not found", 404);
          }

          branchId = branch.id;
          restaurantId = branch.restaurant_id;
        } else {
          await cleanupUploadedFiles([videoFile, thumbnailFile]);
          throwError(
            "Invalid user access: must be linked to restaurant or branch",
            403
          );
        }
      }

      const newVideo = await Video.create(
        {
          title,
          description,
          video_path: videoFile.filename,
          thumbnail_path: thumbnailFile.filename,
          restaurant_id: restaurantId,
          branch_id: branchId,
          menu_item_id: menu_item_id || null,
          uploaded_by: user.id,
          status: "pending",
        },
        { transaction: t }
      );

      await t.commit();

      return {
        message: "Video uploaded successfully",
        data: {
          id: newVideo.id,
          title: newVideo.title,
          description: newVideo.description,
          video_url: getFileUrl(VIDEO_UPLOAD_FOLDER, newVideo.video_path),
          thumbnail_url: getFileUrl(
            VIDEO_UPLOAD_FOLDER,
            newVideo.thumbnail_path
          ),
          status: newVideo.status,
        },
      };
    } catch (err) {
      await t.rollback();
      await cleanupUploadedFiles([videoFile, thumbnailFile].filter(Boolean));
      throw err;
    }
  },

  async updateVideoStatus(videoId, newStatus, user) {
    const video = await Video.findByPk(videoId);

    if (!video) throwError("Video not found", 404);

    video.status = newStatus;
    await video.save();

    if (newStatus === "rejected") {
      const filesToDelete = [
        { path: getFilePath(VIDEO_UPLOAD_FOLDER, video.video_path) },
        { path: getFilePath(VIDEO_UPLOAD_FOLDER, video.thumbnail_path) },
      ];
      await cleanupUploadedFiles(filesToDelete);
    }

    return video;
  },

  async updateVideo(videoId, user, body, files = {}) {
    const { title, description, menu_item_id, status, duration, is_featured } =
      body;
    const videoFile = files.video?.[0];
    const thumbnailFile = files.thumbnail?.[0];

    const video = await Video.findByPk(videoId);
    if (!video) throwError("Video not found", 404);

    const t = await sequelize.transaction();
    try {
      let restaurantId = video.restaurant_id;
      let branchId = null;

      if (menu_item_id) {
        const menuItem = await MenuItem.findByPk(menu_item_id, {
          include: { model: MenuCategory },
          transaction: t,
        });
        if (!menuItem) {
          await cleanupUploadedFiles(
            [videoFile, thumbnailFile].filter(Boolean)
          );
          throwError("Menu item not found", 404);
        }
        const category = menuItem.menu_category;
        if (!category || !category.branch_id) {
          await cleanupUploadedFiles(
            [videoFile, thumbnailFile].filter(Boolean)
          );
          throwError("Menu category or branch information is missing", 400);
        }
        const branch = await Branch.findByPk(category.branch_id, {
          transaction: t,
        });
        if (!branch) {
          await cleanupUploadedFiles(
            [videoFile, thumbnailFile].filter(Boolean)
          );
          throwError("Associated branch not found", 404);
        }
        branchId = branch.id;
      } else {
        if (user.restaurant_id && !user.branch_id) {
          branchId = null;
        } else if (user.branch_id) {
          const branch = await Branch.findByPk(user.branch_id, {
            transaction: t,
          });
          if (!branch) {
            await cleanupUploadedFiles(
              [videoFile, thumbnailFile].filter(Boolean)
            );
            throwError("Branch not found", 404);
          }
          branchId = branch.id;
        } else {
          await cleanupUploadedFiles(
            [videoFile, thumbnailFile].filter(Boolean)
          );
          throwError(
            "Invalid user access: must be linked to restaurant or branch",
            403
          );
        }
      }

      if (videoFile) {
        const oldVideoPath = getFilePath(VIDEO_UPLOAD_FOLDER, video.video_path);
        await fs.unlink(oldVideoPath).catch(() => {});
        video.video_path = videoFile.filename;
      }
      if (thumbnailFile) {
        const oldThumbnailPath = getFilePath(
          VIDEO_UPLOAD_FOLDER,
          video.thumbnail_path
        );
        await fs.unlink(oldThumbnailPath).catch(() => {});
        video.thumbnail_path = thumbnailFile.filename;
      }

      if (title !== undefined) video.title = title;
      if (description !== undefined) video.description = description;
      if (menu_item_id !== undefined) video.menu_item_id = menu_item_id;
      if (branchId !== undefined) video.branch_id = branchId;
      if (status !== undefined) video.status = status;
      if (duration !== undefined) video.duration = duration;
      if (is_featured !== undefined) video.is_featured = is_featured;

      await video.save({ transaction: t });
      await t.commit();

      return {
        message: "Video updated successfully",
        data: {
          id: video.id,
          title: video.title,
          description: video.description,
          video_url: getFileUrl(VIDEO_UPLOAD_FOLDER, video.video_path),
          thumbnail_url: getFileUrl(VIDEO_UPLOAD_FOLDER, video.thumbnail_path),
          status: video.status,
          duration: video.duration,
          is_featured: video.is_featured,
          menu_item_id: video.menu_item_id,
          branch_id: video.branch_id,
          restaurant_id: video.restaurant_id,
        },
      };
    } catch (err) {
      await t.rollback();
      await cleanupUploadedFiles([videoFile, thumbnailFile].filter(Boolean));
      throw err;
    }
  },

  async deleteVideo(videoId, user) {
    const video = await Video.findByPk(videoId);
    if (!video) throwError("Video not found", 404);

    const isRestaurantAdmin = user.restaurant_id && !user.branch_id;
    const isUploader = user.id === video.uploaded_by;

    if (!isRestaurantAdmin && !isUploader) {
      throwError("Unauthorized to delete this video", 403);
    }

    const videoFilePath = getFilePath(VIDEO_UPLOAD_FOLDER, video.video_path);
    const thumbnailFilePath = getFilePath(
      VIDEO_UPLOAD_FOLDER,
      video.thumbnail_path
    );

    await cleanupUploadedFiles([
      { path: videoFilePath },
      { path: thumbnailFilePath },
    ]);

    await video.destroy();

    return {
      message: "Video deleted successfully",
      data: {
        id: video.id,
        title: video.title,
      },
    };
  },

  async listApprovedVideos(user, query = {}) {
    const { page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    let baseWhere = { status: "approved" };

    const videoAttributes = [
      "id",
      "title",
      "description",
      "video_url",
      "thumbnail_url",
      "duration",
      "restaurant_id",
      "branch_id",
      "uploaded_by",
      "menu_item_id",
      "is_featured",
      "created_at",
    ];

    if (!user || !user.id) {
      return Video.findAndCountAll({
        where: baseWhere,
        limit,
        offset,
        order: [["created_at", "DESC"]],
        attributes: videoAttributes,
      });
    }

    const customerId = user.id;

    const seenVideoIds = await VideoView.findAll({
      where: { customer_id: customerId },
      attributes: ["video_id"],
    }).then((rows) => rows.map((r) => r.video_id));

    const unseenVideos = await Video.findAll({
      where: {
        ...baseWhere,
        id: { [Op.notIn]: seenVideoIds },
      },
      limit,
      offset,
      order: [["created_at", "DESC"]],
      attributes: videoAttributes,
    });

    const remaining = limit - unseenVideos.length;

    let seenVideos = [];

    if (remaining > 0 && seenVideoIds.length) {
      seenVideos = await Video.findAll({
        where: {
          ...baseWhere,
          id: { [Op.in]: seenVideoIds },
        },
        limit: remaining,
        offset: 0,
        order: [["created_at", "DESC"]],
        attributes: videoAttributes,
      });
    }

    const results = [...unseenVideos, ...seenVideos];

    return {
      count: results.length,
      rows: results,
    };
  },

  async viewVideo(customerId, videoId) {
    if (!customerId) throwError("Login required to track view", 401);

    const video = await Video.findByPk(videoId);
    if (!video) throwError("Video not found", 404);

    const alreadyViewed = await VideoView.findOne({
      where: {
        video_id: videoId,
        customer_id: customerId,
      },
    });

    if (!alreadyViewed) {
      await VideoView.create({
        video_id: videoId,
        customer_id: customerId,
      });
    }

    return {
      message: "Video marked as viewed.",
      data: {
        video_id: videoId,
        customer_id: customerId,
      },
    };
  },

  async toggleLike(videoId, customerId) {
    const t = await sequelize.transaction();

    try {
      const video = await Video.findByPk(videoId, { transaction: t });
      if (!video) throwError("Video not found", 404);

      const existingLike = await VideoLike.findOne({
        where: { video_id: videoId, customer_id: customerId },
        transaction: t,
      });

      if (existingLike) {
        await existingLike.destroy({ transaction: t });
        await t.commit();
        return { liked: false, message: "Video unliked" };
      } else {
        await VideoLike.create(
          { video_id: videoId, customer_id: customerId },
          { transaction: t }
        );
        await t.commit();
        return { liked: true, message: "Video liked" };
      }
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async toggleFavorite(videoId, customerId) {
    const t = await sequelize.transaction();

    try {
      const video = await Video.findByPk(videoId, { transaction: t });
      if (!video) throwError("Video not found", 404);

      const existingFav = await VideoFavorite.findOne({
        where: { video_id: videoId, customer_id: customerId },
        transaction: t,
      });

      if (existingFav) {
        await existingFav.destroy({ transaction: t });
        await t.commit();
        return { favorited: false, message: "Video unfavorited" };
      } else {
        await VideoFavorite.create(
          { video_id: videoId, customer_id: customerId },
          { transaction: t }
        );
        await t.commit();
        return { favorited: true, message: "Video favorited" };
      }
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async addComment(videoId, customerId, commentText) {
    const t = await sequelize.transaction();

    try {
      const video = await Video.findByPk(videoId, { transaction: t });
      if (!video) throwError("Video not found", 404);

      if (!commentText || commentText.trim() === "") {
        throwError("Comment text is required", 400);
      }

      const comment = await VideoComment.create(
        {
          video_id: videoId,
          customer_id: customerId,
          comment: commentText.trim(),
        },
        { transaction: t }
      );

      await t.commit();

      return comment;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async updateComment(commentId, customerId, newCommentText) {
    const t = await sequelize.transaction();

    try {
      const comment = await VideoComment.findByPk(commentId, {
        transaction: t,
      });
      if (!comment) throwError("Comment not found", 404);

      if (comment.customer_id !== customerId) {
        throwError("Unauthorized to update this comment", 403);
      }

      if (!newCommentText || newCommentText.trim() === "") {
        throwError("Comment text is required", 400);
      }

      comment.comment = newCommentText.trim();

      await comment.save({ transaction: t });
      await t.commit();

      return comment;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async deleteComment(commentId, customerId) {
    const t = await sequelize.transaction();

    try {
      const comment = await VideoComment.findByPk(commentId, {
        transaction: t,
      });
      if (!comment) throwError("Comment not found", 404);

      if (comment.customer_id !== customerId) {
        throwError("Unauthorized to delete this comment", 403);
      }

      await comment.destroy({ transaction: t });
      await t.commit();

      return { message: "Comment deleted successfully", id: commentId };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },

  async listComments(videoId, page = 1, limit = 10) {
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await VideoComment.findAndCountAll({
      where: { video_id: videoId },
      order: [["created_at", "DESC"]],
      limit,
      offset,
      include: [
        {
          association: "Customer",
          attributes: ["id", "first_name", "last_name"],
        },
      ],
    });

    return {
      total: count,
      page,
      limit,
      comments: rows,
    };
  },
};

module.exports = VideoService;
