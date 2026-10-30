import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDate, formatDateTime, storeDateTimeToIso } from "../src/lib/time.ts";

test("dates use Ghana time at day and year boundaries", () => {
  assert.equal(formatDateTime("2027-01-01T01:30:00+02:00"), "31 Dec 2026, 23:30 GMT");
  assert.equal(formatDate("2026-10-30T23:30:00-04:00"), "31 Oct 2026");
});

test("date displays and expiry inputs stay in Ghana time regardless of the device time zone", () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ["America/New_York", "Asia/Tokyo", "Africa/Accra"]) {
      process.env.TZ = zone;
      assert.equal(formatDateTime("2026-10-30T14:05:00Z"), "30 Oct 2026, 14:05 GMT");
      assert.equal(storeDateTimeToIso("2026-10-30T14:05"), "2026-10-30T14:05:00.000Z");
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("notification expiry rejects invalid dates instead of shifting them or throwing", () => {
  for (const value of ["", "2026-02-30T14:00", "2026-10-30T25:00", "not-a-date", "2026-10-30T14:00+09:00"]) {
    assert.equal(storeDateTimeToIso(value), null);
  }
});
