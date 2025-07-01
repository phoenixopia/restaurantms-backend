const cloudinary = require('cloudinary').v2;
// import { v2 as cloudinary } from 'cloudinary';
require('dotenv').config();

const { CLOUD_NAME, API_KEY, API_SECRET } = process.env;

if(!CLOUD_NAME || !API_KEY || !API_SECRET){
  throw new Error("No Credintial on environment.");
}

cloudinary.config({ 
    cloud_name: process.env.CLOUD_NAME, 
    api_key: process.env.API_KEY, 
    api_secret: process.env.API_SECRET,
    secure: true
  });

// Helper to extract public_id from full Cloudinary URL
function getPublicIdFromUrl(url) {
  const parts = url.split('/');
  const fileNameWithExtension = parts[parts.length - 1]; // image.jpg
  const publicIdWithFolder = parts.slice(parts.indexOf('upload') + 1).join('/'); // folder/image.jpg
  return publicIdWithFolder.replace(/\.[^/.]+$/, ""); // remove .jpg or .png
}

module.exports = { cloudinary, getPublicIdFromUrl };