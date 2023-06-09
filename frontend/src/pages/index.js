import { useState, useEffect } from "react";
import { writeContract, readContract, watchContractEvent } from "@wagmi/core";
import { useAccount } from "wagmi";
import Navbar from "../../components/Navbar";
import { SENTIMENT_ABI, SENTIMENT_ADDRESS } from "../../constants/index";
import { Text, Box } from "@chakra-ui/react";

export default function Home() {
  const [names, setNames] = useState([]);
  const [protocolWithMostActivity, setProtocolWithMostActivity] = useState("");
  const [maxMessageCount, setMaxMessageCount] = useState(0);
  const [checkMessageCount, setCheckMessageCount] = useState(true);
  const [readyToDelete, setReadyToDelete] = useState(false);

  const { address, isConnected } = useAccount();

  async function listenToMessagesPosted() {
    const unwatch = watchContractEvent(
      {
        address: SENTIMENT_ADDRESS,
        abi: SENTIMENT_ABI,
        eventName: "MessagePosted",
      },
      (log) => {
        console.log(log);
        setCheckMessageCount(true);
      }
    );
  }

  async function listenToResetTree() {
    const unwatch = watchContractEvent(
      {
        address: SENTIMENT_ADDRESS,
        abi: SENTIMENT_ABI,
        eventName: "TreeCleared",
      },
      (log) => {
        console.log(log);
        setReadyToDelete(true);
      }
    );
  }

  async function getProtocolNames() {
    // read table names from schema
    let protocols;
    setNames(protocols);
  }

  async function deleteTree() {
    console.log("Clearing tree...");
    const response = await fetch("/api/delete", {
      method: "DELETE",
    });
  }

  async function getProtocolWithMostActivity() {
    for (let i = 0; i < names.length; i++) {
      let messageCount;
      // get message count for each protocol from sxt
      if (messageCount > maxMessageCount) {
        setMaxMessageCount(messageCount);
        setProtocolWithMostActivity(names[i]);
      }
    }
    setCheckMessageCount(false);
  }

  useEffect(() => {
    listenToMessagesPosted();
    listenToResetTree();
    if (checkMessageCount) {
      getProtocolWithMostActivity();
    }
    if (readyToDelete) {
      deleteTree();
    }
  }, [readyToDelete, checkMessageCount]);

  useEffect(() => {
    if (isConnected) {
      getProtocolNames();
    }
  }, [names, isConnected]);

  return (
    <>
      <Navbar />
      <Box textAlign="center">
        <Text fontSize="5xl" fontWeight="bold" mt={4}>
          Sentiment
        </Text>
        <Text mt={2} fontSize="2xl">
          A protocol that allows everyone to express their true opinions without revealing their identity
        </Text>
        <Box mt={4}>
          <Text fontSize="3xl" fontWeight="bold">
            {protocolWithMostActivity !== "" ? (
              <>
                Go check out where everyone is posting!!!
                <Text>{protocolWithMostActivity}</Text>
              </>
            ) : (
              <>
                Go check out where everyone is posting!!!
                <Text>
                  {isConnected ? "No Activity" : "Connect Wallet To Reveal"}
                </Text>
              </>
            )}
          </Text>
        </Box>
      </Box>
    </>
  );
}
