import { useState, useEffect } from "react";
import { writeContract, readContract, watchContractEvent } from "@wagmi/core";
import { useAccount } from "wagmi";
import Navbar from "../../components/Navbar";
import { SENTIMENT_ABI, SENTIMENT_ADDRESS, Sentiment } from "../../constants/index";
import { Text, Box } from "@chakra-ui/react";

export default function Home() {
  const [names, setNames] = useState([]);
  const [schema, setSchema] = useState("Sentiment")
  const [protocolWithMostActivity, setProtocolWithMostActivity] = useState("");
  const [maxMessageCount, setMaxMessageCount] = useState(0);
  const [checkMessageCount, setCheckMessageCount] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setisClient] = useState(false)

  async function listenToResetTree() {
    const unwatch = watchContractEvent(
      {
        address: SENTIMENT_ADDRESS,
        abi: SENTIMENT_ABI,
        eventName: "TreeCleared",
      },
      (log) => {
        console.log(log);
        deleteTree();
      }
    );
  }

  async function deleteTree() {
    console.log("Clearing tree...");
    const response = await fetch("/api/delete", {
      method: "DELETE",
    });
    console.log(response);
  }

  async function getProtocolNames() {
    // const sqlText = `SELECT table_name FROM information_schema.tables WHERE table_schema = ${schema}`;
    let protocols = ["UniswapV3", "AaveV2"];
    setNames(protocols);
    await getProtocolWithMostActivity();
  }

  async function getProtocolWithMostActivity() {
    console.log("Getting protocol with most activity...")
    setIsLoading(true);
    let table_name = "";
    let messageCount = 0;
    let sqlText;
    let options;
    let resourceId;
    let response;
    let responseJSON;
    const ACCESS_TOKEN = process.env.NEXT_PUBLIC_ACCESS_TOKEN;
    for (let i = 0; i < names.length; i++) {
      table_name = names[i];
      resourceId = `${schema}.${table_name}`
      sqlText = `SELECT COUNT(*) AS row_count FROM ${resourceId}`;
      console.log(resourceId)
      options = {
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
      response = await fetch("https://hackathon.spaceandtime.dev/v1/sql/dql", options);
      responseJSON = await response.json();
      messageCount = responseJSON[0].row_count;
      if (messageCount > maxMessageCount) {
        setMaxMessageCount(messageCount);
        setProtocolWithMostActivity(names[i]);
      }
    }
    setIsLoading(false);
    console.log("Done getting protocol with most activity...")
  }

  useEffect(() => {
    setisClient(true)
    getProtocolNames();
    listenToResetTree();
  }, []);

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
        {isClient && (
          <Box mt={4}>
            <Text fontSize="3xl" fontWeight="bold">
              {isLoading ? "Loading..." : "Go check out where everyone is posting!!!"}
            </Text>
            {protocolWithMostActivity !== "" ? (
              <Text fontSize="3xl" fontWeight="bold">{protocolWithMostActivity}</Text>
            ) : (
              <Text fontSize="3xl" fontWeight="bold">No Activity</Text>
            )}
          </Box>
        )}
      </Box>
    </>
  );
}
