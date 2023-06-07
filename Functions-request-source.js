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
const access_token = "eyJ0eXBlIjoiYWNjZXNzIiwia2lkIjoiNGE2NTUwNjYtZTMyMS00NWFjLThiZWMtZDViYzg4ZWUzYTIzIiwiYWxnIjoiRVMyNTYifQ.eyJpYXQiOjE2ODU1ODk0ODEsIm5iZiI6MTY4NTU4OTQ4MSwiZXhwIjoxNjg1NTkwOTgxLCJ0eXBlIjoiYWNjZXNzIiwidXNlciI6IlJHIiwic3Vic2NyaXB0aW9uIjoiYTIyOTNlOGMtMDczMi00MTM4LWFmMDAtMDY4MGM4YWVkZjU3Iiwic2Vzc2lvbiI6ImNiYmNjNTQ1ODE4N2Y3OGM5N2EwNjYyNSIsInNzbl9leHAiOjE2ODU2NzU4ODEyMDgsIml0ZXJhdGlvbiI6ImMyMTc2NTY5NmRjZWJmYTY3YzhiZGQ1ZCJ9.7x8tHpGFEdPnEfLWvDFE3RnHoR-MzRjtd6wbYdwS83WuhMPdYbJcQ-wN4_KVQxYELeSAerIe40nZJuFOaA7h8w";
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
const uniswapResponse = await uniswapRequest
if (uniswapResponse.error) {
  console.error(uniswapResponse.error)
  throw Error("Request to Uniswap failed")
}

const selectedAddresses = [];
uniswapResponse.map((address, i) => {
  selectedAddresses.push(address.WALLET_ADDRESS)
})

return Functions.encodeBytes(selectedAddresses);
