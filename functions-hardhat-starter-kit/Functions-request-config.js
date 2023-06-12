const fs = require("fs")

// Loads environment variables from .env.enc file (if it exists)
require("@chainlink/env-enc").config()
require("dotenv").config();

const Location = {
  Inline: 0,
  Remote: 1,
}

const CodeLanguage = {
  JavaScript: 0,
}

const ReturnType = {
  uint: "uint256",
  uint256: "uint256",
  int: "int256",
  int256: "int256",
  string: "string",
  bytes: "Buffer",
  Buffer: "Buffer",
}

const messages = ["I think Chainlink is awesome, I think Chainlink is the best company in the world!, I also think Chainlink is great!"];
const name = "Chainlink"





const prompt = `Generate the closest phrase that embodies/describes all of these phrases: ${messages.join(", ")} and print out a 1-10 word summary of that phrase as well as which emotion that phrase suits best: laughing, happy, angry, sad, or neutral;`;
// Configure the request by setting the fields below
const requestConfig = {
  // Location of source code (only Inline is currently supported)
  codeLocation: Location.Inline,
  // Code language (only JavaScript is currently supported)
  codeLanguage: CodeLanguage.JavaScript,
  // String containing the source code to be executed
  source: fs.readFileSync("./Functions-request-source.js").toString(),
  //source: fs.readFileSync('./API-request-example.js').toString(),
  // Secrets can be accessed within the source code with `secrets.varName` (ie: secrets.apiKey). The secrets object can only contain string values.
  secrets: {openaiKey: process.env.OPEN_AI_KEY ?? ""},
  // Per-node secrets objects assigned to each DON member. When using per-node secrets, nodes can only use secrets which they have been assigned.
  perNodeSecrets: [],
  // ETH wallet key used to sign secrets so they cannot be accessed by a 3rd party
  walletPrivateKey: process.env.PRIVATE_KEY,
  // Args (string only array) can be accessed within the source code with `args[index]` (ie: args[0]).
  args: [prompt, name],
  // Expected type of the returned value
  expectedReturnType: ReturnType.string,
  // Redundant URLs which point to encrypted off-chain secrets
  secretsURLs: [],
}

module.exports = requestConfig

// 0x0de52843a8e253092ffc6a388dc764a57986a83344b110f6ef4d370e892f72c9
// 0x02abeb8a65fcd292054eeb9a4300eba9c1ce9271d7c7ff13694a9528edd2db9c
// 