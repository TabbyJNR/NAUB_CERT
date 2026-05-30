# Phase 2 Coverage Report

## Scope

The current repository environment cannot install Solidity execution tooling because package resolution through the configured proxy returns `403 Forbidden`. As a result, Phase 2 coverage is represented by executable behavioral tests against a JavaScript model of the contract state machine plus static checks against the Solidity source.

## Executed coverage areas

| Area | Covered by |
| --- | --- |
| Initial admin role bootstrap | `test/CertificateRegistry.test.js` |
| Admin role grant and revoke | `test/CertificateRegistry.test.js` |
| Unauthorized role management rejection | `test/CertificateRegistry.test.js` |
| Certificate issuance success path | `test/CertificateRegistry.test.js` |
| Duplicate and malformed issuance rejection | `test/CertificateRegistry.test.js` |
| Public verification not-found and mismatch states | `test/CertificateRegistry.test.js` |
| Revocation success path and audit retention | `test/CertificateRegistry.test.js` |
| Invalid revocation rejection | `test/CertificateRegistry.test.js` |
| Pause/unpause behavior | `test/CertificateRegistry.test.js` |
| Unauthorized issue/revoke/pause rejection | `test/CertificateRegistry.test.js` |
| Solidity source structure and required guards/events | `scripts/static-contract-check.js` |

## Required follow-up

When Solidity tooling is available, replace or supplement this report with EVM-level line and branch coverage using a supported framework such as Hardhat, Foundry, or Truffle.
