import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import { SpinnerRoundFilled } from 'spinners-react';
import { ethers } from "ethers";
import { Biconomy } from "@biconomy/mexa";
import { utils as NEARutils } from "near-api-js";
import {
    useParams
} from "react-router-dom";

import FundModal from '../addFundModal';
import ChooseWallet from '../chooseWallet';
import ResultModal from '../resultTxHash';
import HelpBitcoinWallet from '../helpBitcoinWallet';
import QRURI from '../qrURI';

export default function Payment(props) {
    const [loading, setLoading] = useState(true);
    const [showAddFundModal, setShowAddFundModal] = useState(false);
    const [showResultModal, setShowResultModal] = useState(false);

    const [resultTxHash, setResultTxHash] = useState("");

    const [transactionStatus, setTransactionStatus] = useState("");

    const [buyerAddress, setBuyerAddress] = useState("");

    const [sellerAddress, setSellerAddress] = useState("");
    const [amount, setAmount] = useState(0);
    const [amountTo, setAmountTo] = useState(0);
    const [fiatCurrency, setFiatCurrency] = useState("");
    const [tokenCurrency, setTokenCurrency] = useState("ETH");
    const [paymentStatus, setPaymentStatus] = useState("pending");
    const [paymentExist, setPaymentExist] = useState(false);
    const [buyerBalance, setBuyerBalance] = useState(Number);

    var biconomy = useRef(null);
    const params = useParams()

    useEffect(() => {
        console.log('mount');

        var script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.1.1/jquery.min.js";
        document.getElementsByTagName('head')[0].appendChild(script);
        script.async = true;

        var script1 = document.createElement('script');
        script1.src = "utils/addImgIntoSelectOption.js";
        document.getElementsByTagName('head')[0].appendChild(script1);
        script1.async = true;

        if (typeof params.paymentID !== 'undefined' && params.paymentID !== "") {
            sessionStorage.setItem('paymentID', params.paymentID);
            axios.get(process.env.REACT_APP_API_URL + `/getPayment/${params.paymentID}`).then(async (result) => {
                setPaymentExist(result.data.exist);

                if (result.data.exist === true) {
                    setSellerAddress(result.data.sellerAddress);
                    setPaymentStatus(result.data.paymentStatus);

                    setFiatCurrency(result.data.currency);
                    setAmount(parseFloat(result.data.amount));

                    const api = process.env.REACT_APP_API_URL + `/exchangeFiat2Token/${tokenCurrency}/${fiatCurrency}/${amount}`;

                    axios.get(`${api}`).then(async (result) => {
                        setAmountTo(result.data.amountTo);
                    })
                }
                else {

                }
            }).catch(function (error) {
            });

            if (props.wallet !== "") {
                const getBalance = async () => {
                    const contractInstance = new ethers.Contract(
                        process.env.REACT_APP_CONTRACT_ADDRESS,
                        process.env.REACT_APP_CONTRACT_ABI,
                        biconomy.current.ethersProvider
                    );


                    const buyerBalance = Number(ethers.utils.formatEther(await contractInstance.callStatic.getBalance(buyerAddress)));
                    return buyerBalance;
                }
                if (typeof window.ethereum !== 'undefined') {
                    const initBiconomy = async () => {
                        biconomy.current = new Biconomy(window.ethereum, {
                            apiKey: process.env.REACT_APP_ETH_BICONOMY_APIKEY,
                            contractAddresses: [process.env.REACT_APP_CONTRACT_ADDRESS],
                            debug: false
                        });
                        await biconomy.current.init();
                        const buyerBalance = await getBalance();
                        setBuyerBalance(buyerBalance);
                        setTimeout(() => setLoading(false), 3000);
                    };
                    initBiconomy();
                }
                else {
                    if (typeof window.BinanceChain !== 'undefined') {
                        const initBiconomy = async () => {
                            biconomy.current = new Biconomy(window.BinanceChain, {
                                apiKey: process.env.REACT_APP_ETH_BICONOMY_APIKEY,
                                contractAddresses: [process.env.REACT_APP_CONTRACT_ADDRESS],
                                debug: false
                            });
                            await biconomy.current.init();
                            const buyerBalance = await getBalance();
                            setBuyerBalance(buyerBalance);
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
        }
        else {
            setLoading(false);
        }
    }, [amount, amountTo, fiatCurrency, props.wallet, params.paymentID, setLoading, setPaymentExist, setPaymentStatus, setSellerAddress, tokenCurrency, buyerAddress]);

    const payBill = async () => {
        if (tokenCurrency === "ETH") {
            const enoughBalance = await checkBalance();
            if (enoughBalance) {
                const provider = await biconomy.current.provider;
                const contractInstance = new ethers.Contract(
                    process.env.REACT_APP_CONTRACT_ADDRESS,
                    process.env.REACT_APP_CONTRACT_ABI,
                    biconomy.current.ethersProvider
                );
                let { data } = await contractInstance.populateTransaction.transfer(buyerAddress, sellerAddress, ethers.utils.parseEther(Number(amountTo).toFixed(18)).toHexString());

                let txParams = {
                    from: buyerAddress,
                    to: process.env.REACT_APP_CONTRACT_ADDRESS,
                    data: data,
                    signatureType: "EIP712_SIGN"
                };

                const tx = await provider.send("eth_sendTransaction", [txParams]);

                console.log(tx);

                biconomy.current.on("txHashGenerated", (data) => {
                    console.log(data);
                    setResultTxHash(data.hash);
                    setShowResultModal(true);
                });

                biconomy.current.on("txMined", (data) => {
                    axios.get(process.env.REACT_APP_API_URL + `/transactions/save/${data.hash}/pay/${amount}/${params.paymentID}`).then(async (result) => {
                    }).catch(async (err) => {
                        // console.log(err);
                    });
                });
            }
            else {
                if (window.confirm('Not enough tokens in your balance. Do you want to add more funds to your balance?')) {
                    setShowAddFundModal(true);
                }
                else { }
            }
        }
        else if (tokenCurrency === "NEAR") {

            if (buyerAddress === "") {
                alert("Please make sure you have connected your wallet!");
            }
            else {
                let senderNEARAccount = await window.near.account(buyerAddress);
                const result = await senderNEARAccount.sendMoney(sellerAddress, NEARutils.format.parseNearAmount(amountTo.toString()));

                console.log(result);
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
        else if (tokenCurrency === "USDT") {
            const provider = await biconomy.current.provider;
            const contractInstance = new ethers.Contract(
                process.env.REACT_APP_USDT_CONTRACT_ADDRESS,
                process.env.REACT_APP_USDT_CONTRACT_ABI,
                biconomy.current.ethersProvider
            );

            let { data } = await contractInstance.populateTransaction.transfer(sellerAddress, ethers.utils.parseEther(Number(amountTo).toFixed(18)).toHexString());

            let txParams = {
                from: buyerAddress,
                to: process.env.REACT_APP_USDT_CONTRACT_ADDRESS,
                data: data,
                signatureType: "EIP712_SIGN"
            };

            const tx = await provider.send("eth_sendTransaction", [txParams]);

            console.log(tx);

            biconomy.current.on("txHashGenerated", (data) => {
                console.log(data);
                setResultTxHash(data.hash);
                setShowResultModal(true);
            });

            biconomy.current.on("txMined", (data) => {
                axios.get(process.env.REACT_APP_API_URL + `/transactions/save/${data.hash}/pay/${amount}/${params.paymentID}`).then(async (result) => {
                }).catch(async (err) => {
                    // console.log(err);
                });
            });
        }

    }

    const handleClickProcess = async () => {
        axios.get(process.env.REACT_APP_API_URL + `/bch/send/${sellerAddress}/${window.privateKey}/${amountTo}`).then(async (result) => {
        }).catch(async (err) => {
            // console.log(err);
        });
    }

    const getBalance = async () => {
        const contractInstance = new ethers.Contract(
            process.env.REACT_APP_CONTRACT_ADDRESS,
            process.env.REACT_APP_CONTRACT_ABI,
            biconomy.current.ethersProvider
        );


        const buyerBalance = Number(ethers.utils.formatEther(await contractInstance.callStatic.getBalance(buyerAddress)));
        return buyerBalance;
    }

    const checkBalance = async () => {
        const buyerBalance = await getBalance();
        setBuyerBalance(buyerBalance);
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
                    {props.wallet === ""
                        ?
                        <div>
                            <p>Please connect wallet first!</p>
                        </div>
                        :
                        <>
                            {paymentExist === false
                                ?
                                <p>Payment does not exist. Please check again!</p>
                                :
                                <>
                                    {paymentStatus === 'pending'
                                        ?
                                        <div className="App flex flex-col gap-2 rounded-10 bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.5)] text-hyphen-gray-400">
                                            {props.wallet === 'Bitcoin'
                                                ? <>
                                                    <HelpBitcoinWallet />
                                                </>
                                                :
                                                null
                                            }
                                            <p>Billing amount : {amount} {fiatCurrency} ~ {amountTo} {tokenCurrency}</p>
                                            <label htmlFor='tokenSelection'>Select Token you will pay for.</label><br />
                                            <select id='tokenSelection' className='vodiapicker' onChange={(e) => {
                                                setTokenCurrency(e.target.value);
                                                const api = process.env.REACT_APP_API_URL + `/exchangeFiat2Token/${tokenCurrency}/${fiatCurrency}/${amount}`;

                                                axios.get(`${api}`).then(async (result) => {
                                                    setAmountTo(result.data.amountTo);
                                                })
                                            }}>
                                                {props.wallet === 'Bitcoin'
                                                    ? <>
                                                        <option value="BTC" data-thumbnail="assets/BTC-icon.png">
                                                            Bitcoin (BTC)
                                                        </option>
                                                        <option value="BCH" data-thumbnail="assets/BCH-icon.png">
                                                            Bitcoin Cash (BCH)
                                                        </option>
                                                    </>
                                                    : null
                                                }
                                                {props.wallet === 'MetaMask'
                                                    ?
                                                    <>
                                                        <option value="ETH" data-thumbnail="assets/ETH-icon.svg">
                                                            Ethereum (ETH)
                                                        </option>
                                                        <option value="USDT" data-thumbnail="assets/USDT-icon.svg">
                                                            USDT
                                                        </option>
                                                        <option value="USDC" data-thumbnail="assets/USDC-icon.svg">
                                                            USDC
                                                        </option>
                                                    </>
                                                    : null
                                                }
                                                {props.wallet === 'NEAR'
                                                    ? <option value="NEAR" data-thumbnail="assets/BTC-icon.png">
                                                        NEAR Protocol (NEAR)
                                                    </option>
                                                    : null
                                                }
                                                {props.wallet === 'BinanceWallet'
                                                    ? <>
                                                        <option value="ETH" data-thumbnail="assets/ETH-icon.svg">
                                                            Ethereum (ETH)
                                                        </option>
                                                        <option value="USDT" data-thumbnail="assets/USDT-icon.svg">
                                                            USDT
                                                        </option>
                                                        <option value="USDC" data-thumbnail="assets/USDC-icon.svg">
                                                            USDC
                                                        </option>
                                                    </>
                                                    : null
                                                }
                                            </select><br />
                                            <div className="token-select">
                                                <button className="btn-select" value=""></button>
                                                <div className="b">
                                                    <ul id="a"></ul>
                                                </div>
                                            </div>
                                            <span>{buyerBalance}</span><br />
                                            {tokenCurrency === 'BTC'
                                                ?
                                                <QRURI sellerAddress={sellerAddress} amount={amountTo.toString()} message={'Pay for ' + sellerAddress + ' with amount = ' + amountTo.toString() + ' BTC'} label={'BTC'} />
                                                :
                                                null
                                            }
                                            {props.wallet === 'MetaMask'
                                                ?
                                                <>
                                                    <button onClick={payBill} className="pt-3.5 pb-3 px-6 rounded-full bg-hyphen-purple bg-opacity-20 border-hyphen-purple/10 border text-hyphen-purple-dark/80 font-semibold disabled:text-hyphen-purple/20 disabled: disabled:bg-opacity-10 disabled:cursor-not-allowed">Process payment</button>
                                                    {
                                                        transactionStatus !== ""
                                                            ? <p>{transactionStatus}</p>
                                                            : null
                                                    }
                                                </>
                                                : null
                                            }
                                            {props.wallet === 'BinanceWallet'
                                                ?
                                                <>
                                                    <button onClick={payBill} className="pt-3.5 pb-3 px-6 rounded-full bg-hyphen-purple bg-opacity-20 border-hyphen-purple/10 border text-hyphen-purple-dark/80 font-semibold disabled:text-hyphen-purple/20 disabled: disabled:bg-opacity-10 disabled:cursor-not-allowed">Process payment</button>
                                                    {
                                                        transactionStatus !== ""
                                                            ? <p>{transactionStatus}</p>
                                                            : null
                                                    }
                                                </>
                                                : null
                                            }
                                            {props.wallet === 'Bitcoin'
                                                ?
                                                <>
                                                    {tokenCurrency === 'BCH'
                                                        ?
                                                        <>
                                                            <button onClick={payBill} className="pt-3.5 pb-3 px-6 rounded-full bg-hyphen-purple bg-opacity-20 border-hyphen-purple/10 border text-hyphen-purple-dark/80 font-semibold disabled:text-hyphen-purple/20 disabled: disabled:bg-opacity-10 disabled:cursor-not-allowed">Process payment</button>
                                                        </>
                                                        : null
                                                    }
                                                </>
                                                : null
                                            }
                                            {props.wallet === 'NEAR'
                                                ?
                                                <>
                                                    <button onClick={payBill} className="pt-3.5 pb-3 px-6 rounded-full bg-hyphen-purple bg-opacity-20 border-hyphen-purple/10 border text-hyphen-purple-dark/80 font-semibold disabled:text-hyphen-purple/20 disabled: disabled:bg-opacity-10 disabled:cursor-not-allowed">Process payment</button>
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
                        </>
                    }
                    <FundModal showAddFundModal={showAddFundModal} buyerAddress={buyerAddress} buyerBalance={getBalance} amountTo={amountTo} tokenCurrency={tokenCurrency} fiatCurrency={fiatCurrency} setTxHash={(txHash) => { setResultTxHash(txHash); }} setShowResultModal={(show) => { setShowResultModal(show); }} onClose={() => { setShowAddFundModal(false); }} />
                    <ResultModal showResultModal={showResultModal} onClose={() => { setShowResultModal(false); setLoading(true); }} resultTxHash={resultTxHash} />
                    <ChooseWallet showModalSelectWallet={props.showModalSelectWallet} onClose={() => { props.setShowModalSelectWallet(false); setLoading(true); }} setBuyerAddress={(buyerAddress) => { setBuyerAddress(buyerAddress); }} setWalletType={(walletType) => { props.setWallet(walletType); }} setTokenCurrency={(tokenCurrency) => { setTokenCurrency(tokenCurrency); }} setAmountTo={(amountTo) => { setAmountTo(amountTo); }} fiatCurrency={fiatCurrency} tokenCurrency={tokenCurrency} amount={amount} />
                </div >
            }
        </div >
    );
}