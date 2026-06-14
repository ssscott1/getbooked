const API_URL =
  process.env["NEXT_PUBLIC_API_URL"] ??
  (typeof window === "undefined" ? "http://localhost:3001" : "");

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface PractitionerSummary {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  specialty: string;
  specialInterests: string[];
  languages: string[];
  telehealth: boolean;
  practice: {
    name: string;
    phone: string | null;
    locations: Array<{
      id: string;
      name: string;
      suburb: string;
      state: string;
      postcode: string;
    }>;
    appointmentTypes: Array<{
      id: string;
      name: string;
      durationMinutes: number;
      bookingMode: "INSTANT" | "REQUEST";
    }>;
  };
  slots: Array<{ startsAt: string }>;
}

export interface PractitionerSearchResult {
  data: PractitionerSummary[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export interface SlotHoldResult {
  slotId: string;
  holdToken: string;
  expiresAt: string;
  ttlSeconds: number;
}

export interface DepositIntentResult {
  clientSecret: string;
  depositAmountCents: number;
  currency: string;
}

// ── Endpoints ────────────────────────────────────────────────────────────────

export function searchPractitioners(params: {
  q?: string;
  specialty?: string;
  suburb?: string;
  state?: string;
  page?: number;
}): Promise<PractitionerSearchResult> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.specialty) qs.set("specialty", params.specialty);
  if (params.suburb) qs.set("suburb", params.suburb);
  if (params.state) qs.set("state", params.state);
  if (params.page) qs.set("page", String(params.page));
  return apiFetch(`/practitioners?${qs.toString()}`, {
    next: { revalidate: 60 },
  } as RequestInit);
}

export function getPractitioner(id: string) {
  return apiFetch(`/practitioners/${id}`, { next: { revalidate: 60 } } as RequestInit);
}

export function holdSlot(slotId: string, patientId?: string): Promise<SlotHoldResult> {
  return apiFetch(`/slots/${slotId}/hold`, {
    method: "POST",
    body: JSON.stringify({ patientId }),
  });
}

export function createDepositIntent(body: {
  slotId: string;
  holdToken: string;
  patientId: string;
  referralId?: string;
}): Promise<DepositIntentResult> {
  return apiFetch("/payments/deposit-intent", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function confirmBooking(body: {
  slotId: string;
  holdToken: string;
  patientId: string;
  referralId?: string;
}) {
  return apiFetch("/appointments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
