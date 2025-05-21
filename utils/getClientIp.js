const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    forwarded?.split(",")[0].trim() || req.socket?.remoteAddress || req.ip;
  return ip === "::1" ? "127.0.0.1" : ip;
};

module.exports = getClientIp;
