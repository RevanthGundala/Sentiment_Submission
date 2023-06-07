#!/bin/bash

cd circuits
mkdir -p build

# compile circuit
circom post.circom --r1cs --wasm --sym -o build

cd build/post_js

# trusted setup ceremony
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v -e="random text"
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
snarkjs groth16 setup ../post.r1cs pot12_final.ptau post_0000.zkey
snarkjs zkey contribute post_0000.zkey post_0001.zkey --name="1st Contributor Name" -v -e="random text"

snarkjs zkey export solidityverifier post_0001.zkey ../../../contracts/Verifier.sol
