import React, { useEffect, useState } from 'react';
import './App.css';
import { QRCodeSVG } from 'qrcode.react';
import { P2cBalancer } from 'load-balancers';
import { getQueryParams } from './utils/functions';
import { keyStores, connect as NEARconnect, WalletConnection, utils as NEARutils } from "near-api-js";
import Web3 from 'web3';
import CryptoAccount from "send-crypto";
import axios from 'axios';

const proxies = [
  'http://localhost:5000',
  'http://localhost:5001',
  'http://localhost:5002',
  'http://localhost:5003',
];
declare var window: any;
var queries: any = {};

// Initializes the Power of 2 Choices (P2c) Balancer with ten proxies.
const balancer = new P2cBalancer(proxies.length);

const keyStore = new keyStores.BrowserLocalStorageKeyStore();

function App() {
  const [wallet, setWallet] = useState("MetaMask");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [sellerAddress, setSellerAddress] = useState("");
  const [amount, setAmount] = useState(0);
  const [privateKey, setPrivateKey] = useState("");
  const [transactionHash, setTransactionHash] = useState("");

  const BinanceWeb3 = new Web3('https://data-seed-prebsc-1-s1.binance.org:8545');
  const EthereumWeb3 = new Web3(process.env.REACT_APP_INFURA_API || '');

  const config = {
    networkId: "testnet",
    keyStore,
    nodeUrl: "https://rpc.testnet.near.org",
    walletUrl: "https://wallet.testnet.near.org",
    helperUrl: "https://helper.testnet.near.org",
    explorerUrl: "https://explorer.testnet.near.org",
    headers: { test: "10" }
  };

  queries = getQueryParams();

  useEffect(() => {
    setAmount(queries.amount);
    setSellerAddress(queries.sellerAddress);
  }, []);

  const connectWallet = async () => {
    if (wallet === "MetaMask") {
      if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask Wallet is installed!');
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setBuyerAddress(accounts[0]);
      }
      else {
        alert("Please install MetaMask Wallet");
      }
    }
    else if (wallet === "Binance") {
      if (typeof window.BinanceChain !== 'undefined') {
        console.log('Binance Wallet is installed!');
        window.BinanceChain
          .request({
            method: 'eth_accounts',
          })
          .then((result: any) => {
            setBuyerAddress(result[0]);
          })
          .catch((error: any) => {
            // If the request fails, the Promise will reject with an error.
          });
      }
      else {
        alert("Please install Binance Wallet");
      }
    }
    else if (wallet === "NEAR") {
      window.near = await NEARconnect(config);
      window.NEARwallet = new WalletConnection(window.near, "dag_crypto_bridge");
      if (!window.NEARwallet.isSignedIn()) {
        window.NEARwallet.requestSignIn();
      }
      else {
        setBuyerAddress(window.NEARwallet.getAccountId());

        let senderNEARAccount = await window.near.account(window.NEARwallet.getAccountId());
        window.senderNEARAccount = senderNEARAccount;
        console.log(window.senderNEARAccount);
      }
    }
  }

  const payBill = async () => {
    if (wallet === "MetaMask") {
      EthereumWeb3.eth.getTransactionCount(buyerAddress).then(async (txCount) => {

        let transaction = {
          nonce: txCount,
          from: buyerAddress,
          gasPrice: EthereumWeb3.utils.toHex(1e9),
          gas: EthereumWeb3.utils.toHex(25000),
          to: queries.sellerAddress,
          value: EthereumWeb3.utils.toHex(EthereumWeb3.utils.toWei(amount.toString()))
        }

        let signed = await EthereumWeb3.eth.accounts.signTransaction(transaction, privateKey) as any;
        axios.get(balancer.pick() + '/signedTransactions/save/' + signed.rawTransaction).then(async (result) => {
          if(result.data.transaction_id){
            let transaction_id = result.data.ransaction_id;
            setInterval(()=>{
              axios.get(balancer.pick() + '/signedTransactions/getHash/' + transaction_id).then(async (result) => {
                setTransactionHash(result.data.transactionHash);
              })
            }, 1000);
          }
          else if(result.data.error){
            alert(result.data.error);
          }

        }).catch(async (err) => {
          console.log(err);
        })
      })

    }
    else if (wallet === "Binance") {
      const account = new CryptoAccount(privateKey);
      const accountAddress = await account.address("BTC");
      if (accountAddress !== buyerAddress) {
        alert('Invalid Private Key for Address : ' + buyerAddress + '. Please check it and try again!');
      }
      else {
        const txHash = await account
          .send(sellerAddress, 0.01, "BTC")
          .on("transactionHash", console.log)
          .on("confirmation", console.log);
      }
      
      // BinanceWeb3.eth.getTransactionCount(buyerAddress).then((txCount) => {

      //   BinanceWeb3.eth.signTransaction({
      //     nonce: txCount,
      //     from: buyerAddress,
      //     gasPrice: BinanceWeb3.utils.toHex(10e9),
      //     gas: BinanceWeb3.utils.toHex(25000),
      //     to: queries.sellerAddress,
      //     value: BinanceWeb3.utils.toHex(BinanceWeb3.utils.toWei(amount.toString()))
      //   }).then((result) => {
      //     console.log(result)
      //   });
      // })

    }
    else if (wallet === "NEAR") {

      if (buyerAddress === "") {
        alert("Please make sure you have connected your wallet!");
      }
      else {
        console.log(window.senderNEARAccount);
        const result = await window.senderNEARAccount.sendMoney(sellerAddress, NEARutils.format.parseNearAmount(amount.toString()));
        console.log(result);
      }

    }
  }

  return (

    <div>
      <div>
        {typeof queries.sellerAddress === 'undefined' || typeof queries.amount === 'undefined' || typeof queries.currency === 'undefined'
          ?
          <p>403 Forbidden</p>
          :
          <div className="App">
            <label htmlFor="walletSelection">Select a wallet to connect so we can be sure that you are the owner of the wallet address. Please make sure you have installed wallet!</label><br />
            <select id="walletSelection" onChange={(event) => {
              setWallet(event.target.value);
            }} value={wallet}>
              <option value="MetaMask">MetaMask</option>
              <option value="Binance">Binance</option>
              {/* <option value="Coinbase">Coinbase</option> */}
              <option value="NEAR">NEAR</option>
            </select>
            <button onClick={connectWallet}>Connect wallet</button><br />
            <p>Buyer wallet address: {buyerAddress}</p><br />
            {
              wallet === 'NEAR'
                ? null
                :
                <p>We have your address already. Now, please enter private key of this address. Don't worry, we don't save it.<br />
                  <input placeholder='Enter private key here' type={'password'} onChange={(e) => {
                    setPrivateKey(e.target.value);
                  }} />
                </p>
            }
            {wallet === 'Binance'
              ?
              <a href='https://binance-wallet.gitbook.io/binance-chain-wallet/bew-guides/beginers-guide/acc/backup-wallet#backup-private-key'>Check here if you don't know how to get private key of address.</a>
              : null
            }
            {
              wallet === 'MetaMask'
                ?
                <a href='https://metamask.zendesk.com/hc/en-us/articles/360015289632-How-to-Export-an-Account-Private-Key'>Check here if you don't know how to get private key of address.</a>
                : null
            }

            <p>Billing amount : {queries.amount} {queries.currency}</p>
            <label htmlFor='tokenSelection'>Select Token you will pay for.</label><br />
            {/* Please make sure you have sufficent funds! */}
            <select id='tokenSelection'>
              {wallet === 'Binance'
                ? <option value="Bitcoin">Bitcoin (BTC)</option>
                : null
              }
              {wallet === 'MetaMask'
                ?
                <>
                  <option value="Ethereum">Ethereum (ETH)</option>
                  <option value="USDT">USDT</option>
                  <option value="USDC">USDC</option>
                </>
                : null
              }
              {wallet === 'NEAR'
                ? <option value="NEAR">NEAR Protocol (NEAR)</option>
                : null
              }
            </select><br />

            <p>Or scan QR code</p>
            <QRCodeSVG value={proxies[balancer.pick()] + '/transfer/' + wallet + '/' + buyerAddress + '-' + queries.sellerAddress + '/' + amount} />

            {
              transactionHash !== ""
                ? <p>Payment success, this is payment address : <a href={'https://kovan.etherscan.io/tx/' + transactionHash}>{transactionHash}</a></p>
                : null
            }
          </div >
        }
      </div >
    </div >
  );
}

export default App;
