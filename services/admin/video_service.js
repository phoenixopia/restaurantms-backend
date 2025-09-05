"use strict";

/* ----------------------------- Core Imports ----------------------------- */
const fs = require("fs/promises");
const fsSync = require("fs"); // classic fs
const path = require("path");

/* ---------------------------- Third-Party Libs -------------------------- */
const { Op, fn, col, literal } = require("sequelize");

/* ------------------------------- Models -------------------------------- */
const {
  Restaurant,
  SystemSetting,
  UploadedFile,
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

/* ------------------------------- Utils --------------------------------- */
const throwError = require("../../utils/throwError");
const cleanupUploadedFiles = require("../../utils/cleanUploadedFiles");
const {
  getFileUrl,
  getFilePath,
  ensureFolder,
  fileExists,
  getFFprobePath,
} = require("../../utils/file");
const logActivity = require("../../utils/logActivity");

const getVideoDuration = require("../../utils/getVideoDuration");

/* ------------------------------ Services ------------------------------- */
const FollowService = require("./follow_service");
const SendNotification = require("../../utils/send_notification");

/* ------------------------------ Constants ------------------------------ */
const VIDEO_UPLOAD_FOLDER = "videos";

/* --------------------------- Video Service ----------------------------- */

const VideoService = {
  async getAllVideos(user, filters) {
    const {
      page = 1,
      limit = 10,
      title,
      date,
      status,
      branch_id,
      menu_item_id,
      sortBy = "created_at",
      sortOrder = "DESC",
    } = filters;

    const offset = (page - 1) * limit;

    const where = {};

    // scope by restaurant/branch
    if (user.restaurant_id && !user.branch_id) {
      where.restaurant_id = user.restaurant_id;
      if (branch_id) where.branch_id = branch_id;
    } else if (user.branch_id) {
      where.branch_id = user.branch_id;
    }

    // filters
    if (title) where.title = { [Op.iLike]: `%${title}%` };
    if (status) where.status = status;
    if (menu_item_id) where.menu_item_id = menu_item_id;

    // date filter (use Video.created_at to avoid ambiguity)
    if (date === "daily") {
      where["$Video.created_at$"] = {
        [Op.gte]: sequelize.literal(`CURRENT_DATE`),
      };
    }
    if (date === "weekly") {
      where["$Video.created_at$"] = {
        [Op.gte]: sequelize.literal(`CURRENT_DATE - interval '7 days'`),
      };
    }
    if (date === "monthly") {
      where["$Video.created_at$"] = {
        [Op.gte]: sequelize.literal(`CURRENT_DATE - interval '1 month'`),
      };
    }

    // relations
    const include = [
      { model: VideoLike, attributes: [] },
      { model: VideoFavorite, attributes: [] },
      { model: VideoComment, attributes: [] },
      { model: VideoView, attributes: [] },
      {
        model: MenuItem,
        attributes: ["id", "name", "description", "unit_price", "image"],
        include: [{ model: MenuCategory, attributes: ["id", "name"] }],
      },
      { model: Branch, attributes: ["id", "name"] },
    ];

    // counts
    const attributes = {
      include: [
        [fn("COUNT", col("VideoLikes.id")), "like_count"],
        [fn("COUNT", col("VideoFavorites.id")), "favorite_count"],
        [fn("COUNT", col("VideoComments.id")), "comment_count"],
        [fn("COUNT", col("VideoViews.id")), "view_count"],
      ],
    };

    // ordering
    let order = [["Video", "created_at", "DESC"]];
    const sortMap = {
      views: literal('"view_count"'),
      likes: literal('"like_count"'),
      favorites: literal('"favorite_count"'),
      comments: literal('"comment_count"'),
      created_at: col("Video.created_at"),
    };
    if (sortMap[sortBy]) order = [[sortMap[sortBy], sortOrder]];

    // fetch videos
    const videos = await Video.findAll({
      where,
      attributes,
      include,
      group: [
        "Video.id",
        "MenuItem.id",
        "MenuItem->MenuCategory.id",
        "Branch.id",
      ],
      order,
      limit,
      offset,
      subQuery: false,
    });

    // total count
    const total = await Video.count({ where });

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      total_pages: Math.ceil(total / limit),
      rows: videos,
    };
  },
  async getVideoStatsOverview() {
    const totalVideos = await Video.count();
    const totalComments = await VideoComment.count();
    const totalLikes = await VideoLike.count();
    const totalFavorites = await VideoFavorite.count();
    const totalViews = await VideoView.count();

    return {
      totalVideos,
      totalComments,
      totalLikes,
      totalFavorites,
      totalViews,
    };
  },

  async getProfileData(user) {
    let restaurantId;

    if (user.restaurant_id && !user.branch_id) {
      restaurantId = user.restaurant_id;
    } else if (user.branch_id) {
      const branch = await Branch.findByPk(user.branch_id);
      if (!branch) throwError("Branch not found", 404);

      restaurantId = branch.restaurant_id;
    } else {
      throwError("Invalid user access", 403);
    }

    const stats = await FollowService.getRestaurantFullStats(restaurantId);

    return {
      restaurant_id: restaurantId,
      stats,
    };
  },

  async uploadVideo(user, body, files = {}) {
    const { title, description, menu_item_id, branch_id } = body;
    const videoFile = files.video?.[0];
    const thumbnailFile = files.thumbnail?.[0];

    if (!videoFile || !thumbnailFile) {
      await cleanupUploadedFiles([videoFile, thumbnailFile].filter(Boolean));
      throwError("Missing required fildes", 400);
    }

    if (!body.title) {
      await cleanupUploadedFiles([videoFile, thumbnailFile]);
      throwError("Title is required", 400);
    }

    await ensureFolder(VIDEO_UPLOAD_FOLDER);

    const videoPath = getFilePath(VIDEO_UPLOAD_FOLDER, videoFile.filename);
    const thumbPath = getFilePath(VIDEO_UPLOAD_FOLDER, thumbnailFile.filename);
    console.log("Video path:", videoPath);
    console.log("Thumbnail path:", thumbPath);

    if (
      !(await fileExists(VIDEO_UPLOAD_FOLDER, videoFile.filename)) ||
      !(await fileExists(VIDEO_UPLOAD_FOLDER, thumbnailFile.filename))
    ) {
      await cleanupUploadedFiles([videoFile, thumbnailFile].filter(Boolean));
      throwError("Video or thumbnail file does not exist", 400);
    }

    let duration;
    try {
      console.log("Video path:", videoPath);
      console.log("Thumbnail path:", thumbPath);

      duration = await getVideoDuration(videoPath);
      if (duration > 180) {
        await cleanupUploadedFiles([videoFile, thumbnailFile]);
        throwError("Video must be 3 minutes or less", 400);
      }
    } catch (err) {
      console.error("Error reading video duration:", err);
      await cleanupUploadedFiles([videoFile, thumbnailFile]);
      throwError("Unable to read video duration", 500);
    }

    if (!user.restaurant_id && !user.branch_id) {
      await cleanupUploadedFiles([videoFile, thumbnailFile]);
      throwError("Invalid user access", 403);
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
        if (!category) {
          await cleanupUploadedFiles([videoFile, thumbnailFile]);
          throwError("Menu category is missing", 400);
        }

        // Authorization check
        if (
          user.restaurant_id &&
          category.restaurant_id !== user.restaurant_id
        ) {
          await cleanupUploadedFiles([videoFile, thumbnailFile]);
          throwError("Unauthorized: menu item not in your restaurant", 403);
        }
        if (user.branch_id) {
          const branch = await Branch.findByPk(user.branch_id, {
            transaction: t,
          });
          if (!branch || category.restaurant_id !== branch.restaurant_id) {
            await cleanupUploadedFiles([videoFile, thumbnailFile]);
            throwError("Unauthorized: menu item not in your branch", 403);
          }
        }

        restaurantId = category.restaurant_id;
        branchId = category.branch_id;
      } else if (branch_id || user.branch_id) {
        const branch = await Branch.findByPk(branch_id || user.branch_id, {
          transaction: t,
        });
        if (!branch) {
          await cleanupUploadedFiles([videoFile, thumbnailFile]);
          throwError("Branch not found", 404);
        }
        restaurantId = branch.restaurant_id;
        branchId = branch.id;
      } else {
        restaurantId = user.restaurant_id;
        branchId = null;
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

      await UploadedFile.bulkCreate(
        [
          {
            restaurant_id: restaurantId,
            path: `videos/${videoFile.filename}`,
            size_mb: parseFloat((videoFile.size / (1024 * 1024)).toFixed(2)),
            uploaded_by: user.id,
            type: "video",
            reference_id: newVideo.id,
          },
          {
            restaurant_id: restaurantId,
            path: `videos/${thumbnailFile.filename}`,
            size_mb: parseFloat(
              (thumbnailFile.size / (1024 * 1024)).toFixed(2)
            ),
            uploaded_by: user.id,
            type: "video-thumbnail",
            reference_id: newVideo.id,
          },
        ],
        { transaction: t }
      );

      await logActivity({
        user_id: user.id,
        module: "Video",
        action: "Create",
        details: {
          id: newVideo.id,
          title: newVideo.title,
          restaurant_id: restaurantId,
          branch_id: branchId,
        },
        transaction: t,
      });

      await t.commit();

      await SendNotification.sendVideoUploadedNotification(newVideo, user.id);

      return {
        id: newVideo.id,
        title: newVideo.title,
        description: newVideo.description,
        video_url: newVideo.video_url,
        thumbnail_url: newVideo.thumbnail_url,
        duration: newVideo.duration,
        status: newVideo.status,
      };
    } catch (err) {
      await t.rollback();
      await cleanupUploadedFiles([videoFile, thumbnailFile].filter(Boolean));
      throw err;
    }
  },

  async updateVideoStatus(videoId, newStatus, user) {
    const t = await sequelize.transaction();
    try {
      const video = await Video.findByPk(videoId, { transaction: t });
      if (!video) throwError("Video not found", 404);

      const oldStatus = video.status;
      video.status = newStatus;
      await video.save({ transaction: t });

      await logActivity({
        user_id: user.id,
        module: "Video",
        action: "Update Status",
        details: {
          id: video.id,
          title: video.title,
          before: oldStatus,
          after: newStatus,
        },
        transaction: t,
      });

      await t.commit();
      await SendNotification.sendVideoStatusUpdateNotification(
        video,
        newStatus,
        user.id
      );
      return video;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async deleteOldFile(fileUrl) {
    if (!fileUrl) return;
    const filename = path.basename(fileUrl);
    const filePath = getFilePath(VIDEO_UPLOAD_FOLDER, filename);

    try {
      if (await fileExists(VIDEO_UPLOAD_FOLDER, filename)) {
        await fsSync.promises.unlink(filePath);
        console.log("Deleted old file:", filename);
      } else {
        console.log("Old file not found:", filename);
      }
    } catch (err) {
      console.error("Error deleting old file:", filename, err);
    }
  },

  async updateVideo(user, videoId, body, files = {}) {
    const { title, description, menu_item_id, branch_id } = body;
    const videoFile = files.video?.[0];
    const thumbnailFile = files.thumbnail?.[0];

    const video = await Video.findByPk(videoId);
    if (!video) throwError("Video not found", 404);

    const t = await sequelize.transaction();
    try {
      let restaurantId = null;
      let branchId = null;

      // Resolve restaurant & branch IDs
      if (menu_item_id) {
        const menuItem = await MenuItem.findByPk(menu_item_id, {
          include: {
            model: MenuCategory,
            attributes: ["id", "branch_id", "restaurant_id"],
          },
          transaction: t,
        });
        if (!menuItem) throwError("Menu item not found", 404);
        const category = menuItem.MenuCategory;
        if (!category) throwError("Menu category missing", 400);

        if (user.restaurant_id && category.restaurant_id !== user.restaurant_id)
          throwError("Unauthorized: menu item not in your restaurant", 403);
        if (user.branch_id) {
          const branch = await Branch.findByPk(user.branch_id, {
            transaction: t,
          });
          if (!branch || category.restaurant_id !== branch.restaurant_id)
            throwError("Unauthorized: menu item not in your branch", 403);
        }

        restaurantId = category.restaurant_id;
        branchId = category.branch_id;
      } else if (branch_id || user.branch_id) {
        const branch = await Branch.findByPk(branch_id || user.branch_id, {
          transaction: t,
        });
        if (!branch) throwError("Branch not found", 404);
        restaurantId = branch.restaurant_id;
        branchId = branch.id;
      } else {
        restaurantId = user.restaurant_id;
        branchId = null;
      }

      // Track changes for logging
      const changes = {};

      // Handle video file replacement
      if (videoFile) {
        const newVideoPath = getFilePath(
          VIDEO_UPLOAD_FOLDER,
          videoFile.filename
        );
        const newDuration = await getVideoDuration(newVideoPath);
        if (newDuration > 180)
          throwError("Video must be 3 minutes or less", 400);

        await this.deleteOldFile(video.video_url);

        await UploadedFile.destroy({
          where: { reference_id: video.id, type: "video" },
          transaction: t,
        });
        await UploadedFile.create(
          {
            restaurant_id: restaurantId,
            path: `videos/${videoFile.filename}`,
            size_mb: parseFloat((videoFile.size / (1024 * 1024)).toFixed(2)),
            uploaded_by: user.id,
            type: "video",
            reference_id: video.id,
          },
          { transaction: t }
        );

        changes.video_url = {
          before: video.video_url,
          after: getFileUrl(VIDEO_UPLOAD_FOLDER, videoFile.filename),
        };
        changes.duration = { before: video.duration, after: newDuration };

        video.video_url = changes.video_url.after;
        video.duration = newDuration;
      }

      // Handle thumbnail replacement
      if (thumbnailFile) {
        await this.deleteOldFile(video.thumbnail_url);

        await UploadedFile.destroy({
          where: { reference_id: video.id, type: "video-thumbnail" },
          transaction: t,
        });
        await UploadedFile.create(
          {
            restaurant_id: restaurantId,
            path: `videos/${thumbnailFile.filename}`,
            size_mb: parseFloat(
              (thumbnailFile.size / (1024 * 1024)).toFixed(2)
            ),
            uploaded_by: user.id,
            type: "video-thumbnail",
            reference_id: video.id,
          },
          { transaction: t }
        );

        changes.thumbnail_url = {
          before: video.thumbnail_url,
          after: getFileUrl(VIDEO_UPLOAD_FOLDER, thumbnailFile.filename),
        };
        video.thumbnail_url = changes.thumbnail_url.after;
      }

      // Update video record
      const updatedFields = {
        title: title ?? video.title,
        description: description ?? video.description,
        restaurant_id: restaurantId,
        branch_id: branchId,
        menu_item_id: menu_item_id || null,
      };

      // Track title/description changes
      if (video.title !== updatedFields.title)
        changes.title = { before: video.title, after: updatedFields.title };
      if (video.description !== updatedFields.description)
        changes.description = {
          before: video.description,
          after: updatedFields.description,
        };

      await video.update(updatedFields, { transaction: t });

      // Log the update
      if (Object.keys(changes).length > 0) {
        await logActivity({
          user_id: user.id,
          module: "Video",
          action: "Update",
          details: { video_id: video.id, changes },
          transaction: t,
        });
      }

      await t.commit();

      return {
        message: "Video updated successfully",
        data: {
          id: video.id,
          title: video.title,
          description: video.description,
          video_url: video.video_url,
          thumbnail_url: video.thumbnail_url,
          duration: video.duration,
          status: video.status,
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

    // Authorization check
    if (user.restaurant_id && !user.branch_id) {
      if (video.restaurant_id !== user.restaurant_id) {
        throwError("Unauthorized: video not in your restaurant", 403);
      }
    } else if (user.branch_id) {
      if (video.branch_id !== user.branch_id) {
        throwError("Unauthorized: video not in your branch", 403);
      }
    } else {
      throwError("Invalid user access", 403);
    }

    const t = await sequelize.transaction();
    try {
      const filesToDelete = [];
      if (video.video_url) {
        filesToDelete.push({
          path: getFilePath(
            VIDEO_UPLOAD_FOLDER,
            path.basename(video.video_url)
          ),
        });
      }
      if (video.thumbnail_url) {
        filesToDelete.push({
          path: getFilePath(
            VIDEO_UPLOAD_FOLDER,
            path.basename(video.thumbnail_url)
          ),
        });
      }
      if (filesToDelete.length) {
        await cleanupUploadedFiles(filesToDelete);
      }

      await Promise.all([
        VideoLike.destroy({ where: { video_id: video.id }, transaction: t }),
        VideoFavorite.destroy({
          where: { video_id: video.id },
          transaction: t,
        }),
        VideoComment.destroy({ where: { video_id: video.id }, transaction: t }),
        VideoView.destroy({ where: { video_id: video.id }, transaction: t }),
        UploadedFile.destroy({
          where: {
            reference_id: video.id,
            type: { [Op.in]: ["video", "video-thumbnail"] },
          },
          transaction: t,
        }),
      ]);
      await SendNotification.sendVideoDeletedNotification(video, user.id);
      await video.destroy({ transaction: t });
      await logActivity({
        user_id: user.id,
        module: "Video",
        action: "Delete",
        details: {
          id: video.id,
          title: video.title,
        },
        transaction: t,
      });

      await t.commit();

      return {
        message: "Video deleted successfully",
        data: {
          id: video.id,
          title: video.title,
        },
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  // customer side

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
          attributes: ["id", "first_name", "last_name", "profile_picture"],
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
