// generate token
exports.sendTokenResponse = async (user, statusCode, res) => {
    try {
        const token = await user.getJwtToken();
        const cookieOptions = {
          httpOnly: true,
          // secure: true, // Only in HTTPS
          // sameSite: 'None', 
          secure: false, // only for local dev!
          sameSite: 'Lax', // or 'None' if secure is true
          maxAge: 8 * 60 * 60 * 1000, // 8 hours
        };
        return res.status(statusCode)
            .cookie('token', token, cookieOptions)
            .json({
                success: true,
                data: {
                  id: user.id,
                  // role: user.role,
                  token,
                }
            });
    } catch (error) {
      console.error('Error generating token:', error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  };
  