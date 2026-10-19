// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Test} from "forge-std/Test.sol";
import {Emblem} from "../src/Emblem.sol";

contract EmblemTest is Test {
  Emblem internal emblem;

  address internal alice = address(0xA11CE);
  address internal bob = address(0xB0B);
  address internal charlie = address(0xC0C);

  event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
  event Locked(uint256 indexed tokenId);
  event BadgeIssued(uint256 indexed tokenId, address indexed issuer, address indexed recipient, string label);

  function setUp() public {
    emblem = new Emblem();
    vm.warp(1_760_000_000);
  }

  // 1. test_IssuesBadge (ownerOf, balanceOf, badgeOf)
  function test_IssuesBadge() public {
    vm.prank(alice);
    uint256 tokenId = emblem.issue(bob, "Core Contributor");

    assertEq(tokenId, 1, "first token id should be 1");
    assertEq(emblem.ownerOf(tokenId), bob, "ownerOf should be recipient");
    assertEq(emblem.balanceOf(bob), 1, "balanceOf bob should be 1");
    assertEq(emblem.balanceOf(alice), 0, "balanceOf alice should be 0");

    Emblem.Badge memory badge = emblem.badgeOf(tokenId);
    assertEq(badge.issuer, alice, "issuer");
    assertEq(badge.recipient, bob, "recipient");
    assertEq(badge.label, "Core Contributor", "label");
    assertEq(badge.issuedAt, uint64(block.timestamp), "issuedAt");
  }

  // 2. test_EmitsTransferFromZero (mint event)
  function test_EmitsTransferFromZero() public {
    vm.expectEmit(true, true, true, true, address(emblem));
    emit Transfer(address(0), bob, 1);

    vm.prank(alice);
    emblem.issue(bob, "Member");
  }

  // 3. test_EmitsLocked
  function test_EmitsLocked() public {
    vm.expectEmit(true, true, true, true, address(emblem));
    emit Locked(1);

    vm.prank(alice);
    emblem.issue(bob, "Member");
  }

  // 4. test_EmitsBadgeIssued
  function test_EmitsBadgeIssued() public {
    vm.expectEmit(true, true, true, true, address(emblem));
    emit BadgeIssued(1, alice, bob, "Specialist");

    vm.prank(alice);
    emblem.issue(bob, "Specialist");
  }

  // 5. test_TransferReverts with Soulbound
  function test_TransferReverts() public {
    vm.prank(alice);
    uint256 tokenId = emblem.issue(bob, "Badge");

    vm.prank(bob);
    vm.expectRevert(abi.encodeWithSelector(Emblem.Soulbound.selector, tokenId));
    emblem.transferFrom(bob, charlie, tokenId);
  }

  // 6. test_SafeTransferReverts
  function test_SafeTransferReverts() public {
    vm.prank(alice);
    uint256 tokenId = emblem.issue(bob, "Badge");

    vm.prank(bob);
    vm.expectRevert(abi.encodeWithSelector(Emblem.Soulbound.selector, tokenId));
    emblem.safeTransferFrom(bob, charlie, tokenId);

    vm.prank(bob);
    vm.expectRevert(abi.encodeWithSelector(Emblem.Soulbound.selector, tokenId));
    emblem.safeTransferFrom(bob, charlie, tokenId, "data");
  }

  // 7. test_ApproveReverts
  function test_ApproveReverts() public {
    vm.prank(alice);
    uint256 tokenId = emblem.issue(bob, "Badge");

    vm.prank(bob);
    vm.expectRevert(abi.encodeWithSelector(Emblem.Soulbound.selector, tokenId));
    emblem.approve(charlie, tokenId);
  }

  // 8. test_SetApprovalForAllReverts
  function test_SetApprovalForAllReverts() public {
    vm.prank(bob);
    vm.expectRevert(abi.encodeWithSelector(Emblem.Soulbound.selector, 0));
    emblem.setApprovalForAll(charlie, true);
  }

  // 9. test_LockedReturnsTrue
  function test_LockedReturnsTrue() public {
    vm.prank(alice);
    uint256 tokenId = emblem.issue(bob, "Badge");

    assertTrue(emblem.locked(tokenId), "locked should return true");
  }

  function test_LockedRevertsForNonexistentToken() public {
    vm.expectRevert(abi.encodeWithSelector(Emblem.TokenNotFound.selector, 999));
    emblem.locked(999);
  }

  // 10. test_SupportsERC721, test_SupportsERC5192, test_SupportsERC165
  function test_SupportsERC721() public view {
    assertTrue(emblem.supportsInterface(0x80ac58cd), "supports ERC721");
  }

  function test_SupportsERC5192() public view {
    assertTrue(emblem.supportsInterface(0xb45a3c0e), "supports ERC5192");
  }

  function test_SupportsERC165() public view {
    assertTrue(emblem.supportsInterface(0x01ffc9a7), "supports ERC165");
    assertFalse(emblem.supportsInterface(0xffffffff), "rejects invalid interface");
  }

  // 11. test_RevertsZeroAddress
  function test_RevertsZeroAddress() public {
    vm.prank(alice);
    vm.expectRevert(Emblem.ZeroAddress.selector);
    emblem.issue(address(0), "No zero address");

    vm.expectRevert(Emblem.ZeroAddress.selector);
    emblem.balanceOf(address(0));
  }

  // 12. test_RevertsLabelTooLong
  function test_RevertsLabelTooLong() public {
    uint256 max = emblem.MAX_LABEL_BYTES();
    string memory overlong = string(new bytes(max + 1));

    vm.prank(alice);
    vm.expectRevert(abi.encodeWithSelector(Emblem.LabelTooLong.selector, max + 1, max));
    emblem.issue(bob, overlong);

    // Exactly max bytes must succeed
    string memory atLimit = string(new bytes(max));
    vm.prank(alice);
    uint256 id = emblem.issue(bob, atLimit);
    assertEq(id, 1);
  }

  // 13. test_GasCeiling: issue < 180_000
  function test_GasCeiling() public {
    vm.prank(alice);
    uint256 gasBefore = gasleft();
    emblem.issue(bob, "Senior Protocol Engineer");
    uint256 gasUsed = gasBefore - gasleft();

    emit log_named_uint("issue() gas used", gasUsed);
    assertLt(gasUsed, 180_000, "issue() gas exceeded ceiling of 180,000");
  }

  // 14. testFuzz_AnyoneCanIssueToAnyone
  function testFuzz_AnyoneCanIssueToAnyone(address issuer, address recipient) public {
    vm.assume(recipient != address(0));

    vm.prank(issuer);
    uint256 tokenId = emblem.issue(recipient, "Fuzz Badge");

    assertEq(emblem.ownerOf(tokenId), recipient);
    Emblem.Badge memory badge = emblem.badgeOf(tokenId);
    assertEq(badge.issuer, issuer);
    assertEq(badge.recipient, recipient);
  }

  // 15. testFuzz_BalanceIncrements
  function testFuzz_BalanceIncrements(uint8 count) public {
    vm.assume(count > 0 && count <= 20);

    for (uint256 i = 0; i < count; i++) {
      vm.prank(alice);
      emblem.issue(bob, "Badge Count Test");
    }

    assertEq(emblem.balanceOf(bob), count);
  }

  // Extra reads tests
  function test_MetadataAndReads() public {
    assertEq(emblem.name(), "Emblem");
    assertEq(emblem.symbol(), "BADGE");

    vm.prank(alice);
    uint256 tokenId = emblem.issue(bob, "Dev");
    assertEq(emblem.tokenURI(tokenId), "data:application/json,{\"name\":\"Dev\"}");

    assertEq(emblem.getApproved(tokenId), address(0));
    assertFalse(emblem.isApprovedForAll(bob, charlie));

    vm.expectRevert(abi.encodeWithSelector(Emblem.TokenNotFound.selector, 42));
    emblem.ownerOf(42);

    vm.expectRevert(abi.encodeWithSelector(Emblem.TokenNotFound.selector, 42));
    emblem.tokenURI(42);

    vm.expectRevert(abi.encodeWithSelector(Emblem.TokenNotFound.selector, 42));
    emblem.getApproved(42);
  }
}
