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
  const [selectedAddresses, setSelectedAddresses] = useState([]);
  const [isSelected, setIsSelected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [readyToDelete, setReadyToDelete] = useState(false);
  const [messages, setMessages] = useState([]);

  const { address } = useAccount();
  const router = useRouter();

  async function listen() {
    const unwatch = watchContractEvent(
      {
        address: SENTIMENT_ADDRESS,
        abi: SENTIMENT_ABI,
        eventName: "OCRResponse",
      },
      (log) => {
        console.log(log);
        setReadyToDelete(true);
      }
    );
  }

  async function deleteTree() {
    console.log("Clearing tree and messages...");
    const response = await fetch("/api/delete", {
      method: "DELETE",
    });
  }

  async function getSelectedAddresses() {
    console.log("Requesting selected addresses");
    const name = router.pathname.substring(3);
    let addressesList = await readContract({
      address: SENTIMENT_ADDRESS,
      abi: SENTIMENT_ABI,
      functionName: "getSelectedAddresses",
      args: [name],
    });
    setSelectedAddresses(addressesList);
  }

  async function getMessages() {
    const name = router.pathname.substring(3);
    let messagesList = await readContract({
      address: SENTIMENT_ADDRESS,
      abi: SENTIMENT_ABI,
      functionName: "getMessages",
      args: [name],
    });
    setMessages(messagesList);
  }

  useEffect(() => {
    getSelectedAddresses();
  }, []);

  useEffect(() => {
    getMessages();
    listen();

    if (readyToDelete) {
      deleteTree();
    }

    if (selectedAddresses.includes(address)) {
      setIsSelected(true);
    }
  }, [messages, readyToDelete]);

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
          <VStack spacing="20px">
            <Box marginLeft={"20px"}>
            <Box>
              <Text fontSize={"lg"} as={"b"}>
                Selected
              </Text>
            </Box>
              {selectedAddresses.map((address, index) => (
                <Input
                  key={index}
                  value={address}
                  isDisabled
                  variant="unstyled"
                  borderBottom="1px solid gray"
                  pl="0"
                />
              ))}
            </Box>
          </VStack>
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
          <Insert _isSelected={isSelected} />
          <PostMessage />
        </Box>
      </Box>
    </>
  );
}
