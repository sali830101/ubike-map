export const getLiveUbikeData = async () => {
  return await fetch("https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json")
    .then((response) => response.json())
    .then((data) => data);
};

export const getRoute = async (profile, coords, token) => {
  return await fetch(
    `https://api.mapbox.com/directions/v5/${profile}/${coords.map((c) => c.join(",")).join(";")}?geometries=geojson&access_token=${token}`
  )
    .then((response) => response.json())
    .then((data) => data.routes[0]);
};
