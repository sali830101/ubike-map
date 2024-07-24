<template>
  <div id="cesiumContainer"></div>
</template>
<script setup>
import { ref, onMounted, reactive } from "vue";

const viewer = ref();

onMounted(() => {
  initMap();
});

onUpdated(() => {
  console.log(props.coords);
});

const initMap = async () => {
  const runtimeConfig = useRuntimeConfig();

  // Your access token can be found at: https://ion.cesium.com/tokens.
  // This is the default access token from your ion account
  Cesium.Ion.defaultAccessToken = runtimeConfig.public.cesiumToken;

  // Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
  viewer.value = new Cesium.Viewer("cesiumContainer", {
    terrain: Cesium.Terrain.fromWorldTerrain(),
  });

  viewer.value.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(121.564558, 25.03746, 10000), //taipei coords
  });

  // Add Cesium OSM Buildings, a global 3D buildings layer.
  const buildingTileset = await Cesium.createOsmBuildingsAsync();
  viewer.value.scene.primitives.add(buildingTileset);
};

defineExpose({
  viewer,
});
</script>
