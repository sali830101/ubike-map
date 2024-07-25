export const getLiveUbikeData = async () => {
  return await fetch("https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json")
    .then((response) => response.json())
    .then((data) => data);
};
