export const chunkArray = <T>(arr: T[], chunkSize: number) => {
  const chunkedArr: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunkedArr.push(arr.slice(i, i + chunkSize));
  }
  return chunkedArr;
};

export const capitalizeFirstLetter = (word: string) => {
  return word.charAt(0).toUpperCase() + word.slice(1);
}