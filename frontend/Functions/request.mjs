import { SENTIMENT_ABI, SENTIMENT_ADDRESS, SUB_ID, FULFILL_GAS_LIMIT } from "../constants/index.js";
import {ethers} from "ethers";
import {source} from "./Functions-request-source.js";

async function request(messages, name) {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const consumerContract = new ethers.Contract(SENTIMENT_ADDRESS, SENTIMENT_ABI, signer);
  const gasLimit = 250000; // Transaction gas limit
  const verificationBlocks = 2; // Number of blocks to wait for transaction

  const subscriptionId = SUB_ID;
  const requestGas = FULFILL_GAS_LIMIT;
  const overrides = {
    gasLimit: 500000,
  };
  const prompt =`Generate the closest phrase that embodies/describes all of these phrases: ${messages.join(", ")} and print out a 1-10 word summary of that phrase as well as which emotion that phrase suits best: laughing, happy, angry, sad, or neutral;`;
  const args = [prompt, name];
  const requestTx = await consumerContract.executeRequest(
    source,
   {openaiKey: process.env.OPEN_AI_API_KEY ?? ""},
    0, // 0 for inline, 1 for off-chain
    args ?? [], // Chainlink Functions request args
    subscriptionId, // Subscription ID
    gasLimit, // Gas limit for the transaction
    overrides,
  );

  // If a response is not received within 5 minutes, the request has failed
  setTimeout(
    () =>
      reject(
        "A response not received within 5 minutes of the request " +
          "being initiated and has been canceled. Your subscription " +
          "was not charged. Please make a new request.",
      ),
    300_000,
  );
  console.log(`Waiting ${verificationBlocks} blocks for transaction ` + `${requestTx.hash} to be confirmed...`);

  // TODO: Need a better way to print this. Works on some requests and not others
  // Doesn't handle subscription balance errors correctly
  const requestTxReceipt = await requestTx.wait(verificationBlocks);
  let requestId;
  try {
    // Try ethers v6 logs
    requestId = requestTxReceipt.logs[2].args.id;
    console.log(`\nRequest ${requestId} initiated`);
  } catch (e) {
    if (e instanceof TypeError) {
      // Try ethers v5 events
      requestId = requestTxReceipt.events[2].args.id;
      console.log(requestId);
    } else {
      console.log(e);
      console.log("Could not read tx receipt. Skipping...");
    }
  }

  console.log(`Waiting for fulfillment...\n`);

  // TODO: Detect when the fulfillment is done rather than pausing
  await new Promise(r => setTimeout(r, 30000));

  // Check for errors
  let latestError = await consumerContract.latestError();
  if (latestError.length > 0 && latestError !== "0x") {
    window.alert(`\nOn-chain error message: ${Buffer.from(latestError.slice(2), "hex").toString()}`);
  }

  // Decode and print the latest response
  let latestResponse = await consumerContract.latestResponse();
  if (latestResponse.length > 0 && latestResponse !== "0x") {
    latestResponse = BigInt(await latestResponse).toString();
    console.log("Stored value is: " + latestResponse);
  }
}

export default request;
