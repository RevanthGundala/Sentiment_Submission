// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Emoji is ERC721 {
    uint public tokenIdCounter;
    mapping(uint => string) public tokenIdToURI;
    mapping(address => uint) public balances;
    event Mint(address to, uint tokenId);

    constructor() ERC721("Emoji", "Emo") {
        tokenIdCounter = 0;
    }

    function mint(address to, string memory uri) external {
        tokenIdToURI[tokenIdCounter] = uri;
        _safeMint(to, tokenIdCounter);
        emit Mint(to, tokenIdCounter);
        tokenIdCounter++;
    }

    function getTokenIdCounter() external view returns (uint) {
        return tokenIdCounter;
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721) returns (string memory) {
        return tokenIdToURI[tokenId];
    }
}
