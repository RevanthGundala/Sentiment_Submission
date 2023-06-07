// make HTTP request
const url = 'https://hackathon.spaceandtime.dev/v1/sql/dql'
let sqlText = `SELECT
      FROM_ADDRESS AS WALLET_ADDRESS,
      COUNT(*) AS TRANSACTION_COUNT
    FROM
      ETHEREUM.TRANSACTIONS
    GROUP BY
      FROM_ADDRESS
    ORDER BY
      CAST(TRANSACTION_COUNT AS DECIMAL(38)) DESC
    LIMIT
      10;`;
      
let resourceId = 'ETHEREUM.TRANSACTIONS'
const access_token = "eyJ0eXBlIjoiYWNjZXNzIiwia2lkIjoiNGE2NTUwNjYtZTMyMS00NWFjLThiZWMtZDViYzg4ZWUzYTIzIiwiYWxnIjoiRVMyNTYifQ.eyJpYXQiOjE2ODYwODg2MDAsIm5iZiI6MTY4NjA4ODYwMCwiZXhwIjoxNjg2MDkwMTAwLCJ0eXBlIjoiYWNjZXNzIiwidXNlciI6IlJHIiwic3Vic2NyaXB0aW9uIjoiYTIyOTNlOGMtMDczMi00MTM4LWFmMDAtMDY4MGM4YWVkZjU3Iiwic2Vzc2lvbiI6IjEwOGI1Zjc3NjAwNjBmM2I2OWY1M2U0NiIsInNzbl9leHAiOjE2ODYxNzUwMDA5MzIsIml0ZXJhdGlvbiI6ImFmZjJiYTM4NGEwNGRhYzkxOGI0YWIzMSJ9.VyAU_yT2h3oY3rFbnO3VZgiqyXJX7HBpSdMtmSQIO2qWoVQrS5XbuDkdI1yLXMQ_D3BvhknBnl0m64YHhopdRQ";
// let options = {
//   method: 'POST',
//   headers: {
//     accept: 'application/json',
//     'content-type': 'application/json',
//     authorization: `Bearer ${access_token}`
//   },
//   body: JSON.stringify({
//     sqlText: sqlText,
//     resourceId: resourceId
//   })
// };

// construct the HTTP Request object. See: https://github.com/smartcontractkit/functions-hardhat-starter-kit#javascript-code
// params used for URL query parameters
const uniswapRequest = Functions.makeHttpRequest({
  url: url,
  method: "POST",
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    authorization: `Bearer ${access_token}`
  },
  data: {
    sqlText: sqlText,
    resourceId: resourceId
  }

})

// Execute the API request (Promise)
const uniswapResponse = (await uniswapRequest).data;

if (uniswapResponse.error) {
  console.error(uniswapResponse.error)
  throw Error("Request to Uniswap failed")
}

console.log("Returning...");
const selectedAddresses =  uniswapResponse.map((address) => 
    address.WALLET_ADDRESS
);

// return Buffer.concat(selectedAddresses.map(address => Functions.encodeString(address)));
return Functions.encodeString("0xae2Fc483527B8EF99EB5D9B44875F005ba1FaE13,126697,0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549,101128,0x75e89d5979E4f6Fba9F97c104c2F0AFB3F1dcB88,97033,0x28C6c06298d514Db089934071355E5743bf21d60,95192,0x46340b20830761efd32832A74d7169B29FEB9758,92067,0xDFd5293D8e347dFe59E90eFd55b2956a1343963d,90946,0xf89d7b9c864f589bbF53a82105107622B35EaA40,71653,0x9696f59E4d72E237BE84fFD425DCaD154Bf96976,71622,0x56Eddb7aa87536c09CCc2793473599fD21A8b17F,69934,0x4976A4A02f38326660D17bf34b431dC6e2eb2327,58032");