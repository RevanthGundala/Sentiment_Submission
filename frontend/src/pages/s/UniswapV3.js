import Navbar from "../../../components/Navbar";
import Insert from "../../../components/Insert";
import PostMessage from "../../../components/PostMessage";
import { useState, useEffect } from "react";
import { Box, VStack, Input, Textarea, Text } from "@chakra-ui/react";
import { useAccount } from "wagmi";
import { writeContract, readContract, watchContractEvent } from "@wagmi/core";
import { useRouter } from "next/router";
import { SENTIMENT_ABI, SENTIMENT_ADDRESS } from "../../../constants";

export default function Uniswap() {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [reload, setReload] = useState(false);
  const [sentiment, setSentiment] = useState("");
  const [tokenURI, setTokenURI] = useState("");

  const router = useRouter();

  async function getMessages() {
    const name = router.pathname.substring(3);
    // fetch to sxt db
    let messagesList = [];
    setMessages(messagesList);
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
  }
  async function listenToMessagesPosted() {
    const unwatch = watchContractEvent(
      {
        address: SENTIMENT_ADDRESS,
        abi: SENTIMENT_ABI,
        eventName: "MessagePosted",
      },
      (log) => {
        console.log(log);
        // TODO: Request
        setReload(true);
      }
    );
  }

  useEffect(() => {
    getMessages();
    getSentimentText();
    getSentimentEmoji();
  }, []);

  useEffect(() => {
    listenToMessagesPosted();
  }, []);

  useEffect(() => {
    if (reload) {
      getMessages();
      getSentimentText();
      getSentimentEmoji();
      setReload(false);
    }
  }, [reload]);

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
                value={message}
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
