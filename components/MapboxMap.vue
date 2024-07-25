<template>
  <div id="mapboxContainer" ref="mapDiv"></div>
</template>
<script setup>
import { ref, onMounted, reactive } from "vue";
import mapboxgl from "mapbox-gl";
import { getLiveUbikeData, getRoute } from "@/api";
import * as turf from "@turf/turf";

const map = ref();
const mapDiv = ref();

const moving = ref(false);

const markers = reactive([]);

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

  map.value.on("load", () => {
    map.value.addSource("ubike", {
      type: "geojson",
      data: "/geojson/ubike.geojson",
    });
    console.log(map.value);
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
  map.value.on("click", (event) => {
    const features = map.value.queryRenderedFeatures(event.point, {
      layers: ["ubike-stations"],
    });
    if (!features.length) {
      if (markers.length === 2) {
        markers.forEach((m) => m.remove());
        markers.length = 0;
      }
      // Create a default Marker and add it to the map.
      const marker = new mapboxgl.Marker({ color: markers.length ? "red" : "blue" }).setLngLat([event.lngLat.lng, event.lngLat.lat]).addTo(map.value);
      markers.push(marker);
      console.log(markers);
      if (markers.length === 2) {
        getUbikeRoute();
      }

      return;
    }
    openPopup(features[0]);
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

const openPopup = async (feature) => {
  const data = await getLiveUbikeData();

  const target = data.filter((d) => d.sno === feature.properties.id);

  let availableBikes = "No Data";

  if (target.length) {
    availableBikes = `${target[0].available_rent_bikes}/${target[0].total}`;
  }

  const popup = new mapboxgl.Popup({ offset: [0, -15] })
    .setLngLat(feature.geometry.coordinates)
    .setHTML(`<h3>${feature.properties.name.replaceAll("_", " ")}</h3><p>${feature.properties.location}</p><p>目前可借車輛數: ${availableBikes}</p>`)
    .addTo(map.value);
};

const getUbikeRoute = async () => {
  const startPoint = markers[0].getLngLat();
  const endPoint = markers[1].getLngLat();
  const coords = [[startPoint.lng, startPoint.lat]];
  const features = map.value.querySourceFeatures("composite", { sourceLayer: "ubike_stations" });
  // get nearest ubike station from start point
  const nearestUbikeStart = turf.nearestPoint(turf.point([startPoint.lng, startPoint.lat]), {
    type: "FeatureCollection",
    features: features,
  });
  coords.push(nearestUbikeStart.geometry.coordinates);
  // get nearest ubike station to destination
  const nearestUbikeEnd = turf.nearestPoint(turf.point([endPoint.lng, endPoint.lat]), {
    type: "FeatureCollection",
    features: features,
  });
  coords.push(nearestUbikeEnd.geometry.coordinates);
  coords.push([endPoint.lng, endPoint.lat]);
  // walk to nearest ubike station
  const route1 = await getRoute("mapbox/walking", [coords[0], coords[1]], mapboxgl.accessToken);
  // ride ubike
  const route2 = await getRoute("mapbox/cycling", [coords[1], coords[2]], mapboxgl.accessToken);
  // walk from nearest ubike station to destination
  const route3 = await getRoute("mapbox/walking", [coords[2], coords[3]], mapboxgl.accessToken);
  const geojson = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [...route1.geometry.coordinates, ...route2.geometry.coordinates, ...route3.geometry.coordinates],
    },
  };
  // if the route already exists on the map, we'll reset it using setData
  if (map.value.getSource("route")) {
    map.value.getSource("route").setData(geojson);
  }
  // otherwise, we'll make a new request
  else {
    map.value.addLayer({
      id: "route",
      type: "line",
      source: {
        type: "geojson",
        data: geojson,
      },
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#3887be",
        "line-width": 5,
        "line-opacity": 0.75,
      },
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
