# Numeric Boundary Inventory - earnproof-backend

This document catalogs all numeric inputs, their constraints, and boundary conditions across the earnproof-backend application.

## Overview

- **Total numeric inputs inventoried**: 15+ direct user inputs and constants
- **Inputs with documented bounds**: 9
- **Inputs without documented bounds**: 6
- **Critical hard-coded limits**: 5
- **Arithmetic operations tracked**: 4 primary calculations

---

## 1. AUTHENTICATION MODULE

### Challenge Nonce Length
- **Type**: Constant (bytes)
- **Value**: `24`
- **Documented Bound**: Fixed at 24 bytes
- **Test Cases**: Fixed value, no boundary testing required
- **Risk Level**: LOW (cryptographic constant, not user input)

### Challenge Expiration Time
- **Type**: Constant (milliseconds)
- **Value**: `5 * 60 * 1000` = 300,000 ms (5 minutes)
- **Documented Bound**: Hard-coded 5-minute expiration
- **Test Cases**: No boundary testing for constant
- **Risk Level**: LOW (hard-coded configuration)
- **Arithmetic**: `Date.now() + 300_000` - potential overflow if Date.now() near MAX_SAFE_INTEGER

### Wallet Address Length
- **Type**: User input (string length)
- **Value Range**: Exactly 56 characters
- **Documented Bound**: `@Length(56, 56)` enforced
- **Test Cases**:
  - ✅ Valid: exactly 56 characters (Stellar public key format)
  - ✅ Below: 55 characters (rejected by validator)
  - ✅ Above: 57 characters (rejected by validator)
  - ✅ Zero: empty string (rejected)
  - ✅ Type mismatch: number input (rejected)
- **Risk Level**: LOW (strict validation enforced)

### Auth Token TTL
- **Type**: Optional parameter, defaults to constant (seconds)
- **Value Range**: `60 * 60 * 12` = 43,200 seconds (12 hours default)
- **Documented Bound**: Default 12 hours, can be overridden
- **Constraints**: `ttlSeconds` parameter passed to `sign()` function
- **Test Cases**:
  - ✅ Default: 43,200 seconds (12 hours)
  - ⚠️ Minimum: 1 second (no documented minimum)
  - ⚠️ Maximum: No documented maximum (could be years)
  - ⚠️ Zero: 0 seconds (invalid token, should reject)
  - ⚠️ Negative: -1 seconds (undefined behavior)
  - ⚠️ Very large: Number.MAX_SAFE_INTEGER (overflow risk)
- **Risk Level**: MEDIUM (no documented bounds, arithmetic used)
- **Arithmetic**: `Math.floor(Date.now() / 1000) + ttlSeconds` - overflow if ttlSeconds very large
- **Recommendation**: Add documented bounds (e.g., min: 60s, max: 31536000s = 1 year)

---

## 2. PAYMENTS MODULE

### Payment List Pagination Limit
- **Type**: Hard-coded constant (record count)
- **Value**: `100`
- **Documented Bound**: Hard-coded max 100 records per list query
- **Test Cases**: Fixed limit, no boundary testing for constant
- **Risk Level**: LOW (hard-coded configuration)
- **Notes**: No user control; prevents DoS on payment listing

### Payments Sync Counters (created, updated, skipped)
- **Type**: Derived values (auto-increment counters)
- **Value Range**: Unbounded, starts at 0
- **Documented Bound**: None
- **Test Cases**:
  - ✅ Zero: 0 payments sync'd (valid)
  - ⚠️ Maximum: No documented max, could exceed Number.MAX_SAFE_INTEGER
  - ⚠️ Negative: Counter should never be negative (logic error)
- **Risk Level**: MEDIUM (unbounded, returned in response, no overflow check)
- **Arithmetic**: Counter incremented in loop: `created++`, `updated++`, `skipped++`
- **Recommendation**: Add bounds check or BigInt for large-scale deployments

### Stellar Horizon Payment Fetch Limit
- **Type**: Constant (record count)
- **Value**: `200`
- **Documented Bound**: External API limit (Stellar Horizon)
- **Test Cases**: Fixed limit from external API
- **Risk Level**: LOW (external API constraint, not user input)

---

## 3. PROOFS MODULE

