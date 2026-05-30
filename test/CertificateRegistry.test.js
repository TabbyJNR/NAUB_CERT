const assert = require('node:assert/strict');
const { describe, it, beforeEach } = require('node:test');

const DEFAULT_ADMIN_ROLE = '0x00';
const REGISTRY_ADMIN_ROLE = 'REGISTRY_ADMIN_ROLE';
const PAUSER_ROLE = 'PAUSER_ROLE';
const Status = Object.freeze({ None: 0, Issued: 1, Revoked: 2 });

class CertificateRegistryModel {
  constructor(initialAdmin) {
    if (!initialAdmin) throw new Error('InvalidAccount');
    this.roles = new Map();
    this.certificates = new Map();
    this.paused = false;
    this.events = [];
    this._grantRole(DEFAULT_ADMIN_ROLE, initialAdmin, 'constructor');
    this._grantRole(REGISTRY_ADMIN_ROLE, initialAdmin, 'constructor');
    this._grantRole(PAUSER_ROLE, initialAdmin, 'constructor');
  }

  hasRole(role, account) {
    return this.roles.get(role)?.has(account) ?? false;
  }

  grantRole(role, account, sender) {
    this._requireRole(DEFAULT_ADMIN_ROLE, sender);
    this._grantRole(role, account, sender);
  }

  revokeRole(role, account, sender) {
    this._requireRole(DEFAULT_ADMIN_ROLE, sender);
    if (!account) throw new Error('InvalidAccount');
    this.roles.get(role)?.delete(account);
    this.events.push({ name: 'RoleRevoked', role, account, sender });
  }

  issueCertificate(certificateId, certificateHash, holderCommitment, ipfsCid, sender) {
    this._requireRole(REGISTRY_ADMIN_ROLE, sender);
    this._requireNotPaused();
    if (!certificateId) throw new Error('EmptyCertificateId');
    if (!certificateHash) throw new Error('EmptyCertificateHash');
    if (!holderCommitment) throw new Error('EmptyHolderCommitment');
    if (!ipfsCid) throw new Error('EmptyIpfsCid');
    if ((this.certificates.get(certificateId)?.status ?? Status.None) !== Status.None) {
      throw new Error('CertificateAlreadyExists');
    }

    const certificate = {
      certificateHash,
      holderCommitment,
      ipfsCid,
      issuer: sender,
      issuedAt: 1_778_000_000,
      revokedAt: 0,
      status: Status.Issued,
      revocationReason: '',
    };
    this.certificates.set(certificateId, certificate);
    this.events.push({ name: 'CertificateIssued', certificateId, certificateHash, holderCommitment, ipfsCid, issuer: sender });
  }

  revokeCertificate(certificateId, reason, sender) {
    this._requireRole(REGISTRY_ADMIN_ROLE, sender);
    this._requireNotPaused();
    if (!certificateId) throw new Error('EmptyCertificateId');
    if (!reason) throw new Error('EmptyRevocationReason');

    const certificate = this.certificates.get(certificateId);
    if (!certificate) throw new Error('CertificateNotFound');
    if (certificate.status === Status.Revoked) throw new Error('CertificateAlreadyRevoked');

    certificate.status = Status.Revoked;
    certificate.revokedAt = 1_778_000_100;
    certificate.revocationReason = reason;
    this.events.push({ name: 'CertificateRevoked', certificateId, revokedBy: sender, reason });
  }

  verifyCertificate(certificateId, candidateHash) {
    if (!certificateId) throw new Error('EmptyCertificateId');
    const certificate = this.certificates.get(certificateId) ?? { status: Status.None };
    return {
      status: certificate.status,
      hashMatches: certificate.status !== Status.None && certificate.certificateHash === candidateHash,
      certificate,
    };
  }

  pause(sender) {
    this._requireRole(PAUSER_ROLE, sender);
    this._requireNotPaused();
    this.paused = true;
    this.events.push({ name: 'Paused', account: sender });
  }

  unpause(sender) {
    this._requireRole(PAUSER_ROLE, sender);
    if (!this.paused) throw new Error('ContractNotPaused');
    this.paused = false;
    this.events.push({ name: 'Unpaused', account: sender });
  }

  _grantRole(role, account, sender) {
    if (!account) throw new Error('InvalidAccount');
    if (!this.roles.has(role)) this.roles.set(role, new Set());
    this.roles.get(role).add(account);
    this.events.push({ name: 'RoleGranted', role, account, sender });
  }

  _requireRole(role, account) {
    if (!this.hasRole(role, account)) throw new Error('AccessDenied');
  }

  _requireNotPaused() {
    if (this.paused) throw new Error('ContractPaused');
  }
}

