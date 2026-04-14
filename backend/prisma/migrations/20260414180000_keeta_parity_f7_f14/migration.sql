-- F7-F14 + Amendments — Keeta Parity schema additions
-- Adds 12 new models, 3 new enums, plus Shift.deliveryArea and Notification.userId nullability.
-- ─── New enums ────────────────────────────────────────────────────────────
CREATE TYPE "BillingStatus" AS ENUM ('PENDING_INVOICE', 'AWAITING_APPROVAL', 'APPROVED', 'PAID', 'REJECTED');
CREATE TYPE "TaxInvoiceStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED');
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'WITHDRAWN', 'FAILED');
-- ─── Column changes on existing tables ───────────────────────────────────
ALTER TABLE "Notification" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "deliveryArea" TEXT;
CREATE INDEX IF NOT EXISTS "Shift_tenantId_deliveryArea_date_idx" ON "Shift" ("tenantId", "deliveryArea", "date");
-- ─── New tables ──────────────────────────────────────────────────────────
-- PostgreSQL database dump
-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.17
-- Name: Billing; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public."Billing" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "partnerId" text NOT NULL,
    "groupId" text NOT NULL,
    "groupName" text NOT NULL,
    "billingId" text NOT NULL,
    "billType" text NOT NULL,
    period text NOT NULL,
    "billingDate" timestamp(3) without time zone NOT NULL,
    "invoiceAmount" numeric(18,3) NOT NULL,
    "payableAmount" numeric(18,3) NOT NULL,
    status public."BillingStatus" DEFAULT 'PENDING_INVOICE'::public."BillingStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
-- Name: CourierAttendanceSlot; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public."CourierAttendanceSlot" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "driverId" text NOT NULL,
    date date NOT NULL,
    "slotStart" integer NOT NULL,
    "slotEnd" integer NOT NULL,
    status text NOT NULL,
    "onShiftMin" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
-- Name: CourierIncentivePayout; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public."CourierIncentivePayout" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "roundId" text NOT NULL,
    "driverId" text NOT NULL,
    "experienceRate" double precision DEFAULT 0 NOT NULL,
    "experienceTier" text,
    "experiencePayKwd" integer DEFAULT 0 NOT NULL,
    "validDaCount" integer DEFAULT 0 NOT NULL,
    "validDaTier" text,
    "validDaPayKwd" integer DEFAULT 0 NOT NULL,
    "totalPayKwd" integer DEFAULT 0 NOT NULL,
    "computedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
-- Name: DeliveryArea; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public."DeliveryArea" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    "nameAr" text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
-- Name: IncentiveGoal; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public."IncentiveGoal" (
    id text NOT NULL,
    "roundId" text NOT NULL,
    name text NOT NULL,
    weight double precision NOT NULL,
    "targetValue" double precision NOT NULL,
    "minThreshold" double precision NOT NULL
);
-- Name: IncentiveTargetRound; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public."IncentiveTargetRound" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "partnerId" text NOT NULL,
    period text NOT NULL,
    "vehicleType" text NOT NULL,
    "issuedAt" timestamp(3) without time zone NOT NULL,
    "initialTarget" integer NOT NULL,
    "adjustedTarget" integer,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    operator text DEFAULT 'Keeta OPS'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
-- Name: IncentiveTier; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public."IncentiveTier" (
    id text NOT NULL,
    "roundId" text NOT NULL,
    kind text NOT NULL,
    level text NOT NULL,
    "minRate" double precision NOT NULL,
    "maxRate" double precision NOT NULL,
    payment integer NOT NULL
);
-- Name: Partner; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public."Partner" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    "groupId" text NOT NULL,
    "groupName" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
