const ImageGalleryService = require("../../services/admin/image_gallery_serivce");
const asyncHandler = require("../../utils/asyncHandler");
const { success } = require("../../utils/apiResponse");

exports.uploadImageGalleryFiles = asyncHandler(async (req, res) => {
  const restaurantId = req.user.restaurant_id;
  const captions = req.body.captions ? JSON.parse(req.body.captions) : [];
  const files = req.files;

  const images = await ImageGalleryService.uploadImage({
    files,
    captions,
    restaurant_id: restaurantId,
  });

  return success(res, "Images uploaded to gallery successfully", images, 201);
});

exports.getImageGalleryById = asyncHandler(async (req, res) => {
  const restaurantId = req.user.restaurant_id;
  const imageId = req.params.id;

  const image = await ImageGalleryService.getImageById({
    id: imageId,
    restaurant_id: restaurantId,
  });

  return success(res, "Image fetched successfully", image);
});
// what is the
exports.listImageGallery = asyncHandler(async (req, res) => {
  const restaurantId = req.user.restaurant_id;
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;

  const images = await ImageGalleryService.listImages({
    restaurant_id: restaurantId,
    page,
    limit,
  });

  return success(res, "Images retrieved successfully", images);
});

exports.updateImageGalleryFile = asyncHandler(async (req, res) => {
  const restaurantId = req.user.restaurant_id;
  const imageId = req.params.id;
  const file = req.file;
  const caption = req.body.caption;

  const updatedImage = await ImageGalleryService.updateImageById({
    id: imageId,
    restaurant_id: restaurantId,
    file,
    caption,
  });

  return success(res, "Image updated successfully", updatedImage);
});
