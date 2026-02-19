/**
 * Local shim for react-leaflet-cluster that avoids CSS requires
 * (which break Turbopack). The MarkerCluster styles are already
 * inlined in globals.css.
 */
import { createPathComponent, createElementObject, extendContext } from "@react-leaflet/core";
import L from "leaflet";
import "leaflet.markercluster";

function getPropsAndEvents(props: Record<string, unknown>) {
  let clusterProps: Record<string, unknown> = {};
  let clusterEvents: Record<string, unknown> = {};
  const { children: _children, ...rest } = props;
  Object.entries(rest).forEach(([propName, prop]) => {
    if (propName.startsWith("on")) {
      clusterEvents = { ...clusterEvents, [propName]: prop };
    } else {
      clusterProps = { ...clusterProps, [propName]: prop };
    }
  });
  return { clusterProps, clusterEvents };
}

function createMarkerClusterGroup(props: Record<string, unknown>, context: any) {
  const { clusterProps, clusterEvents } = getPropsAndEvents(props);
  const markerClusterGroup = new (L as any).MarkerClusterGroup(clusterProps);
  Object.entries(clusterEvents).forEach(([eventAsProp, callback]) => {
    const clusterEvent = `cluster${eventAsProp.substring(2).toLowerCase()}`;
    markerClusterGroup.on(clusterEvent, callback);
  });
  return createElementObject(
    markerClusterGroup,
    extendContext(context, { layerContainer: markerClusterGroup })
  );
}

const updateMarkerCluster = () => {};

const MarkerClusterGroup = createPathComponent(createMarkerClusterGroup, updateMarkerCluster);
export default MarkerClusterGroup;
