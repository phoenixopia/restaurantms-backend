const validateImageUrls = (images) => {
  if (!Array.isArray(images)) return false;
  return images.every((url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  });
};
