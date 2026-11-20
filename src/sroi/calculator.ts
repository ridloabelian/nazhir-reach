import type { SroiInput, SroiResult, SroiStreamBreakdown } from '../types/domain.js';

export class SroiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SroiValidationError';
  }
}

function assertPct(label: string, val: number): void {
  if (!Number.isFinite(val) || val < 0 || val > 100) {
    throw new SroiValidationError(
      `Persentase ${label} harus berada pada rentang 0–100 (diterima: ${val}).`
    );
  }
}

export function calculateHonestSroi(input: SroiInput): SroiResult {
  if (!Number.isFinite(input.totalInvestmentIdr) || input.totalInvestmentIdr <= 0) {
    throw new SroiValidationError(
      'Total investasi/dana program (totalInvestmentIdr) harus lebih besar dari 0.'
    );
  }
  if (!Array.isArray(input.streams) || input.streams.length === 0) {
    throw new SroiValidationError('Minimal harus ada 1 outcome stream dampak.');
  }

  const discountRatePct = input.discountRatePct ?? 6;
  assertPct('discountRatePct', discountRatePct);
  const discountRate = discountRatePct / 100;

  let grossUndiscountedTotalIdr = 0;
  let presentValueBenefitsIdr = 0;
  let hasAnyHaircut = false;
  const streams: SroiStreamBreakdown[] = [];

  for (const stream of input.streams) {
    if (!Number.isFinite(stream.beneficiaryCount) || stream.beneficiaryCount <= 0) {
      throw new SroiValidationError(
        `beneficiaryCount pada "${stream.label}" harus > 0.`
      );
    }
    if (!Number.isFinite(stream.grossUnitValueIdr) || stream.grossUnitValueIdr <= 0) {
      throw new SroiValidationError(
        `grossUnitValueIdr pada "${stream.label}" harus > 0.`
      );
    }
    if (
      !Number.isInteger(stream.benefitPeriodYears) ||
      stream.benefitPeriodYears < 1 ||
      stream.benefitPeriodYears > 20
    ) {
      throw new SroiValidationError(
        `benefitPeriodYears pada "${stream.label}" harus bilangan bulat 1–20 tahun.`
      );
    }

    assertPct(`deadweightPct (${stream.label})`, stream.deadweightPct);
    assertPct(`displacementPct (${stream.label})`, stream.displacementPct);
    assertPct(`attributionPct (${stream.label})`, stream.attributionPct);
    assertPct(`dropOffPct (${stream.label})`, stream.dropOffPct);

    if (stream.deadweightPct > 0 || stream.attributionPct > 0) {
      hasAnyHaircut = true;
    }

    const grossAnnualValueIdr = stream.beneficiaryCount * stream.grossUnitValueIdr;
    const streamGrossTotal = grossAnnualValueIdr * stream.benefitPeriodYears;

    const survivalDeadweight = 1 - stream.deadweightPct / 100;
    const survivalDisplacement = 1 - stream.displacementPct / 100;
    const survivalAttribution = 1 - stream.attributionPct / 100;

    const year1NetImpactIdr =
      grossAnnualValueIdr *
      survivalDeadweight *
      survivalDisplacement *
      survivalAttribution;

    const yearlyNetPresentValues: SroiStreamBreakdown['yearlyNetPresentValues'] = [];
    let streamPresentValueIdr = 0;

    for (let year = 1; year <= stream.benefitPeriodYears; year += 1) {
      const dropOffFactor = Math.pow(1 - stream.dropOffPct / 100, year - 1);
      const netImpactIdr = year1NetImpactIdr * dropOffFactor;
      const presentValueIdr = netImpactIdr / Math.pow(1 + discountRate, year);
      streamPresentValueIdr += presentValueIdr;
      yearlyNetPresentValues.push({
        year,
        netImpactIdr: Math.round(netImpactIdr),
        presentValueIdr: Math.round(presentValueIdr)
      });
    }

    grossUndiscountedTotalIdr += streamGrossTotal;
    presentValueBenefitsIdr += streamPresentValueIdr;

    streams.push({
      label: stream.label,
      beneficiaryCount: stream.beneficiaryCount,
      grossAnnualValueIdr: Math.round(grossAnnualValueIdr),
      grossUndiscountedTotalIdr: Math.round(streamGrossTotal),
      year1NetImpactIdr: Math.round(year1NetImpactIdr),
      presentValueIdr: Math.round(streamPresentValueIdr),
      yearlyNetPresentValues
    });
  }

  const roundedGross = Math.round(grossUndiscountedTotalIdr);
  const roundedPv = Math.round(presentValueBenefitsIdr);
  const netPresentSocialValueIdr = roundedPv - Math.round(input.totalInvestmentIdr);
  const naiveVanityRatio = Number(
    (grossUndiscountedTotalIdr / input.totalInvestmentIdr).toFixed(2)
  );
  const honestSroiRatio = Number(
    (presentValueBenefitsIdr / input.totalInvestmentIdr).toFixed(2)
  );
  const haircutPct =
    grossUndiscountedTotalIdr > 0
      ? Number(
          (
            (1 - presentValueBenefitsIdr / grossUndiscountedTotalIdr) *
            100
          ).toFixed(2)
        )
      : 0;

  let credibilityBand: SroiResult['credibilityBand'] = 'CONSERVATIVE_CREDIBLE';
  if (honestSroiRatio < 1.0) {
    credibilityBand = 'SUB_BREAKEVEN';
  } else if (honestSroiRatio > 5.5 || !hasAnyHaircut) {
    credibilityBand = 'REQUIRES_CWC_AUDIT';
  }

  const methodologyNote =
    credibilityBand === 'CONSERVATIVE_CREDIBLE'
      ? 'Rasio SROI terdiskon berada pada koridor wajar & jujur (1.00x–5.50x) setelah potongan deadweight, displacement, attribution, drop-off, dan diskonto nilai waktu.'
      : credibilityBand === 'SUB_BREAKEVEN'
        ? 'Nilai manfaat sosial terdiskon berada di bawah nilai investasi awal (<1.00x); evaluasi ulang efisiensi biaya program.'
        : 'Rasio melampaui 5.50x atau belum menerapkan potongan deadweight & attribution; wajib diaudit CWC sebelum dipublikasikan ke Wakif.';

  return {
    programName: input.programName?.trim() || 'Program Wakaf Produktif / ZIS',
    totalInvestmentIdr: Math.round(input.totalInvestmentIdr),
    discountRatePct,
    grossUndiscountedTotalIdr: roundedGross,
    naiveVanityRatio,
    presentValueBenefitsIdr: roundedPv,
    netPresentSocialValueIdr,
    honestSroiRatio,
    haircutPct,
    credibilityBand,
    methodologyNote,
    streams
  };
}
