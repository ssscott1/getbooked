/**
 * Referral validity — deterministic code, never model output (brief §5.2).
 *
 * Australian convention: GP → specialist referrals default to 12 months from
 * the date of WRITING when no period is stated; specialist → specialist
 * referrals default to 3 months; "indefinite" referrals do not lapse.
 * (Medicare Benefits Schedule referral rules.)
 */

export type ReferralPeriod = "3_months" | "12_months" | "indefinite" | "not_stated";

export interface ReferralValidity {
  /** Null for indefinite referrals. */
  expiresAt: Date | null;
  periodMonthsApplied: number | null;
  defaultApplied: boolean;
}

export function computeReferralExpiry(
  referralDate: Date,
  statedPeriod: ReferralPeriod,
  options: { referrerKind?: "gp" | "specialist" } = {},
): ReferralValidity {
  const referrerKind = options.referrerKind ?? "gp";

  let months: number | null;
  let defaultApplied = false;
  switch (statedPeriod) {
    case "indefinite":
      months = null;
      break;
    case "3_months":
      months = 3;
      break;
    case "12_months":
      months = 12;
      break;
    case "not_stated":
      months = referrerKind === "specialist" ? 3 : 12;
      defaultApplied = true;
      break;
  }

  if (months === null) {
    return { expiresAt: null, periodMonthsApplied: null, defaultApplied };
  }
  return {
    expiresAt: addMonthsUtc(referralDate, months),
    periodMonthsApplied: months,
    defaultApplied,
  };
}

export interface ExpiryCheck {
  status: "valid" | "expiring_before_appointment" | "expired";
  expiresAt: Date | null;
}

/**
 * §14 acceptance criterion: an expired referral attached to a future
 * appointment generates alerts to both patient and practice. This is the
 * predicate the alert job runs on.
 */
export function checkReferralAgainstAppointment(
  validity: ReferralValidity,
  appointmentStartsAt: Date,
  now: Date = new Date(),
): ExpiryCheck {
  if (validity.expiresAt === null) {
    return { status: "valid", expiresAt: null };
  }
  if (validity.expiresAt.getTime() <= now.getTime()) {
    return { status: "expired", expiresAt: validity.expiresAt };
  }
  if (validity.expiresAt.getTime() <= appointmentStartsAt.getTime()) {
    return { status: "expiring_before_appointment", expiresAt: validity.expiresAt };
  }
  return { status: "valid", expiresAt: validity.expiresAt };
}

/** Calendar-month addition with end-of-month clamping (31 Jan + 3m → 30 Apr). */
function addMonthsUtc(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const daysInTarget = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, daysInTarget));
  return result;
}
