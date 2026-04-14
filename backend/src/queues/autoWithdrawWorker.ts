import { prisma } from "../config";
import { logger } from "../config/logger";

/**
 * F12 — triggered synchronously when a tax invoice is accepted. Creates a
 * PaymentWithdrawal, transitions Billing status, and simulates a payout call
 * (stubbed until PAYOUT_PROVIDER_URL is configured).
 */
export async function triggerWithdrawal(taxInvoiceId: string) {
  const inv = await prisma.taxInvoice.findUnique({
    where: { id: taxInvoiceId },
    include: { billing: { include: { partner: { include: { bankAccounts: true } } } } },
  });
  if (!inv) throw new Error("Tax invoice not found");
  if (inv.status !== "ACCEPTED") throw new Error("Invoice must be ACCEPTED before withdrawal");

  const billing = inv.billing;
  const bank = billing.partner.bankAccounts[0];
  if (!bank) throw new Error("Partner has no bank account on file");

  await prisma.billing.update({ where: { id: billing.id }, data: { status: "APPROVED" } });

  const withdrawal = await prisma.paymentWithdrawal.create({
    data: {
      tenantId: billing.tenantId,
      billingId: billing.id,
      groupId: billing.groupId,
      groupName: billing.groupName,
      withdrawTime: new Date(),
      tailNumber: bank.tailNumber,
      amountKwd: billing.payableAmount,
      status: "PENDING",
      operationStatus: "Withdrawing",
      note: "SYSTEM AUTO WITHDRAW",
    },
  });

  // Stub: pretend the payout provider succeeded immediately.
  await prisma.paymentWithdrawal.update({
    where: { id: withdrawal.id },
    data: { status: "WITHDRAWN", operationStatus: "Withdrawn" },
  });

  await prisma.billing.update({ where: { id: billing.id }, data: { status: "PAID" } });

  logger.info({ billingId: billing.id, withdrawalId: withdrawal.id }, "autoWithdraw complete");
  return withdrawal;
}
