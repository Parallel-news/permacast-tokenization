import { NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, MUMBAI_RPC_URL } from "./constants.js"
import { ethers } from "ethers";
import Web3 from "web3";
import dotenv from "dotenv";
const web3 = new Web3(MUMBAI_RPC_URL);
dotenv.config();

export async function mintEpisode(address, token_uri) {
  try {
    const provider = new ethers.providers.JsonRpcProvider(MUMBAI_RPC_URL);
    const signer = new ethers.Wallet(process.env.MINTER_PK, provider);
    const Contract = new ethers.Contract(
      NFT_CONTRACT_ADDRESS,
      NFT_CONTRACT_ABI,
      signer
    );
    console.log(address, token_uri)
    const interaction = await Contract.mint(address, token_uri);
    await interaction.wait();
    console.log(interaction)
    return interaction;
  } catch (error) {
    console.log(error);
  }
}


