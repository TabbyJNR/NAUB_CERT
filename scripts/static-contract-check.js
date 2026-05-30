const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const contractPath = path.join(__dirname, '..', 'contracts', 'CertificateRegistry.sol');
const source = fs.readFileSync(contractPath, 'utf8');

function includes(pattern, message) {
  assert.match(source, pattern, message);
}

includes(/pragma solidity \^0\.8\.24;/, 'contract must pin the Solidity 0.8.24 compiler family');
includes(/bytes32 public constant REGISTRY_ADMIN_ROLE = keccak256\("REGISTRY_ADMIN_ROLE"\);/, 'registry admin role must exist');
includes(/bytes32 public constant PAUSER_ROLE = keccak256\("PAUSER_ROLE"\);/, 'pauser role must exist');
includes(/enum CertificateStatus\s*{\s*None,\s*Issued,\s*Revoked\s*}/s, 'certificate lifecycle states must be explicit');
includes(/event CertificateIssued\(/, 'issuance event must be emitted');
includes(/event CertificateRevoked\(/, 'revocation event must be emitted');
includes(/event Paused\(/, 'pause event must be emitted');
includes(/event Unpaused\(/, 'unpause event must be emitted');
includes(/function issueCertificate[\s\S]*onlyRole\(REGISTRY_ADMIN_ROLE\)[\s\S]*whenNotPaused/, 'issuance must be role-gated and paused-safe');
includes(/function revokeCertificate[\s\S]*onlyRole\(REGISTRY_ADMIN_ROLE\)[\s\S]*whenNotPaused/, 'revocation must be role-gated and paused-safe');
includes(/function verifyCertificate[\s\S]*external[\s\S]*view/, 'verification must be a public read-only function');
includes(/function pause\(\)[\s\S]*onlyRole\(PAUSER_ROLE\)[\s\S]*whenNotPaused/, 'pause must be pauser-gated');
includes(/function unpause\(\)[\s\S]*onlyRole\(PAUSER_ROLE\)[\s\S]*whenPaused/, 'unpause must be pauser-gated');
includes(/if \(certificateHash == bytes32\(0\)\) revert EmptyCertificateHash\(\);/, 'empty certificate hash must be rejected');
includes(/if \(holderCommitment == bytes32\(0\)\) revert EmptyHolderCommitment\(\);/, 'empty holder commitment must be rejected');
includes(/if \(bytes\(ipfsCid\)\.length == 0\) revert EmptyIpfsCid\(\);/, 'empty IPFS CID must be rejected');

let depth = 0;
for (const char of source) {
  if (char === '{') depth += 1;
  if (char === '}') depth -= 1;
  assert.ok(depth >= 0, 'contract braces must be balanced');
}
assert.equal(depth, 0, 'contract braces must end balanced');

console.log('Static contract checks passed for contracts/CertificateRegistry.sol');
