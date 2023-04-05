import { genNodeAPI } from "arseeding-js";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

async function getTransactionData(txid) {
  try {
    return (await axios.get(`https://arseed.web3infra.dev/${txid}`))?.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function generateURI(request) {
  try {
    const instance = await genNodeAPI(process.env.ARSEED_PK);

    const arseedUrl = "https://arseed.web3infra.dev";

    const uri_object = {
      animation_url: `ar://${request.metadata.content}`,
      description: await getTransactionData(request.metadata.description),
      image: `ar://${request.metadata.cover}`,
      name: request.metadata.name,
      properties: {
        channel: request.metadata.cid,
      },
    };

    const data = Buffer.from(JSON.stringify(uri_object));
    const payCurrency = "eth";
    const ops = {
      tags: [{ name: "Content-Type", value: "application/json" }],
    };

    const res = await instance.sendAndPay(arseedUrl, data, payCurrency, ops);
    return res.order.itemId;
  } catch (error) {
    console.log(error);
  }
}
