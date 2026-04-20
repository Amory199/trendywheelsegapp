import swaggerJsdoc from "swagger-jsdoc";

export const openapiSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "TrendyWheels API",
      version: "1.0.0",
      description:
        "Backend API for TrendyWheels — vehicle rental, sales, and repair platform for Egypt.",
    },
    servers: [{ url: "/api", description: "API base path" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Auth" },
      { name: "Users" },
      { name: "Vehicles" },
      { name: "Bookings" },
      { name: "Sales" },
      { name: "Repairs" },
      { name: "Messages" },
      { name: "Notifications" },
      { name: "Storage" },
      { name: "Admin" },
    ],
    paths: {
      "/auth/send-otp": {
        post: {
          tags: ["Auth"],
          summary: "Send OTP to phone number",
          security: [],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { phone: { type: "string" } }, required: ["phone"] } } } },
          responses: { 200: { description: "OTP sent" } },
        },
      },
      "/auth/verify-otp": {
        post: {
          tags: ["Auth"],
          summary: "Verify OTP and receive tokens",
          security: [],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { phone: { type: "string" }, otp: { type: "string" } }, required: ["phone", "otp"] } } } },
          responses: { 200: { description: "Authenticated" } },
        },
      },
      "/vehicles": {
        get: { tags: ["Vehicles"], summary: "List vehicles", security: [], responses: { 200: { description: "OK" } } },
        post: { tags: ["Vehicles"], summary: "Create vehicle (admin)", responses: { 201: { description: "Created" } } },
      },
      "/bookings": {
        get: { tags: ["Bookings"], summary: "List bookings", responses: { 200: { description: "OK" } } },
        post: { tags: ["Bookings"], summary: "Create a booking", responses: { 201: { description: "Created" } } },
      },
      "/sales": {
        get: { tags: ["Sales"], summary: "List sales listings", security: [], responses: { 200: { description: "OK" } } },
        post: { tags: ["Sales"], summary: "Create sales listing", responses: { 201: { description: "Created" } } },
      },
      "/repairs": {
        get: { tags: ["Repairs"], summary: "List repair requests", responses: { 200: { description: "OK" } } },
        post: { tags: ["Repairs"], summary: "Submit repair request", responses: { 201: { description: "Created" } } },
      },
      "/messages": {
        post: { tags: ["Messages"], summary: "Send a message", responses: { 201: { description: "Sent" } } },
      },
      "/notifications": {
        get: { tags: ["Notifications"], summary: "List notifications", responses: { 200: { description: "OK" } } },
      },
      "/storage/images": {
        post: { tags: ["Storage"], summary: "Upload an image", responses: { 201: { description: "Uploaded" } } },
      },
      "/admin/metrics": {
        get: { tags: ["Admin"], summary: "Dashboard metrics", responses: { 200: { description: "OK" } } },
      },
    },
  },
  apis: [],
});
