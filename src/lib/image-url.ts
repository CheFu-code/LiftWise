export function imageUrl(uri: string, width = 960) {
  try {
    const url = new URL(uri);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "res.cloudinary.com" ||
      url.pathname.includes("/s--")
    )
      return uri;
    return uri.replace(
      "/image/upload/",
      `/image/upload/f_auto,q_auto,w_${width},c_limit/`,
    );
  } catch {
    return uri;
  }
}
