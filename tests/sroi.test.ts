import { describe, expect, it } from 'vitest';
import {
  calculateHonestSroi,
  SroiValidationError
} from '../src/sroi/calculator.js';

describe('Honest SROI Calculator (ZK-027)', () => {
  it('applies deadweight, displacement, attribution, drop-off, and time discounting below vanity ratio', () => {
    const result = calculateHonestSroi({
      programName: 'Wakaf Sumur Bor Garut',
      totalInvestmentIdr: 300_000_000,
      discountRatePct: 6,
      streams: [
        {
          label: 'Kenaikan Hasil Panen Petani',
          beneficiaryCount: 320,
          grossUnitValueIdr: 2_500_000,
          deadweightPct: 20,
          displacementPct: 10,
          attributionPct: 25,
          dropOffPct: 15,
          benefitPeriodYears: 3
        }
      ]
    });

    // Gross = 320 * 2.5M * 3 = 2.4B -> Vanity = 8.00x
    expect(result.grossUndiscountedTotalIdr).toBe(2_400_000_000);
    expect(result.naiveVanityRatio).toBe(8.0);

    // Year 1 net = 800M * 0.8 * 0.9 * 0.75 = 432M
    expect(result.streams[0]?.year1NetImpactIdr).toBe(432_000_000);
    // PV(1) = 432M / 1.06 = 407,547,170
    // PV(2) = (432M * 0.85) / 1.06^2 = 326,806,693
    // PV(3) = (432M * 0.85^2) / 1.06^3 = 262,061,971
    // Total PV = 996,415,834 -> Honest SROI = 3.32x
    expect(result.presentValueBenefitsIdr).toBeCloseTo(996_415_834, -2);
    expect(result.honestSroiRatio).toBe(3.32);
    expect(result.honestSroiRatio).toBeLessThan(result.naiveVanityRatio);
    expect(result.haircutPct).toBeGreaterThan(50);
    expect(result.credibilityBand).toBe('CONSERVATIVE_CREDIBLE');
  });

  it('flags missing haircuts or excessive multiples as REQUIRES_CWC_AUDIT and detects SUB_BREAKEVEN', () => {
    const noHaircut = calculateHonestSroi({
      totalInvestmentIdr: 100_000_000,
      discountRatePct: 5,
      streams: [
        {
          label: 'Raw Benefit',
          beneficiaryCount: 100,
          grossUnitValueIdr: 2_000_000,
          deadweightPct: 0,
          displacementPct: 0,
          attributionPct: 0,
          dropOffPct: 0,
          benefitPeriodYears: 2
        }
      ]
    });
    expect(noHaircut.credibilityBand).toBe('REQUIRES_CWC_AUDIT');

    const subBreakeven = calculateHonestSroi({
      totalInvestmentIdr: 500_000_000,
      discountRatePct: 6,
      streams: [
        {
          label: 'Small Outcome',
          beneficiaryCount: 50,
          grossUnitValueIdr: 1_500_000,
          deadweightPct: 25,
          displacementPct: 10,
          attributionPct: 20,
          dropOffPct: 10,
          benefitPeriodYears: 2
        }
      ]
    });
    expect(subBreakeven.honestSroiRatio).toBeLessThan(1.0);
    expect(subBreakeven.credibilityBand).toBe('SUB_BREAKEVEN');
  });

  it('rejects invalid percentages or non-positive investment', () => {
    expect(() =>
      calculateHonestSroi({
        totalInvestmentIdr: 0,
        streams: [
          {
            label: 'Test',
            beneficiaryCount: 10,
            grossUnitValueIdr: 100_000,
            deadweightPct: 10,
            displacementPct: 0,
            attributionPct: 10,
            dropOffPct: 5,
            benefitPeriodYears: 1
          }
        ]
      })
    ).toThrowError(SroiValidationError);

    expect(() =>
      calculateHonestSroi({
        totalInvestmentIdr: 10_000_000,
        streams: [
          {
            label: 'Invalid pct',
            beneficiaryCount: 10,
            grossUnitValueIdr: 100_000,
            deadweightPct: 120,
            displacementPct: 0,
            attributionPct: 10,
            dropOffPct: 5,
            benefitPeriodYears: 1
          }
        ]
      })
    ).toThrowError(SroiValidationError);
  });
});
