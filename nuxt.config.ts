// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      cesiumToken: process.env.NUXT_CESIUM_TOKEN,
      mapboxToken: process.env.NUXT_MAPBOX_TOKEN,
    },
  },
});
