<template>
  <div class="container">
    <h1>Ubike Map</h1>
    <p>select start and end point on the map to get the route for riding Ubike</p>
    <div class="map-container">
      <CesiumMap class="child-container" ref="cesiumMap" :addLocation="addLocation"></CesiumMap>
      <MapboxMap class="child-container" ref="mapboxMap" :addLocation="addLocation"></MapboxMap>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, reactive } from "vue";
import { getLiveUbikeData, getRoute } from "@/api";
import * as turf from "@turf/turf";

const runtimeConfig = useRuntimeConfig();

const cesiumMap = ref(null);
const mapboxMap = ref(null);
const locations = reactive([]);

const getCurrentLocation = () => {
  // when location is available
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      const coords = position.coords;
      cesiumMap.value.viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(coords.longitude, coords.latitude, 550), //current coords
      });
      mapboxMap.value.map.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom: 16,
      });
    });
  }
};

const initSyncEvent = () => {
  cesiumMap.value.initEvent(mapboxMap.value.map);
  mapboxMap.value.initEvent(cesiumMap.value.viewer);
};

const addLocation = (coords, source) => {
  if (source === "mapbox") {
    cesiumMap.value.addMarker(coords);
  } else if (source === "cesium") {
    mapboxMap.value.addMarker(coords);
  }
  locations.push(coords);
  if (locations.length == 2) {
    getUbikeRoute();
    locations.length = 0;
  }
};

const getUbikeRoute = async () => {
  const coords = [locations[0]];
  const features = mapboxMap.value.map.querySourceFeatures("composite", { sourceLayer: "ubike_stations" });
  // get nearest ubike station from start point
  const nearestUbikeStart = turf.nearestPoint(turf.point(locations[0]), {
    type: "FeatureCollection",
    features: features,
  });
  coords.push(nearestUbikeStart.geometry.coordinates);
  // get nearest ubike station to destination
  const nearestUbikeEnd = turf.nearestPoint(turf.point(locations[1]), {
    type: "FeatureCollection",
    features: features,
  });
  coords.push(nearestUbikeEnd.geometry.coordinates);
  coords.push(locations[1]);

  // same ubike station
  if (coords[1][0] === coords[2][0] && coords[1][1] === coords[2][1]) {
    // walk only
    const route = await getRoute("mapbox/walking", [coords[0], coords[3]], runtimeConfig.public.mapboxToken);

    mapboxMap.value.addRoute([...route.geometry.coordinates]);
    cesiumMap.value.addRoute([...route.geometry.coordinates]);
  } else {
    // walk to nearest ubike station
    const route1 = await getRoute("mapbox/walking", [coords[0], coords[1]], runtimeConfig.public.mapboxToken);
    // ride ubike
    const route2 = await getRoute("mapbox/cycling", [coords[1], coords[2]], runtimeConfig.public.mapboxToken);
    // walk from nearest ubike station to destination
    const route3 = await getRoute("mapbox/walking", [coords[2], coords[3]], runtimeConfig.public.mapboxToken);

    mapboxMap.value.addRoute([...route1.geometry.coordinates, ...route2.geometry.coordinates, ...route3.geometry.coordinates]);
    cesiumMap.value.addRoute([...route1.geometry.coordinates, ...route2.geometry.coordinates, ...route3.geometry.coordinates]);
  }
};

onMounted(() => {
  getCurrentLocation();
  initSyncEvent();
  // initUbike();
});
</script>
<style scoped>
/* Mobile First means designing for mobile before designing for desktop or any other device (This will make the page display faster on smaller devices). */
/* For mobile phones: */
.container {
  padding: 30px;
  width: 100vw;
  box-sizing: border-box;
}
.map-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
  height: 80vh;
}
.child-container {
  flex: 1;
  width: 100%;
}

/* For desktop: */
@media only screen and (min-width: 768px) {
  .map-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 20px;
    width: 100%;
    height: 80vh;
  }
  .child-container {
    flex: 1;
    height: 60%;
  }
}
</style>
<style>
body {
  margin: 0px;
}
</style>
