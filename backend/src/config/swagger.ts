import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Darb Fleet Management API",
      version: "1.0.0",
      description: "API documentation for the Darb CRM — multi-tenant delivery fleet management platform supporting Talabat, Keeta, Deliveroo, and Americana.",
    },
    servers: [
      { url: "/", description: "Current server" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT access token from POST /api/auth/login",
        },
      },
      schemas: {
        Driver: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            phone: { type: "string" },
            platform: { type: "string", enum: ["TALABAT", "KEETA", "DELIVEROO", "AMERICANA"] },
            status: { type: "string", enum: ["ACTIVE", "INACTIVE", "SUSPENDED", "TERMINATED", "LEAVE", "RESTRICTED"] },
            zone: { type: "string" },
            batchNumber: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Shift: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            driverId: { type: "string" },
            platform: { type: "string", enum: ["TALABAT", "KEETA", "DELIVEROO", "AMERICANA"] },
            date: { type: "string", format: "date-time" },
            scheduledStart: { type: "string", format: "date-time" },
            scheduledEnd: { type: "string", format: "date-time" },
            status: { type: "string", enum: ["BOOKED", "IN_PROGRESS", "COMPLETED", "MISSED", "CANCELLED"] },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            details: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        PaginatedResponse: {
          type: "object",
          properties: {
            data: { type: "array", items: {} },
            total: { type: "integer" },
            page: { type: "integer" },
            limit: { type: "integer" },
            totalPages: { type: "integer" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Auth", description: "Authentication and user management" },
      { name: "Drivers", description: "Driver profile and performance management" },
      { name: "Shifts", description: "Shift scheduling, clock-in/out, and attendance" },
      { name: "Orders", description: "Order logging and analytics" },
      { name: "KPIs", description: "Key performance indicators and scoring" },
      { name: "Platform Overview", description: "Real-time platform dashboards" },
      { name: "Platform Settings", description: "Per-platform configuration" },
      { name: "Notifications", description: "In-app and push notifications" },
      { name: "Leave Requests", description: "Driver leave and day-off management" },
      { name: "Cash", description: "Cash collection and ledger management" },
      { name: "Alerts", description: "System alerts and compliance violations" },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
