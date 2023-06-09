// make HTTP request to database
const prompt = args[0];
const _name = args[1];

if(!secrets.openaiKey){
  throw Error("Need to set OPEN_AI_KEY environment variable")
}

const openAIRequest = Functions.makeHttpRequest({
  url: "https://api.openai.com/v1/completions",
  method: "POST",
  headers: {
    Authorization: `Bearer ${secrets.openaiKey}`,
  },
  data: {
    "model": "text-davinci-003", "prompt": prompt, "temperature": 0, "max_tokens": 50
  }
});

const [openAIResponse] = await Promise.all([
  openAIRequest
])

console.log("raw response", openAIResponse);
const sentiment = openAIResponse.data.choices[0].text;
const sentimentText = sentiment.substring(0, sentiment.indexOf('('));
const emoji = sentiment.substring(sentiment.indexOf('(') + 1, sentiment.indexOf(')'));
console.log("Value we will send on-chain: ", sentimentText + " " + emoji + " " + _name);
return Buffer.concat(
  [Functions.encodeString(sentimentText),
  Functions.encodeString(emoji),
  Functions.encodeString(_name)]
);


// Functions code should check if the message is similar to other messages in the database
// when message gets created, first sends the message to open ai to compare it with other messages in database
// if it is a similar message, return the similar message to the user, and ask if they would like to send it, or create a new message.
// if user accepts, create message inside SxT database. 


// Returns sentiment to contract
// configure dynamic nft based on if contract is positive or negative