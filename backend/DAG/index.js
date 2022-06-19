const SHA256 = require('crypto-js/sha256');
const mongoDB = require('../db');
const logger = require('../utils/logger');

class DAG {
    constructor() {
        this.client = mongoDB.getDb();
        this.collection = this.client.db('DAG_Data').collection('data');

        this.blockNumber = this.getBlockNumber();
        this.difficulty = 1;
        this.nonce = '';
        this.blockHash = '';
        this.parentblock = '';
        this.parentblockHash = '';
        this.size = this.getSizeDAG();
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
        this.childrenblock = [];
        this.childrenblockHash = [];
    }
    initDAG() {
        this.blockMerkleRoot = 0;
        this.blockMerkleRootHash = SHA256(this.blockMerkleRoot + 'Block Merkle Root' + Date.now()).toString();
        this.collection.insertOne({
            blockNumber: this.blockMerkleRoot,
            blockHash: this.blockMerkleRootHash,
            blockVersion: this.blockVersion,
            blockVerify: true,
            blockMerkleRoot: this.blockMerkleRoot,
            blockMerkleRootHash: this.blockMerkleRootHash,
            blockTimestamp: new Date(Date.now()).toISOString(),
            blockTimestampUnix: Date.now(),
            maxParentBlockTime: this.maxParentBlockTime,
            childrenblock: [],
            childrenblockHash: [],
        }, function (err, result) {
            if (!err) {
                return {
                    status: 'success',
                    message: 'Init DAG success',
                    code: 200,
                    data: result
                }
            } else {
                return {
                    status: 'error',
                    message: 'Init DAG error',
                    code: 500,
                    data: err
                }
            }
        });
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
        return SHA256(this.parentblockHash + this.blockTimestampUnix + JSON.stringify(this.data) + this.nonce + this.difficulty).toString();
    }
    calDifficulty() {
        if (this.difficulty <= 0) {
            return 1;
        }
        return Date.now() - parseInt(this.getPreviousBlock().blockTimestamp) < this.blockTime ? 1 : -1;
    }
    newBlock(transactionId, transactionHash, rawTransaction, type, amount, from, to, gasUsed, contractAddress) {
        try {
            let parentBlockData = this.getValidParentBlock();
            this.blockNumber = this.getBlockNumber() + 1;
            this.parentblock = parentBlockData.blockNumber;
            this.parentblockHash = parentBlockData.blockHash;
            this.difficulty += this.calDifficulty();
            this.nonce = this.getPreviousBlock().nonce + 1;
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
            this.blockTimestamp = new Date(Date.now()).toISOString();
            this.blockTimestampUnix = Date.now();
            this.blockHash = this.calBlockHash();

            this.collection.insertOne({
                blockNumber: this.blockNumber,
                blockHash: this.blockHash,
                parentblock: this.parentblock,
                parentblockHash: this.parentblockHash,
                difficulty: this.difficulty,
                nonce: this.nonce,
                data: this.data,
                blockVersion: this.blockVersion,
                blockVerify: false,
                blockMerkleRoot: this.blockMerkleRoot,
                blockMerkleRootHash: this.blockMerkleRootHash,
                blockTimestamp: this.blockTimestamp,
                blockTimestampUnix: this.blockTimestampUnix,
                maxParentBlockTime: this.maxParentBlockTime,
                childrenblock: [],
                childrenblockHash: [],
                timeoutParentBlock: false,
            }, function (err, result) {
                if (!err) {
                    return {
                        status: 'success',
                        message: 'New Block success',
                        code: 200,
                        data: result
                    }
                } else {
                    return {
                        status: 'error',
                        message: 'New Block error',
                        code: 500,
                        data: err
                    }
                }
            })
            this.updateChildBlock(parentBlockData);
            return {
                status: 'success',
                message: 'New block created',
                code: 200,
                blockNumber: this.blockNumber,
                blockHash: this.blockHash,
                parentBlock: this.parentblock,
                parentBlockHash: this.parentblockHash,
                difficulty: this.difficulty,
                nonce: this.nonce,
                size: this.getSizeDAG(),
                data: this.data,
                blockMerkleRoot: this.blockMerkleRoot,
                blockMerkleRootHash: this.blockMerkleRootHash,
                blockTimestamp: this.blockTimestamp,
                blockTimestampUnix: this.blockTimestampUnix,
                blockVersion: this.blockVersion,
                blockVerify: this.blockVerify,
            };
        }
        catch (e) {
            logger.log({
                level: 'error',
                message: e.message,
            })
            return {
                status: 'error',
                message: 'New block not created. Please check logs for more details',
                code: 500,
                blockNumber: this.blockNumber,
                blockHash: this.blockHash,
                difficulty: this.difficulty,
                nonce: this.nonce,
                size: this.getSizeDAG(),
                data: this.data,
                blockMerkleRoot: this.blockMerkleRoot,
                blockMerkleRootHash: this.blockMerkleRootHash,
                blockTimestamp: this.blockTimestamp,
                blockTimestampUnix: this.blockTimestampUnix,
                blockVersion: this.blockVersion,
            }
        }
    }
    updateChildBlock(parentBlock) {
        this.collection.find({ blockNumber: parentBlock.blockNumber, blockHash: parentBlock.blockHash }).toArray(function (err, docs) {
            docs.childrenblock.push(this.blockNumber);
            docs.childrenblockHash.push(this.blockHash);
            this.collection.update({ blockNumber: parentBlock.blockNumber, blockHash: parentBlock.blockHash }, { $set: { childrenblock: docs.childrenblock, childrenblockHash: docs.childrenblockHash } }, function (err, result) {
                if (!err) {
                    return {
                        status: 'success',
                        message: 'Update child block success',
                        code: 200,
                        blockNumber: parentBlock.blockNumber,
                        childBlock: this.blockNumber,
                        childBlockHash: this.blockHash,
                    };
                } else {
                    logger.log({
                        level: 'error',
                        message: err.message,
                    });
                    return {
                        status: 'error',
                        message: 'Update child block failed',
                        code: 500,
                        blockNumber: parentBlock.blockNumber,
                        childBlock: this.blockNumber,
                        childBlockHash: this.blockHash,
                    }
                }
            });
        });
    }
}

module.exports = DAG;