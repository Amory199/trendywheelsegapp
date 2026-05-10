import { expect, test } from "@playwright/test";

import { customerToken } from "./helpers";

const API = process.env.E2E_API_URL ?? "https://api.trendywheelseg.com";

// Regression test for the localhost-presign bug: uploadUrl must point at the
// public API, signed URL must accept a real PUT, and the file must come back
// from the public CDN.
test("storage presign + PUT + public fetch round-trips with no localhost", async ({ request }) => {
  const token = await customerToken(request);

  const presign = await request.post(`${API}/api/storage/presign`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { mimeType: "image/png", prefix: "uploads" },
  });
  expect(presign.status()).toBe(200);
  const { uploadUrl, fileUrl } = await presign.json();

  // Critical: the URL the browser will hit must NOT be localhost.
  expect(uploadUrl).not.toContain("localhost");
  expect(uploadUrl).not.toContain("127.0.0.1");
  expect(uploadUrl).toContain("api.trendywheelseg.com");

  // Round-trip a 1-byte fake PNG.
  const body = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const put = await request.put(uploadUrl, {
    data: body,
    headers: { "Content-Type": "image/png" },
  });
  expect(put.status()).toBe(200);

  const get = await request.get(fileUrl);
  expect(get.status()).toBe(200);
  expect(fileUrl).toContain("cdn.trendywheelseg.com");
});
