/**
 * expo-camera mock — minimal surface; Phase 5 unit tests don't exercise the
 * camera view component, just the upload pipeline.
 */

export const CameraType = { back: "back", front: "front" };
export const Camera = jest.fn();
export const CameraView = jest.fn();
export const useCameraPermissions = jest.fn(() => [
  { status: "granted", granted: true },
  jest.fn(),
]);

export default {
  CameraType,
  Camera,
  CameraView,
  useCameraPermissions,
};
