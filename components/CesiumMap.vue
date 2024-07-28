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
    destination: Cesium.Cartesian3.fromDegrees(121.5219484, 25.0459674, 550), //oneworks coords
  });

  // Add Cesium OSM Buildings, a global 3D buildings layer.
  // const buildingTileset = await Cesium.createOsmBuildingsAsync();
  // viewer.value.scene.primitives.add(buildingTileset);

  addOSMBuildings();
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

  // Set the cull function for the viewer
  viewer.value.cull = cull;
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

const addOSMBuildings = async () => {
  // const tileset = await Cesium.Cesium3DTileset.fromUrl("/3d tiles/osm_buildings/tileset.json");
  // viewer.value.scene.primitives.add(tileset);
  // const tileset = viewer.value.scene.primitives.add(await Cesium.Cesium3DTileset.fromIonAssetId(2681531));
  const promise = Cesium.GeoJsonDataSource.load("/geojson/osm_buildings_clean.geojson", {
    clampToGround: true, //The position is clamped to the terrain.
  });
  // const promiseKML = Cesium.KmlDataSource.load("/kml/osm_buildings.kml", {
  //   clampToGround: true, //The position is clamped to the terrain.
  // });
  promise
    .then(function (dataSource) {
      //Get the array of entities
      const entities = dataSource.entities.values;

      for (let i = 0; i < entities.length; i++) {
        //For each entity, create a random color based on the state name.
        //Some states have multiple entities, so we store the color in a
        //hash so that we use the same color for the entire state.
        const entity = entities[i];

        if (entity.polygon) {
          //Set the polygon material to our random color.
          entity.polygon.material = Cesium.Color.LIGHTGREY.withAlpha(0.5);
          //Remove the outlines.
          entity.polygon.outline = false;

          entity.polygon.clampToGround = true;

          entity.polygon.extrudedHeight = 50;

          viewer.value.entities.add(entity);
        }
      }
    })
    .catch(function (error) {
      //Display any errrors encountered while loading.
      window.alert(error);
    });
};

// Define a custom cull function
function cull(entity) {
  console.log("cull");
  // Get the camera object
  var camera = viewer.value.camera;

  // Check if the entity is in the view frustum
  if (camera.isInFrustum(entity.position)) {
    return true; // Entity is in view, render it
  } else {
    return false; // Entity is not in view, hide it
  }
}

defineExpose({
  viewer,
  initEvent,
});
</script>
