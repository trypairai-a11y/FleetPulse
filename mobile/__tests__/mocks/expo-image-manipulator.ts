/**
 * expo-image-manipulator mock. Returns a fake compressed URI; tests inspect
 * manipulateAsync call args (compress ratio, resize width, output format).
 */

export const SaveFormat = {
  JPEG: "jpeg",
  PNG: "png",
  WEBP: "webp",
};

export const manipulateAsync = jest.fn(
  async (_uri: string, _actions: any[] = [], _options: any = {}) => ({
    uri: "file://compressed.jpg",
    width: 1280,
    height: 960,
  }),
);

export default {
  SaveFormat,
  manipulateAsync,
};
