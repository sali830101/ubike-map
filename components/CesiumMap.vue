<template>
  <div id="cesiumContainer" ref="viewerDiv"></div>
</template>
<script setup>
import { ref, onMounted, reactive } from "vue";

const props = defineProps({
  addLocation: Function,
});

const viewer = ref();
const viewerDiv = ref();

const moving = ref(false);

const markers = reactive([]);
const polylineRoute = ref();

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

  viewer.value.scene.globe.depthTestAgainstTerrain = false;
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

  // click event
  viewer.value.screenSpaceEventHandler.setInputAction(function (event) {
    let scene = viewer.value.scene;
    if (scene.pickPositionSupported) {
      let cartesian = scene.pickPosition(event.position);

      if (Cesium.defined(cartesian)) {
        let cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        let longitude = Cesium.Math.toDegrees(cartographic.longitude);
        let latitude = Cesium.Math.toDegrees(cartographic.latitude);
        addMarker([longitude, latitude]);
        props.addLocation([longitude, latitude], "cesium");
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
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

const addMarker = (coords) => {
  viewer.value.entities.remove(polylineRoute.value);
  if (markers.length === 2) {
    markers.forEach((m) => viewer.value.entities.remove(m));
    markers.length = 0;
  }
  const entity = viewer.value.entities.add({
    position: Cesium.Cartesian3.fromDegrees(coords[0], coords[1]),
    billboard: {
      image: markers.length ? "/marker-red.png" : "/marker-blue.png",
      scale: 2,
    },
  });
  markers.push(entity);
};

const addRoute = (route) => {
  const cornflowerBlue = Cesium.Color.CORNFLOWERBLUE.withAlpha(0.7);
  const polyline = viewer.value.entities.add({
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray(route.flat()),
      width: 5,
      material: new Cesium.PolylineOutlineMaterialProperty({
        color: cornflowerBlue,
      }),
      depthFailMaterial: new Cesium.PolylineOutlineMaterialProperty({
        color: cornflowerBlue,
      }),
    },
  });
  polylineRoute.value = polyline;
};

defineExpose({
  viewer,
  initEvent,
  addMarker,
  addRoute,
});
</script>
