<template>
  <div id="mapboxContainer" ref="mapDiv"></div>
</template>
<script setup>
import { ref, onMounted, reactive } from "vue";
import mapboxgl from "mapbox-gl";

const map = ref();
const mapDiv = ref();

const moving = ref(false);

onMounted(() => {
  initMap();
});

const initMap = async () => {
  const runtimeConfig = useRuntimeConfig();

  mapboxgl.accessToken = runtimeConfig.public.mapboxToken;

  map.value = new mapboxgl.Map({
    container: "mapboxContainer", // container ID
    center: [121.5219484, 25.0459674, 550], // starting position [lng, lat]. Note that lat must be set between -90 and 90
    zoom: 16, // starting zoom
  });
};

const initEvent = (viewer) => {
  map.value.on("load", () => {
    addOSMBuildings();
    mapDiv.value.addEventListener("mouseenter", (event) => {
      moving.value = true;
    });
    mapDiv.value.addEventListener("mouseleave", (event) => {
      moving.value = false;
    });
    map.value.on("move", () => syncCesiumView(viewer));
  });
};

const syncCesiumView = (viewer) => {
  if (moving.value) {
    //  update Cesium viewer's camera properties based on Mapbox map's view properties
    const camera = viewer.camera;
    const bounds = map.value.getBounds().toArray();
    camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(...bounds[0], ...bounds[1]),
      orientation: {
        heading: Cesium.Math.toRadians(map.value.getBearing()),
        pitch: Cesium.Math.toRadians(map.value.getPitch() - 90),
      },
      duration: 0,
    });
  }
};

const addOSMBuildings = async () => {
  map.value.addSource("osm-buildings", {
    type: "geojson",
    // Use a URL for the value for the `data` property.
    data: "/geojson/osm_buildings_clean.geojson",
    // Size of the tile buffer on each side. A value of 0 produces no buffer.
    buffer: 0,
    minzoom: 15,
    // implements the Douglas–Peucker algorithm and can be used to improve performance
    tolerance: 1,
  });

  map.value.addLayer({
    id: "osm-buildings",
    type: "fill-extrusion",
    source: "osm-buildings",
    paint: {
      // Get the `fill-extrusion-color` from the source `color` property.
      "fill-extrusion-color": "#D3D3D3",

      // Get `fill-extrusion-height` from the source `height` property.
      "fill-extrusion-height": 50,

      // Get `fill-extrusion-base` from the source `base_height` property.
      "fill-extrusion-base": 0,

      // Make extrusions slightly opaque to see through indoor walls.
      "fill-extrusion-opacity": 0.5,
    },
  });
};

defineExpose({
  map,
  initEvent,
});
</script>
