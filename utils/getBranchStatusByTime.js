const getBranchStatusByTime = (openingTime, closingTime) => {
  const now = new Date();
  const [openHour, openMinute] = openingTime.split(":").map(Number);
  const [closeHour, closeMinute] = closingTime.split(":").map(Number);

  const openTime = new Date(now);
  openTime.setHours(openHour, openMinute, 0);

  const closeTime = new Date(now);
  closeTime.setHours(closeHour, closeMinute, 0);

  if (closeTime <= openTime) {
    if (now >= openTime || now <= closeTime) {
      return "active";
    }
  } else {
    if (now >= openTime && now <= closeTime) {
      return "active";
    }
  }

  return "inactive";
};

module.exports = getBranchStatusByTime;
