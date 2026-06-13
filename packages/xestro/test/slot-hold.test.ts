import { describe, expect, it } from "vitest";
import {
  CHECKOUT_HOLD_TTL_MS,
  InMemorySlotHoldStore,
  runWaitlistOffers,
} from "../src/slot-hold.js";

describe("InMemorySlotHoldStore", () => {
  it("grants an exclusive hold and rejects a second holder", async () => {
    const store = new InMemorySlotHoldStore();
    const first = await store.acquire("slot-1", "patient-a", CHECKOUT_HOLD_TTL_MS);
    const second = await store.acquire("slot-1", "patient-b", CHECKOUT_HOLD_TTL_MS);
    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it("is reentrant for the same holder (refreshes TTL)", async () => {
    const store = new InMemorySlotHoldStore();
    await store.acquire("slot-1", "patient-a", 1000);
    const again = await store.acquire("slot-1", "patient-a", 1000);
    expect(again).not.toBeNull();
  });

  it("expires holds after the TTL", async () => {
    let now = 0;
    const store = new InMemorySlotHoldStore(() => now);
    await store.acquire("slot-1", "patient-a", 5000);
    now = 5001;
    expect(await store.get("slot-1")).toBeNull();
    const second = await store.acquire("slot-1", "patient-b", 5000);
    expect(second).not.toBeNull();
  });

  it("only the holder can release", async () => {
    const store = new InMemorySlotHoldStore();
    await store.acquire("slot-1", "patient-a", 5000);
    expect(await store.release("slot-1", "patient-b")).toBe(false);
    expect(await store.release("slot-1", "patient-a")).toBe(true);
    expect(await store.get("slot-1")).toBeNull();
  });
});

describe("runWaitlistOffers", () => {
  it("offers sequentially and stops at the first claim", async () => {
    const store = new InMemorySlotHoldStore();
    const notified: string[] = [];
    const result = await runWaitlistOffers(store, "slot-1", [
      {
        patientId: "p1",
        notifyAndAwaitClaim: async () => {
          notified.push("p1");
          return false; // p1 lets the window lapse
        },
      },
      {
        patientId: "p2",
        notifyAndAwaitClaim: async () => {
          notified.push("p2");
          return true; // p2 claims
        },
      },
      {
        patientId: "p3",
        notifyAndAwaitClaim: async () => {
          notified.push("p3");
          return true;
        },
      },
    ]);
    expect(result.claimedBy).toBe("p2");
    expect(notified).toEqual(["p1", "p2"]); // p3 never offered
    // The claim IS the hold: p2 still holds the slot, nobody else can take it.
    expect((await store.get("slot-1"))?.holderId).toBe("p2");
    expect(await store.acquire("slot-1", "someone-else", 1000)).toBeNull();
  });

  it("aborts if the slot is claimed externally mid-sequence", async () => {
    const store = new InMemorySlotHoldStore();
    // A direct booking grabs the slot before offers start.
    await store.acquire("slot-1", "direct-booking", 60_000);
    const result = await runWaitlistOffers(store, "slot-1", [
      { patientId: "p1", notifyAndAwaitClaim: async () => true },
    ]);
    expect(result.claimedBy).toBeNull();
  });
});
