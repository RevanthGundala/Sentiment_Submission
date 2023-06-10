import Navbar from "../../../components/Navbar";
import Insert from "../../../components/Insert";
import PostMessage from "../../../components/PostMessage";
import { useState, useEffect } from "react";
import { Box, VStack, Input, Textarea, Text } from "@chakra-ui/react";
import { useAccount } from "wagmi";
import { writeContract, readContract, watchContractEvent } from "@wagmi/core";
import { useRouter } from "next/router";
import { SENTIMENT_ABI, SENTIMENT_ADDRESS } from "../../../constants";
import request from "../../../Functions/request.mjs";

export default function Protocol() {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sentiment, setSentiment] = useState("");
  const [imageURI, setImageURI] = useState("");
  const [schema, setSchema] = useState("Sentiment")

  const router = useRouter();

  async function getMessagesAndAddresses() {
    //const table_name = router.pathname.substring(3);
    const table_name = router.query.name;
    const resourceId = `${schema}.${table_name}`
    await checkTableExists(table_name, resourceId);
    const sqlText = `SELECT MESSAGE, ADDRESS FROM ${resourceId}`;
    const ACCESS_TOKEN = process.env.NEXT_PUBLIC_ACCESS_TOKEN; 
    const options = {
        method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: `Bearer ${ACCESS_TOKEN}`
          },
          body: JSON.stringify({
            sqlText: sqlText,
            resourceId: resourceId
          })
    };
    const messagesList = await fetch("https://hackathon.spaceandtime.dev/v1/sql/dql", options);
    const messagesListJSON = await messagesList.json();
    setMessages(messagesListJSON);
    await request(messagesListJSON, table_name);
    const {hash, latestResponse} = await readContract({
      address: SENTIMENT_ADDRESS,
      abi: SENTIMENT_ABI,
      functionName: "getLatestResponse",
    })
    console.log(latestResponse);
  }

  async function checkTableExists(table_name, resourceId){
    const ACCESS_TOKEN = process.env.NEXT_PUBLIC_ACCESS_TOKEN; 
    let sqlText = `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name = '${table_name}')`;
    const options = {
        method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: `Bearer ${ACCESS_TOKEN}`
          },
          body: JSON.stringify({
            sqlText: sqlText,
            resourceId: resourceId
          })
    };
    const tableExists = await fetch("https://hackathon.spaceandtime.dev/v1/sql/dql", options);
    const tableExistsJSON = await tableExists.json();
    console.log(tableExistsJSON);
    const exists = true;
    if(!exists){
      //
    }
  }

  async function getSentiment(){
    const name = router.query.name;
    const sentimentText = await readContract({
      address: SENTIMENT_ADDRESS,
      abi: SENTIMENT_ABI,
      functionName: "getSentimentText",
      args: [name]
    });
    setSentiment(sentimentText);
    await getSentimentEmoji();
  }

  async function getSentimentEmoji(){
    const name = router.query.name;
    const tokenURI = await readContract({
      address: SENTIMENT_ADDRESS,
      abi: SENTIMENT_ABI,
      functionName: "getEmojiURI",
      args: [name]
    });
    await fetchNFTDetails(tokenURI);
  }

  async function fetchNFTDetails(tokenURI){
    tokenURI = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/");
    const metdata = await fetch(tokenURI);
    const metadataJSON = await metdata.json();
    console.log(metadataJSON);

    let image = metadataJSON.image;
    image = image.replace("ipfs://", "https://ipfs.io/ipfs/");
    setImageURI(image);
  }

  useEffect(() => {
    if(router.query.name){
      getMessagesAndAddresses();
    //getSentiment();
    }
  }, [router.query.name]);


  return (
    <>
      <Navbar />
      <Box
        display="flex"
        alignItems="flex-start"
        justifyContent="space-between"
        mt="20px"
      >
       <Box>
          {sentiment}
          <img src={imageURI} />
        </Box>
        <Box>
          <VStack spacing="20px">
            <Box>
              <Text fontSize={"lg"} as={"b"}>
                Posts
              </Text>
            </Box>
            {messages.map((message, index) => (
              <Textarea
                key={index}
                value={`Posted by ${message.ADDRESS}\n\n${message.MESSAGE}`}
                readOnly={true}
                width="200%"
                resize={"none"}
                minHeight="100px"
              />
            ))}
          </VStack>
        </Box>
        <Box mt={10}>
          <Insert />
          <Box mr={5}>
            <PostMessage />
          </Box>
        </Box>
      </Box>
    </>
  );
}


// 0x0389e564051d8f5fed210f3ff1342f7598274050d6c000aaf29d654e1a7f1f33
// 0x12d3467195dd2e20f138080b347c3a2094f3d203c3d20c9ab9ff3736780289ad
// {"root":"0x0b30cf9a1f29dbbca49faf4d9a382614d928e61485e134eb5bc25d09d0bc198a","nullifierHash":"0x02b4777ebf4652cddfa33ade82eb2c80a94eb246f20fd4b80e59dee81b2d3fd2","nullifier":"450533247850435330993681627900391181","pathElements":["0x1b1cc8710b869ab4ba2082f838b9762f77ae7620d9859ded425052fb3e539e0a","0x1a578b6b1057048f93b089dca6f3a7714f2df512bdc034fbc6a821e399c92ffa","0x217126fa352c326896e8c2803eec8fd63ad50cf65edfef27a41a9e32dc622765","0x0e28a61a9b3e91007d5a9e3ada18e1b24d6d230c618388ee5df34cacd7397eee","0x27953447a6979839536badc5425ed15fadb0e292e9bc36f92f0aa5cfa5013587","0x194191edbfb91d10f6a7afd315f33095410c7801c47175c2df6dc2cce0e3affc","0x1733dece17d71190516dbaf1927936fa643dc7079fc0cc731de9d6845a47741f","0x267855a7dc75db39d81d17f95d0a7aa572bf5ae19f4db0e84221d2b2ef999219","0x1184e11836b4c36ad8238a340ecc0985eeba665327e33e9b0e3641027c27620d","0x0702ab83a135d7f55350ab1bfaa90babd8fc1d2b3e6a7215381a7b2213d6c5ce"],"pathIndices":[1,1,0,0,0,0,0,0,0,0]}