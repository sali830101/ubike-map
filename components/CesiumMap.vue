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
    destination: Cesium.Cartesian3.fromDegrees(121.5219484, 25.0459674, 550), //oneworks coords
  });

  viewer.value.scene.globe.depthTestAgainstTerrain = false;

  // Add Cesium OSM Buildings, a global 3D buildings layer.
  // const buildingTileset = await Cesium.createOsmBuildingsAsync();
  // viewer.value.scene.primitives.add(buildingTileset);

  addOSMBuildings();
  addUbike();
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

const addUbike = () => {
  const promise = Cesium.GeoJsonDataSource.load("/geojson/ubike.geojson", {
    clampToGround: true, //The position is clamped to the terrain.
    markerSymbol: "bicycle",
  });
  promise
    .then(function (dataSource) {
      viewer.value.dataSources.add(dataSource);
    })
    .catch(function (error) {
      //Display any errrors encountered while loading.
      window.alert(error);
    });
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

const addAnimation = async (routes) => {
  let totalDuration = 0;
  const positions = [];
  routes.forEach((route) => {
    const segmentDuration = route.duration / route.geometry.coordinates.length;
    route.geometry.coordinates.forEach((c, index) => {
      positions.push(totalDuration + segmentDuration * index);
      positions.push(c[0]);
      positions.push(c[1]);
      positions.push(20);
    });
    totalDuration += route.duration;
  });
  const startTime = new Date();
  const endTime = new Date();
  endTime.setSeconds(endTime.getSeconds() + totalDuration);
  const czml = [
    {
      id: "document",
      name: "CZML Model",
      version: "1.0",
      clock: {
        interval: `${startTime.toISOString()}/${endTime.toISOString()}`,
        currentTime: startTime.toISOString(),
        multiplier: 10,
      },
    },
    {
      id: "pushpin",
      name: "Pushpin",
      availability: `${startTime.toISOString()}/${endTime.toISOString()}`,
      position: {
        epoch: startTime.toISOString(),
        cartographicDegrees: positions,
      },
      model: {
        gltf: "/glb/pushpin.glb",
        scale: 0.1,
        minimumPixelSize: 10,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    },
  ];
  const dataSource = await viewer.value.dataSources.add(Cesium.CzmlDataSource.load(czml));

  viewer.value.trackedEntity = dataSource.entities.getById("pushpin");
};

const sum = (array) => {
  return array.reduce((a, b) => a + b, 0);
};

defineExpose({
  viewer,
  initEvent,
  addMarker,
  addRoute,
  addAnimation,
});
</script>
