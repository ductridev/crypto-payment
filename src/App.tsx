import React, { useEffect, useState } from 'react';
import './App.css';
import { QRCodeSVG } from 'qrcode.react';
import { P2cBalancer } from 'load-balancers';
import { getQueryParams } from './utils/functions';
import { keyStores, connect as NEARconnect, WalletConnection, utils as NEARutils } from "near-api-js";
import Web3 from 'web3';
import axios from 'axios';
import DeviceInfo from 'react-native-device-info';
import CryptoAccount from 'send-crypto';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import { Biconomy } from "@biconomy/mexa";
import Countdown from 'react-countdown';

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
  const [os, setOs] = useState("");
  const [token, setToken] = useState("");

  DeviceInfo.getBaseOs().then((baseOs) => {
    setOs(baseOs);
  });

  let EthereumBiconomy = new Biconomy(window.ethereum, {
    apiKey: "0wesR0B52.148547c8-9806-4856-ba97-6e034e86a72f",
    debug: true
  });

  let EthereumWeb3 = new Web3(EthereumBiconomy);

  // const EthereumWeb3 = new Web3(process.env.REACT_APP_INFURA_API || '');

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
        let amountTo;
        const api = "https://api.exchangerate-api.com/v4/latest/USD";
        fetch(`${api}`)
          .then(currency => {
            return currency.json();
          }).then((currency) => {
            let fromRate = currency.rates[queries.currency];
            let toRate = currency.rates['USD'];
            amountTo = ((toRate / fromRate) * amount).toFixed(2);
          });
        axios.get(balancer.pick() + `/signedTransactions/save/${signed.rawTransaction}/pay/${amountTo}`).then(async (result) => {
          if (result.data.transaction_id) {
            let transaction_id = result.data.ransaction_id;
            setInterval(() => {
              axios.get(balancer.pick() + '/signedTransactions/getHash/' + transaction_id).then(async (result) => {
                setTransactionHash(result.data.transactionHash);
              })
            }, 1000);
          }
          else if (result.data.error) {
            alert(result.data.error);
          }

        }).catch(async (err) => {
          console.log(err);
        })
      })

    }
    else if (wallet === "NEAR") {

      if (buyerAddress === "") {
        alert("Please make sure you have connected your wallet!");
      }
      else {
        const result = await window.senderNEARAccount.sendMoney(sellerAddress, NEARutils.format.parseNearAmount(amount.toString()));
        console.log(result);
      }

    }
    else if (wallet === "Bitcoin") {
      if (token === "BCH") {
        confirmAlert({
          customUI: ({ onClose }) => {
            return (
              <div className='custom-ui'>
                <h1>Are you sure?</h1>
                <p>Continue process this payment?</p>
                <button onClick={onClose}>Cancel</button>
                <button
                  onClick={() => {
                    handleClickProcess();
                    onClose();
                  }}
                >
                  Yes, Continue Process Payment
                </button>
              </div>
            );
          }
        });
      }
    }
  }

  const handleClickProcess = async () => {
    const account = new CryptoAccount(privateKey);

    await account.send(
      "bitcoincash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy",
      0.01,
      "BCH"
    );
  }

  EthereumBiconomy.onEvent(EthereumBiconomy.READY, () => {
  }).onEvent(EthereumBiconomy.ERROR, (error: any, message: any) => {
    return (
      <div>
        <script>
          Something error! Refresh after <Countdown
            date={Date.now() + 5000}
            onComplete={() => { window.location.reload(); }}
          />
        </script>
      </div>
    );
  });

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
              if (event.target.value === 'Bitcoin') {
                setToken('BTC');
              }
            }} value={wallet}>
              <option value="MetaMask">MetaMask</option>
              <option value="Bitcoin">Bitcoin</option>
              <option value="NEAR">NEAR</option>
            </select>
            {wallet === 'Bitcoin'
              ? null
              :
              <>
                <button onClick={connectWallet}>Connect wallet</button><br />
                <p>Buyer wallet address: {buyerAddress}</p><br />
              </>
            }
            {
              wallet === 'MetaMask'
                ? <p>We have your address already. Now, please enter private key of this address. Don't worry, we don't save it.<br />
                  <input placeholder='Enter private key here' type={'password'} onChange={(e) => {
                    setPrivateKey(e.target.value);
                  }} />
                </p>
                : null
            }
            {
              wallet === 'MetaMask'
                ?
                <a href='https://metamask.zendesk.com/hc/en-us/articles/360015289632-How-to-Export-an-Account-Private-Key'>Check here if you don't know how to get private key of address.</a>
                : null
            }

            <p>Billing amount : {queries.amount} {queries.currency}</p>
            {os
              ? <HelpBitcoinWallet os={os} />
              : null}
            <label htmlFor='tokenSelection'>Select Token you will pay for.</label><br />
            <select id='tokenSelection' onChange={(e) => { setToken(e.target.value); }}>
              {wallet === 'Bitcoin'
                ? <>
                  <option value="BTC">Bitcoin (BTC)</option>
                  <option value="BCH">Bitcoin Cash (BCH)</option>
                </>
                : null
              }
              {wallet === 'MetaMask'
                ?
                <>
                  <option value="ETH">Ethereum (ETH)</option>
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
            {token === 'BTC'
              ?
              <QRURI sellerAddress={sellerAddress} amount={amount.toString()} message={'Pay for ' + sellerAddress + ' with amount = ' + amount.toString() + ' BTC'} label={'BTC'} />
              :
              null
            }
            {wallet === 'MetaMask'
              ?
              <>
                <button onClick={payBill}>Process payment</button>

                <p>Or scan QR code</p>
                <QRCodeSVG value={proxies[balancer.pick()] + '/transfer/' + wallet + '/' + buyerAddress + '-' + queries.sellerAddress + '/' + amount} />

                {
                  transactionHash !== ""
                    ? <p>Payment success, this is payment address : <a href={'https://kovan.etherscan.io/tx/' + transactionHash}>{transactionHash}</a></p>
                    : null
                }
              </>
              : null
            }
            {wallet === 'Bitcoin'
              ?
              <>
                {token === 'BCH'
                  ?
                  <button onClick={payBill}>Process payment</button>
                  : null
                }
              </>
              : null
            }
            {wallet === 'NEAR'
              ?
              <>
                <button onClick={payBill}>Process payment</button>
              </>
              : null
            }
          </div >
        }
      </div >
    </div >
  );
}