-- Name: PartnerBankAccount; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public."PartnerBankAccount" (
    id text NOT NULL,
    "partnerId" text NOT NULL,
    "bankName" text NOT NULL,
    "accountName" text NOT NULL,
    "tailNumber" text NOT NULL,
    verified boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
-- Name: PaymentWithdrawal; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public."PaymentWithdrawal" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "billingId" text NOT NULL,
    "groupId" text NOT NULL,
    "groupName" text NOT NULL,
    "withdrawTime" timestamp(3) without time zone NOT NULL,
    "tailNumber" text NOT NULL,
    "amountKwd" numeric(18,3) NOT NULL,
    status public."WithdrawalStatus" DEFAULT 'PENDING'::public."WithdrawalStatus" NOT NULL,
    "operationStatus" text DEFAULT 'Withdrawn'::text NOT NULL,
    note text DEFAULT 'SYSTEM AUTO WITHDRAW'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
-- Name: ShiftComplianceConfig; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public."ShiftComplianceConfig" (
    "tenantId" text NOT NULL,
    "underShiftHours" double precision DEFAULT 10 NOT NULL,
    "evaluateCron" text DEFAULT '0 6 * * *'::text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
-- Name: TaxInvoice; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public."TaxInvoice" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "billingId" text NOT NULL,
    "invoiceNo" text NOT NULL,
    "issueDate" timestamp(3) without time zone NOT NULL,
    "sellerName" text NOT NULL,
    "totalAmount" numeric(18,3) NOT NULL,
    "fileUrl" text,
    status public."TaxInvoiceStatus" DEFAULT 'DRAFT'::public."TaxInvoiceStatus" NOT NULL,
    "rejectReason" text,
    "submittedAt" timestamp(3) without time zone,
    "acceptedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
-- Name: Billing Billing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."Billing"
    ADD CONSTRAINT "Billing_pkey" PRIMARY KEY (id);
-- Name: CourierAttendanceSlot CourierAttendanceSlot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."CourierAttendanceSlot"
    ADD CONSTRAINT "CourierAttendanceSlot_pkey" PRIMARY KEY (id);
-- Name: CourierIncentivePayout CourierIncentivePayout_pkey; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."CourierIncentivePayout"
    ADD CONSTRAINT "CourierIncentivePayout_pkey" PRIMARY KEY (id);
-- Name: DeliveryArea DeliveryArea_pkey; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."DeliveryArea"
    ADD CONSTRAINT "DeliveryArea_pkey" PRIMARY KEY (id);
-- Name: IncentiveGoal IncentiveGoal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."IncentiveGoal"
    ADD CONSTRAINT "IncentiveGoal_pkey" PRIMARY KEY (id);
-- Name: IncentiveTargetRound IncentiveTargetRound_pkey; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."IncentiveTargetRound"
    ADD CONSTRAINT "IncentiveTargetRound_pkey" PRIMARY KEY (id);
-- Name: IncentiveTier IncentiveTier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."IncentiveTier"
    ADD CONSTRAINT "IncentiveTier_pkey" PRIMARY KEY (id);
-- Name: PartnerBankAccount PartnerBankAccount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."PartnerBankAccount"
    ADD CONSTRAINT "PartnerBankAccount_pkey" PRIMARY KEY (id);
-- Name: Partner Partner_pkey; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."Partner"
    ADD CONSTRAINT "Partner_pkey" PRIMARY KEY (id);
-- Name: PaymentWithdrawal PaymentWithdrawal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."PaymentWithdrawal"
    ADD CONSTRAINT "PaymentWithdrawal_pkey" PRIMARY KEY (id);
-- Name: ShiftComplianceConfig ShiftComplianceConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."ShiftComplianceConfig"
    ADD CONSTRAINT "ShiftComplianceConfig_pkey" PRIMARY KEY ("tenantId");
-- Name: TaxInvoice TaxInvoice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."TaxInvoice"
    ADD CONSTRAINT "TaxInvoice_pkey" PRIMARY KEY (id);
-- Name: Billing_billingId_key; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "Billing_billingId_key" ON public."Billing" USING btree ("billingId");
-- Name: Billing_tenantId_period_idx; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "Billing_tenantId_period_idx" ON public."Billing" USING btree ("tenantId", period);
-- Name: Billing_tenantId_status_idx; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "Billing_tenantId_status_idx" ON public."Billing" USING btree ("tenantId", status);
-- Name: CourierAttendanceSlot_tenantId_date_idx; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "CourierAttendanceSlot_tenantId_date_idx" ON public."CourierAttendanceSlot" USING btree ("tenantId", date);
-- Name: CourierAttendanceSlot_tenantId_driverId_date_slotStart_key; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "CourierAttendanceSlot_tenantId_driverId_date_slotStart_key" ON public."CourierAttendanceSlot" USING btree ("tenantId", "driverId", date, "slotStart");
-- Name: CourierIncentivePayout_roundId_driverId_key; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "CourierIncentivePayout_roundId_driverId_key" ON public."CourierIncentivePayout" USING btree ("roundId", "driverId");
-- Name: CourierIncentivePayout_tenantId_driverId_idx; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "CourierIncentivePayout_tenantId_driverId_idx" ON public."CourierIncentivePayout" USING btree ("tenantId", "driverId");
-- Name: DeliveryArea_tenantId_active_idx; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "DeliveryArea_tenantId_active_idx" ON public."DeliveryArea" USING btree ("tenantId", active);
-- Name: DeliveryArea_tenantId_name_key; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "DeliveryArea_tenantId_name_key" ON public."DeliveryArea" USING btree ("tenantId", name);
-- Name: IncentiveGoal_roundId_idx; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IncentiveGoal_roundId_idx" ON public."IncentiveGoal" USING btree ("roundId");
-- Name: IncentiveTargetRound_tenantId_partnerId_period_vehicleType_key; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IncentiveTargetRound_tenantId_partnerId_period_vehicleType_key" ON public."IncentiveTargetRound" USING btree ("tenantId", "partnerId", period, "vehicleType");
-- Name: IncentiveTargetRound_tenantId_period_idx; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IncentiveTargetRound_tenantId_period_idx" ON public."IncentiveTargetRound" USING btree ("tenantId", period);
-- Name: IncentiveTier_roundId_kind_idx; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IncentiveTier_roundId_kind_idx" ON public."IncentiveTier" USING btree ("roundId", kind);
-- Name: PartnerBankAccount_partnerId_idx; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "PartnerBankAccount_partnerId_idx" ON public."PartnerBankAccount" USING btree ("partnerId");
-- Name: Partner_tenantId_idx; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "Partner_tenantId_idx" ON public."Partner" USING btree ("tenantId");
-- Name: Partner_tenantId_name_key; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "Partner_tenantId_name_key" ON public."Partner" USING btree ("tenantId", name);
-- Name: PaymentWithdrawal_tenantId_withdrawTime_idx; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "PaymentWithdrawal_tenantId_withdrawTime_idx" ON public."PaymentWithdrawal" USING btree ("tenantId", "withdrawTime");
-- Name: TaxInvoice_billingId_key; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "TaxInvoice_billingId_key" ON public."TaxInvoice" USING btree ("billingId");
-- Name: TaxInvoice_tenantId_status_idx; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "TaxInvoice_tenantId_status_idx" ON public."TaxInvoice" USING btree ("tenantId", status);
-- Name: Billing Billing_partnerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."Billing"
    ADD CONSTRAINT "Billing_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES public."Partner"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
-- Name: Billing Billing_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."Billing"
    ADD CONSTRAINT "Billing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
-- Name: CourierAttendanceSlot CourierAttendanceSlot_driverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."CourierAttendanceSlot"
    ADD CONSTRAINT "CourierAttendanceSlot_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES public."Driver"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
-- Name: CourierAttendanceSlot CourierAttendanceSlot_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."CourierAttendanceSlot"
    ADD CONSTRAINT "CourierAttendanceSlot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
-- Name: CourierIncentivePayout CourierIncentivePayout_driverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."CourierIncentivePayout"
    ADD CONSTRAINT "CourierIncentivePayout_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES public."Driver"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
-- Name: CourierIncentivePayout CourierIncentivePayout_roundId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."CourierIncentivePayout"
    ADD CONSTRAINT "CourierIncentivePayout_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES public."IncentiveTargetRound"(id) ON UPDATE CASCADE ON DELETE CASCADE;
-- Name: CourierIncentivePayout CourierIncentivePayout_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."CourierIncentivePayout"
    ADD CONSTRAINT "CourierIncentivePayout_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
-- Name: DeliveryArea DeliveryArea_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."DeliveryArea"
    ADD CONSTRAINT "DeliveryArea_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
-- Name: IncentiveGoal IncentiveGoal_roundId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."IncentiveGoal"
    ADD CONSTRAINT "IncentiveGoal_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES public."IncentiveTargetRound"(id) ON UPDATE CASCADE ON DELETE CASCADE;
-- Name: IncentiveTargetRound IncentiveTargetRound_partnerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."IncentiveTargetRound"
    ADD CONSTRAINT "IncentiveTargetRound_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES public."Partner"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
-- Name: IncentiveTargetRound IncentiveTargetRound_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."IncentiveTargetRound"
    ADD CONSTRAINT "IncentiveTargetRound_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
-- Name: IncentiveTier IncentiveTier_roundId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."IncentiveTier"
    ADD CONSTRAINT "IncentiveTier_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES public."IncentiveTargetRound"(id) ON UPDATE CASCADE ON DELETE CASCADE;
-- Name: PartnerBankAccount PartnerBankAccount_partnerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."PartnerBankAccount"
    ADD CONSTRAINT "PartnerBankAccount_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES public."Partner"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
-- Name: Partner Partner_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."Partner"
    ADD CONSTRAINT "Partner_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
-- Name: PaymentWithdrawal PaymentWithdrawal_billingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."PaymentWithdrawal"
    ADD CONSTRAINT "PaymentWithdrawal_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES public."Billing"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
-- Name: PaymentWithdrawal PaymentWithdrawal_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."PaymentWithdrawal"
    ADD CONSTRAINT "PaymentWithdrawal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
-- Name: ShiftComplianceConfig ShiftComplianceConfig_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."ShiftComplianceConfig"
    ADD CONSTRAINT "ShiftComplianceConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
-- Name: TaxInvoice TaxInvoice_billingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."TaxInvoice"
    ADD CONSTRAINT "TaxInvoice_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES public."Billing"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
-- Name: TaxInvoice TaxInvoice_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public."TaxInvoice"
    ADD CONSTRAINT "TaxInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
-- PostgreSQL database dump complete
