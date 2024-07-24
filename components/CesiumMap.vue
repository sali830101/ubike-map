<template>
  <div id="cesiumContainer" ref="viewerDiv"></div>
</template>
<script setup>
import { ref, onMounted, reactive } from "vue";

const viewer = ref();
const viewerDiv = ref();

const moving = ref(false);

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

const initEvent = (map) => {
  // to prevent infinate syncing
  viewerDiv.value.addEventListener("mouseenter", (event) => {
    moving.value = true;
  });
  viewerDiv.value.addEventListener("mouseleave", (event) => {
    moving.value = false;
  });
  // add event for cesium camera changed
  viewer.value.camera.changed.addEventListener(() => syncToMapboxMap(map));
  // By default, the `camera.changed` event will trigger when the camera has changed by 50%
  // To make it more sensitive, we can bring down this sensitivity
  viewer.value.camera.percentageChanged = 0.0001;
};

const syncToMapboxMap = (map) => {
  if (moving.value) {
    //  update Mapbox map's view properties based on Cesium viewer's camera properties
    const camera = viewer.value.camera;
    const bounds = camera.computeViewRectangle();

    //fit bounds without animation
    map.fitBounds(
      [
        [Cesium.Math.toDegrees(bounds.west), Cesium.Math.toDegrees(bounds.south)],
        [Cesium.Math.toDegrees(bounds.east), Cesium.Math.toDegrees(bounds.north)],
      ],
      { duration: 0 }
    );
    // console.log(Cesium.Math.toDegrees(camera.heading));
    map.setBearing(Cesium.Math.toDegrees(camera.heading));
    map.setPitch(Cesium.Math.toDegrees(camera.pitch) + 90);
  }
};

defineExpose({
  viewer,
  initEvent,
});
</script>
