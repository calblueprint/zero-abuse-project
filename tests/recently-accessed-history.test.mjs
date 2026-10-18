import assert from "node:assert/strict";
import test from "node:test";
import {
  orderExistingItems,
  storedItemIds,
  uuidPattern,
} from "../lib/intelligence-library/recently-accessed-history.ts";

const ids = [1, 2, 3, 4].map(
  number => `aa000046-2001-4000-8000-${String(number).padStart(12, "0")}`,
);

test("null, empty, and non-array histories return no IDs", () => {
  for (const value of [null, undefined, [], {}, "[]", 42]) {
    assert.deepEqual(storedItemIds(value), []);
  }
});

test("malformed entries and invalid UUIDs are ignored", () => {
  assert.deepEqual(
    storedItemIds([null, 42, {}, [ids[0]], "not-a-uuid", ids[0]]),
    [ids[0]],
  );
  assert.equal(uuidPattern.test(ids[0]), true);
  assert.equal(uuidPattern.test("not-a-uuid"), false);
});

test("stored recency order is retained and duplicates are removed", () => {
  assert.deepEqual(storedItemIds([ids[2], ids[0], ids[2], ids[1]]), [
    ids[2],
    ids[0],
    ids[1],
  ]);
});

test("UUID duplicates are case-insensitive and the result is capped at three", () => {
  assert.deepEqual(storedItemIds([ids[0].toUpperCase(), ...ids]), [
    ids[0],
    ids[1],
    ids[2],
  ]);
});

test("retrieved items follow history order, not database row order", () => {
  const items = [ids[0], ids[1], ids[2]].map(itemId => ({ itemId }));
  assert.deepEqual(
    orderExistingItems([ids[2], ids[0], ids[1]], items).map(
      item => item.itemId,
    ),
    [ids[2], ids[0], ids[1]],
  );
});

test("missing or deleted items are omitted from retrieval", () => {
  assert.deepEqual(
    orderExistingItems(
      [ids[2], ids[0], ids[1]],
      [{ itemId: ids[1] }, { itemId: ids[2] }],
    ).map(item => item.itemId),
    [ids[2], ids[1]],
  );
});
