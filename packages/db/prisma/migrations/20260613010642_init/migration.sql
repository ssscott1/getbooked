-- CreateEnum
CREATE TYPE "BookingMode" AS ENUM ('INSTANT', 'REQUEST');

-- CreateEnum
CREATE TYPE "PracticeRole" AS ENUM ('OWNER', 'PRACTICE_MANAGER', 'RECEPTION', 'PRACTITIONER_READ_ONLY');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('DRAFT', 'UPLOADED', 'EXTRACTED', 'VERIFIED', 'ACTIVE', 'EXPIRING', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReferralSource" AS ENUM ('PATIENT_UPLOAD', 'GP_SECURE_MESSAGING', 'PRACTICE_ENTERED');

-- CreateEnum
CREATE TYPE "TriageUrgency" AS ENUM ('URGENT', 'SOON', 'ROUTINE');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('REFERRAL', 'INTAKE_RESPONSE', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('REQUESTED', 'TRIAGED', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'NO_SHOW', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('MARKETPLACE', 'WIDGET', 'PHONE', 'PMS');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('ACTIVE', 'OFFERED', 'CLAIMED', 'LAPSED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('SMS', 'EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('CORE', 'PRO', 'GROUP');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SyncMode" AS ENUM ('LIVE', 'MANAGED_CALENDAR', 'REQUEST');

-- CreateEnum
CREATE TYPE "SyncDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "SyncEventStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('PRACTICE_USER', 'PATIENT', 'PLATFORM_ADMIN', 'SYSTEM');

-- CreateTable
CREATE TABLE "Practice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "abn" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "websiteUrl" TEXT,
    "bio" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Practice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "suburb" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Australia/Sydney',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "wheelchairAccess" BOOLEAN NOT NULL DEFAULT false,
    "parkingNotes" TEXT,
    "transportNotes" TEXT,
    "pmsExternalId" TEXT,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Practitioner" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "title" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "subSpecialties" TEXT[],
    "specialInterests" TEXT[],
    "proceduresOffered" TEXT[],
    "languages" TEXT[],
    "gender" TEXT,
    "bio" TEXT,
    "photoUrl" TEXT,
    "ahpraNumber" TEXT,
    "hospitalAffiliations" TEXT[],
    "telehealth" BOOLEAN NOT NULL DEFAULT false,
    "acceptsNewPatients" BOOLEAN NOT NULL DEFAULT true,
    "referralRequired" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "pmsExternalId" TEXT,
    "maxNewPatientsPerSession" INTEGER,
    "minNoticeHours" INTEGER NOT NULL DEFAULT 24,
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 90,

    CONSTRAINT "Practitioner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentType" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "telehealth" BOOLEAN NOT NULL DEFAULT false,
    "onlineBookable" BOOLEAN NOT NULL DEFAULT true,
    "bookingMode" "BookingMode" NOT NULL DEFAULT 'REQUEST',
    "triageBeforeConfirm" BOOLEAN NOT NULL DEFAULT false,
    "preparationInstructions" TEXT,
    "pmsExternalId" TEXT,

    CONSTRAINT "AppointmentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeUser" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "PracticeRole" NOT NULL,
    "mfaEnrolled" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "medicareNumberEnc" TEXT,
    "dvaNumberEnc" TEXT,
    "healthFundEnc" TEXT,
    "interpreterNeeded" BOOLEAN NOT NULL DEFAULT false,
    "preferredLanguage" TEXT,
    "accountClaimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dependent" (
    "id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "relationship" TEXT NOT NULL,
    "medicareNumberEnc" TEXT,

    CONSTRAINT "Dependent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "dependentId" TEXT,
    "practiceId" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'DRAFT',
    "source" "ReferralSource" NOT NULL DEFAULT 'PATIENT_UPLOAD',
    "referringDoctorName" TEXT,
    "referringProviderNumber" TEXT,
    "referralDate" TIMESTAMP(3),
    "periodMonths" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "specialty" TEXT,
    "extractedJson" JSONB,
    "extractionModel" TEXT,
    "extractionConfidence" DOUBLE PRECISION,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "triageUrgency" "TriageUrgency",
    "triagedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "referralId" TEXT,
    "kind" "DocumentKind" NOT NULL,
    "s3Key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pmsAttachedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "appointmentTypeId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "pmsExternalId" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "appointmentTypeId" TEXT NOT NULL,
    "slotId" TEXT,
    "patientId" TEXT,
    "dependentId" TEXT,
    "referralId" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "source" "AppointmentSource" NOT NULL DEFAULT 'MARKETPLACE',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "telehealth" BOOLEAN NOT NULL DEFAULT false,
    "telehealthUrl" TEXT,
    "cancellationReason" TEXT,
    "declineMessage" TEXT,
    "requestExpiresAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "pmsExternalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "practitionerId" TEXT,
    "appointmentTypeId" TEXT,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'ACTIVE',
    "urgency" "TriageUrgency",
    "earliestAcceptable" TIMESTAMP(3),
    "offeredSlotId" TEXT,
    "offerExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeSchedule" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "appointmentTypeId" TEXT NOT NULL,
    "consultationFeeCents" INTEGER,
    "medicareRebateCents" INTEGER,
    "estimatedGapCents" INTEGER,
    "depositCents" INTEGER,
    "cancellationPolicy" TEXT,
    "feeNotListed" BOOLEAN NOT NULL DEFAULT false,
    "feeNotListedExplanation" TEXT,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeEstimate" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "feeScheduleId" TEXT,
    "consultationFeeCents" INTEGER,
    "medicareRebateCents" INTEGER,
    "estimatedGapCents" INTEGER,
    "depositCents" INTEGER,
    "disclosedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeForm" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schemaJson" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "IntakeForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeFormResponse" (
    "id" TEXT NOT NULL,
    "intakeFormId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "answersJson" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3),
    "pmsSyncedAt" TIMESTAMP(3),

    CONSTRAINT "IntakeFormResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageJourney" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "appointmentTypeId" TEXT,
    "name" TEXT NOT NULL,
    "stepsJson" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MessageJourney_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT,
    "appointmentId" TEXT,
    "channel" "MessageChannel" NOT NULL,
    "direction" "MessageDirection" NOT NULL DEFAULT 'OUTBOUND',
    "templateKey" TEXT,
    "body" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "inReplyToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "practitionerSeats" INTEGER NOT NULL DEFAULT 1,
    "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "trialEndsAt" TIMESTAMP(3),
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncConnection" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "mode" "SyncMode" NOT NULL DEFAULT 'REQUEST',
    "pmsVendor" TEXT NOT NULL DEFAULT 'xestro',
    "credentialRef" TEXT,
    "healthy" BOOLEAN NOT NULL DEFAULT true,
    "lastReadAt" TIMESTAMP(3),
    "lastWriteAt" TIMESTAMP(3),
    "lastWebhookAt" TIMESTAMP(3),
    "dlqDepth" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncEvent" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "direction" "SyncDirection" NOT NULL,
    "kind" TEXT NOT NULL,
    "externalEventId" TEXT,
    "payloadJson" JSONB,
    "status" "SyncEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "SyncEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "practiceId" TEXT,
    "patientId" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Practice_slug_key" ON "Practice"("slug");

-- CreateIndex
CREATE INDEX "Location_practiceId_idx" ON "Location"("practiceId");

-- CreateIndex
CREATE INDEX "Location_postcode_idx" ON "Location"("postcode");

-- CreateIndex
CREATE UNIQUE INDEX "Practitioner_slug_key" ON "Practitioner"("slug");

-- CreateIndex
CREATE INDEX "Practitioner_practiceId_idx" ON "Practitioner"("practiceId");

-- CreateIndex
CREATE INDEX "Practitioner_specialty_idx" ON "Practitioner"("specialty");

-- CreateIndex
CREATE INDEX "AppointmentType_practiceId_idx" ON "AppointmentType"("practiceId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeUser_email_key" ON "PracticeUser"("email");

-- CreateIndex
CREATE INDEX "PracticeUser_practiceId_idx" ON "PracticeUser"("practiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_phone_key" ON "Patient"("phone");

-- CreateIndex
CREATE INDEX "Dependent_guardianId_idx" ON "Dependent"("guardianId");

-- CreateIndex
CREATE INDEX "Referral_patientId_idx" ON "Referral"("patientId");

-- CreateIndex
CREATE INDEX "Referral_practiceId_status_idx" ON "Referral"("practiceId", "status");

-- CreateIndex
CREATE INDEX "Referral_expiresAt_idx" ON "Referral"("expiresAt");

-- CreateIndex
CREATE INDEX "Document_referralId_idx" ON "Document"("referralId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_practitionerId_startsAt_idx" ON "AvailabilitySlot"("practitionerId", "startsAt");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_startsAt_idx" ON "AvailabilitySlot"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilitySlot_practitionerId_startsAt_appointmentTypeId_key" ON "AvailabilitySlot"("practitionerId", "startsAt", "appointmentTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_idempotencyKey_key" ON "Appointment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Appointment_practiceId_status_idx" ON "Appointment"("practiceId", "status");

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");

-- CreateIndex
CREATE INDEX "Appointment_startsAt_idx" ON "Appointment"("startsAt");

-- CreateIndex
CREATE INDEX "WaitlistEntry_practiceId_status_idx" ON "WaitlistEntry"("practiceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FeeSchedule_practiceId_appointmentTypeId_key" ON "FeeSchedule"("practiceId", "appointmentTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeEstimate_appointmentId_key" ON "FeeEstimate"("appointmentId");

-- CreateIndex
CREATE INDEX "IntakeForm_practiceId_idx" ON "IntakeForm"("practiceId");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeFormResponse_appointmentId_key" ON "IntakeFormResponse"("appointmentId");

-- CreateIndex
CREATE INDEX "MessageJourney_practiceId_idx" ON "MessageJourney"("practiceId");

-- CreateIndex
CREATE INDEX "Message_appointmentId_idx" ON "Message"("appointmentId");

-- CreateIndex
CREATE INDEX "Message_status_scheduledFor_idx" ON "Message"("status", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_practiceId_idx" ON "Subscription"("practiceId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncConnection_practiceId_key" ON "SyncConnection"("practiceId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncEvent_externalEventId_key" ON "SyncEvent"("externalEventId");

-- CreateIndex
CREATE INDEX "SyncEvent_connectionId_status_idx" ON "SyncEvent"("connectionId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_practiceId_createdAt_idx" ON "AuditLog"("practiceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_patientId_createdAt_idx" ON "AuditLog"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Practitioner" ADD CONSTRAINT "Practitioner_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentType" ADD CONSTRAINT "AppointmentType_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeUser" ADD CONSTRAINT "PracticeUser_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dependent" ADD CONSTRAINT "Dependent_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "Dependent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_appointmentTypeId_fkey" FOREIGN KEY ("appointmentTypeId") REFERENCES "AppointmentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_appointmentTypeId_fkey" FOREIGN KEY ("appointmentTypeId") REFERENCES "AppointmentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "AvailabilitySlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "Dependent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeSchedule" ADD CONSTRAINT "FeeSchedule_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeSchedule" ADD CONSTRAINT "FeeSchedule_appointmentTypeId_fkey" FOREIGN KEY ("appointmentTypeId") REFERENCES "AppointmentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeEstimate" ADD CONSTRAINT "FeeEstimate_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeEstimate" ADD CONSTRAINT "FeeEstimate_feeScheduleId_fkey" FOREIGN KEY ("feeScheduleId") REFERENCES "FeeSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeForm" ADD CONSTRAINT "IntakeForm_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeFormResponse" ADD CONSTRAINT "IntakeFormResponse_intakeFormId_fkey" FOREIGN KEY ("intakeFormId") REFERENCES "IntakeForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeFormResponse" ADD CONSTRAINT "IntakeFormResponse_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeFormResponse" ADD CONSTRAINT "IntakeFormResponse_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageJourney" ADD CONSTRAINT "MessageJourney_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageJourney" ADD CONSTRAINT "MessageJourney_appointmentTypeId_fkey" FOREIGN KEY ("appointmentTypeId") REFERENCES "AppointmentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "MessageJourney"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncConnection" ADD CONSTRAINT "SyncConnection_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncEvent" ADD CONSTRAINT "SyncEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "SyncConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
