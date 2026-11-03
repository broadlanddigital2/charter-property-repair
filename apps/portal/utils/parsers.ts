export const parseImageURL = (imageURL: string) => {
  // some image urls start without protocol
  if (!imageURL.startsWith("http")) {
    return `https:${imageURL}`
  }

  return imageURL;
}