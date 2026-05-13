/**
 * RED test — turns GREEN when Wave 1 ships mobile/src/services/photoService.ts
 * with uploadDeliveryPhoto() that compresses to ≤ 200 KB.
 *
 * Contract:
 *   - manipulateAsync invoked with { compress: 0.7, format: SaveFormat.JPEG }
 *     and a resize action capping width to 1280.
 */

import * as ImageManipulator from "expo-image-manipulator";
import { __mockApi as mockApi } from "./mocks/api-client";

const mockManipulator = ImageManipulator as unknown as {
  manipulateAsync: jest.Mock;
  SaveFormat: { JPEG: string };
};

describe("photoService.uploadDeliveryPhoto — compression", () => {
  test("compresses to JPEG with width<=1280 and compress=0.7", async () => {
    mockManipulator.manipulateAsync.mockResolvedValueOnce({
      uri: "file://compressed.jpg",
      width: 1280,
      height: 960,
    });

    // Mock global fetch (for the presigned-URL PUT) so the upload completes.
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      blob: async () => ({ size: 195000 } as any),
    }) as any;

    mockApi.requestUploadUrl.mockResolvedValueOnce({
      url: "https://r2.example/x",
      key: "tenA/order1/dev1/123.jpg",
      expiresInSec: 300,
    });
    mockApi.recordDeliveryPhotoMetadata.mockResolvedValueOnce({ ok: true });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { uploadDeliveryPhoto } = require("../src/services/photoService");
    await uploadDeliveryPhoto({
      orderId: "order1",
      uri: "file://orig.jpg",
      latitude: 29.3759,
      longitude: 47.9774,
    });

    expect(mockManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file://orig.jpg",
      expect.arrayContaining([
        expect.objectContaining({ resize: expect.objectContaining({ width: 1280 }) }),
      ]),
      expect.objectContaining({
        compress: 0.7,
        format: mockManipulator.SaveFormat.JPEG,
      }),
    );
  });
});
