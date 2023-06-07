// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {Functions, FunctionsClient} from "./dev/functions/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./Verifier.sol";
import "./MerkleTree.sol";

struct Proof {
    uint256[2] a;
    uint256[2][2] b;
    uint256[2] c;
}

error Sentiment__RandomWordsNotUpdated(string message);
error Sentiment__CommitmentAlreadyUsed(string message);
error Sentiment__InvalidProof(string message);
error Sentiment__NullifierAlreadyUsed(string message);
error Sentiment__RootNotKnown(string message);
error Sentiment__TimeInterval(string message);
error Sentiment__NotSelected(string message);

interface IVerifier {
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[2] memory input
    ) external returns (bool r);
}

contract Sentiment is
    FunctionsClient,
    ConfirmedOwner,
    AutomationCompatibleInterface,
    MerkleTree,
    ReentrancyGuard
{
    using Functions for Functions.Request;

    // Chainlink automation
    bytes public requestCBOR;
    uint64 public subscriptionId;
    uint32 public fulfillGasLimit;
    uint256 public constant updateInterval = 1 weeks;
    uint256 public lastUpkeepTimeStamp;
    uint256 public upkeepCounter;
    uint256 public responseCounter;

    // Chainlink functions variables
    bytes32 public latestRequestId;
    bytes public latestResponse;
    bytes public latestError;
    event OCRResponse(bytes32 indexed requestId, bytes result, bytes err);

    // Contract Variables
    IVerifier public verifier;
    mapping(bytes32 => bool) public nullifiers;
    mapping(bytes32 => bool) public commitments;
    mapping(string => string[]) public messages;
    mapping(string => uint) public messageCount;
    mapping(string => bool) public nameExists;
    mapping(address => mapping(string => bool)) public isSelected;
    mapping(string => address[]) public selectedAddressesForName;
    string[] public names;
    event Inserted(bytes32 commitment, uint32 insertedIndex);
    event messagePosted(string message, bytes32 nullifierHash);
    event messagesCleared();

    // bool DONE_GENERATING_REQUESTS = false;
    // while count < names.length: fulfillrequest()
    constructor(
        address oracle,
        IVerifier _verifier,
        uint32 _merkleTreeHeight,
        address _hasher,
        uint64 _subscriptionId,
        uint32 _fulfillGasLimit
    )
        FunctionsClient(oracle)
        ConfirmedOwner(msg.sender)
        MerkleTree(_merkleTreeHeight, _hasher)
    {
        names = new string[](0);
        verifier = _verifier;
        subscriptionId = _subscriptionId;
        fulfillGasLimit = _fulfillGasLimit;
        lastUpkeepTimeStamp = block.timestamp;
    }

    modifier selectedAddress(address walletAddress, string memory name) {
        isSelected[walletAddress][name] = true; // UNCOMMENT FOR TESTING
        if (!isSelected[walletAddress][name])
            revert Sentiment__NotSelected("Address not selected");
        _;
    }

    /**
    @dev Calls insert function on merkle tree and emits Inserted event
  */
    function insertIntoTree(
        bytes32 _commitment,
        string calldata _name
    ) external nonReentrant selectedAddress(msg.sender, _name) {
        if (commitments[_commitment])
            revert Sentiment__CommitmentAlreadyUsed("Commitment already used");

        uint32 insertedIndex = _insert(_commitment);
        commitments[_commitment] = true;
        emit Inserted(_commitment, insertedIndex);
    }

    /**
    @dev Posts a message to the merkle tree, emits messagePosted event,
    and verifies the proof
  */
    function postMessageWithProof(
        string memory name,
        string memory _message,
        bytes32 _nullifierHash,
        bytes32 _root,
        Proof memory _proof
    ) external nonReentrant {
        if (nullifiers[_nullifierHash])
            revert Sentiment__NullifierAlreadyUsed("Nullifier already used");

        if (!isKnownRoot(_root))
            revert Sentiment__RootNotKnown("Root not known");

        uint[2] memory publicInputs = [uint(_root), uint(_nullifierHash)];
        if (!verifier.verifyProof(_proof.a, _proof.b, _proof.c, publicInputs))
            revert Sentiment__InvalidProof("Invalid proof");

        nullifiers[_nullifierHash] = true;
        messages[name].push(_message);
        messageCount[name]++;
        emit messagePosted(_message, _nullifierHash);
    }

    /**
     * @notice Generates a new Functions.Request. This pure function allows the request CBOR to be generated off-chain, saving gas.
     *
     * @param source JavaScript source code
     * @param secrets Encrypted secrets payload
     * @param args List of arguments accessible from within the source code
     */
    function generateRequest(
        string calldata source,
        bytes calldata secrets,
        string[] calldata args
    ) public pure returns (bytes memory) {
        Functions.Request memory req;
        req.initializeRequest(
            Functions.Location.Inline,
            Functions.CodeLanguage.JavaScript,
            source
        );
        if (secrets.length > 0) {
            req.addRemoteSecrets(secrets);
        }
        if (args.length > 0) req.addArgs(args);

        return req.encodeCBOR();
    }

    /**
     * @notice Used by Automation to check if performUpkeep should be called.
     *
     * Returns a tuple where the first element is a boolean which determines if upkeep is needed and the
     * second element contains custom bytes data which is passed to performUpkeep when it is called by Automation.
     */
    function checkUpkeep(
        bytes memory
    ) public view override returns (bool upkeepNeeded, bytes memory) {
        upkeepNeeded = (block.timestamp - lastUpkeepTimeStamp) > updateInterval;
    }

    /**
     * @notice Called by Automation to trigger a Functions request
     */
    function performUpkeep(bytes calldata) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded)
            revert Sentiment__TimeInterval("Time interval not met");
        lastUpkeepTimeStamp = block.timestamp;
        upkeepCounter = upkeepCounter + 1;

        bytes32 requestId = s_oracle.sendRequest(
            subscriptionId,
            requestCBOR,
            fulfillGasLimit
        );
        // clearMessages();

        // s_pendingRequests[requestId] = s_oracle.getRegistry();
        // emit RequestSent(requestId);
        // latestRequestId = requestId;
    }

    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        latestResponse = response;
        latestError = err;
        emit OCRResponse(requestId, response, err);
        // for (uint i = 0; i < response.length; i++) {
        //     address wallet = abi.decode(response, (address));
        //     selectedAddresses[wallet] = true;
        //     selectedAddressesArray.push(wallet);
        // }
    }

    /**
    @dev Returns the list of messages
  */
    function getMessages(
        string calldata name
    ) external view returns (string[] memory) {
        return messages[name];
    }

    function getSelectedAddresses(
        string calldata name
    ) external view returns (address[] memory) {
        return selectedAddressesForName[name];
    }

    /**
    @dev Deletes the list of messages and emits messagesCleared event
  */
    function clearMessages() internal {
        uint length = names.length;
        // delete the addresses and messages
        for (uint i = 0; i < length; i++) {
            string memory name = names[i];
            delete selectedAddressesForName[name];
            delete messages[name];
            selectedAddressesForName[name] = new address[](0);
            messages[name] = new string[](0);
            messageCount[name] = 0;
        }
        resetTree();
        emit messagesCleared();
    }

    function addName(string memory _name) public {
        names.push(_name);
        nameExists[_name] = true;
    }

    function getMessageCount(
        string calldata _name
    ) external view returns (uint) {
        return messageCount[_name];
    }

    function getNames() external view returns (string[] memory) {
        return names;
    }

    function checkIfSelected(
        address user,
        string calldata name
    ) external view returns (bool) {
        return isSelected[user][name];
    }

    /**
    @dev Checks if a nullifier has been used
  */
    function isNullifierUsed(bytes32 _nullifier) public view returns (bool) {
        return nullifiers[_nullifier];
    }
}
