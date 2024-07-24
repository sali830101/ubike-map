<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
useHead({
  title: "Ubike Map",
  meta: [{ name: "description", content: "Ubike Map" }],
  script: [{ src: "https://cesium.com/downloads/cesiumjs/releases/1.119/Build/Cesium/Cesium.js" }],
  link: [
    { href: "https://cesium.com/downloads/cesiumjs/releases/1.119/Build/Cesium/Widgets/widgets.css", rel: "stylesheet" },
    { href: "https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.css", rel: "stylesheet" },
  ],
});
</script>