### Proof Expiration Days (Default)
- **Type**: Constant (days)
- **Value**: `30`
- **Documented Bound**: Hard-coded default 30 days
- **Test Cases**: No boundary testing for constant default
- **Risk Level**: LOW (hard-coded configuration)

### Proof Expiration Days (User Input)
- **Type**: User input (optional integer)
- **Value Range**: `1` to `365` days (with @Min(1) @Max(365) validation)
- **Documented Bound**: ✅ Min: 1 day, Max: 365 days (1 year)
- **Test Cases**:
  - ✅ Valid minimum: 1 day
  - ✅ Valid maximum: 365 days
  - ✅ Valid middle: 180 days
  - ❌ Below minimum: 0 days (rejected by @Min(1))
  - ❌ Above maximum: 366 days (rejected by @Max(365))
  - ❌ Negative: -1 days (rejected by @Min(1) and @IsInt)
  - ❌ Zero: 0 days (rejected by @Min(1))
  - ❌ Type mismatch: "30" as string (rejected by @IsInt)
  - ⚠️ Very large: Number.MAX_SAFE_INTEGER (rejected by @Max(365))
- **Risk Level**: LOW (bounded by class-validator decorators)
- **Arithmetic**: `now.getTime() + (expiresInDays * 24 * 60 * 60 * 1000)` - overflow risk if near DATE boundaries

### Selected Payments Array Size
- **Type**: User input (array length)
- **Value Range**: Minimum 1, maximum unbounded
- **Documented Bound**: ⚠️ Min: 1 (enforced by @ArrayMinSize(1)), Max: UNDOCUMENTED
- **Test Cases**:
  - ✅ Valid minimum: 1 payment ID
  - ✅ Valid typical: 10 payment IDs
  - ❌ Below minimum: empty array (rejected by @ArrayMinSize(1))
  - ⚠️ Large: 1000 payment IDs (not validated, could cause memory/performance issues)
  - ⚠️ Very large: 100,000 payment IDs (could OOM application)
- **Risk Level**: MEDIUM (no maximum bound documented, potential DoS vector)
- **Recommendation**: Add @ArrayMaxSize(n) constraint (e.g., 1000 or 10,000 max)

### Threshold Amount (String with Decimal Precision)
- **Type**: User input (string matching regex)
- **Value Format**: Regex: `/^\d+(\.\d{1,7})?$/` (0-7 decimal places)
- **Documented Bound**: ✅ Decimal places: 0 to 7 (Stellar standard)
- **Test Cases**:
  - ✅ Valid: "100"
  - ✅ Valid: "100.1234567" (7 decimal places)
  - ❌ Invalid: "100.12345678" (8 decimal places, rejected)
  - ❌ Invalid: "-100.1" (negative, rejected by regex)
  - ❌ Invalid: "abc" (non-numeric, rejected)
  - ⚠️ Very large: "999999999999999999.9999999" (valid format but large number)
  - ⚠️ Zero: "0" (valid format, edge case)
- **Risk Level**: MEDIUM (string format validated but magnitude unbounded)
- **Arithmetic**: Parsed to BigInt: `BigInt(whole) * 10_000_000n + BigInt(paddedDecimal)`

### Amount Parsing Precision Scaling Factor
- **Type**: Constant (scaling factor)
- **Value**: `10_000_000` (10^7)
- **Documented Bound**: Fixed Stellar asset precision
- **Test Cases**: Constant, no boundary testing
- **Risk Level**: LOW (cryptographic constant)
- **Arithmetic**: `BigInt(whole) * 10_000_000n + BigInt(paddedDecimal)` - multiplication with potentially large numbers

---

## 4. CRYPTOGRAPHY & CONFIGURATION

### Encryption Key Size
- **Type**: Configuration constant (bytes)
- **Value**: `32`
- **Documented Bound**: Exact 32 bytes for AES-256-GCM
- **Test Cases**: Fixed constraint, enforced at environment validation
- **Risk Level**: LOW (enforced by schema validation)

### Encryption IV Size
- **Type**: Constant (bytes)
- **Value**: `12`
- **Documented Bound**: Fixed 12-byte IV for AES-256-GCM
- **Test Cases**: Fixed constant
- **Risk Level**: LOW (cryptographic constant)

