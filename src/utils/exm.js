import axios from "axios";
import { Exm, ContractType } from "@execution-machine/sdk";
import Arweave from "arweave";
import { generateURI } from "./generateURI.js";
import { mintEpisode } from "./ether.js";
import { REQUESTS_EXM_CONTRACT } from "./constants.js";
const PK = JSON.parse(process.env.JWK);
const exm = new Exm({ token: process.env.EXM_TOKEN });
const arweave = Arweave.init({
  host: "arweave.net",
  port: 449,
  protocol: "https",
  timeout: 60000,
  logging: false,
});

async function getUnresolvedRequests() {
  const state = (
    await axios.get(`https://api.exm.dev/read/${REQUESTS_EXM_CONTRACT}`)
  )?.data;
  const requests = state.records.filter(
    (record) => record.status === "pending"
  );

  return requests;
}

export async function resolveRequests() {
  try {
    const requests = await getUnresolvedRequests();
    for (const request of requests) {
      const token_uri = await generateURI(request);
      const nftCreate = await mintEpisode(request.target, `ar://${token_uri}`);
      await exmWrite(nftCreate.hash, request.record_id);
    }
  } catch (error) {
    console.log(error);
  }
}

async function exmWrite(hash, record_id) {
  try {
    const signature = await generateSig();
    const inputs = {
      function: "resolveRequest",
      jwk_n: PK.n,
      sig: signature,
      mint_hash: hash,
      record_id: record_id,
    };

    const tx = await exm.functions.write(REQUESTS_EXM_CONTRACT, inputs);
    console.log(tx.data.execution);
  } catch (error) {
    console.log(error);
  }
}

async function generateSig() {
  const data = new TextEncoder().encode(`hello world`);
  const sign = await arweave.crypto.sign(PK, data);

  return sign.toString("base64");
}

export async function sleep(min) {
  console.log(`sleeping for ${min} min`);
  return new Promise((resolve) => setTimeout(resolve, min * 60 * 1e3));
}
