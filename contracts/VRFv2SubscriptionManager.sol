// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

contract VRFv2SubscriptionManager is VRFConsumerBaseV2 {
    VRFCoordinatorV2Interface public COORDINATOR;
    LinkTokenInterface public LINKTOKEN;
    uint256 public constant SUBSCRIPTION_AMOUNT = 1e18;
    bytes32 public immutable KEY_HASH;
    uint16 public immutable REQUEST_CONFIRMATIONS;
    uint32 public immutable GAS_LIMIT;
    uint32 public immutable NUM_WORDS;

    // Storage parameters
    uint256[] public s_randomWords;
    uint256 public s_requestId;
    uint64 public s_subscriptionId;
    address public immutable owner;

    constructor(
        address _vrfCoordinator,
        address _link,
        bytes32 _keyHash,
        uint16 _requestConfirmations,
        uint32 _gasLimit,
        uint32 _merkleTreeHeight
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        LINKTOKEN = LinkTokenInterface(_link);
        KEY_HASH = _keyHash;
        REQUEST_CONFIRMATIONS = _requestConfirmations;
        GAS_LIMIT = _gasLimit;
        NUM_WORDS = uint32(2 ** _merkleTreeHeight);
        owner = msg.sender;
        //createNewSubscription();
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only callable by owner");
        _;
    }

    function requestRandomWords() public onlyOwner {
        (uint96 balance, , , ) = COORDINATOR.getSubscription(s_subscriptionId);
        // TODO: estimate gas cost and add that to balance check
        if (balance >= SUBSCRIPTION_AMOUNT) {
            s_requestId = COORDINATOR.requestRandomWords(
                KEY_HASH,
                s_subscriptionId,
                REQUEST_CONFIRMATIONS,
                GAS_LIMIT,
                NUM_WORDS
            );
        } else {
            if (
                LINKTOKEN.balanceOf(address(COORDINATOR)) < SUBSCRIPTION_AMOUNT
            ) {
                LINKTOKEN.transferFrom(
                    msg.sender,
                    address(COORDINATOR),
                    SUBSCRIPTION_AMOUNT -
                        LINKTOKEN.balanceOf(address(COORDINATOR))
                );
            }
            LINKTOKEN.transferAndCall(
                address(COORDINATOR),
                SUBSCRIPTION_AMOUNT - balance,
                abi.encode(s_subscriptionId)
            );
            requestRandomWords();
        }
    }

    function fulfillRandomWords(
        uint256 /* requestId */,
        uint256[] memory randomWords
    ) internal override {
        s_randomWords = randomWords;
    }

    // Create a new subscription when the contract is initially deployed.
    function createNewSubscription() internal {
        s_subscriptionId = COORDINATOR.createSubscription();
        // Add this contract as a consumer of its own subscription.
        COORDINATOR.addConsumer(s_subscriptionId, address(this));
    }

    function getRandomWords() external view returns (uint256[] memory) {
        return s_randomWords;
    }
}
