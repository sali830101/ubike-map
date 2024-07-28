<template>
  <div id="mapboxContainer" ref="mapDiv"></div>
</template>
<script setup>
import { ref, onMounted, reactive } from "vue";
import mapboxgl from "mapbox-gl";
import { getLiveUbikeData } from "@/api";

const props = defineProps({
  addLocation: Function,
});

const map = ref();
const mapDiv = ref();

const moving = ref(false);

const markers = reactive([]);

const popup = ref();

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

  // map.value.on("load", () => {
  //   map.value.addSource("ubike", {
  //     type: "geojson",
  //     data: "/geojson/ubike.geojson",
  //   });
  //   console.log(map.value);
  // });
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

    map.value.on("click", (event) => {
      const features = map.value.queryRenderedFeatures(event.point, {
        layers: ["ubike-stations"],
      });
      if (!features.length) {
        addMarker([event.lngLat.lng, event.lngLat.lat]);
        props.addLocation([event.lngLat.lng, event.lngLat.lat], "mapbox");

        return;
      }
    });

    // add popup event on hover
    map.value.on("mouseenter", "ubike-stations", (e) => {
      // Change the cursor style as a UI indicator.
      map.value.getCanvas().style.cursor = "pointer";

      openPopup(e.features[0]);
    });
    map.value.on("mouseleave", "ubike-stations", () => {
      map.value.getCanvas().style.cursor = "";
      // popup.value.remove();
    });
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

const openPopup = async (feature) => {
  const data = await getLiveUbikeData();

  const target = data.filter((d) => d.sno === feature.properties.id);

  let availableBikes = "No Data";

  if (target.length) {
    availableBikes = target[0].available_rent_bikes;
  }

  popup.value = new mapboxgl.Popup({ offset: [0, -15], closeButton: false, closeOnClick: false })
    .setLngLat(feature.geometry.coordinates)
    .setHTML(
      `<h3>${feature.properties.name.replaceAll("_", " ")}</h3><p>${feature.properties.location}</p><p>目前可借車輛數: <span class="${
        availableBikes ? "available" : "unavailable"
      }">${target[0].available_rent_bikes}</span>/${target[0].total}</p>`
    )
    .addTo(map.value);
};

const addMarker = (coords) => {
  if (markers.length === 2) {
    markers.forEach((m) => m.remove());
    markers.length = 0;
  }
  // Create a default Marker and add it to the map.
  const marker = new mapboxgl.Marker({ color: markers.length ? "red" : "#0062ff" }).setLngLat(coords).addTo(map.value);
  markers.push(marker);
};

const addRoute = (route) => {
  const geojson = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: route,
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
  addMarker,
  addRoute,
});
</script>
<style>
/* custom style for popup */
.mapboxgl-popup-close-button {
}
.mapboxgl-popup-content {
  padding: 15px;
  border-radius: 15px;
}
.mapboxgl-popup-tip {
  display: none;
}
.mapboxgl-popup-content-wrapper {
}
.available {
  color: green;
  font-weight: bold;
}
.unavailable {
  color: red;
  font-weight: bold;
}
</style>
