import { useState, useEffect } from "react";
import { writeContract, fetchTransaction, waitForTransaction, watchContractEvent } from "@wagmi/core";
import path from "path"
import { Box, Textarea, IconButton, Button, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton } from "@chakra-ui/react";
import {ethers} from "ethers"; 
import { buildPoseidon } from "circomlibjs";
import PostMessage from "./PostMessage";
import { SENTIMENT_ABI, SENTIMENT_ADDRESS } from "../constants";
import { useWaitForTransaction } from "wagmi";
import { useRouter } from "next/router";

export default function Insert(){
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false);
    const [nullifierHash, setNullifierHash] = useState("");
    const [root, setRoot] = useState("");
    const [witness, setWitness] = useState("");

    const router = useRouter();

    function poseidonHash(poseidon, inputs) {
        const hash = poseidon(inputs.map((x) => ethers.BigNumber.from(x).toBigInt()));
        const hashStr = poseidon.F.toString(hash);
        const hashHex = ethers.BigNumber.from(hashStr).toHexString();
        const bytes32 = ethers.utils.hexZeroPad(hashHex, 32);
        return bytes32;
    }

    async function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    class Insert {
        nullifier;
        poseidon;
        leafIndex;
    
      constructor(nullifier, poseidon, leafIndex) {
        this.nullifier = nullifier;
        this.poseidon = poseidon;
        this.leafIndex = leafIndex;
      }
    
      static new(poseidon) {
        const nullifier = ethers.utils.randomBytes(15);
        return new this(nullifier, poseidon);
      }
    
      get commitment() {
        return poseidonHash(this.poseidon, [this.nullifier, 0]);
      }
    
      get nullifierHash() {
        if (this.leafIndex === undefined)
          throw new Error("leafIndex is unset yet");
        return poseidonHash(this.poseidon, [this.nullifier, 1, this.leafIndex]);
      }
    }

    async function insertIntoTree(e){
        e.preventDefault();
        console.log("Inserting... ");
        setIsLoading(true);
        let poseidon = await buildPoseidon();
        const insert = Insert.new(poseidon);
        const unwatch = watchContractEvent(
          {
            address: SENTIMENT_ADDRESS,
            abi: SENTIMENT_ABI,
            eventName: 'Inserted',
          },
          (log) => {
            console.log(log)
            if(insert.commitment !== log[0].args.commitment){
              throw new Error("Something went wrong");
            }
            insert.leafIndex = log[0].args.insertedIndex;
            setIsLoading(false);
          }
        )
        const name = router.query.name;
        const {hash} = await writeContract({
            address: SENTIMENT_ADDRESS,
            abi: SENTIMENT_ABI,
            functionName: "insertIntoTree",
            args: [insert.commitment, name]
        })
        
        await sleep(20000);
  
        const response = await fetch("/api/post", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ commitment: insert.commitment })
        })
        if(!response.ok){
            throw new Error(response.status);
        }
        const result = await response.text();
        console.log(result);
          const treeResponse = await fetch(`/api/get?leafIndex=${insert.leafIndex}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });
          const responseData = await treeResponse.json();
          const {_root, _path_elements, _path_index} = responseData;
          setRoot(_root);
          setNullifierHash(insert.nullifierHash);
          let _witness = {
              root: _root,
              nullifierHash: insert.nullifierHash,
              nullifier: ethers.BigNumber.from(insert.nullifier).toString(),
              pathElements: _path_elements,
              pathIndices: _path_index
          }
          unwatch();
          setWitness(JSON.stringify(_witness));
          setIsModalOpen(true);
    }

    return(
        <>
         {witness === "" ? (
          <Button
            colorScheme="blue"
            isLoading={isLoading}
            loadingText="Inserting commitment into the tree"
            onClick={insertIntoTree}
          >
            Generate Proof
          </Button>
        ) : (
          <Button
            colorScheme="green"
            onClick={() => setIsModalOpen(true)}
          >
            View Proof
          </Button>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Save this proof somewhere safe!</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Textarea
            readOnly={true}
              value={root}
              resize="vertical"
              minHeight="100px"
            />
            <Textarea
            readOnly={true}
              value={nullifierHash}
              resize="vertical"
              minHeight="100px"
            />
            <Textarea
            readOnly={true}
              value={witness}
              resize="vertical"
              minHeight="550px"
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}


