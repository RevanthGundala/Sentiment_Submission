# Sentiment

# Problem
There is no good way to show the community's throughts and opitions about a protocol. In the case of most off-chain governance protocols, users must use their own wallet address which reveals their identity, and can lead to potential privacy issues in the long run. In addition, off-chain web2 social media plaforms like reddit not only have this issue of pseudonymity as opposed to full anonomity, but also rely solely on the upvote system to display the overall feeling of the community, oftentimes leaving out the posts that don't get a lot of attention because of possible unconscious biases from users.

# Solution
Sentiment is an off-chain governance alternative solution that tries to address both of these issues. 
1. This protocol attempts to solve the privacy issue using Merkle Tree inclusion to allow users to post messages from a different account. This leads to full anonomity since no post can be tracked to a specific user.
2. This protocol attempts to solve the lack of community 'sentiment' by utilzing AI to summarize what the community is feeling based off of all of the posts.

# Getting Started
Contract can be found here on sepolia testnet:  
1. ```git clone https://github.com/RevanthGundala/Sentiment.git```
2. ```npm i```
3. Replace .env
4. ```npx hardhat run scripts/00-runAll.js --network NETWORK_NAME```
5. To run tests: ```npx hardhat test --network NETWORK_NAME```

# Server
1. ```cd server```
2. ```npm i```
3. ```node index```

# Frontend
1. ```cd frontend```
2. ``` npm i ```
3. Replace .env
4. ```npm run dev```

# Chainlink Functions
In order to test Chainlink Functions specific tasks, please refer to ```https://github.com/smartcontractkit/functions-hardhat-starter-kit```

# Video 

# Live Demo
Note: BEARER_ACCESS_TOKEN by Space and Time is reset every 30 minutes.



