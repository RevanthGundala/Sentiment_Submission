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

export default function Uniswap() {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sentiment, setSentiment] = useState("");
  const [tokenURI, setTokenURI] = useState("");
  const [name, setName] = useState("");
  const [imageURI, setImageURI] = useState("");
  const [schema, setSchema] = useState("Sentiment")

  const router = useRouter();

  async function getMessages() {
    const table_name = router.pathname.substring(3);
    const resourceId = `${schema}.${table_name}`
    const sqlText = `SELECT MESSAGE FROM ${resourceId}`;
    const ACCESS_TOKEN = process.env.ACCESS_TOKEN || "eyJ0eXBlIjoiYWNjZXNzIiwia2lkIjoiNGE2NTUwNjYtZTMyMS00NWFjLThiZWMtZDViYzg4ZWUzYTIzIiwiYWxnIjoiRVMyNTYifQ.eyJpYXQiOjE2ODYzNDQ0OTYsIm5iZiI6MTY4NjM0NDQ5NiwiZXhwIjoxNjg2MzQ1OTk2LCJ0eXBlIjoiYWNjZXNzIiwidXNlciI6IlJHIiwic3Vic2NyaXB0aW9uIjoiYTIyOTNlOGMtMDczMi00MTM4LWFmMDAtMDY4MGM4YWVkZjU3Iiwic2Vzc2lvbiI6ImZiOTVlYjZkZGJhNjUyMmUxMzEwNGExMyIsInNzbl9leHAiOjE2ODY0MzA4OTYyNzIsIml0ZXJhdGlvbiI6IjNkMWEzOWUyNDhjMjgwNjQ4YmEzMzkwOCJ9.-3Pp9ymf27bVbVrRVNibpBFQ_oKw9obSBcR6zWdyOf_j5jXCaSa7N9VkFrGVjM_nlqOg0o9LEKZm9dhx43497A"; 
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
    //await request(messagesListJSON, table_name);
  }

  async function getSentimentText(){
    const name = router.pathname.substring(3);
    const sentimentText = await readContract({
      address: SENTIMENT_ADDRESS,
      abi: SENTIMENT_ABI,
      functionName: "getSentimentText",
      args: [name]
    });
    setSentiment(sentimentText);
  }

  async function getSentimentEmoji(){
    const name = router.pathname.substring(3);
    const sentimentEmoji = await readContract({
      address: SENTIMENT_ADDRESS,
      abi: SENTIMENT_ABI,
      functionName: "getEmojiURI",
      args: [name]
    });
    setTokenURI(sentimentEmoji);
    await fetchNFTDetails();
  }

  async function fetchNFTDetails(){
    const metdata = await fetch(tokenURI);
    const metadataJSON = await metdata.json();

    let image = metadataJSON.image;
    image = image.replace("ipfs://", "https://ipfs.io/ipfs/");
    setName(metadataJSON.name);
    setImageURI(image);
  }

  useEffect(() => {
    getMessages();
    // getSentimentText();
    // getSentimentEmoji();
  }, []);


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
          {tokenURI}
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
                value={message.MESSAGE}
                readOnly={true}
                width="200%"
                resize={"none"}
                minHeight="100px"
              />
            ))}
          </VStack>
        </Box>
        <Box>
          <Insert />
          <PostMessage />
        </Box>
      </Box>
    </>
  );
}
