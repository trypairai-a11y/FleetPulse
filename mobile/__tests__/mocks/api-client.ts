/**
 * Mock of `mobile/src/api/client`. All named exports become jest.fn() seams;
 * each test injects behaviour via .mockResolvedValueOnce / .mockRejectedValueOnce.
 *
 * The mock is exposed under __mockApi for ergonomic test code:
 *   import { __mockApi as mockApi } from "../__tests__/mocks/api-client";
 *   mockApi.uploadLocations.mockResolvedValueOnce({ synced: 5 });
 */

export const BASE_URL = "http://localhost:3001";

export const agentFetch = jest.fn(async (_path: string, _options?: any) => ({}));
export const register = jest.fn(async (_code: string, _info: any) => ({
  token: "t",
  deviceId: "d",
  driverId: "drv",
}));
export const heartbeat = jest.fn(async (_payload: any) => ({}));
export const uploadSelfie = jest.fn(async (_payload: any) => ({}));
export const uploadLocations = jest.fn(async (_batch: any[]) => ({ synced: 0 }));
export const uploadCapturedOrders = jest.fn(async (_orders: any[]) => ({}));
export const pollCommands = jest.fn(async (_deviceId: string) => [] as any[]);
export const ackCommand = jest.fn(async (_commandId: string) => ({}));
export const fetchMyDarbPoints = jest.fn(async () => ({}));
export const submitTicket = jest.fn(async (_payload: any) => ({}));
export const listMyTickets = jest.fn(async () => []);
export const getMyTicket = jest.fn(async (_id: string) => ({}));

// Wave 1+ exports (do not exist in real client yet — tests reference them as RED seams):
export const requestUploadUrl = jest.fn(
  async (_payload: { deviceId: string; orderId: string; contentType: string }) => ({
    url: "https://r2.example/x",
    key: "tenA/order1/dev1/12345.jpg",
    expiresInSec: 300,
  }),
);
export const recordDeliveryPhotoMetadata = jest.fn(async (_payload: any) => ({ ok: true }));

export const __mockApi = {
  agentFetch,
  register,
  heartbeat,
  uploadSelfie,
  uploadLocations,
  uploadCapturedOrders,
  pollCommands,
  ackCommand,
  fetchMyDarbPoints,
  submitTicket,
  listMyTickets,
  getMyTicket,
  requestUploadUrl,
  recordDeliveryPhotoMetadata,
};
