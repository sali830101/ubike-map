<template>
  <div id="mapboxContainer" ref="mapDiv"></div>
</template>
<script setup>
import { ref, onMounted, reactive } from "vue";
import mapboxgl from "mapbox-gl";
import { getLiveUbikeData } from "@/api";

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
    center: [121.564558, 25.03746], // starting position [lng, lat]. Note that lat must be set between -90 and 90
    zoom: 10, // starting zoom
    style: "mapbox://styles/sali830101/clz0xuu1l00h701rib99z3s5s", // custom style with ubike
  });
};

const initEvent = (viewer) => {
  mapDiv.value.addEventListener("mouseenter", (event) => {
    moving.value = true;
  });
  mapDiv.value.addEventListener("mouseleave", (event) => {
    moving.value = false;
  });
  map.value.on("move", () => syncCesiumView(viewer));

  // add popup event
  map.value.on("click", async (event) => {
    const features = map.value.queryRenderedFeatures(event.point, {
      layers: ["ubike-stations"],
    });
    if (!features.length) {
      return;
    }
    const feature = features[0];

    const data = await getLiveUbikeData();

    const target = data.filter((d) => d.sno === feature.properties.id);

    let availableBikes = "No Data";

    if (target.length) {
      availableBikes = `${target[0].available_rent_bikes}/${target[0].total}`;
    }

    const popup = new mapboxgl.Popup({ offset: [0, -15] })
      .setLngLat(feature.geometry.coordinates)
      .setHTML(
        `<h3>${feature.properties.name.replaceAll("_", " ")}</h3><p>${feature.properties.location}</p><p>目前可借車輛數: ${availableBikes}</p>`
      )
      .addTo(map.value);
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

defineExpose({
  map,
  initEvent,
});
</script>
<style>
/* custom style for popup */
.mapboxgl-popup-close-button {
  display: none;
}
.mapboxgl-popup-content {
  padding: 15px;
}
.mapboxgl-popup-content-wrapper {
}
</style>
