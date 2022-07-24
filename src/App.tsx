import React, { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { P2cBalancer } from 'load-balancers';
import { keyStores, connect as NEARconnect, WalletConnection, utils as NEARutils } from "near-api-js";
import axios from 'axios';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import { SpinnerRoundFilled } from 'spinners-react';
import { useStateIfMounted } from "use-state-if-mounted";
import { EventEmitter } from 'events';
import { useResourceMonitor } from 'react-resource-monitor';
import { ethers } from "ethers";
import { Biconomy } from "@biconomy/mexa";
import { BrowserView, AndroidView, IOSView } from 'react-device-detect';

import './App.css';
import { getQueryParams } from './utils/functions';

const proxies = [
  process.env.REACT_APP_API_URL + ':' + process.env.REACT_APP_PORT_API1,
  process.env.REACT_APP_API_URL + ':' + process.env.REACT_APP_PORT_API2,
  process.env.REACT_APP_API_URL + ':' + process.env.REACT_APP_PORT_API3,
  process.env.REACT_APP_API_URL + ':' + process.env.REACT_APP_PORT_API4,
];
declare var window: any;
var queries: any = {};
let biconomy: any;

// Initializes the Power of 2 Choices (P2c) Balancer with ten proxies.
const balancer = new P2cBalancer(proxies.length);

const keyStore = new keyStores.BrowserLocalStorageKeyStore();

function App() {
  useResourceMonitor();

  const [loading, setLoading] = useStateIfMounted(true);
  const isMounted = useRef(true);

  const [wallet, setWallet] = useStateIfMounted("MetaMask");
  const [transactionHash, setTransactionHash] = useStateIfMounted("");
  const [transactionStatus, setTransactionStatus] = useStateIfMounted("");

  const [buyerAddress, setBuyerAddress] = useStateIfMounted("");
  const [sellerAddress, setSellerAddress] = useStateIfMounted("");
  const [amount, setAmount] = useStateIfMounted(0);
  const [token, setToken] = useStateIfMounted("ETH");
  const [currency, setCurrency] = useStateIfMounted("USD");
  const [paymentStatus, setPaymentStatus] = useStateIfMounted("pending");
  const [amountTo, setAmountTo] = useStateIfMounted("");
  const [paymentExist, setPaymentExist] = useStateIfMounted(false);

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
    console.log("mount");
    isMounted.current = true;

    const newEvent = new EventEmitter();
    newEvent.setMaxListeners(9000000000000);

    if (typeof queries.paymentID !== 'undefined' && queries.paymentID !== "") {
      axios.get(proxies[balancer.pick()] + `/getPayment/${queries.paymentID}`).then(async (result) => {
        setPaymentExist(result.data.exist);

        if (result.data.exist === true) {
          setAmount(result.data.amount);
          setSellerAddress(result.data.sellerAddress);
          setCurrency(result.data.currency);
          setPaymentStatus(result.data.paymentStatus);

          const api = proxies[balancer.pick()] + `/exchange/${token}/${result.data.currency}/${result.data.amount}`;

          axios.get(`${api}`).then(async (result) => {
            setAmountTo(result.data.amountTo);
          })
        }
        else {

        }
      });

      const initBiconomy = async () => {
        biconomy = new Biconomy(window.ethereum, {
          apiKey: process.env.REACT_APP_ETH_BICONOMY_APIKEY,
          contractAddresses: [process.env.REACT_APP_CONTRACT_ADDRESS],
          debug: false
        });
        await biconomy.init();
        setLoading(false);
      };
      initBiconomy();
    }
    else {
      setLoading(false);
    }
  }, [amount, currency, setAmount, setAmountTo, setCurrency, setLoading, setPaymentExist, setPaymentStatus, setSellerAddress, token]);

  useEffect(() => () => {
    isMounted.current = false;
    console.log("Unmounted");
  }, []);

  const connectWallet = async () => {
    if (wallet === "MetaMask") {
      if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask Wallet is installed!');
        await window.ethereum.enable()
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (isMounted.current) {
          setBuyerAddress(accounts[0]);
        }
      }
      else {
        alert("Please install MetaMask Wallet");
      }
    }
    else if (wallet === "Binance") {
      if (typeof window.BinanceChain !== 'undefined') {
        console.log('Binance Wallet is installed!');
        const accounts = await window.BinanceChain.request({ method: 'eth_requestAccounts' });
        if (isMounted.current) {
          setBuyerAddress(accounts[0]);
        }
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
        let accountID = window.NEARwallet.getAccountId();
        if (isMounted.current) {
          setBuyerAddress(accountID);
        }

        let senderNEARAccount = await window.near.account(window.NEARwallet.getAccountId());
        window.senderNEARAccount = senderNEARAccount;
      }
    }
  }

  const payBill = async () => {
    if (token === "ETH") {
      const provider = await biconomy.provider;
      const contractInterface = new ethers.utils.Interface(process.env.REACT_APP_CONTRACT_ABI);
      const signer = new ethers.Wallet(window.privateKey, biconomy.ethersProvider);
      const contractInstance = new ethers.Contract(
        process.env.REACT_APP_CONTRACT_ADDRESS,
        contractInterface,
        signer
      );

      // console.log(contractInstance);

      let { data } = await contractInstance.populateTransaction.transfer(sellerAddress);

      let txParams = {
        from: buyerAddress,
        to: process.env.REACT_APP_CONTRACT_ADDRESS,
        contractAddress: process.env.REACT_APP_CONTRACT_ADDRESS,
        data: data,
        value: ethers.utils.parseEther(Number(amountTo).toFixed(18)).toHexString(),
        signatureType: "EIP712_SIGN"
      };

      let txHash = await provider.send("eth_sendTransaction", [txParams]);

      // console.log(txHash);

      // Listen to transaction updates:
      biconomy.on("txHashGenerated", (data: { transactionId: string; transactionHash: string; }) => {
        console.log("txHashGenerated: " + data);
        setTransactionHash(`tx hash ${data.transactionHash}`);
      });

      biconomy.on("txMined", (data: { msg: string; id: string; hash: string; receipt: string }) => {
        console.log("txMined: " + data);

        setTransactionStatus('Your payment processed');
        setTransactionHash(`${data.hash}`);
      });

      biconomy.on("onError", (data: { error: any; transactionId: string }) => {
        console.log("onError: " + data);
      });

      biconomy.on("txHashChanged", (data: { transactionId: string, transactionHash: string }) => {
        console.log("txHashChanged: " + data);
      });

      // axios.get(proxies[balancer.pick()] + `/signedTransactions/save/${data.transactionHash}/pay/${amount}/${data.gasUsed}/${data.status}`).then(async (result) => {
      // }).catch(async (err) => {
      //   console.log(err);
      // });

      // if (isMounted.current) {
      //   if (receipt.status) {
      //     setTransactionStatus('Your payment processed');
      //     setTransactionHash(receipt.transactionHash);
      //   }
      //   else if (!receipt.status) {
      //     setTransactionStatus('Your payment have error! Please contact to our support at support@estar-solutions.com');
      //   }
      // }

      // const txParams = {
      //   from: buyerAddress,
      //   to: sellerAddress,
      //   value: ethers.utils.parseEther(Number(amountTo).toFixed(18)).toHexString(),
      //   nonce: await EthereumWeb3.getTransactionCount(buyerAddress, "latest"),
      //   gasLimit: ethers.utils.hexlify(25000),
      //   gasPrice: await (await EthereumWeb3.getGasPrice()).toNumber(),
      // }
    }
    else if (token === "NEAR") {

      if (buyerAddress === "") {
        alert("Please make sure you have connected your wallet!");
      }
      else {
        const result = await window.senderNEARAccount.sendMoney(sellerAddress, NEARutils.format.parseNearAmount(amountTo.toString()));
        console.log(result);
      }

    }
    else if (token === "BCH") {
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
    else if (token === "BTC") {
      if (isMounted.current) {

      }
    }
  }

  const handleClickProcess = async () => {
    axios.get(proxies[balancer.pick()] + `/bch/send/${sellerAddress}/${window.privateKey}/${amountTo}`).then(async (result) => {
    }).catch(async (err) => {
      console.log(err);
    });
  }

  return (
    <div className='container'>
      {loading
        ?
        <SpinnerRoundFilled enabled={loading} color={"#3f5063"} />
        :
        <div className='main'>
          {paymentExist === false
            ?
            <p>Payment does not exist. Please check again!</p>
            :
            <>
              {paymentStatus === 'pending'
                ?
                <div className="App">
                  <label htmlFor="walletSelection">Select a wallet to connect so we can be sure that you are the owner of the wallet address. Please make sure you have installed wallet!</label><br />
                  <select id="walletSelection" onChange={(event) => {
                    if (isMounted.current) {
                      setBuyerAddress('');
                      setWallet(event.target.value);
                      if (event.target.value === 'Bitcoin') {
                        setToken('BTC');
                      }
                      else if (event.target.value === 'MetaMask') {
                        setToken('ETH');
                      }
                      else if (event.target.value === 'NEAR') {
                        setToken('NEAR');
                      }
                      else if (event.target.value === 'Binance') {
                        setToken('ETH');
                      }
                      const api = proxies[balancer.pick()] + `/exchange/${token}/${currency}/${amount}`;

                      axios.get(`${api}`).then(async (result) => {
                        setAmountTo(result.data.amountTo);
                      })
                    }
                  }} value={wallet}>
                    <option value="MetaMask">MetaMask</option>
                    <option value="Binance">Binance</option>
                    <option value="Bitcoin">Bitcoin</option>
                    <option value="NEAR">NEAR</option>
                  </select>
                  {wallet === 'Bitcoin'
                    ? <>
                      <HelpBitcoinWallet />
                    </>
                    :
                    <>
                      <button onClick={connectWallet}>Connect wallet</button><br />
                      <p>Buyer wallet address: {buyerAddress}</p><br />
                    </>
                  }
                  {
                    wallet === 'MetaMask'
                      ? <div>
                        <p>We have your address already. Now, please enter private key of this address. Don't worry, we don't save it.<br />
                          <input placeholder='Enter private key here' type={'password'} onBlur={(e) => {
                            window.privateKey = e.target.value;
                          }} />
                        </p>
                        <a href='https://metamask.zendesk.com/hc/en-us/articles/360015289632-How-to-Export-an-Account-Private-Key'>Check here if you don't know how to get private key of address.</a>
                      </div>
                      : null
                  }

                  <p>Billing amount : {amount} {currency} ~ {amountTo} {token}</p>
                  <label htmlFor='tokenSelection'>Select Token you will pay for.</label><br />
                  <select id='tokenSelection' onChange={(e) => {
                    if (isMounted.current) {
                      const api = proxies[balancer.pick()] + `/exchange/${e.target.value}/${currency}/${amount}`;

                      axios.get(`${api}`).then(async (result) => {
                        setToken(e.target.value);
                        setAmountTo(result.data.amountTo);
                      })
                    }
                  }}>
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
                    {
                      wallet === 'Binance'
                        ? <>
                          <option value="ETH">Ethereum (ETH)</option>
                          <option value="USDT">USDT (BEP2)</option>
                          <option value="USDC">USDC</option>
                        </>
                        : null
                    }
                  </select><br />
                  {token === 'BTC'
                    ?
                    <QRURI sellerAddress={sellerAddress} amount={amountTo.toString()} message={'Pay for ' + sellerAddress + ' with amount = ' + amountTo.toString() + ' BTC'} label={'BTC'} />
                    :
                    null
                  }
                  {wallet === 'MetaMask'
                    ?
                    <>
                      <button onClick={payBill}>Process payment</button>

                      <p>Or scan QR code</p>
                      <QRCodeSVG value={proxies[balancer.pick()] + '/transfer/' + wallet + '/' + buyerAddress + '-' + sellerAddress + '/' + amountTo + '/' + token} />
                      {
                        transactionStatus !== ""
                          ? <p>{transactionStatus}</p>
                          : null
                      }
                      {
                        transactionHash !== ""
                          ? <p>Payment success, this is payment address : <a href={'https://kovan.etherscan.io/tx/' + transactionHash}>{transactionHash}</a></p>
                          : null
                      }
                    </>
                    : null
                  }
                  {wallet === 'Binance'
                    ?
                    <>
                      <button onClick={payBill}>Process payment</button>

                      <p>Or scan QR code</p>
                      <QRCodeSVG value={proxies[balancer.pick()] + '/transfer/' + wallet + '/' + buyerAddress + '-' + sellerAddress + '/' + amountTo + '/' + token} />
                      {
                        transactionStatus !== ""
                          ? <p>{transactionStatus}</p>
                          : null
                      }
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
                        <>
                          <button onClick={payBill}>Process payment</button>
                        </>
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
                : null
              }
              {paymentStatus === "paid"
                ?

                <div>
                  This payment has been paid. Please ask for seller to check payment status to confirm!
                </div>

                : null
              }
              {paymentStatus === "canceled"
                ?

                <div>
                  This payment has been canceled. Please ask for seller to create new payment!
                </div>

                : null
              }
            </>
          }
        </div >
      }
    </div >
  );
}

function HelpBitcoinWallet() {
  return (
    <div>
      <BrowserView>
        <p>Check all Bitcoin Wallet for Windows is available at <a href='https://bitcoin.org/en/wallets/desktop/windows/?step=5&platform=windows'>here</a></p>
      </BrowserView>
      <AndroidView>
        <p>Check all Bitcoin Wallet for Android is available at <a href='https://bitcoin.org/en/wallets/mobile/android?step=5&platform=android'>here</a></p>
      </AndroidView>
      <IOSView>
        <p>Check all Bitcoin Wallet for iOS is available at <a href='https://bitcoin.org/en/wallets/mobile/ios/?step=5&platform=ios'>here</a></p>
      </IOSView>
    </div>
  )
}

function QRURI(props: {
  sellerAddress: string;
  amount: string;
  message: string;
  label: string;
}) {
  const [showURI, setShowURI] = useStateIfMounted(false);

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