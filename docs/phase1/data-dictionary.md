# Phase 1 Data Dictionary

## Canonical Certificate (On-chain Anchored)

| Field | Type | Required | Description | Example |
|---|---|---:|---|---|
| `certificate_id` | string (UUID v4) | Yes | Globally unique certificate identifier used as primary key in off-chain systems. | `8f3c73fa-75d0-4d8f-bf6b-4f42277e13a1` |
| `holder_name` | string | Yes | Legal name of certificate holder. PII field stored off-chain only. | `Aisha Bello` |
| `holder_id_type` | enum | Yes | Type of holder identifier. Allowed: `nin`, `passport`, `student_number`, `employee_id`, `other`. | `student_number` |
| `holder_id_value` | string | Yes | Holder identifier value. PII field, never stored on-chain. | `NAUB/2026/00421` |
| `program_name` | string | Yes | Name of award/course/program. | `B.Sc. Computer Science` |
| `issuing_institution` | string | Yes | Institution issuing the certificate. | `Nigerian Army University Biu` |
| `issue_date` | string (date) | Yes | ISO-8601 date (`YYYY-MM-DD`) certificate was issued. | `2026-05-20` |
| `expiry_date` | string (date or null) | No | ISO-8601 date (`YYYY-MM-DD`) of expiry when applicable. | `2030-05-20` |
| `classification` | string | No | Degree class/grade distinction where applicable. | `Second Class Upper` |
| `metadata_uri` | string (URI) | No | IPFS CID URI referencing public metadata JSON. | `ipfs://bafy...` |
| `evidence_uri` | string (URI) | No | Optional supporting evidence URI (e.g., transcript). | `ipfs://bafy...` |
| `issued_by` | string | Yes | Registrar/admin identity (internal identifier). | `reg-001` |
| `issued_at` | string (date-time) | Yes | RFC3339 timestamp when issuance transaction requested. | `2026-05-20T10:42:31Z` |
| `status` | enum | Yes | Certificate lifecycle state. Allowed: `issued`, `revoked`. | `issued` |
| `revoked_at` | string (date-time or null) | No | RFC3339 timestamp of revocation if revoked. | `2026-06-01T08:10:00Z` |
| `revocation_reason` | string or null | No | Human-readable reason for revocation. | `Administrative correction` |
| `schema_version` | string | Yes | Semantic version for canonical payload rules. | `1.0.0` |
| `payload_hash` | string (hex, 0x-prefixed) | Yes | Keccak-256 hash of canonicalized payload bytes. Stored on-chain. | `0x4f56...` |
| `tx_hash` | string (hex, 0x-prefixed) | No | Blockchain transaction hash for issuance/revocation events. | `0xab12...` |

## On-chain Registry Record

| Field | Type | Required | Description |
|---|---|---:|---|
| `payload_hash` | bytes32 | Yes | Unique key for certificate proof lookup. |
| `status` | uint8 | Yes | `1 = issued`, `2 = revoked`. |
| `issued_by` | address | Yes | Issuer wallet address with role permissions. |
| `issued_at_block` | uint256 | Yes | Block number at issuance. |
| `revoked_by` | address | No | Revoker wallet address. |
| `revoked_at_block` | uint256 | No | Block number at revocation. |

## PII Separation Rules

- PII fields (`holder_name`, `holder_id_value`) MUST remain off-chain.
- Hashing input may include salted/peppered PII-derived digests but MUST NOT include raw PII values.
- Public metadata published to IPFS MUST exclude raw PII unless policy approval exists.
