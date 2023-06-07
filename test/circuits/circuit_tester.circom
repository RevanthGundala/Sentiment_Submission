pragma circom 2.0.0;
include "../../circuits/Post.circom";

component main {public [root,nullifierHash]} = Post(3);