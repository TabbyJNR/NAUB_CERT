// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CertificateRegistry
/// @notice Role-governed registry for anchoring NAUB certificate hashes, IPFS CIDs,
///         holder commitments, and revocation state without storing PII on-chain.
/// @dev The contract intentionally avoids on-chain personal data. Store only hashes,
///      opaque certificate IDs, IPFS CIDs, and holder commitments generated off-chain.
contract CertificateRegistry {
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 public constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    enum CertificateStatus {
        None,
        Issued,
        Revoked
    }

    struct Certificate {
        bytes32 certificateHash;
        bytes32 holderCommitment;
        string ipfsCid;
        address issuer;
        uint64 issuedAt;
        uint64 revokedAt;
        CertificateStatus status;
        string revocationReason;
    }

    mapping(bytes32 => Certificate) private certificates;
    mapping(bytes32 => mapping(address => bool)) private roles;
    bool private paused;

    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event CertificateIssued(
        bytes32 indexed certificateId,
        bytes32 indexed certificateHash,
        bytes32 indexed holderCommitment,
        string ipfsCid,
        address issuer,
        uint64 issuedAt
    );
    event CertificateRevoked(
        bytes32 indexed certificateId,
        address indexed revokedBy,
        string reason,
        uint64 revokedAt
    );
    event Paused(address indexed account);
    event Unpaused(address indexed account);

    error AccessDenied(bytes32 role, address account);
    error CertificateAlreadyExists(bytes32 certificateId);
    error CertificateNotFound(bytes32 certificateId);
    error CertificateAlreadyRevoked(bytes32 certificateId);
    error EmptyCertificateId();
    error EmptyCertificateHash();
    error EmptyHolderCommitment();
    error EmptyIpfsCid();
    error EmptyRevocationReason();
    error ContractPaused();
    error ContractNotPaused();
    error InvalidAccount();

    modifier onlyRole(bytes32 role) {
        _checkRole(role, msg.sender);
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    modifier whenPaused() {
        if (!paused) revert ContractNotPaused();
        _;
    }

    constructor(address initialAdmin) {
        if (initialAdmin == address(0)) revert InvalidAccount();
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(REGISTRY_ADMIN_ROLE, initialAdmin);
        _grantRole(PAUSER_ROLE, initialAdmin);
    }

    function issueCertificate(
        bytes32 certificateId,
        bytes32 certificateHash,
        bytes32 holderCommitment,
        string calldata ipfsCid
    ) external onlyRole(REGISTRY_ADMIN_ROLE) whenNotPaused {
        _validateCertificateId(certificateId);
        if (certificateHash == bytes32(0)) revert EmptyCertificateHash();
        if (holderCommitment == bytes32(0)) revert EmptyHolderCommitment();
        if (bytes(ipfsCid).length == 0) revert EmptyIpfsCid();
        if (certificates[certificateId].status != CertificateStatus.None) {
            revert CertificateAlreadyExists(certificateId);
        }

        uint64 issuedAt = uint64(block.timestamp);
        certificates[certificateId] = Certificate({
            certificateHash: certificateHash,
            holderCommitment: holderCommitment,
            ipfsCid: ipfsCid,
            issuer: msg.sender,
            issuedAt: issuedAt,
            revokedAt: 0,
            status: CertificateStatus.Issued,
            revocationReason: ""
        });

        emit CertificateIssued(certificateId, certificateHash, holderCommitment, ipfsCid, msg.sender, issuedAt);
    }

    function revokeCertificate(bytes32 certificateId, string calldata reason)
        external
        onlyRole(REGISTRY_ADMIN_ROLE)
        whenNotPaused
    {
        _validateCertificateId(certificateId);
        if (bytes(reason).length == 0) revert EmptyRevocationReason();

        Certificate storage certificate = certificates[certificateId];
        if (certificate.status == CertificateStatus.None) revert CertificateNotFound(certificateId);
        if (certificate.status == CertificateStatus.Revoked) revert CertificateAlreadyRevoked(certificateId);

        uint64 revokedAt = uint64(block.timestamp);
        certificate.status = CertificateStatus.Revoked;
        certificate.revokedAt = revokedAt;
        certificate.revocationReason = reason;

        emit CertificateRevoked(certificateId, msg.sender, reason, revokedAt);
    }

    function verifyCertificate(bytes32 certificateId, bytes32 candidateHash)
        external
        view
        returns (CertificateStatus status, bool hashMatches, Certificate memory certificate)
    {
        _validateCertificateId(certificateId);
        certificate = certificates[certificateId];
        status = certificate.status;
        hashMatches = status != CertificateStatus.None && certificate.certificateHash == candidateHash;
    }

    function getCertificate(bytes32 certificateId) external view returns (Certificate memory certificate) {
        _validateCertificateId(certificateId);
        certificate = certificates[certificateId];
        if (certificate.status == CertificateStatus.None) revert CertificateNotFound(certificateId);
    }

    function pause() external onlyRole(PAUSER_ROLE) whenNotPaused {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyRole(PAUSER_ROLE) whenPaused {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function isPaused() external view returns (bool) {
        return paused;
    }

    function grantRole(bytes32 role, address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (account == address(0)) revert InvalidAccount();
        if (roles[role][account]) {
            roles[role][account] = false;
            emit RoleRevoked(role, account, msg.sender);
        }
    }

    function hasRole(bytes32 role, address account) public view returns (bool) {
        return roles[role][account];
    }

    function _checkRole(bytes32 role, address account) private view {
        if (!roles[role][account]) revert AccessDenied(role, account);
    }

    function _grantRole(bytes32 role, address account) private {
        if (account == address(0)) revert InvalidAccount();
        if (!roles[role][account]) {
            roles[role][account] = true;
            emit RoleGranted(role, account, msg.sender);
        }
    }

    function _validateCertificateId(bytes32 certificateId) private pure {
        if (certificateId == bytes32(0)) revert EmptyCertificateId();
    }
}