### Port Number (Configuration)
- **Type**: Configuration (environment variable, coerced to integer)
- **Value Range**: Default 4000, must be positive integer
- **Documented Bound**: ⚠️ Positive integer only, default 4000, max typically 65535
- **Test Cases**:
  - ✅ Valid: 4000 (default)
  - ✅ Valid: 8080 (common alternate port)
  - ✅ Valid: 3000
  - ❌ Invalid: 0 (must be positive)
  - ❌ Invalid: -1 (must be positive)
  - ❌ Invalid: 65536 (exceeds max port number)
  - ❌ Invalid: "not a number" (must coerce or reject)
- **Risk Level**: LOW (environmental, not user input, validated at startup)
- **Recommendation**: Add upper bound check (max 65535)

### Stellar Contract Timeouts
- **Type**: Constants (milliseconds)
- **Values**: 
  - Mutation timeout: `120_000` (2 minutes)
  - Read timeout: `60_000` (1 minute)
- **Documented Bound**: Hard-coded timeouts
- **Test Cases**: Fixed constants
- **Risk Level**: LOW (hard-coded configuration)

### Schema Version
- **Type**: Configuration constant (integer)
- **Value**: Default `1`, can be overridden via environment
- **Documented Bound**: Positive integer, default 1
- **Test Cases**:
  - ✅ Valid: 1 (default)
  - ✅ Valid: 2
  - ❌ Invalid: 0 (must be positive)
  - ❌ Invalid: -1 (must be positive)
- **Risk Level**: LOW (environmental, validated at startup)

---

## 5. DATABASE DATETIME FIELDS

### All DateTime Fields (50+ fields across schema)
- **Type**: Timestamp fields (DateTime)
- **Examples**: 
  - `User.createdAt`, `User.updatedAt`, `User.lastLoginAt`
  - `WalletChallenge.expiresAt`
  - `Proof.periodStart`, `Proof.periodEnd`, `Proof.expiresAt`
  - `Payment.occurredAt`
  - `ApiKey.expiresAt`
- **Documented Bound**: ⚠️ None - no min/max constraints in Prisma schema
- **Test Cases**:
  - ✅ Valid: Current timestamp (Date.now())
  - ✅ Valid: Future timestamp (within 1 year)
  - ✅ Valid: Past timestamp (recent history)
  - ⚠️ Far future: Year 9999 (valid in JavaScript but unusual)
  - ⚠️ Epoch: Jan 1, 1970
  - ⚠️ Invalid: Invalid date string (rejected by Prisma/DB)
  - ⚠️ NULL: Allowed for optional fields (e.g., `lastLoginAt`)
- **Risk Level**: MEDIUM (no documented bounds, can cause confusion in ordering/filtering)
- **Arithmetic**: Timestamp arithmetic done in service layer (e.g., `Date.now() + milliseconds`)
- **Recommendation**: Add documented constraints or explicit min/max in schema comments

---

## 6. FLAGGED INPUTS WITHOUT DOCUMENTED BOUNDS

| Input | Location | Current State | Risk | Recommendation |
|-------|----------|---------------|------|----------------|
| `selectedPaymentIds` array size | `create-minimum-income-proof.dto.ts:12` | Min: 1, Max: unbounded | MEDIUM | Add `@ArrayMaxSize(1000)` or similar |
| `ttlSeconds` for auth tokens | `auth-token.service.ts` | No explicit bounds | MEDIUM | Document min/max (e.g., 60s-31536000s) |
| Payment sync counters | `payments.service.ts:47-49` | Unbounded counter | MEDIUM | Document max expected or use BigInt |
| DateTime fields in Prisma | `prisma/schema.prisma` | No min/max documented | LOW | Add comments documenting expected ranges |
| Challenge ID string | `verify-challenge.dto.ts:9` | No length validation | LOW | Add validation or document expected format |
| Signature string | `verify-challenge.dto.ts:9` | No length validation | LOW | Add validation or document expected format |

---

## 7. ARITHMETIC OPERATIONS & OVERFLOW RISKS

### 1. Challenge Expiry Calculation
```typescript
// Location: src/auth/auth.service.ts:36
expiresAt = Date.now() + (5 * 60 * 1000);  // 5 minutes in ms
```
- **Inputs**: `Date.now()` (current timestamp in ms)
- **Risk**: Overflow if Date.now() > Number.MAX_SAFE_INTEGER - 300_000
- **Safe**: JavaScript Date.now() is safe until year 285,616,365,954
- **Verdict**: LOW risk for practical applications

