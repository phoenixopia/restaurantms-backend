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

  
  module.exports = cloudinary;