describe('CertificateRegistry Phase 2 behavior', () => {
  const admin = '0xAdmin';
  const registrar = '0xRegistrar';
  const pauser = '0xPauser';
  const outsider = '0xOutsider';
  const certId = '0xCERT001';
  const certHash = '0xHASH001';
  const holderCommitment = '0xHOLDER001';
  const ipfsCid = 'bafybeigdyrztNAUBCertificate001';

  let registry;

  beforeEach(() => {
    registry = new CertificateRegistryModel(admin);
  });

  it('bootstraps the initial administrator with admin, registry, and pauser roles', () => {
    assert.equal(registry.hasRole(DEFAULT_ADMIN_ROLE, admin), true);
    assert.equal(registry.hasRole(REGISTRY_ADMIN_ROLE, admin), true);
    assert.equal(registry.hasRole(PAUSER_ROLE, admin), true);
  });

  it('allows the default admin to grant and revoke least-privilege roles', () => {
    registry.grantRole(REGISTRY_ADMIN_ROLE, registrar, admin);
    assert.equal(registry.hasRole(REGISTRY_ADMIN_ROLE, registrar), true);

    registry.revokeRole(REGISTRY_ADMIN_ROLE, registrar, admin);
    assert.equal(registry.hasRole(REGISTRY_ADMIN_ROLE, registrar), false);
  });

  it('rejects role management from non-admin accounts', () => {
    assert.throws(() => registry.grantRole(REGISTRY_ADMIN_ROLE, registrar, outsider), /AccessDenied/);
  });

  it('issues a certificate with hash, holder commitment, IPFS CID, issuer, status, and event evidence', () => {
    registry.grantRole(REGISTRY_ADMIN_ROLE, registrar, admin);
    registry.issueCertificate(certId, certHash, holderCommitment, ipfsCid, registrar);

    const verification = registry.verifyCertificate(certId, certHash);
    assert.equal(verification.status, Status.Issued);
    assert.equal(verification.hashMatches, true);
    assert.equal(verification.certificate.ipfsCid, ipfsCid);
    assert.equal(verification.certificate.issuer, registrar);
    assert.equal(registry.events.at(-1).name, 'CertificateIssued');
  });

  it('rejects duplicate issuance and malformed issuance inputs', () => {
    registry.issueCertificate(certId, certHash, holderCommitment, ipfsCid, admin);

    assert.throws(() => registry.issueCertificate(certId, certHash, holderCommitment, ipfsCid, admin), /CertificateAlreadyExists/);
    assert.throws(() => registry.issueCertificate('', certHash, holderCommitment, ipfsCid, admin), /EmptyCertificateId/);
    assert.throws(() => registry.issueCertificate('0x2', '', holderCommitment, ipfsCid, admin), /EmptyCertificateHash/);
    assert.throws(() => registry.issueCertificate('0x2', certHash, '', ipfsCid, admin), /EmptyHolderCommitment/);
    assert.throws(() => registry.issueCertificate('0x2', certHash, holderCommitment, '', admin), /EmptyIpfsCid/);
  });

  it('reports not-found and hash mismatch states without requiring verifier authorization', () => {
    registry.issueCertificate(certId, certHash, holderCommitment, ipfsCid, admin);

    assert.deepEqual(registry.verifyCertificate('0xMISSING', certHash), {
      status: Status.None,
      hashMatches: false,
      certificate: { status: Status.None },
    });
    assert.equal(registry.verifyCertificate(certId, '0xWRONG').hashMatches, false);
  });

  it('revokes certificates with a required reason while keeping audit data queryable', () => {
    registry.issueCertificate(certId, certHash, holderCommitment, ipfsCid, admin);
    registry.revokeCertificate(certId, 'degree rescinded by senate decision', admin);

    const verification = registry.verifyCertificate(certId, certHash);
    assert.equal(verification.status, Status.Revoked);
    assert.equal(verification.hashMatches, true);
    assert.equal(verification.certificate.revocationReason, 'degree rescinded by senate decision');
    assert.equal(registry.events.at(-1).name, 'CertificateRevoked');
  });

  it('rejects invalid revocation requests', () => {
    assert.throws(() => registry.revokeCertificate(certId, 'missing record', admin), /CertificateNotFound/);

    registry.issueCertificate(certId, certHash, holderCommitment, ipfsCid, admin);
    assert.throws(() => registry.revokeCertificate(certId, '', admin), /EmptyRevocationReason/);
    registry.revokeCertificate(certId, 'duplicate test', admin);
    assert.throws(() => registry.revokeCertificate(certId, 'duplicate test', admin), /CertificateAlreadyRevoked/);
  });

  it('pauses and unpauses privileged writes but leaves public verification available', () => {
    registry.grantRole(PAUSER_ROLE, pauser, admin);
    registry.issueCertificate(certId, certHash, holderCommitment, ipfsCid, admin);

    registry.pause(pauser);
    assert.equal(registry.paused, true);
    assert.equal(registry.verifyCertificate(certId, certHash).hashMatches, true);
    assert.throws(() => registry.issueCertificate('0x2', '0xHASH002', holderCommitment, ipfsCid, admin), /ContractPaused/);
    assert.throws(() => registry.revokeCertificate(certId, 'paused write', admin), /ContractPaused/);

    registry.unpause(pauser);
    registry.revokeCertificate(certId, 'valid after unpause', admin);
    assert.equal(registry.verifyCertificate(certId, certHash).status, Status.Revoked);
  });

  it('prevents unauthorized issuance, revocation, and pause operations', () => {
    assert.throws(() => registry.issueCertificate(certId, certHash, holderCommitment, ipfsCid, outsider), /AccessDenied/);
    registry.issueCertificate(certId, certHash, holderCommitment, ipfsCid, admin);
    assert.throws(() => registry.revokeCertificate(certId, 'outsider request', outsider), /AccessDenied/);
    assert.throws(() => registry.pause(outsider), /AccessDenied/);
  });
});
