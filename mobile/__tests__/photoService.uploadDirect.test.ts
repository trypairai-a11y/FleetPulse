/**
 * RED test — turns GREEN in Wave 1 when uploadDeliveryPhoto:
 *   1. Calls api.requestUploadUrl() to get the presigned URL + key.
 *   2. PUTs the binary payload to that URL with Content-Type image/jpeg.
 *   3. POSTs metadata (key + latitude + longitude) via api.recordDeliveryPhotoMetadata.
 */

import * as ImageManipulator from "expo-image-manipulator";
import { __mockApi as mockApi } from "./mocks/api-client";

const mockManipulator = ImageManipulator as unknown as { manipulateAsync: jest.Mock };

describe("photoService.uploadDeliveryPhoto — presigned-URL flow", () => {
  test("requests presigned URL → PUTs blob with Content-Type image/jpeg → POSTs metadata", async () => {
    mockManipulator.manipulateAsync.mockResolvedValueOnce({
      uri: "file://compressed.jpg",
      width: 1280,
      height: 960,
    });

    mockApi.requestUploadUrl.mockResolvedValueOnce({
      url: "https://r2.example/upload-target",
      key: "tenA/order1/dev1/12345.jpg",
      expiresInSec: 300,
    });

    const fetchMock = jest.fn().mockResolvedValueOnce({ ok: true, status: 200 });
    global.fetch = fetchMock as any;

    mockApi.recordDeliveryPhotoMetadata.mockResolvedValueOnce({ ok: true });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { uploadDeliveryPhoto } = require("../src/services/photoService");
    await uploadDeliveryPhoto({
      orderId: "order1",
      uri: "file://orig.jpg",
      latitude: 29.3759,
      longitude: 47.9774,
    });

    expect(mockApi.requestUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: "order1", contentType: "image/jpeg" }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://r2.example/upload-target",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({ "Content-Type": "image/jpeg" }),
      }),
    );

    expect(mockApi.recordDeliveryPhotoMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order1",
        key: "tenA/order1/dev1/12345.jpg",
        latitude: 29.3759,
        longitude: 47.9774,
      }),
    );
  });
});
