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
import Modal from 'react-modal';

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

const modalStyle = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
  },
};

function App() {
  let subtitle: any;
  const [modalIsOpen, setIsOpen] = React.useState(false);
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

  Modal.setAppElement('#root');

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
        console.log(window.senderNEARAccount);
        const result = await window.senderNEARAccount.sendMoney(sellerAddress, NEARutils.format.parseNearAmount(amount.toString()));
        console.log(result);
      }

    }
  }

  const openModal = () => {
    setIsOpen(true);
  }

  const afterOpenModal = () => {
    // references are now sync'd and can be accessed.
    subtitle.style.color = '#f00';
  }

  const closeModal = () => {
    setIsOpen(false);
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
            {wallet === 'Bitcoin'

              ? <>
                {token === 'BCH'
                  ?
                  <button onClick={openModal}>Open Modal</button>
                  : null
                }
              </>
              : null
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
            <Modal
              isOpen={modalIsOpen}
              onAfterOpen={afterOpenModal}
              onRequestClose={closeModal}
              style={modalStyle}
              contentLabel="Payment Confirmation Modal"
            >
              <h2 ref={(_subtitle) => (subtitle = _subtitle)}>Payment Confirmation</h2>
              <button onClick={closeModal}>Close</button>
              <div>After you confirm, we can't refund your payment. Are you sure to process the payment ?</div>
              <div>If you confirm. Please enter private key of your address so we can make sure that you confirm with payment.</div>
              <input placeholder='Private Key' onChange={(e) => { setPrivateKey(e.target.value) }}></input>
            </Modal>
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
