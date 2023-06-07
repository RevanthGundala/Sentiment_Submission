import { useState } from "react";
import { Box, Textarea, IconButton, Button, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton } from "@chakra-ui/react";
import { writeContract, getContract, readContract } from "@wagmi/core";
import { BsSendFill } from "react-icons/bs";
import { SENTIMENT_ABI, SENTIMENT_ADDRESS } from "../constants/index";
import { useRouter } from "next/router";
import { groth16 } from "snarkjs";

export default function PostMessage() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [root, setRoot] = useState("");
  const [nullifierHash, setNullifierHash] = useState("");
  const [witness, setWitness] = useState("");

  const router = useRouter();

  async function prove() {
    // const wasmPath = "http://localhost:5002/post.wasm"; 
    // const zkeyPath = "http://localhost:5002/post_0001.zkey";
    const wasmPath = "/zkproof/post.wasm";
    const zkeyPath = "/zkproof/post_0001.zkey";
    const { proof } = await groth16.fullProve(JSON.parse(witness), wasmPath, zkeyPath);
    const solProof = {
      a: [proof.pi_a[0], proof.pi_a[1]],
      b: [
        [proof.pi_b[0][1], proof.pi_b[0][0]],
        [proof.pi_b[1][1], proof.pi_b[1][0]],
      ],
      c: [proof.pi_c[0], proof.pi_c[1]],
    };
    return solProof;
  }

  async function post(e) {
    e.preventDefault();
    setIsLoading(true);
    const solProof = await prove();
    const name = router.pathname.substring(3);
    const nameExists = await readContract({
      address: SENTIMENT_ADDRESS,
      abi: SENTIMENT_ABI,
      functionName: "nameExists",
      args: [name]
    })
    
    if(!nameExists){
      await writeContract({
        address: SENTIMENT_ADDRESS,
        abi: SENTIMENT_ABI,
        functionName: "addName",
        args: [name]
      })
    }
    await writeContract({
      address: SENTIMENT_ADDRESS,
      abi: SENTIMENT_ABI,
      functionName: "postMessageWithProof",
      args: [name, message, nullifierHash, root, solProof],
    });
    console.log("Posted message to contract");
    // REPLACE WITH YOUR OWN ACCESS TOKEN 
    const access_token = process.env.ACCESS_TOKEN || "eyJ0eXBlIjoiYWNjZXNzIiwia2lkIjoiNGE2NTUwNjYtZTMyMS00NWFjLThiZWMtZDViYzg4ZWUzYTIzIiwiYWxnIjoiRVMyNTYifQ.eyJpYXQiOjE2ODYwOTc2MDYsIm5iZiI6MTY4NjA5NzYwNiwiZXhwIjoxNjg2MDk5MTA2LCJ0eXBlIjoiYWNjZXNzIiwidXNlciI6IlJHIiwic3Vic2NyaXB0aW9uIjoiYTIyOTNlOGMtMDczMi00MTM4LWFmMDAtMDY4MGM4YWVkZjU3Iiwic2Vzc2lvbiI6IjM1MTdiMmZjY2Q5NDBjZjEyNzYwNTcxYiIsInNzbl9leHAiOjE2ODYxODQwMDY1ODEsIml0ZXJhdGlvbiI6ImQ3YjVhMWRiNjIzNjNjNWM1MzI2OGY1NyJ9.57zNZNybKPsG2zGdG38etaxbTyaVamhZkfVP4hy_6lxpT1_j_OakFFkgj_ezj40Yfjx9eanGn1IuGN45ZbpclA"
    const resourceId = `SnapshotV2.${name}`;
    const sqlText = `INSERT INTO ${resourceId} VALUES ${nullifierHash} ${message} ${Date.now()}}`
    const options = {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: `Bearer ${access_token}`
        },
        body: JSON.stringify({
          sqlText: sqlText,
          resourceId: resourceId
        })
      };
    const response = await fetch("https://hackathon.spaceandtime.dev/v1/sql/dml", options);
    console.log(response);
    setIsLoading(false);
    setIsModalOpen(false);
  }

  return (
    <>
      <Box position="relative" width="300px" margin="20px">
        <Textarea
          placeholder="Type your message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          width="100%"
          paddingRight="70px" // Adjust the padding to make space for the button
          resize="vertical" // Allow vertical resizing
          minHeight="50px" // Set the minimum height
        />
        <IconButton
          colorScheme="blue"
          isLoading={isLoading}
          onClick={() => setIsModalOpen(true)}
          aria-label="Post Message"
          icon={<BsSendFill />}
          position="absolute"
          right="10px" // Adjust the position of the button
          top="50%" // Center the button vertically
          transform="translateY(-50%)" // Center the button vertically
        />
      </Box>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Submit Proof</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Textarea
              placeholder="Enter your root"
              value={root}
              onChange={(e) => setRoot(e.target.value)}
              resize="vertical"
              minHeight="100px"
            />
            <Textarea
              placeholder="Enter your nullifier hash"
              value={nullifierHash}
              onChange={(e) => setNullifierHash(e.target.value)}
              resize="vertical"
              minHeight="100px"
            />
            <Textarea
              placeholder="Enter your witness"
              value={witness}
              onChange={(e) => setWitness(e.target.value)}
              resize="vertical"
              minHeight="550px"
            />
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={post} isLoading={isLoading} loadingText="Submitting Proof">
              Submit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}


// 0x1c4add0b31126f3a145d0888c5681d5a4474eb36b6df73a85865f2e4131f4e01
// 0x1d23faa86bc71984a91a0f787281b93ab61d2354431f21a35c34ba6edf9e7cae
