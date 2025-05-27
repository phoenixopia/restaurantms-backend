exports.getUser = async (req, res) => {
  try {
    const user = req.user;

    return res.status(200).json({
      success: true,
      message: "User info fetched successfully.",
      data: {
        ...user.toJSON(),
        role: user.Role?.name || null,
        permissions:
          user.Role?.RolePermissions?.map((rp) => rp.Permission?.name) || [],
      },
    });
  } catch (error) {
    console.error("Get User Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while getting user data.",
    });
  }
};
