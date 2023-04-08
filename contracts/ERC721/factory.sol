// contracts/4_ERC721.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract PermacastNFT is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    address public admin;

    constructor() ERC721("Permacast NFT", "PC") {
        admin = 0x197f818c1313DC58b32D88078ecdfB40EA822614;
    }

    event Mint(
        address indexed sender,
        address indexed owner,
        string tokenURI,
        uint256 tokenId
    );

    function mint(address owner, string memory tokenURI)
        public
        returns (uint256)
    {
        require(
            admin == msg.sender,
            "NFT can be only minted by contract admin"
        );
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        _mint(owner, newItemId);
        _setTokenURI(newItemId, tokenURI);

        emit Mint(msg.sender, owner, tokenURI, newItemId);
        return newItemId;
    }

    function uri(uint256 tokenId) public view returns (string memory) {
        return tokenURI(tokenId);
    }
}
