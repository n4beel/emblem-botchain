// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/// @title Emblem
/// @notice Non-transferable credential badges on BOT Chain (ERC-721 + ERC-5192).
///
/// @dev What this proves, exactly:
/// A badge records ONLY that `issuer` attested `label` about `recipient` at `issuedAt`.
/// It does NOT prove authority, authenticity, verification, or endorsement beyond that attestation.
/// Anyone can issue a badge to anyone.
///
/// What this contract CANNOT do:
/// - No transfers under any circumstances (all transfer methods revert with `Soulbound`)
/// - No approvals (approvals revert with `Soulbound`, locked badges cannot be approved)
/// - No owner / admin / operator privileges (contract is completely unowned)
/// - No upgrades or proxying
/// - No pause or freeze mechanism
/// - No burn or revocation mechanism
/// - No recovery hatch
contract Emblem {
  uint256 private _nextTokenId;

  struct Badge {
    address issuer;
    address recipient;
    string label;
    uint64 issuedAt;
  }

  mapping(uint256 tokenId => Badge) private _badges;
  mapping(address owner => uint256) private _balances;

  // ERC-721 required events
  event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
  event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
  event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

  // ERC-5192 event
  event Locked(uint256 indexed tokenId);

  // Custom event
  event BadgeIssued(uint256 indexed tokenId, address indexed issuer, address indexed recipient, string label);

  error ZeroAddress();
  error LabelTooLong(uint256 length, uint256 max);
  error TokenNotFound(uint256 tokenId);
  error Soulbound(uint256 tokenId);

  uint256 public constant MAX_LABEL_BYTES = 200;
  string private constant _NAME = "Emblem";
  string private constant _SYMBOL = "BADGE";

  /// @notice Issue a new non-transferable credential badge.
  /// @param to Recipient address for the badge. Cannot be address(0).
  /// @param label Attestation label describing the credential.
  /// @return tokenId The ID of the newly minted badge.
  function issue(address to, string calldata label) external returns (uint256 tokenId) {
    if (to == address(0)) revert ZeroAddress();
    uint256 len = bytes(label).length;
    if (len > MAX_LABEL_BYTES) revert LabelTooLong(len, MAX_LABEL_BYTES);

    tokenId = ++_nextTokenId;
    _badges[tokenId] = Badge({
      issuer: msg.sender,
      recipient: to,
      label: label,
      issuedAt: uint64(block.timestamp)
    });
    _balances[to] += 1;

    emit Transfer(address(0), to, tokenId);
    emit Locked(tokenId);
    emit BadgeIssued(tokenId, msg.sender, to, label);
  }

  // ERC-5192: Returns the locking status of an NFT. Badges are permanently locked (soulbound).
  function locked(uint256 tokenId) external view returns (bool) {
    if (_badges[tokenId].recipient == address(0)) revert TokenNotFound(tokenId);
    return true;
  }

  // ERC-721 reads
  function ownerOf(uint256 tokenId) external view returns (address) {
    address r = _badges[tokenId].recipient;
    if (r == address(0)) revert TokenNotFound(tokenId);
    return r;
  }

  function balanceOf(address owner) external view returns (uint256) {
    if (owner == address(0)) revert ZeroAddress();
    return _balances[owner];
  }

  function badgeOf(uint256 tokenId) external view returns (Badge memory) {
    return _badges[tokenId];
  }

  function name() external pure returns (string memory) {
    return _NAME;
  }

  function symbol() external pure returns (string memory) {
    return _SYMBOL;
  }

  function tokenURI(uint256 tokenId) external view returns (string memory) {
    if (_badges[tokenId].recipient == address(0)) revert TokenNotFound(tokenId);
    return string.concat("data:application/json,{\"name\":\"", _badges[tokenId].label, "\"}");
  }

  // All transfer/approve paths revert Soulbound
  function transferFrom(address, address, uint256 tokenId) external pure {
    revert Soulbound(tokenId);
  }

  function safeTransferFrom(address, address, uint256 tokenId) external pure {
    revert Soulbound(tokenId);
  }

  function safeTransferFrom(address, address, uint256 tokenId, bytes calldata) external pure {
    revert Soulbound(tokenId);
  }

  function approve(address, uint256 tokenId) external pure {
    revert Soulbound(tokenId);
  }

  function setApprovalForAll(address, bool) external pure {
    revert Soulbound(0);
  }

  function getApproved(uint256 tokenId) external view returns (address) {
    if (_badges[tokenId].recipient == address(0)) revert TokenNotFound(tokenId);
    return address(0);
  }

  function isApprovedForAll(address, address) external pure returns (bool) {
    return false;
  }

  // ERC-165
  function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
    return interfaceId == 0x01ffc9a7 || // ERC165
           interfaceId == 0x80ac58cd || // ERC721
           interfaceId == 0xb45a3c0e;   // ERC5192
  }
}
