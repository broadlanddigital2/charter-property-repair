export const saveImagesToSessionStorage = (productName: string, imageUrl: string): void => {
  const cache = JSON.parse(sessionStorage.getItem("productImages") || "{}");
  cache[productName] = imageUrl;
  sessionStorage.setItem("productImages", JSON.stringify(cache));
};

export const getImageFromSessionStorage = (productName: string): string | null => {
  const cache = JSON.parse(sessionStorage.getItem("productImages") || "{}");
  return cache[productName] || null;
};
