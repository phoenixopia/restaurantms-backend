"use strict";

/* ----------------------------- Core Imports ----------------------------- */
const fs = require("fs/promises");
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
const { getFileUrl, getFilePath } = require("../../utils/file");
const getVideoDuration = require("../../utils/getVideoDuration");

/* ------------------------------ Services ------------------------------- */
const FollowService = require("./follow_service");

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

    if (user.restaurant_id && !user.branch_id) {
      where.restaurant_id = user.restaurant_id;
      if (branch_id) where.branch_id = branch_id;
    } else if (user.branch_id) {
      where.branch_id = user.branch_id;
    }

    if (title) where.title = { [Op.iLike]: `%${title}%` };
    if (status) where.status = status;
    if (menu_item_id) where.menu_item_id = menu_item_id;

    if (date === "daily")
      where.created_at = { [Op.gte]: sequelize.literal(`CURRENT_DATE`) };
    if (date === "weekly")
      where.created_at = {
        [Op.gte]: sequelize.literal(`CURRENT_DATE - interval '7 days'`),
      };
    if (date === "monthly")
      where.created_at = {
        [Op.gte]: sequelize.literal(`CURRENT_DATE - interval '1 month'`),
      };

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

    const attributes = {
      include: [
        [fn("COUNT", col("VideoLikes.id")), "like_count"],
        [fn("COUNT", col("VideoFavorites.id")), "favorite_count"],
        [fn("COUNT", col("VideoComments.id")), "comment_count"],
        [fn("COUNT", col("VideoViews.id")), "view_count"],
      ],
    };

    let order = [["created_at", "DESC"]];
    const sortMap = {
      views: literal('"view_count"'),
      likes: literal('"like_count"'),
      favorites: literal('"favorite_count"'),
      comments: literal('"comment_count"'),
      created_at: col("created_at"),
    };
    if (sortMap[sortBy]) order = [[sortMap[sortBy], sortOrder]];

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

    const total = await Video.count({ where });

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      has_next_page: offset + videos.length < total,
      rows: videos,
    };
  },

  async getAllVideosForAdmin(filters) {
    const { page = 1, limit = 10, status, title, restaurant_name } = filters;

    const offset = (page - 1) * limit;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (title) {
      where.title = { [Op.iLike]: `%${title}%` }; // Postgres only
    }

    const restaurantWhere = {};
    if (restaurant_name) {
      restaurantWhere.restaurant_name = { [Op.iLike]: `%${restaurant_name}%` };
    }

    const videos = await Video.findAndCountAll({
      where,
      include: [
        {
          model: Restaurant,
          attributes: ["id", "restaurant_name"],
          where: Object.keys(restaurantWhere).length
            ? restaurantWhere
            : undefined,
          include: [
            {
              model: SystemSetting,
              attributes: ["logo_url"],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: Number(limit),
      offset,
    });

    return {
      total: videos.count,
      page: Number(page),
      limit: Number(limit),
      total_pages: Math.ceil(videos.count / limit),
      rows: videos.rows,
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

    const stats = await FollowService.getRestaurantStats(restaurantId);

    return {
      restaurant_id: restaurantId,
      stats,
    };
  },

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

    if (!user.restaurant_id && !user.branch_id) {
      await cleanupUploadedFiles([videoFile, thumbnailFile].filter(Boolean));
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

        if (user.restaurant_id) {
          if (category.restaurant_id !== user.restaurant_id) {
            await cleanupUploadedFiles([videoFile, thumbnailFile]);
            throwError("Unauthorized: menu item not in your restaurant", 403);
          }
          restaurantId = user.restaurant_id;
          branchId = category.branch_id;
        } else if (user.branch_id) {
          const branch = await Branch.findByPk(user.branch_id, {
            transaction: t,
          });
          if (!branch) {
            await cleanupUploadedFiles([videoFile, thumbnailFile]);
            throwError("Branch not found", 404);
          }
          if (category.restaurant_id !== branch.restaurant_id) {
            await cleanupUploadedFiles([videoFile, thumbnailFile]);
            throwError("Unauthorized: menu item not in your restaurant", 403);
          }
          restaurantId = branch.restaurant_id;
          branchId = category.branch_id;
        }
      } else {
        if (user.branch_id) {
          const branch = await Branch.findByPk(user.branch_id, {
            transaction: t,
          });
          if (!branch) {
            await cleanupUploadedFiles([videoFile, thumbnailFile]);
            throwError("Branch not found", 404);
          }
          restaurantId = branch.restaurant_id;
          branchId = branch.id;
        } else if (user.restaurant_id) {
          restaurantId = user.restaurant_id;
          branchId = null;
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

      await UploadedFile.create(
        {
          restaurant_id: restaurantId,
          path: getFileUrl(VIDEO_UPLOAD_FOLDER, videoFile.filename),
          size_mb: videoFile.size / (1024 * 1024),
          uploaded_by: user.id,
          type: "video",
          reference_id: newVideo.id,
        },
        { transaction: t }
      );

      await UploadedFile.create(
        {
          restaurant_id: restaurantId,
          path: getFileUrl(VIDEO_UPLOAD_FOLDER, thumbnailFile.filename),
          size_mb: thumbnailFile.size / (1024 * 1024),
          uploaded_by: user.id,
          type: "video-thumbnail",
          reference_id: newVideo.id,
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
        if (filesToDelete.length > 0) {
          await cleanupUploadedFiles(filesToDelete);
        }

        await UploadedFile.destroy({
          where: {
            reference_id: video.id,
            type: { [Op.in]: ["video", "video-thumbnail"] },
          },
          transaction: t,
        });

        await video.destroy({ transaction: t });

        await t.commit();
      } catch (err) {
        await t.rollback();
        throw err;
      }
    }

    return video;
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

        if (user.restaurant_id) {
          if (category.restaurant_id !== user.restaurant_id) {
            throwError("Unauthorized: menu item not in your restaurant", 403);
          }
          restaurantId = user.restaurant_id;
          branchId = category.branch_id;
        } else if (user.branch_id) {
          const branch = await Branch.findByPk(user.branch_id, {
            transaction: t,
          });
          if (!branch) throwError("Branch not found", 404);

          if (category.restaurant_id !== branch.restaurant_id) {
            throwError("Unauthorized: menu item not in your restaurant", 403);
          }
          restaurantId = branch.restaurant_id;
          branchId = category.branch_id;
        }
      } else {
        if (user.restaurant_id && !user.branch_id) {
          if (branch_id) {
            const branch = await Branch.findByPk(branch_id, { transaction: t });
            if (!branch) throwError("Branch not found", 404);

            if (branch.restaurant_id !== user.restaurant_id) {
              throwError("Unauthorized: branch not in your restaurant", 403);
            }
            branchId = branch.id;
            restaurantId = branch.restaurant_id;
          } else {
            branchId = null;
            restaurantId = user.restaurant_id;
          }
        } else if (user.branch_id) {
          const branch = await Branch.findByPk(user.branch_id, {
            transaction: t,
          });
          if (!branch) throwError("Branch not found", 404);
          branchId = branch.id;
          restaurantId = branch.restaurant_id;
        } else {
          throwError("Invalid user access", 403);
        }
      }

      if (videoFile) {
        const newVideoPath = getFilePath(
          VIDEO_UPLOAD_FOLDER,
          videoFile.filename
        );
        const newDuration = await getVideoDuration(newVideoPath);
        if (newDuration > 180) {
          await cleanupUploadedFiles(
            [videoFile, thumbnailFile].filter(Boolean)
          );
          throwError("Video must be 3 minutes or less", 400);
        }

        if (video.video_url) {
          const oldVideoFilename = path.basename(video.video_url);
          await fs
            .unlink(getFilePath(VIDEO_UPLOAD_FOLDER, oldVideoFilename))
            .catch(() => {});
        }

        await UploadedFile.destroy({
          where: { reference_id: video.id, type: "video" },
          transaction: t,
        });

        await UploadedFile.create(
          {
            restaurant_id: restaurantId,
            path: getFileUrl(VIDEO_UPLOAD_FOLDER, videoFile.filename),
            size_mb: videoFile.size / (1024 * 1024),
            uploaded_by: user.id,
            type: "video",
            reference_id: video.id,
          },
          { transaction: t }
        );

        video.video_url = getFileUrl(VIDEO_UPLOAD_FOLDER, videoFile.filename);
        video.duration = newDuration;
      }

      if (thumbnailFile) {
        if (video.thumbnail_url) {
          const oldThumbFilename = path.basename(video.thumbnail_url);
          await fs
            .unlink(getFilePath(VIDEO_UPLOAD_FOLDER, oldThumbFilename))
            .catch(() => {});
        }

        await UploadedFile.destroy({
          where: { reference_id: video.id, type: "video-thumbnail" },
          transaction: t,
        });

        await UploadedFile.create(
          {
            restaurant_id: restaurantId,
            path: getFileUrl(VIDEO_UPLOAD_FOLDER, thumbnailFile.filename),
            size_mb: thumbnailFile.size / (1024 * 1024),
            uploaded_by: user.id,
            type: "video-thumbnail",
            reference_id: video.id,
          },
          { transaction: t }
        );

        video.thumbnail_url = getFileUrl(
          VIDEO_UPLOAD_FOLDER,
          thumbnailFile.filename
        );
      }

      await video.update(
        {
          title: title ?? video.title,
          description: description ?? video.description,
          restaurant_id: restaurantId,
          branch_id: branchId,
          menu_item_id: menu_item_id || null,
        },
        { transaction: t }
      );

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
      await cleanupUploadedFiles(filesToDelete);

      await UploadedFile.destroy({
        where: {
          reference_id: video.id,
          type: { [Op.in]: ["video", "video-thumbnail"] },
        },
        transaction: t,
      });

      await video.destroy({ transaction: t });

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
