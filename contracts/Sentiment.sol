// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {Functions, FunctionsClient} from "./dev/functions/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "./Verifier.sol";
import "./MerkleTree.sol";
import "./Emoji.sol";

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
error Sentiment__ResetNotNeeded(string message);

interface IEmoji {
    function mint(address to, string memory uri) external;

    function tokenURI(uint256 tokenId) external view returns (string memory);

    function getTokenIdCounter() external view returns (uint);
}

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
    MerkleTree,
    ReentrancyGuard,
    ERC721Holder,
    AutomationCompatibleInterface
{
    using Functions for Functions.Request;

    // Chainlink functions variables
    bytes32 public latestRequestId;
    bytes public latestResponse;
    bytes public latestError;
    event OCRResponse(bytes32 indexed requestId, bytes result, bytes err);

    // Contract Variables -> public for testing
    IVerifier public verifier;
    mapping(bytes32 => bool) public nullifiers;
    mapping(bytes32 => bool) public commitments;
    mapping(string => bool) public nameExists;
    mapping(string => string) public nameToSentimentText;
    mapping(string => string) public nameToEmojiString;
    mapping(string => uint) public emojiStringToTokenId;
    address public immutable emojiAddress;
    uint public counter;
    uint public constant UPDATE_INTERVAL = 1 weeks;
    uint public lastUpkeepTimeStamp;
    event Inserted(bytes32 commitment, uint32 insertedIndex);
    event MessagePosted(string message, bytes32 nullifierHash);
    event ResponseUpdated(
        string sentimentText,
        string emojiString,
        string name
    );
    event TreeCleared(uint time);

    constructor(
        address oracle,
        IVerifier _verifier,
        uint32 _merkleTreeHeight,
        address _hasher,
        address _emojiAddress
    )
        FunctionsClient(oracle)
        ConfirmedOwner(msg.sender)
        MerkleTree(_merkleTreeHeight, _hasher)
    {
        verifier = _verifier;
        counter = 0;
        emojiAddress = _emojiAddress;
        lastUpkeepTimeStamp = block.timestamp;
    }

    modifier checkNameExists(string memory _name) {
        if (!nameExists[_name]) addName(_name);
        _;
    }

    function addEmoji(string memory uri) external {
        IEmoji(emojiAddress).mint(address(this), uri);
    }

    // returns the uri of the emoji
    function getEmojiURI(
        string calldata name
    ) external checkNameExists(name) returns (string memory) {
        return
            IEmoji(emojiAddress).tokenURI(
                emojiStringToTokenId[nameToEmojiString[name]]
            );
    }

    /**
    @dev Calls insert function on merkle tree and emits Inserted event
  */
    function insertIntoTree(
        bytes32 _commitment,
        string calldata _name
    ) external nonReentrant checkNameExists(_name) {
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
    ) external nonReentrant checkNameExists(name) {
        if (nullifiers[_nullifierHash])
            revert Sentiment__NullifierAlreadyUsed("Nullifier already used");

        if (!isKnownRoot(_root))
            revert Sentiment__RootNotKnown("Root not known");

        uint[2] memory publicInputs = [uint(_root), uint(_nullifierHash)];
        if (!verifier.verifyProof(_proof.a, _proof.b, _proof.c, publicInputs))
            revert Sentiment__InvalidProof("Invalid proof");

        nullifiers[_nullifierHash] = true;
        emit MessagePosted(_message, _nullifierHash);
    }

    /**
     * @notice Generates a new Functions.Request. This pure function allows the request CBOR to be generated off-chain, saving gas.
     *
     * @param source JavaScript source code
     * @param secrets Encrypted secrets payload
     * @param args List of arguments accessible from within the source code
     */
    function executeRequest(
        string calldata source,
        bytes calldata secrets,
        string[] calldata args,
        uint64 subscriptionId,
        uint32 gasLimit
    ) public onlyOwner returns (bytes32) {
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

        bytes32 assignedReqID = sendRequest(req, subscriptionId, gasLimit);
        latestRequestId = assignedReqID;
        return assignedReqID;
    }

    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        latestResponse = response;
        latestError = err;
        emit OCRResponse(requestId, response, err);
        // if (err.length == 0 && response.length > 0) {
        //     (
        //         string memory sentimentText,
        //         string memory emojiString,
        //         string memory name
        //     ) = abi.decode(latestResponse, (string, string, string));
        //     nameToSentimentText[name] = sentimentText;
        //     nameToEmojiString[name] = emojiString;
        //     uint _counter = counter;
        //     // updates mapping
        //     if (_counter < IEmoji(emojiAddress).getTokenIdCounter()) {
        //         emojiStringToTokenId[emojiString] = _counter;
        //         _counter++;
        //         counter = _counter;
        //     }
        // }
    }

    function getLatestResponse() public view returns (bytes memory) {
        return latestResponse;
    }

    function updateLatestResponse(
        string memory sentimentText,
        string memory emojiString,
        string memory name
    ) external {
        if (latestError.length == 0 && latestResponse.length > 0) {
            nameToSentimentText[name] = sentimentText;
            nameToEmojiString[name] = emojiString;
            uint _counter = counter;
            // updates mapping
            if (_counter < IEmoji(emojiAddress).getTokenIdCounter()) {
                emojiStringToTokenId[emojiString] = _counter;
                _counter++;
                counter = _counter;
            }
            emit ResponseUpdated(sentimentText, emojiString, name);
        }
    }

    /// @dev this method is called by the Automation Nodes to check if `performUpkeep` should be performed
    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = false;
        if (
            (block.timestamp - lastUpkeepTimeStamp >= UPDATE_INTERVAL) ||
            isResetNeeded()
        ) upkeepNeeded = true;
        return (upkeepNeeded, "");
    }

    /// @dev this method is called by the Automation Nodes. It deletes the Tree and emits TreeCleared event
    function performUpkeep(bytes calldata /* performData */) external override {
        if (
            !isResetNeeded() &&
            (block.timestamp - lastUpkeepTimeStamp < UPDATE_INTERVAL)
        ) revert Sentiment__ResetNotNeeded("Reset not needed");
        lastUpkeepTimeStamp = block.timestamp;
        _resetTree();
        emit TreeCleared(block.timestamp);
    }

    function addName(string memory _name) public {
        nameExists[_name] = true;
    }

    function getSentimentText(
        string calldata _name
    ) external view returns (string memory) {
        return nameToSentimentText[_name];
    }

    /**
    @dev Checks if a nullifier has been used
  */
    function isNullifierUsed(bytes32 _nullifier) public view returns (bool) {
        return nullifiers[_nullifier];
    }
}
