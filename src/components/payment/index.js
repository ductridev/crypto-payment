import { useEffect, useState } from 'react';
import axios from 'axios';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import { SpinnerRoundFilled } from 'spinners-react';
import { ethers } from "ethers";
import { Biconomy } from "@biconomy/mexa";
import { utils as NEARutils } from "near-api-js";

import FundModal from '../addFundModal';
import ChooseWallet from '../chooseWallet';
import ResultModal from '../resultTxHash';
import { getQueryParams } from '../../utils/functions';
import HelpBitcoinWallet from '../helpBitcoinWallet';
import QRURI from '../qrURI';

export default function Payment() {
    const [loading, setLoading] = useState(true);
    const [showAddFundModal, setShowAddFundModal] = useState(false);
    const [showResultModal, setShowResultModal] = useState(false);
    const [showModalSelectWallet, setShowModalSelectWallet] = useState(false);

    const [wallet, setWallet] = useState("");
    const [resultTxHash, setResultTxHash] = useState("");

    const [transactionStatus, setTransactionStatus] = useState("");

    const [buyerAddress, setBuyerAddress] = useState("");

    const [sellerAddress, setSellerAddress] = useState("");
    const [amount, setAmount] = useState(0);
    const [amountTo, setAmountTo] = useState(0);
    const [fiatCurrency, setFiatCurrency] = useState("");
    const [tokenCurrency, setTokenCurrency] = useState("");
    const [paymentStatus, setPaymentStatus] = useState("pending");
    const [paymentExist, setPaymentExist] = useState(false);

    var queries = getQueryParams();
    var biconomy;

    useEffect(() => {
        console.log('mount');
        if (typeof queries.paymentID !== 'undefined' && queries.paymentID !== "") {
            axios.get(process.env.REACT_APP_API_URL + `/getPayment/${queries.paymentID}`).then(async (result) => {
                setPaymentExist(result.data.exist);

                if (result.data.exist === true) {
                    setSellerAddress(result.data.sellerAddress);
                    setPaymentStatus(result.data.paymentStatus);

                    setFiatCurrency(result.data.currency);
                    setAmount(parseFloat(result.data.amount));

                    const api = process.env.REACT_APP_API_URL + `/exchange/${tokenCurrency}/${fiatCurrency}/${amount}`;

                    axios.get(`${api}`).then(async (result) => {
                        setAmountTo(result.data.amountTo);
                    })
                }
                else {

                }
            }).catch(function (error) {
            });

            if (typeof window.ethereum !== 'undefined') {
                const initBiconomy = async () => {
                    biconomy = new Biconomy(window.ethereum, {
                        apiKey: process.env.REACT_APP_ETH_BICONOMY_APIKEY,
                        contractAddresses: [process.env.REACT_APP_CONTRACT_ADDRESS],
                        debug: false
                    });
                    await biconomy.init();
                    setTimeout(() => setLoading(false), 3000);
                };
                initBiconomy();
            }
            else {
                if (typeof window.BinanceChain !== 'undefined') {
                    const initBiconomy = async () => {
                        biconomy = new Biconomy(window.BinanceChain, {
                            apiKey: process.env.REACT_APP_ETH_BICONOMY_APIKEY,
                            contractAddresses: [process.env.REACT_APP_CONTRACT_ADDRESS],
                            debug: false
                        });
                        await biconomy.init();
                        setTimeout(() => setLoading(false), 3000);
                    };
                    initBiconomy();
                }
                else {
                    alert("Please install MetaMask Wallet or Binance Wallet");
                }
            }
        }
        else {
            setLoading(false);
        }
    }, [amount, amountTo, fiatCurrency, setLoading, setPaymentExist, setPaymentStatus, setSellerAddress, tokenCurrency]);

    const payBill = async () => {
        const enoughBalance = await checkBalance();
        if (enoughBalance) {
            if (tokenCurrency === "ETH") {
                const provider = await biconomy.provider;
                const contractInstance = new ethers.Contract(
                    process.env.REACT_APP_CONTRACT_ADDRESS,
                    process.env.REACT_APP_CONTRACT_ABI,
                    biconomy.ethersProvider
                );

                let { data } = await contractInstance.populateTransaction.transfer(buyerAddress, sellerAddress, ethers.utils.parseEther(Number(amountTo).toFixed(18)).toHexString());

                let txParams = {
                    from: buyerAddress,
                    to: process.env.REACT_APP_CONTRACT_ADDRESS,
                    data: data,
                    signatureType: "EIP712_SIGN"
                };

                let txHash = await provider.send("eth_sendTransaction", [txParams]);

                // console.log(txHash);

                axios.get(process.env.REACT_APP_API_URL + `/transactions/save/${txHash.transactionId}/pay/${amount}/${queries.paymentID}`).then(async (result) => {
                }).catch(async (err) => {
                    // console.log(err);
                });
            }
            else if (tokenCurrency === "NEAR") {

                if (buyerAddress === "") {
                    alert("Please make sure you have connected your wallet!");
                }
                else {
                    let senderNEARAccount = await window.near.account(buyerAddress);
                    const result = await senderNEARAccount.sendMoney(sellerAddress, NEARutils.format.parseNearAmount(amountTo.toString()));

                    // console.log(result);
                }

            }
            else if (tokenCurrency === "BCH") {
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
            else if (tokenCurrency === "BTC") {
            }
        }
        else {
            if (window.confirm('Not enough tokens in your balance. Do you want to add more funds to your balance?')) {
                setShowAddFundModal(true);
            }
            else { }
        }
    }

    const handleClickProcess = async () => {
        axios.get(process.env.REACT_APP_API_URL + `/bch/send/${sellerAddress}/${window.privateKey}/${amountTo}`).then(async (result) => {
        }).catch(async (err) => {
            // console.log(err);
        });
    }

    const checkBalance = async () => {
        const contractInstance = new ethers.Contract(
            process.env.REACT_APP_CONTRACT_ADDRESS,
            process.env.REACT_APP_CONTRACT_ABI,
            biconomy.ethersProvider
        );

        const buyerBalance = Number(ethers.utils.formatEther(await contractInstance.callStatic.getBalance(buyerAddress)));
        if (buyerBalance <= amountTo) {
            return false;
        }
        else {
            return true;
        }
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
                            {wallet === ""
                                ?
                                <button onClick={() => { setShowModalSelectWallet(true); }}>
                                    Connect Wallet
                                </button>
                                :
                                <>
                                    {paymentStatus === 'pending'
                                        ?
                                        <div className="App">
                                            {wallet === 'Bitcoin'
                                                ? <>
                                                    <HelpBitcoinWallet />
                                                </>
                                                :
                                                null
                                            }
                                            <p>Billing amount : {amount} {fiatCurrency} ~ {amountTo} {tokenCurrency}</p>
                                            <label htmlFor='tokenSelection'>Select Token you will pay for.</label><br />
                                            <select id='tokenSelection' onChange={(e) => {
                                                setTokenCurrency(e.target.value);
                                                const api = process.env.REACT_APP_API_URL + `/exchange/${tokenCurrency}/${fiatCurrency}/${amount}`;

                                                axios.get(`${api}`).then(async (result) => {
                                                    setAmountTo(result.data.amountTo);
                                                })
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
                                                    wallet === 'BinanceWallet'
                                                        ? <>
                                                            <option value="ETH">Ethereum (ETH)</option>
                                                            <option value="USDT">USDT (BEP2)</option>
                                                            <option value="USDC">USDC</option>
                                                        </>
                                                        : null
                                                }
                                            </select><br />
                                            {tokenCurrency === 'BTC'
                                                ?
                                                <QRURI sellerAddress={sellerAddress} amount={amountTo.toString()} message={'Pay for ' + sellerAddress + ' with amount = ' + amountTo.toString() + ' BTC'} label={'BTC'} />
                                                :
                                                null
                                            }
                                            {wallet === 'MetaMask'
                                                ?
                                                <>
                                                    <button onClick={payBill}>Process payment</button>
                                                    {
                                                        transactionStatus !== ""
                                                            ? <p>{transactionStatus}</p>
                                                            : null
                                                    }
                                                    {
                                                        resultTxHash !== ""
                                                            ? <p>Payment success, this is payment address : <a href={'https://kovan.etherscan.io/tx/' + resultTxHash}>{resultTxHash}</a></p>
                                                            : null
                                                    }
                                                </>
                                                : null
                                            }
                                            {wallet === 'BinanceWallet'
                                                ?
                                                <>
                                                    <button onClick={payBill}>Process payment</button>
                                                    {
                                                        transactionStatus !== ""
                                                            ? <p>{transactionStatus}</p>
                                                            : null
                                                    }
                                                    {
                                                        resultTxHash !== ""
                                                            ? <p>Payment success, this is payment address : <a href={'https://kovan.etherscan.io/tx/' + resultTxHash}>{resultTxHash}</a></p>
                                                            : null
                                                    }
                                                </>
                                                : null
                                            }
                                            {wallet === 'Bitcoin'
                                                ?
                                                <>
                                                    {tokenCurrency === 'BCH'
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
                            <FundModal showAddFundModal={showAddFundModal} buyerAddress={buyerAddress} amount={amount} tokenCurrency={tokenCurrency} fiatCurrency={fiatCurrency} setTxHash={(txHash) => { setResultTxHash(txHash); }} setShowResultModal={(show) => { setShowResultModal(show); }} onClose={() => { setShowAddFundModal(false); }} />
                            <ResultModal showResultModal={showResultModal} onClose={() => { setShowResultModal(false); setLoading(true); }} resultTxHash={resultTxHash} />
                            <ChooseWallet showModalSelectWallet={showModalSelectWallet} onClose={() => { setShowModalSelectWallet(false); setLoading(true); }} setBuyerAddress={(buyerAddress) => { setBuyerAddress(buyerAddress); }} setWalletType={(walletType) => { setWallet(walletType); }} setTokenCurrency={(tokenCurrency) => { setTokenCurrency(tokenCurrency); }} setAmountTo={(amountTo) => { setAmountTo(amountTo); }} fiatCurrency={fiatCurrency} tokenCurrency={tokenCurrency} amount={amount} />
                        </>
                    }
                </div >
            }
        </div >
    );
}