### 2. Proof Expiry Calculation
```typescript
// Location: src/proofs/proofs.service.ts:174
expiresAt = new Date(now.getTime() + (expiresInDays * 24 * 60 * 60 * 1000));
```
- **Inputs**: `now.getTime()` (ms), `expiresInDays` (user input: 1-365)
- **Calculation**: `expiresInDays * 86_400_000` (ms per day)
- **Max safe input**: 365 days = 31,536,000,000 ms
- **Risk**: Safe within current bounds (1-365 days)
- **Verdict**: LOW risk given constraints

### 3. Token Expiry Calculation
```typescript
// Location: src/auth/auth-token.service.ts:19
exp: Math.floor(Date.now() / 1000) + ttlSeconds;
```
- **Inputs**: `Date.now() / 1000` (Unix timestamp in seconds), `ttlSeconds` (user input, no bounds)
- **Risk**: HIGH if `ttlSeconds` is very large or negative
- **Verdict**: MEDIUM - recommend adding bounds to `ttlSeconds`

### 4. Amount Parsing (BigInt Multiplication)
```typescript
// Location: src/proofs/proofs.service.ts:287
const scaled = BigInt(whole) * 10_000_000n + BigInt(paddedDecimal);
```
- **Inputs**: `whole` (string → BigInt), `paddedDecimal` (string → BigInt)
- **Risk**: Multiplication of large numbers; BigInt handles arbitrary precision
- **Verdict**: LOW risk (BigInt is safe for arbitrarily large numbers)

---

## 8. TEST COVERAGE MATRIX

| Input Category | Count | Tested | Boundary Cases | Property Tests | Status |
|----------------|-------|--------|-----------------|----------------|--------|
| Validated user inputs (DTOs) | 5 | ✅ | Min/max/zero/overflow | Partial | MEDIUM |
| Hard-coded constants | 8 | ✅ | N/A (fixed) | N/A | LOW |
| Configuration (env) | 4 | ⚠️ | Partial | No | MEDIUM |
| Derived/computed values | 4 | ⚠️ | Partial | Planned | MEDIUM |
| DateTime fields (DB) | 50+ | ⚠️ | Not tested | No | HIGH |
| Counters/aggregates | 3 | ⚠️ | Not tested | No | MEDIUM |

---

## 9. RECOMMENDATIONS & ACTION ITEMS

### Critical (P0)
1. **Add documented bounds** to `ttlSeconds` parameter (min: 60s, max: 31536000s)
2. **Add overflow protection** to token expiry calculation when custom `ttlSeconds` provided
3. **Add `@ArrayMaxSize()` constraint** to `selectedPaymentIds` (recommend max 1000)

### Important (P1)
4. Add boundary tests for all user-input DTO fields
5. Document DateTime field ranges in Prisma schema
6. Add property-based tests for arithmetic operations
7. Test counter overflow scenarios (BigInt or documented max)

### Nice-to-have (P2)
8. Add validation for `challengeId` and `signature` strings
9. Document port number constraints (1-65535)
10. Centralize all numeric constants in shared config module

---

## Files Referenced

- `src/auth/auth.service.ts` - Challenge creation and expiration
- `src/auth/auth-token.service.ts` - Token signing and TTL
- `src/auth/dto/create-challenge.dto.ts` - Wallet address validation
- `src/auth/dto/verify-challenge.dto.ts` - Challenge verification input
- `src/payments/payments.service.ts` - Payment sync and listing
- `src/proofs/proofs.service.ts` - Proof creation and expiry calculation
- `src/proofs/dto/create-minimum-income-proof.dto.ts` - Proof creation input
- `src/config/env.validation.ts` - Environment variable validation
- `src/common/crypto/protected-amount.ts` - Encryption constants
- `prisma/schema.prisma` - Database schema with DateTime fields

---

## Test Files Created

All tests are located in `tests/numeric-boundaries/`:
- `boundary-inputs.test.ts` - DTO field boundary tests
- `arithmetic-overflow.test.ts` - Arithmetic operation tests
- `datetime-boundaries.test.ts` - DateTime field tests
- `config-constants.test.ts` - Configuration constant tests
- `counter-overflow.test.ts` - Counter and derived value tests
