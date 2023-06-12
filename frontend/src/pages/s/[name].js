import Navbar from "../../../components/Navbar";
import Insert from "../../../components/Insert";
import PostMessage from "../../../components/PostMessage";
import { useState, useEffect } from "react";
import { Box, VStack, Input, Textarea, Text } from "@chakra-ui/react";
import { useAccount } from "wagmi";
import { writeContract, readContract, watchContractEvent } from "@wagmi/core";
import { useRouter } from "next/router";
import { SENTIMENT_ABI, SENTIMENT_ADDRESS } from "../../../constants";

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
    //await checkTableExists(table_name, resourceId);
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
    console.log(messagesListJSON);
    // TODO: Call executeRequest() from CL Functions automatically
  }

  // async function checkTableExists(table_name, resourceId){
  //   const ACCESS_TOKEN = process.env.NEXT_PUBLIC_ACCESS_TOKEN; 
  //   let sqlText = `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name = '${table_name}')`;
  //   const options = {
  //       method: 'POST',
  //         headers: {
  //           accept: 'application/json',
  //           'content-type': 'application/json',
  //           authorization: `Bearer ${ACCESS_TOKEN}`
  //         },
  //         body: JSON.stringify({
  //           sqlText: sqlText,
  //           resourceId: resourceId
  //         })
  //   };
  //   const tableExists = await fetch("https://hackathon.spaceandtime.dev/v1/sql/dql", options);
  //   const tableExistsJSON = await tableExists.json();
  //   console.log(tableExistsJSON);
  // }

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
      getSentiment();
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
          <Box ml={40}>
          <Insert />
          </Box>
          <Box mr={5}>
            <PostMessage />
          </Box>
        </Box>
      </Box>
    </>
  );
}

// 0x1d0af21d6b9af5600ea27084e43eccbe3dc11be8cb7cdd3a2503248e4e5eee4c
// 0x2aa0fa949e5a26c7334c69c2f87bfc878da2928354314317bac85d2f37275fc7