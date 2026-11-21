export function splitAmount(amountCents, commissionBps) {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0 || !Number.isInteger(commissionBps) || commissionBps < 0 || commissionBps > 10000) throw new TypeError('Importe o comisión inválidos');
  const commissionCents = Number((BigInt(amountCents) * BigInt(commissionBps) + 5000n) / 10000n);
  return { amountCents, commissionCents, creatorAmountCents: amountCents - commissionCents };
}
