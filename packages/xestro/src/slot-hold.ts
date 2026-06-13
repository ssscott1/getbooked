/**
 * Slot-hold primitive — double-booking prevention during checkout, and the
 * exclusive claim window for waitlist backfill offers.
 *
 * Production implementation is Redis (`SET key NX PX <ttl>`); the in-memory
 * implementation below has identical semantics and backs unit tests and local
 * dev. Semantics:
 *   - at most one active hold per slot key at any time
 *   - holds expire after ttlMs (checkout default ~5 min; waitlist claim 15 min)
 *   - only the holder can release or convert its hold
 */

export interface SlotHold {
  slotKey: string;
  holderId: string;
  expiresAt: number; // epoch ms
}

export interface SlotHoldStore {
  /**
   * Attempt to acquire an exclusive hold. Returns the hold on success, or
   * null if another active hold exists.
   */
  acquire(slotKey: string, holderId: string, ttlMs: number): Promise<SlotHold | null>;
  /** Release a hold — only succeeds for the current holder. */
  release(slotKey: string, holderId: string): Promise<boolean>;
  /** The current active hold, if any (expired holds are treated as absent). */
  get(slotKey: string): Promise<SlotHold | null>;
}

export const CHECKOUT_HOLD_TTL_MS = 5 * 60 * 1000;
export const WAITLIST_CLAIM_TTL_MS = 15 * 60 * 1000;

export class InMemorySlotHoldStore implements SlotHoldStore {
  private holds = new Map<string, SlotHold>();

  constructor(private readonly now: () => number = Date.now) {}

  async acquire(slotKey: string, holderId: string, ttlMs: number): Promise<SlotHold | null> {
    const existing = this.activeHold(slotKey);
    if (existing && existing.holderId !== holderId) return null;
    const hold: SlotHold = { slotKey, holderId, expiresAt: this.now() + ttlMs };
    this.holds.set(slotKey, hold);
    return hold;
  }

  async release(slotKey: string, holderId: string): Promise<boolean> {
    const existing = this.activeHold(slotKey);
    if (!existing || existing.holderId !== holderId) return false;
    this.holds.delete(slotKey);
    return true;
  }

  async get(slotKey: string): Promise<SlotHold | null> {
    return this.activeHold(slotKey);
  }

  private activeHold(slotKey: string): SlotHold | null {
    const hold = this.holds.get(slotKey);
    if (!hold) return null;
    if (hold.expiresAt <= this.now()) {
      this.holds.delete(slotKey);
      return null;
    }
    return hold;
  }
}

/**
 * Sequential waitlist offer runner: offers a freed slot to candidates in
 * priority order, giving each an exclusive claim window. The slot can never be
 * double-claimed because the claim is the hold.
 */
export interface WaitlistCandidate {
  patientId: string;
  /** Resolves true if the patient claimed the offer within the window. */
  notifyAndAwaitClaim: () => Promise<boolean>;
}

export async function runWaitlistOffers(
  store: SlotHoldStore,
  slotKey: string,
  candidates: WaitlistCandidate[],
  claimTtlMs: number = WAITLIST_CLAIM_TTL_MS,
): Promise<{ claimedBy: string | null }> {
  for (const candidate of candidates) {
    const hold = await store.acquire(slotKey, candidate.patientId, claimTtlMs);
    if (!hold) {
      // Slot was claimed (e.g. booked directly) while we were offering.
      return { claimedBy: null };
    }
    const claimed = await candidate.notifyAndAwaitClaim();
    if (claimed) {
      return { claimedBy: candidate.patientId };
    }
    await store.release(slotKey, candidate.patientId);
  }
  return { claimedBy: null };
}
