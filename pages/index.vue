<template>
  <div class="container">
    <CesiumMap class="child-container" ref="cesiumMap"></CesiumMap>
    <MapboxMap class="child-container" ref="mapboxMap"></MapboxMap>
  </div>
</template>
<script setup>
import { ref, onMounted, reactive } from "vue";

const cesiumMap = ref(null);
const mapboxMap = ref(null);

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

onMounted(() => {
  getCurrentLocation();
  initSyncEvent();
});
</script>
<style scoped>
/* Mobile First means designing for mobile before designing for desktop or any other device (This will make the page display faster on smaller devices). */
/* For mobile phones: */
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100vw;
  height: 100vh;
  padding: 30px;
  box-sizing: border-box;
}
.child-container {
  flex: 1;
  width: 100%;
}

/* For desktop: */
@media only screen and (min-width: 768px) {
  .container {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 20px;
    width: 100vw;
    height: 100vh;
    padding: 30px;
    box-sizing: border-box;
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
