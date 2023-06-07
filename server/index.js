const express = require('express');
const cors = require('cors');
const { ethers } = require('hardhat');
const { MerkleTreeJS } = require('../constants/merkleTree.js');
const { MERKLE_TREE_HEIGHT } = require('../constants/index.js');
const { buildPoseidon } = require('circomlibjs');

const app = express();
app.use(express.json());
// app.use(cors());
// app.use(express.static('./../circuits/build/post_js'));

function poseidonHash(poseidon, inputs) {
    const hash = poseidon(inputs.map((x) => ethers.BigNumber.from(x).toBigInt()));
    const hashStr = poseidon.F.toString(hash);
    const hashHex = ethers.BigNumber.from(hashStr).toHexString();
    const bytes32 = ethers.utils.hexZeroPad(hashHex, 32);
    return bytes32;
  }

class PoseidonHasher {
    poseidon;

  constructor(poseidon) {
    this.poseidon = poseidon;
  }

  hash(left, right) {
    return poseidonHash(this.poseidon, [left, right]);
  }
}

async function initialize() {
  const poseidon = await buildPoseidon();

  const hasher = new PoseidonHasher(poseidon);
  let tree = new MerkleTreeJS(MERKLE_TREE_HEIGHT, 'Tree', hasher);

  console.log("Initialized new tree");

  app.get('/api/get', async (req, res) => {
    const leafIndex = req.query.leafIndex; // Retrieve the leaf index from the request query parameters
    const {root, path_elements, path_index} = await tree.path(leafIndex);
    const response = {
        _root: root,
        _path_elements: path_elements,
        _path_index: path_index
    };
    res.json(response);
  });

  app.post('/api/post', async (req, res) => {
    try {
        await tree.insert(req.body.commitment);
        res.send('Inserted into tree');
      } catch (error) {
        console.error(error);
        res.status(400).send('Error inserting into tree');
      }
  });

  app.delete('/api/delete', async (req, res) => {
    const hasher = new PoseidonHasher(poseidon);
    tree = new MerkleTreeJS(MERKLE_TREE_HEIGHT, 'Tree', hasher);
    res.send('Deleted tree');
  });

  app.listen(5002, () => {
    console.log('Server started on port 5002');
  });
}

initialize();
