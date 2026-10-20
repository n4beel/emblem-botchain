# Emblem

Non-transferable credential badges on BOT Chain.

### BOT Chain mainnet (677) — live

| | |
|---|---|
| Contract | [`0x5F4b0CD99CAdA0bF877BFf45061418F9780bA28d`](https://scan.botchain.ai/address/0x5F4b0CD99CAdA0bF877BFf45061418F9780bA28d) · source verified |
| Deploy block | 27329474 |

### Bohr testnet (968) — live

| | |
|---|---|
| Contract | [`0x5F4b0CD99CAdA0bF877BFf45061418F9780bA28d`](https://scan.bohr.life/address/0x5F4b0CD99CAdA0bF877BFf45061418F9780bA28d) · source verified |
| Deploy block | 27397272 |

The site targets mainnet.

---

## What it does
Emblem issues soulbound credential badges implementing **ERC-721 and ERC-5192**. Any address can issue an attestation badge to any recipient with a descriptive label. `locked(tokenId)` returns true unconditionally, and every transfer path reverts.

## What a badge means
Anyone may issue a badge to anyone. The issuer is permanently recorded and visible in the badge metadata. A badge means strictly:
> *"Address A attested this label about Address B at this block timestamp."*
It does not claim authority or authenticity beyond that attestation.

## What it deliberately cannot do
- **No transfers**: badges cannot be moved under any circumstances (`Soulbound`)
- **No burn**: badges are immutable historical records
- **No owner / admin**: anyone may attest; the protocol has no central authority

## Gas
- `issue()`: ~142k gas (target: ~150k)

## Honest limits
- Anyone can issue a badge with any text; consumers must evaluate the trustworthiness of the issuing address
- Labels are limited to 200 bytes
