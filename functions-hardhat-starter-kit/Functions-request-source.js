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
console.log("Sentiment: ", sentiment);
const sentimentText = sentiment.substring(3, sentiment.indexOf('(') - 2);
const emoji = sentiment.substring(sentiment.indexOf('(') + 1, sentiment.indexOf(')'));
console.log(`Value we will send on-chain: \n${sentimentText}\n${emoji}\n${_name}`);
const returnValue = sentimentText.toString() + "," + emoji.toString() + "," + _name.toString() + ",";
return Functions.encodeString(returnValue);