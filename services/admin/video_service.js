"use strict";

const fs = require("fs/promises");
const path = require("path");
const { Op } = require("sequelize");

const {
  Restaurant,
  SystemSetting,
  Location,
  VideoLike,
  VideoComment,
  VideoFavorite,
  VideoView,
  RestaurantFollower,
  Video,
  Branch,
  MenuItem,
  MenuCategory,
  sequelize,
} = require("../../models");
const throwError = require("../../utils/throwError");
const cleanupUploadedFiles = require("../../utils/cleanUploadedFiles");
const { getFileUrl, getFilePath } = require("../../utils/file");
const getVideoDuration = require("../../utils/getVideoDuration");

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

    const videoPath = getFilePath(VIDEO_UPLOAD_FOLDER, videoFile.filename);

    let duration;
    try {
      duration = await getVideoDuration(videoPath);

      if (duration > 180) {
        await cleanupUploadedFiles([videoFile, thumbnailFile]);
        throwError("Video must be 3 minutes or less", 400);
      }
    } catch (err) {
      await cleanupUploadedFiles([videoFile, thumbnailFile]);
      throwError("Unable to read video duration", 500);
    }

    const t = await sequelize.transaction();
    try {
      let restaurantId = null;
      let branchId = null;

      if (menu_item_id) {
        const menuItem = await MenuItem.findByPk(menu_item_id, {
          include: {
            model: MenuCategory,
            attributes: ["id", "branch_id", "restaurant_id"],
          },
          transaction: t,
        });

        if (!menuItem) {
          await cleanupUploadedFiles([videoFile, thumbnailFile]);
          throwError("Menu item not found", 404);
        }

        const category = menuItem.MenuCategory;

        if (!category || !category.branch_id) {
          await cleanupUploadedFiles([videoFile, thumbnailFile]);
          throwError("Menu category or branch information is missing", 400);
        }

        if (user.branch_id) {
          // Staff user
          if (category.branch_id !== user.branch_id) {
            await cleanupUploadedFiles([videoFile, thumbnailFile]);
            throwError("Unauthorized: menu item not in your branch", 403);
          }

          // Get branch info to find restaurant_id
          const branch = await Branch.findByPk(user.branch_id, {
            transaction: t,
          });
          if (!branch) {
            await cleanupUploadedFiles([videoFile, thumbnailFile]);
            throwError("Branch not found", 404);
          }

          branchId = branch.id;
          restaurantId = branch.restaurant_id;
        } else if (user.restaurant_id) {
          // Restaurant admin user
          if (category.restaurant_id !== user.restaurant_id) {
            await cleanupUploadedFiles([videoFile, thumbnailFile]);
            throwError("Unauthorized: menu item not in your restaurant", 403);
          }

          branchId = category.branch_id;
          restaurantId = user.restaurant_id;
        } else {
          await cleanupUploadedFiles([videoFile, thumbnailFile]);
          throwError(
            "Invalid user access: must be linked to restaurant or branch",
            403
          );
        }
      } else {
        // No menu item id given
        if (user.branch_id) {
          const branch = await Branch.findByPk(user.branch_id, {
            transaction: t,
          });
          if (!branch) {
            await cleanupUploadedFiles([videoFile, thumbnailFile]);
            throwError("Branch not found", 404);
          }
          branchId = branch.id;
          restaurantId = branch.restaurant_id;
        } else if (user.restaurant_id) {
          branchId = null;
          restaurantId = user.restaurant_id;
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
          video_url: getFileUrl(VIDEO_UPLOAD_FOLDER, videoFile.filename),
          thumbnail_url: getFileUrl(
            VIDEO_UPLOAD_FOLDER,
            thumbnailFile.filename
          ),
          duration,
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
          video_url: newVideo.video_url,
          thumbnail_url: newVideo.thumbnail_url,
          duration: newVideo.duration,
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
      const filesToDelete = [];

      if (video.video_url) {
        const videoFilename = path.basename(video.video_url);
        filesToDelete.push({
          path: getFilePath(VIDEO_UPLOAD_FOLDER, videoFilename),
        });
      }

      if (video.thumbnail_url) {
        const thumbFilename = path.basename(video.thumbnail_url);
        filesToDelete.push({
          path: getFilePath(VIDEO_UPLOAD_FOLDER, thumbFilename),
        });
      }

      if (filesToDelete.length > 0) {
        await cleanupUploadedFiles(filesToDelete);
      }

      await video.destroy();
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

    let newDuration;

    if (videoFile) {
      const videoPath = getFilePath(VIDEO_UPLOAD_FOLDER, videoFile.filename);
      try {
        newDuration = await getVideoDuration(videoPath);
        if (newDuration > 180) {
          await cleanupUploadedFiles(
            [videoFile, thumbnailFile].filter(Boolean)
          );
          throwError("Video must be 3 minutes or less", 400);
        }
      } catch {
        await cleanupUploadedFiles([videoFile, thumbnailFile].filter(Boolean));
        throwError("Unable to read video duration", 500);
      }
    }

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
        restaurantId = branch.restaurant_id;
      } else {
        if (user.restaurant_id && !user.branch_id) {
          branchId = null;
          restaurantId = user.restaurant_id;
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
          restaurantId = branch.restaurant_id;
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
        const videoFilename = path.basename(video.video_url);
        const oldVideoPath = getFilePath(VIDEO_UPLOAD_FOLDER, videoFilename);
        await fs.unlink(oldVideoPath).catch(() => {});
        video.video_path = videoFile.filename;
        video.duration = newDuration;
        video.video_url = getFileUrl(VIDEO_UPLOAD_FOLDER, videoFile.filename);
      }
      if (thumbnailFile) {
        const thumbFilename = path.basename(video.thumbnail_url);
        const oldThumbnailPath = getFilePath(
          VIDEO_UPLOAD_FOLDER,
          thumbFilename
        );
        await fs.unlink(oldThumbnailPath).catch(() => {});
        video.thumbnail_path = thumbnailFile.filename;
        video.thumbnail_url = getFileUrl(
          VIDEO_UPLOAD_FOLDER,
          thumbnailFile.filename
        );
      }

      if (title !== undefined) video.title = title;
      if (description !== undefined) video.description = description;
      if (menu_item_id !== undefined) video.menu_item_id = menu_item_id;
      if (branchId !== undefined) video.branch_id = branchId;
      if (status !== undefined) video.status = status;
      if (duration !== undefined && !videoFile) video.duration = duration;
      if (is_featured !== undefined) video.is_featured = is_featured;

      await video.save({ transaction: t });
      await t.commit();

      return {
        message: "Video updated successfully",
        data: {
          id: video.id,
          title: video.title,
          description: video.description,
          video_url: video.video_url,
          thumbnail_url: video.thumbnail_url,
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
    const baseWhere = { status: "approved" };
    const customerId = user?.id;

    const includeCommon = [
      {
        model: Restaurant,
        attributes: ["id", "restaurant_name"],
        include: [
          { model: SystemSetting, attributes: ["logo_url"] },
          {
            model: Branch,
            required: false,
            where: { main_branch: true },
            attributes: ["id", "name", "main_branch"],
            include: [
              {
                model: Location,
                attributes: ["address", "latitude", "longitude"],
              },
            ],
          },
        ],
      },
      {
        model: Branch,
        attributes: ["id", "name", "main_branch"],
        include: [
          { model: Location, attributes: ["address", "latitude", "longitude"] },
        ],
      },
      { model: VideoLike, attributes: [] },
      { model: VideoFavorite, attributes: [] },
      { model: VideoComment, attributes: [] },
      {
        model: MenuItem,
        attributes: ["id", "name", "description", "unit_price", "image"],
        include: [
          { model: MenuCategory, attributes: ["id", "name", "description"] },
        ],
      },
    ];

    const baseAttributes = {
      include: [
        [
          sequelize.literal(`(
          SELECT COUNT(*) FROM "video_likes" AS vl
          WHERE vl.video_id = "Video".id
        )`),
          "like_count",
        ],
        [
          sequelize.literal(`(
          SELECT COUNT(*) FROM "video_favorites" AS vf
          WHERE vf.video_id = "Video".id
        )`),
          "favorite_count",
        ],
        [
          sequelize.literal(`(
          SELECT COUNT(*) FROM "video_comments" AS vc
          WHERE vc.video_id = "Video".id
        )`),
          "comment_count",
        ],
      ],
      exclude: ["updated_at"],
    };

    const getVideos = async (where, lim, off) => {
      return await Video.findAll({
        where,
        limit: lim,
        offset: off,
        order: [["created_at", "DESC"]],
        attributes: baseAttributes,
        include: includeCommon,
        group: [
          "Video.id",
          "Restaurant.id",
          "Restaurant->SystemSetting.id",
          "Restaurant->Branches.id",
          "Restaurant->Branches->Location.id",
          "Branch.id",
          "Branch->Location.id",
          "MenuItem.id",
          "MenuItem->MenuCategory.id",
        ],
        subQuery: false,
      });
    };

    let combinedVideos = [];

    if (customerId) {
      const seenIds = await VideoView.findAll({
        where: { customer_id: customerId },
        attributes: ["video_id"],
      }).then((rows) => rows.map((r) => r.video_id));

      const unseen = await getVideos(
        { ...baseWhere, id: { [Op.notIn]: seenIds } },
        limit,
        0
      );

      const remaining = limit - unseen.length;
      let seen = [];

      if (remaining > 0 && seenIds.length) {
        seen = await getVideos(
          { ...baseWhere, id: { [Op.in]: seenIds } },
          remaining,
          (page - 1) * remaining
        );
      }

      combinedVideos = [...unseen, ...seen];

      const videoIds = combinedVideos.map((v) => v.id);
      const restaurantIds = combinedVideos
        .map((v) => v.Restaurant?.id)
        .filter(Boolean);

      const [liked, favorited, followed] = await Promise.all([
        VideoLike.findAll({
          where: { customer_id: customerId, video_id: { [Op.in]: videoIds } },
          attributes: ["video_id"],
        }),
        VideoFavorite.findAll({
          where: { customer_id: customerId, video_id: { [Op.in]: videoIds } },
          attributes: ["video_id"],
        }),
        RestaurantFollower.findAll({
          where: {
            customer_id: customerId,
            restaurant_id: { [Op.in]: restaurantIds },
          },
          attributes: ["restaurant_id"],
        }),
      ]);

      const likedMap = new Set(liked.map((r) => r.video_id));
      const favoritedMap = new Set(favorited.map((r) => r.video_id));
      const followedMap = new Set(followed.map((r) => r.restaurant_id));

      combinedVideos = combinedVideos.map((v) => {
        const video = v.toJSON();
        video.is_liked_by_user = likedMap.has(video.id);
        video.is_favorited_by_user = favoritedMap.has(video.id);
        video.is_followed_by_user = video.Restaurant
          ? followedMap.has(video.Restaurant.id)
          : false;

        if (video.Branch?.Location) {
          video.location = video.Branch.Location;
        } else if (video.Restaurant?.Branches?.length) {
          const mainBranch = video.Restaurant.Branches.find(
            (b) => b.main_branch
          );
          if (mainBranch?.Location) video.location = mainBranch.Location;
        }

        return video;
      });
    } else {
      const { count, rows } = await Video.findAndCountAll({
        where: baseWhere,
        limit,
        offset,
        order: [["created_at", "DESC"]],
        attributes: baseAttributes,
        include: includeCommon,
        group: [
          "Video.id",
          "Restaurant.id",
          "Restaurant->SystemSetting.id",
          "Restaurant->Branches.id",
          "Restaurant->Branches->Location.id",
          "Branch.id",
          "Branch->Location.id",
          "MenuItem.id",
          "MenuItem->MenuCategory.id",
        ],
        subQuery: false,
      });

      combinedVideos = rows.map((v) => {
        const video = v.toJSON();

        if (video.Branch?.Location) {
          video.location = video.Branch.Location;
        } else if (video.Restaurant?.Branches?.length) {
          const mainBranch = video.Restaurant.Branches.find(
            (b) => b.main_branch
          );
          if (mainBranch?.Location) video.location = mainBranch.Location;
        }

        video.is_followed_by_user = false;
        video.is_liked_by_user = false;
        video.is_favorited_by_user = false;

        return video;
      });
    }

    const totalCount = await Video.count({ where: baseWhere });

    return {
      total: totalCount,
      page: Number(page),
      limit: Number(limit),
      has_next_page: offset + combinedVideos.length < totalCount,
      rows: combinedVideos,
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
          comment_text: commentText.trim(),
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
