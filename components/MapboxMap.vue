<template>
  <div id="mapboxContainer"></div>
</template>
<script setup>
import { ref, onMounted, reactive } from "vue";
import mapboxgl from "mapbox-gl";

const map = ref();

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
  });
};

defineExpose({
  map,
});
</script>
