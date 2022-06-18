const SHA256 = require('crypto-js/sha256');
const mongoDB = require('../db');

class DAG {
    constructor() {
        this.client = mongoDB.getDb();
        this.collection = this.client.db('DAG_Data').collection('data');

        this.blockNumber = '';
        this.difficulty = 1;
        this.nonce = '';
        this.blockHash = '';
        this.parentblock = '';
        this.parentblockHash = '';
        this.size = '';
        this.childrenblock = [];
        this.childrenblockHash = [];
        this.data = {};
        this.blockVersion = process.env.DAG_VERSION;
        this.blockVerify = false;
        this.blockMerkleRoot = '';
        this.blockMerkleRootHash = '';
        this.blockTimestamp = '';
        this.blockTimestampUnix = '';
        this.blockTime = '10000';
        this.maxParentBlockTime = '30000';
        this.timeoutParentBlock = false;
    }
    getBlockNumber() {
        return this.collection.count();
    }
    getMerkelRoot() {
        this.collection.find().sort({ _id: -1 }).limit(1).toArray(function (err, docs) {
            if (!err) {
                return docs[0];
            }
            else {
                console.log(err);
                this.getMerkelRoot();
            }
        });
    }
    getPreviousBlockHash() {
        return this.getPreviousBlock().blockHash;
    }
    getPreviousBlock() {
        this.collection.find().sort({ _id: 1 }).limit(1).toArray(function (err, docs) {
            if (!err) {
                return docs[0];
            }
            else {
                console.log(err);
                this.getPreviousBlock();
            }
        });
    }
    getLastVerifiedBlock() {
        this.collection.find({ timeoutParentBlock: false, blockVerify: true }).toArray(function (err, docs) {
            if (!err) {
                return docs[docs.length];
            }
            else {
                console.log(err);
                this.getLastVerifiedBlock();
            }
        });
    }
    getValidParentBlock(lastVerifiedBlock) {
        var timeoutParentBlock;
        Date.now() > parseInt(lastVerifiedBlock.blockTimestamp) + this.maxParentBlockTime ? timeoutParentBlock = true : timeoutParentBlock = false;
        if (timeoutParentBlock === false) {
            return lastVerifiedBlock;
        }
        else {
            this.getValidParentBlock(this.getLastVerifiedBlock());
        }
    }
    getSizeDAG() {
        return this.collection.dataSize();
    }
    calBlockHash() {
        return SHA256(this.parentblockHash + this.blockTimestamp + JSON.stringify(this.data) + this.nonce + this.difficulty).toString();
    }
    calDifficulty() {
        if (this.difficulty <= 0) {
            return 1;
        }
        return Date.now() - parseInt(this.getPreviousBlock().blockTimestamp) < this.blockTime ? 1 : -1;
    }
    newBlock(transactionId, transactionHash, rawTransaction, type, amount, from, to, gasUsed, contractAddress) {
        this.blockNumber = this.getBlockNumber() + 1;
        this.parentblock = this.getValidParentBlock().blockNumber;
        this.parentblockHash = this.getValidParentBlock().blockHash;
        this.difficulty += this.calDifficulty();
        this.nonce = this.getPreviousBlock().nonce + 1;
        this.size = this.getSizeDAG();
        this.data = {
            'transactionId': transactionId,
            'transactionHash': transactionHash,
            'rawTransaction': rawTransaction,
            'type': type,
            'amount': amount,
            'from': from,
            'to': to,
            'timestamp': new Date(Date.now()).toISOString(),
            'timestampUnix': Date.now(),
            'blockNumber': this.blockNumber,
            'blockHash': this.calBlockHash(),
            'parentBlock': this.parentblock,
            'parentBlockHash': this.parentblockHash,
            'difficulty': this.difficulty,
            'gasUsed': gasUsed,
            'contractAddress': contractAddress,
        };
        this.blockMerkleRoot = this.blockMerkleRoot().blockNumber;
        this.blockMerkleRootHash = this.blockMerkleRoot().blockHash;
        this.blockTimestamp = new Date(Date.now()).toISOString();
        this.blockTimestampUnix = Date.now();
        this.blockHash = this.calBlockHash();
    }
    updateChildBlock(childBlock) {
        this.childrenblock.push(childBlock.blockNumber);
        this.childrenblockHash.push(childBlock.blockHash);
        this.collection.update({ blockNumber: this.blockNumber, blockHash: this.blockHash }, { $set: { childrenblock: this.childrenblock, childrenblockHash: this.childrenblockHash } }, function (err, result) {
            if (!err) {
                console.log(result);
                return {
                    status: 'success',
                    message: 'Update child block success',
                    code: 200,
                    blockNumber: this.blockNumber,
                    childBlock: childBlock.blockNumber,
                    childBlockHash: childBlock.blockHash,
                };
            } else {
                console.log(err);
                return {
                    status: 'error',
                    message: 'Update child block failed',
                    code: 500,
                    blockNumber: this.blockNumber,
                    childBlock: childBlock.blockNumber,
                    childBlockHash: childBlock.blockHash,
                }
            }
        });
    }
}

module.exports = DAG;