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
  const [selectedFor, setSelectedFor] = useState([]);

  const { address, isConnected } = useAccount();

  async function listen() {
    const unwatch = watchContractEvent(
      {
        address: SENTIMENT_ADDRESS,
        abi: SENTIMENT_ABI,
        eventName: "messagePosted",
      },
      (log) => {
        console.log(log);
        setCheckMessageCount(true);
      }
    );
  }

  async function getProtocolNames() {
    const protocols = await readContract({
      address: SENTIMENT_ADDRESS,
      abi: SENTIMENT_ABI,
      functionName: "getNames",
    });
    setNames(protocols)
  }

  async function checkIfSelected(name) {
    let selected = await readContract({
      address: SENTIMENT_ADDRESS,
      abi: SENTIMENT_ABI,
      functionName: "checkIfSelected",
      args: [name, address],
    });
    if (selected) {
      setSelectedFor(selectedFor.concat(name));
    }
  }

  async function getProtocolWithMostActivity() {
    for (let i = 0; i < names.length; i++) {
      let messageCount = await readContract({
        address: SENTIMENT_ADDRESS,
        abi: SENTIMENT_ABI,
        functionName: "getMessageCount",
        args: [names[i]],
      });
      if (messageCount > maxMessageCount) {
        setMaxMessageCount(messageCount);
        setProtocolWithMostActivity(names[i]);
      }

      if(isConnected){
        await checkIfSelected(names[i]);
      }
    }
    setCheckMessageCount(false);
  }

  useEffect(() => {
    listen();
    if (checkMessageCount) {
      getProtocolWithMostActivity();
    }
  }, []);

  useEffect(() => {
    if(isConnected){
      getProtocolNames();
    }
  }, [names]);

  return (
    <>
      <Navbar />
      <Box textAlign="center">
        <Text fontSize="5xl" fontWeight="bold" mt={4}>
          Sentiment
        </Text>
        <Text mt={2} fontSize={"2xl"}>
          A protocol that allows everyone to express their true opinions without revealing their identity
        </Text>
        <Box mt={4} fontSize={"2xl"}>
          <Text>Hurry Up, You can go post messages in these protocols for the next week!!!</Text>
          {selectedFor.length > 0 ? (
            selectedFor.map((name, index) => <Text fontWeight={"bold"} key={index}>{name}</Text>)
          ) : (
            <Text fontWeight={"bold"}>{isConnected ? "Not Selected" : "Connect Wallet To Reveal"}</Text>
          )}
        </Box>
        <Box mt={4}>
          <Text fontSize={"3xl"}>Go check out where everyone is posting!!!</Text>
          <Text fontSize={"3xl"} fontWeight={"bold"}>
              {protocolWithMostActivity !== "" ? (
                <span>{protocolWithMostActivity}</span>
              ) : (
                <span>{isConnected ? "No Activity" : "Connect Wallet To Reveal"}</span>
              )}
          </Text>
        </Box>
      </Box>
    </>
  );
}