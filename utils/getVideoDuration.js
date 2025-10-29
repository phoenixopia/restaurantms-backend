// const ffmpeg = require("fluent-ffmpeg");
// const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
// const ffprobePath = require("@ffprobe-installer/ffprobe").path;

// ffmpeg.setFfmpegPath(ffmpegPath);
// ffmpeg.setFfprobePath(ffprobePath);

// module.exports = function getVideoDuration(filePath) {
//   return new Promise((resolve, reject) => {
//     ffmpeg.ffprobe(filePath, (err, metadata) => {
//       if (err) {
//         return reject(err);
//       }

//       const duration = Math.floor(metadata.format.duration);
//       resolve(duration);
//     });
//   });
// };


const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;

let ffprobePath;

try {
  // Use the wrapper package to get the platform binary
  ffprobePath = require("@ffprobe-installer/ffprobe").path;
} catch (err) {
  console.warn("⚠️ ffprobe binary not found via wrapper. Falling back to system ffprobe if available.");
  ffprobePath = "/usr/bin/ffprobe"; // fallback path (Linux default)
}

// Set paths for ffmpeg and ffprobe
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

/**
 * Returns the duration of a video file in seconds
 * @param {string} filePath - path to the video file
 * @returns {Promise<number>} - duration in seconds
 */
module.exports = function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error("Error reading video duration:", err.message);
        return reject(err);
      }

      const duration = Math.floor(metadata.format.duration);
      resolve(duration);
    });
  });
};
