/**
 * @file boundary-inputs.test.ts
 * @description Table-driven boundary tests for all numeric DTO inputs
 *
 * Tests cover:
 * - Minimum documented values
 * - Maximum documented values
 * - One below minimum
 * - One above maximum
 * - Zero and negative values
 * - Type mismatches
 * - Type limits (Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER)
 */

import { validate } from "class-validator";
import { CreateMinimumIncomeProofDto } from "../../src/proofs/dto/create-minimum-income-proof.dto";
import { CreateChallengeDto } from "../../src/auth/dto/create-challenge.dto";
import { VerifyChallengeDto } from "../../src/auth/dto/verify-challenge.dto";

/**
 * Helper to extract validation error messages
 */
const getErrorMessages = async (
  dto: any
): Promise<Record<string, string[]>> => {
  const errors = await validate(dto);
  return errors.reduce(
    (acc, err) => {
      acc[err.property] = Object.values(err.constraints || {});
      return acc;
    },
    {} as Record<string, string[]>
  );
};

describe("Numeric Boundary Inputs - DTOs", () => {
  describe("CreateMinimumIncomeProofDto - expiresInDays", () => {
    const validBase = {
      selectedPaymentIds: ["payment-1"],
      thresholdAmount: "100.50",
      assetCode: "USD",
      assetIssuer: "GBUQWP3BOUZX34ULNQG23RQ6F4BVWCIYHOJKCEKTVMRPZ7N7TKLXLVXV",
      periodStart: "2024-01-01T00:00:00Z",
      periodEnd: "2024-12-31T23:59:59Z",
    };

    const testCases = [
      {
        name: "Valid: minimum boundary (1 day)",
        input: { ...validBase, expiresInDays: 1 },
        shouldPass: true,
      },
      {
        name: "Valid: maximum boundary (365 days)",
        input: { ...validBase, expiresInDays: 365 },
        shouldPass: true,
      },
      {
        name: "Valid: mid-range value (180 days)",
        input: { ...validBase, expiresInDays: 180 },
        shouldPass: true,
      },
      {
        name: "Invalid: below minimum (0 days)",
        input: { ...validBase, expiresInDays: 0 },
        shouldPass: false,
        expectedError: "must not be less than 1",
      },
      {
        name: "Invalid: above maximum (366 days)",
        input: { ...validBase, expiresInDays: 366 },
        shouldPass: false,
        expectedError: "must not be greater than 365",
      },
      {
        name: "Invalid: negative value (-1 day)",
        input: { ...validBase, expiresInDays: -1 },
        shouldPass: false,
        expectedError: "must not be less than 1",
      },
      {
        name: "Invalid: far above maximum (1000 days)",
        input: { ...validBase, expiresInDays: 1000 },
        shouldPass: false,
        expectedError: "must not be greater than 365",
      },
      {
        name: "Invalid: Number.MAX_SAFE_INTEGER",
        input: {
          ...validBase,
          expiresInDays: Number.MAX_SAFE_INTEGER,
        },
        shouldPass: false,
        expectedError: "must not be greater than 365",
      },
      {
        name: "Invalid: type is string instead of number",
        input: { ...validBase, expiresInDays: "365" },
        shouldPass: false,
        expectedError: "must be an integer number",
      },
      {
        name: "Valid: omitted (uses default)",
        input: validBase,
        shouldPass: true,
      },
      {
        name: "Invalid: floating point (not integer)",
        input: { ...validBase, expiresInDays: 365.5 },
        shouldPass: false,
        expectedError: "must be an integer number",
      },
    ];

    testCases.forEach(({ name, input, shouldPass, expectedError }) => {
      it(name, async () => {
        const dto = Object.assign(new CreateMinimumIncomeProofDto(), input);
        const errors = await validate(dto);

        if (shouldPass) {
          expect(errors).toHaveLength(0);
        } else {
          expect(errors.length).toBeGreaterThan(0);
          if (expectedError) {
            const expiresInDaysErrors = errors.find(
              (e) => e.property === "expiresInDays"
            );
            expect(expiresInDaysErrors).toBeDefined();
            const errorMessages = Object.values(
              expiresInDaysErrors?.constraints || {}
            ).join(", ");
            expect(errorMessages.toLowerCase()).toContain(
              expectedError.toLowerCase()
            );
          }
        }
      });
    });
  });

  describe("CreateMinimumIncomeProofDto - selectedPaymentIds", () => {
    const validBase = {
      thresholdAmount: "100.50",
      assetCode: "USD",
      assetIssuer: "GBUQWP3BOUZX34ULNQG23RQ6F4BVWCIYHOJKCEKTVMRPZ7N7TKLXLVXV",
      periodStart: "2024-01-01T00:00:00Z",
      periodEnd: "2024-12-31T23:59:59Z",
    };

    const testCases = [
      {
        name: "Valid: minimum (1 payment)",
        input: { ...validBase, selectedPaymentIds: ["payment-1"] },
        shouldPass: true,
      },
      {
        name: "Valid: typical case (5 payments)",
        input: {
          ...validBase,
          selectedPaymentIds: [
            "payment-1",
            "payment-2",
            "payment-3",
            "payment-4",
            "payment-5",
          ],
        },
        shouldPass: true,
      },
      {
        name: "Valid: large array (100 payments)",
        input: {
          ...validBase,
          selectedPaymentIds: Array.from(
            { length: 100 },
            (_, i) => `payment-${i + 1}`
          ),
        },
        shouldPass: true, // Currently no max bound enforced
      },
      {
        name: "Invalid: empty array",
        input: { ...validBase, selectedPaymentIds: [] },
        shouldPass: false,
        expectedError: "each value in array",
      },
      {
        name: "Invalid: type is not array",
        input: {
          ...validBase,
          selectedPaymentIds: "payment-1",
        },
        shouldPass: false,
        expectedError: "must be an array",
      },
      {
        name: "Invalid: array contains non-string",
        input: {
          ...validBase,
          selectedPaymentIds: ["payment-1", 123, "payment-2"],
        },
        shouldPass: false,
        expectedError: "each value",
      },
    ];

    testCases.forEach(({ name, input, shouldPass, expectedError }) => {
      it(name, async () => {
        const dto = Object.assign(new CreateMinimumIncomeProofDto(), input);
        const errors = await validate(dto);

        if (shouldPass) {
          expect(errors).toHaveLength(0);
        } else {
          expect(errors.length).toBeGreaterThan(0);
          if (expectedError) {
            const paymentErrors = errors.find(
              (e) => e.property === "selectedPaymentIds"
            );
            expect(paymentErrors).toBeDefined();
            const errorMessages = Object.values(
              paymentErrors?.constraints || {}
            ).join(", ");
            expect(errorMessages.toLowerCase()).toContain(
              expectedError.toLowerCase()
            );
          }
        }
      });
    });
  });

  describe("CreateMinimumIncomeProofDto - thresholdAmount", () => {
    const validBase = {
      selectedPaymentIds: ["payment-1"],
      assetCode: "USD",
      assetIssuer: "GBUQWP3BOUZX34ULNQG23RQ6F4BVWCIYHOJKCEKTVMRPZ7N7TKLXLVXV",
      periodStart: "2024-01-01T00:00:00Z",
      periodEnd: "2024-12-31T23:59:59Z",
    };

    const testCases = [
      {
        name: "Valid: zero (no decimals)",
        input: { ...validBase, thresholdAmount: "0" },
        shouldPass: true,
      },
      {
        name: "Valid: whole number",
        input: { ...validBase, thresholdAmount: "1000" },
        shouldPass: true,
      },
      {
        name: "Valid: 1 decimal place",
        input: { ...validBase, thresholdAmount: "100.1" },
        shouldPass: true,
      },
      {
        name: "Valid: 7 decimal places (maximum)",
        input: { ...validBase, thresholdAmount: "100.1234567" },
        shouldPass: true,
      },
      {
        name: "Valid: large number with decimals",
        input: { ...validBase, thresholdAmount: "999999999.1234567" },
        shouldPass: true,
      },
      {
        name: "Invalid: 8 decimal places (exceeds precision)",
        input: { ...validBase, thresholdAmount: "100.12345678" },
        shouldPass: false,
        expectedError: "invalid",
      },
      {
        name: "Invalid: negative number",
        input: { ...validBase, thresholdAmount: "-100.50" },
        shouldPass: false,
        expectedError: "invalid",
      },
      {
        name: "Invalid: non-numeric",
        input: { ...validBase, thresholdAmount: "abc" },
        shouldPass: false,
        expectedError: "invalid",
      },
      {
        name: "Invalid: empty string",
        input: { ...validBase, thresholdAmount: "" },
        shouldPass: false,
        expectedError: "invalid",
      },
      {
        name: "Invalid: only decimal point",
        input: { ...validBase, thresholdAmount: "." },
        shouldPass: false,
        expectedError: "invalid",
      },
      {
        name: "Invalid: scientific notation",
        input: { ...validBase, thresholdAmount: "1e10" },
        shouldPass: false,
        expectedError: "invalid",
      },
      {
        name: "Invalid: type is number not string",
        input: { ...validBase, thresholdAmount: 100.5 },
        shouldPass: false,
        expectedError: "must be a string",
      },
    ];

    testCases.forEach(({ name, input, shouldPass, expectedError }) => {
      it(name, async () => {
        const dto = Object.assign(new CreateMinimumIncomeProofDto(), input);
        const errors = await validate(dto);

        if (shouldPass) {
          expect(errors).toHaveLength(0);
        } else {
          expect(errors.length).toBeGreaterThan(0);
          if (expectedError) {
            const amountErrors = errors.find(
              (e) => e.property === "thresholdAmount"
            );
            expect(amountErrors).toBeDefined();
            const errorMessages = Object.values(
              amountErrors?.constraints || {}
            ).join(", ");
            expect(errorMessages.toLowerCase()).toContain(
              expectedError.toLowerCase()
            );
          }
        }
      });
    });
  });

  describe("CreateChallengeDto - walletAddress", () => {
    const testCases = [
      {
        name: "Valid: correct Stellar address (56 chars)",
        input: {
          walletAddress:
            "GBUQWP3BOUZX34ULNQG23RQ6F4BVWCIYHOJKCEKTVMRPZ7N7TKLXLVXV",
        },
        shouldPass: true,
      },
      {
        name: "Invalid: too short (55 chars)",
        input: {
          walletAddress:
            "GBUQWP3BOUZX34ULNQG23RQ6F4BVWCIYHOJKCEKTVMRPZ7N7TKLXLVX",
        },
        shouldPass: false,
        expectedError: "length",
      },
      {
        name: "Invalid: too long (57 chars)",
        input: {
          walletAddress:
            "GBUQWP3BOUZX34ULNQG23RQ6F4BVWCIYHOJKCEKTVMRPZ7N7TKLXLVXVV",
        },
        shouldPass: false,
        expectedError: "length",
      },
      {
        name: "Invalid: empty string",
        input: { walletAddress: "" },
        shouldPass: false,
        expectedError: "length",
      },
      {
        name: "Invalid: type is number",
        input: { walletAddress: 123456789 },
        shouldPass: false,
        expectedError: "must be a string",
      },
    ];

    testCases.forEach(({ name, input, shouldPass, expectedError }) => {
      it(name, async () => {
        const dto = Object.assign(new CreateChallengeDto(), input);
        const errors = await validate(dto);

        if (shouldPass) {
          expect(errors).toHaveLength(0);
        } else {
          expect(errors.length).toBeGreaterThan(0);
          if (expectedError) {
            const addressErrors = errors.find(
              (e) => e.property === "walletAddress"
            );
            expect(addressErrors).toBeDefined();
            const errorMessages = Object.values(
              addressErrors?.constraints || {}
            ).join(", ");
            expect(errorMessages.toLowerCase()).toContain(
              expectedError.toLowerCase()
            );
          }
        }
      });
    });
  });

  describe("VerifyChallengeDto - string fields (no length validation)", () => {
    it("should accept challengeId of any length", async () => {
      const dto = Object.assign(new VerifyChallengeDto(), {
        walletAddress:
          "GBUQWP3BOUZX34ULNQG23RQ6F4BVWCIYHOJKCEKTVMRPZ7N7TKLXLVXV",
        challengeId: "x", // Single char - boundary case
        signature: "sig",
      });
      const errors = await validate(dto);
      // Currently no length validation on challengeId
      expect(errors.filter((e) => e.property === "challengeId")).toHaveLength(
        0
      );
    });

    it("should accept very long challengeId", async () => {
      const dto = Object.assign(new VerifyChallengeDto(), {
        walletAddress:
          "GBUQWP3BOUZX34ULNQG23RQ6F4BVWCIYHOJKCEKTVMRPZ7N7TKLXLVXV",
        challengeId: "x".repeat(10000), // 10K characters - no validation
        signature: "sig",
      });
      const errors = await validate(dto);
      // Currently no validation on string length
      expect(errors.filter((e) => e.property === "challengeId")).toHaveLength(
        0
      );
    });

    it("should accept empty challengeId", async () => {
      const dto = Object.assign(new VerifyChallengeDto(), {
        walletAddress:
          "GBUQWP3BOUZX34ULNQG23RQ6F4BVWCIYHOJKCEKTVMRPZ7N7TKLXLVXV",
        challengeId: "", // Empty string - boundary case
        signature: "sig",
      });
      const errors = await validate(dto);
      // @IsString allows empty strings unless @MinLength is added
      expect(errors.filter((e) => e.property === "challengeId")).toHaveLength(
        0
      );
    });
  });
});
