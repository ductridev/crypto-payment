import Modal from 'react-modal';
import Button from 'react-bootstrap/Button';
import axios from 'axios';
import { keyStores, connect as NEARconnect, WalletConnection } from "near-api-js";

export default function ChooseWallet(props) {
    const keyStore = new keyStores.BrowserLocalStorageKeyStore();

    const config = {
        networkId: "testnet",
        keyStore,
        nodeUrl: "https://rpc.testnet.near.org",
        walletUrl: "https://wallet.testnet.near.org",
        helperUrl: "https://helper.testnet.near.org",
        explorerUrl: "https://explorer.testnet.near.org",
        headers: { test: "10" }
    };

    const customStyles = {
        content: {
          top: '50%',
          left: '50%',
          right: 'auto',
          bottom: 'auto',
          marginRight: '-50%',
          transform: 'translate(-50%, -50%)',
        },
      };

    return (
        <>
            <Modal isOpen={props.showModalSelectWallet} onRequestClose={props.onClose} appElement={document.getElementById('main')} style={customStyles} shouldCloseOnOverlayClick={false}>
                <h3>Connect your wallet</h3>
                <div>
                    <div className="ConnectWalletModal_buttons">
                        <button className="text-300" onClick={async () => {
                            if (typeof window.ethereum !== 'undefined') {
                                console.log('MetaMask Wallet is installed!');
                                await window.ethereum.enable();
                                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                                props.setBuyerAddress(accounts[0]);
                                props.onClose();
                                props.setWalletType("MetaMask");
                                props.setTokenCurrency("ETH");

                                const api = process.env.REACT_APP_API_URL + `/exchangeFiat2Token/${props.tokenCurrency}/${props.fiatCurrency}/${props.amount}`;

                                axios.get(`${api}`).then(async (result) => {
                                    props.setAmountTo(result.data.amountTo);
                                })
                            }
                            else {
                                alert("Please install MetaMask Wallet");
                            }
                        }}>
                            <img src="assets/MetaMask.svg" alt="Metamask" style={{width: '128px'}} />MetaMask
                        </button>
                        <button className="text-300" onClick={() => { }}>
                            <img src="assets/WalletConnect.svg" alt="WalletConnect" style={{width: '128px'}} />WalletConnect
                        </button>
                        <button className="text-300" onClick={async () => {
                            window.near = await NEARconnect(config);
                            window.NEARwallet = new WalletConnection(window.near, "dag_crypto_bridge");
                            if (!window.NEARwallet.isSignedIn()) {
                                window.NEARwallet.requestSignIn();
                            }
                            else {
                                let accountID = window.NEARwallet.getAccountId();
                                props.setBuyerAddress(accountID);
                                props.onClose();
                                props.setWalletType("NEAR");
                                props.setTokenCurrency("NEAR");

                                const api = process.env.REACT_APP_API_URL + `/exchangeFiat2Token/${props.tokenCurrency}/${props.fiatCurrency}/${props.amount}`;

                                axios.get(`${api}`).then(async (result) => {
                                    props.setAmountTo(result.data.amountTo);
                                })

                                let senderNEARAccount = await window.near.account(window.NEARwallet.getAccountId());
                                window.senderNEARAccount = senderNEARAccount;
                            }
                        }}>
                            <img src="assets/NEARWallet.png" alt="NEAR Wallet" style={{width: '128px'}} />NEAR
                        </button>
                        <button className="text-300" onClick={
                            async () => {
                                if (typeof window.BinanceChain !== 'undefined') {
                                    console.log('Binance Wallet is installed!');
                                    const accounts = await window.BinanceChain.request({ method: 'eth_requestAccounts' });
                                    props.setBuyerAddress(accounts[0]);
                                    props.onClose();
                                    props.setWalletType("BinanceWallet");
                                    props.setTokenCurrency("ETH");

                                    const api = process.env.REACT_APP_API_URL + `/exchangeFiat2Token/${props.tokenCurrency}/${props.fiatCurrency}/${props.amount}`;

                                    axios.get(`${api}`).then(async (result) => {
                                        props.setAmountTo(result.data.amountTo);
                                    })
                                }
                                else {
                                    alert("Please install Binance Wallet");
                                }
                            }
                        }>
                            <img src="assets/BinanceWallet.png" alt="Binance Wallet" style={{width: '128px'}} />Binance Wallet
                        </button>
                    </div>
                </div>
                <div>
                    <Button variant="secondary" onClick={props.onClose}>
                        Cancel
                    </Button>
                </div>
            </Modal>
        </>
    )
}