function HelpBitcoinWallet(props: {
  os: string;
}) {
  return (
    <div>
      {
        props.os === 'Windows'
          ? <p>Check all Bitcoin Wallet for Windows is available at <a href='https://bitcoin.org/en/wallets/desktop/windows/?step=5&platform=windows'>here</a></p>
          : null
      }
      {props.os === 'Android'
        ? <p>Check all Bitcoin Wallet for Android is available at <a href='https://bitcoin.org/en/wallets/mobile/android?step=5&platform=android'>here</a></p>
        : null
      }
      {props.os === 'iOS'
        ? <p>Check all Bitcoin Wallet for iOS is available at <a href='https://bitcoin.org/en/wallets/mobile/ios/?step=5&platform=ios'>here</a></p>
        : null
      }
    </div>
  )
}

function QRURI(props: {
  sellerAddress: string;
  amount: string;
  message: string;
  label: string;
}) {
  const [showURI, setShowURI] = useState(false);

  return (
    <div>
      <button onClick={() => { setShowURI(true); }}>Create Request URI</button>
      {showURI === true
        ?
        <div>
          <a href={'bitcoin:' + props.sellerAddress + '?amount=' + props.amount + '&message=' + props.message + '&label=' + props.label}>{'bitcoin:' + props.sellerAddress + '?amount=' + props.amount + '&message=' + props.message + '&label=' + props.label}</a><br />
          or<br />
          <QRCodeSVG value={'bitcoin:' + props.sellerAddress + '?amount=' + props.amount + '&message=' + props.message + '&label=' + props.label} />
        </div>
        : null
      }
    </div>
  )
}

export default App;
