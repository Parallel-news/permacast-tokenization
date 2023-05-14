<p align="center">
  <a href="https://permacast.app">
    <img src="https://raw.githubusercontent.com/Parallel-news/permacast-protocol/main/img/pc-icons/logo192.png" height="124">
  </a>
  <p align="center">Tokenizing Permacast episodes as ERC721 tokens</p>
</p>

## About
This repository is a bridge for Permacast episodes (audio/video content) to be minted as ERC721 NFTs on Polygon blockchain. Mint your Permacast episode with a single gasless EXM interaction.

| name  | value |
| :-------------: |:-------------:|
| stage      | testnet     |
| ERC721 factory      | [0x1690a413DCFC7D373142A856090fA8b8f21113Db](https://mumbai.polygonscan.com/address/0x1690a413dcfc7d373142a856090fa8b8f21113db) / [source code](./contracts/ERC721) |
| EXM jobs resolver      | [PIn2MzAi8E-mUK6zrKyrwXZ8xyY2ItSk1lMB74RNGLc](https://api.exm.dev/read/PIn2MzAi8E-mUK6zrKyrwXZ8xyY2ItSk1lMB74RNGLc) / [source code](./contracts/requests-handler) |
| Permacast contract | [PkYlJofH0Vz0oVpoPB67KrKq0rPzPBg7O4I28eNFmzM](https://api.exm.dev/read/PkYlJofH0Vz0oVpoPB67KrKq0rPzPBg7O4I28eNFmzM) - testnet Bloodstone |

## Tech Stack

- EXM : [exm.dev](https://exm.dev) - smart contract protocol
- EverFinance: [arseeding-js](https://www.npmjs.com/package/arseeding-js) - L2 payments processor
- molecule : [molecule.sh](http://molecule.sh) - EXM developer tooling

## License
This repository is licensed under the [MIT License](./LICENSE)
