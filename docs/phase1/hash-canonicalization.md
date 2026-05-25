# Hash Input Canonicalization Rules (v1.0.0)

## Purpose
Ensure reproducible payload hashing across backend services, smart contracts, and verification clients.

## Algorithm
- Hash function: `keccak256`.
- Input bytes: UTF-8 encoded canonical JSON string.

## Canonical JSON Rules
1. JSON object keys MUST be lexicographically sorted (byte-order comparison).
2. No insignificant whitespace (single-line compact JSON).
3. String values MUST use NFC Unicode normalization.
4. Date values MUST use `YYYY-MM-DD`.
5. Date-time values MUST use UTC RFC3339 with `Z` suffix.
6. Null values are included only for nullable schema fields when explicitly present.
7. Arrays preserve provided order.
8. Numbers MUST be rendered without exponent notation.

## Hash Payload Field Set
The canonical object for hashing MUST contain only non-sensitive proof fields:

- `certificate_id`
- `program_name`
- `issuing_institution`
- `issue_date`
- `expiry_date`
- `classification`
- `metadata_uri`
- `schema_version`

> Note: `holder_name` and `holder_id_value` are excluded from the hash payload in v1.0.0 to reduce PII leakage risk.

## Example Canonical JSON
{"certificate_id":"8f3c73fa-75d0-4d8f-bf6b-4f42277e13a1","classification":"Second Class Upper","expiry_date":null,"issue_date":"2026-05-20","issuing_institution":"Nigerian Army University Biu","metadata_uri":"ipfs://bafybeigdyrsamplecid","program_name":"B.Sc. Computer Science","schema_version":"1.0.0"}
