import { useEffect } from 'react';
import Modal from 'react-modal';
import Button from 'react-bootstrap/Button';
import { ethers } from "ethers";
import axios from 'axios';
import { useState } from 'react';

Modal.setAppElement('#root');

export default function FundModal(props) {
    const [amountTo, setAmountTo] = useState(0);
    const [amountDeposit, setAmountDeposit] = useState(0);

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

    const addMoreFund = async () => {
        const api = process.env.REACT_APP_API_URL + `/exchangeFiat2Token/${props.tokenCurrency}/${props.fiatCurrency}/${amountDeposit}`;

        axios.get(`${api}`).then(async (result) => {
            setAmountTo(result.data.amountTo);
        })
        let txParams = {
            from: props.buyerAddress,
            to: process.env.REACT_APP_CONTRACT_ADDRESS,
            value: ethers.utils.parseEther(Number(amountTo).toFixed(18)).toHexString(),
            signatureType: "EIP712_SIGN"
        };

        let txHash = await window.ethereum.send("eth_sendTransaction", [txParams]);
        props.setTxHash(txHash.result);
        props.setShowResultModal(true);
        props.onClose();
    }

    useEffect(() => {
        if (amountDeposit === 0) {
            const getBalance = async () => {
                const buyerBalance = await props.buyerBalance;
                return buyerBalance;
            }
            // console.log(getBalance());
            const api = process.env.REACT_APP_API_URL + `/exchangeToken2Fiat/${props.tokenCurrency}/${props.fiatCurrency}/${props.amountTo - getBalance()}`;

            axios.get(`${api}`).then(async (result) => {
                setAmountTo(props.amountTo - getBalance());
                setAmountDeposit(result.data.amount);
            })
        }
        else {
            const api = process.env.REACT_APP_API_URL + `/exchangeFiat2Token/${props.tokenCurrency}/${props.fiatCurrency}/${amountDeposit}`;

            axios.get(`${api}`).then(async (result) => {
                setAmountTo(result.data.amountTo);
            })
        }
    }, [amountDeposit, props.amountTo, props.buyerBalance, props.fiatCurrency, props.tokenCurrency]);

    return (
        <>
            <Modal isOpen={props.showAddFundModal} onRequestClose={props.onClose} appElement={document.getElementById('main')} style={customStyles} shouldCloseOnOverlayClick={false}>
                <h3>Add More Fund</h3>
                <div>
                    Enter amount you want to add to your balance (At least {amountDeposit}): <input type={'number'} step='0.01' min={'0'} value={amountDeposit} onBlur={(e) => {
                        if (e.target.value < amountDeposit) {
                            setAmountDeposit(amountDeposit);
                        }
                        else {
                            setAmountDeposit(e.target.value);
                        }
                    }} onChange={(e) => { setAmountDeposit(e.target.value); }} /> {props.fiatCurrency} ~ {amountTo} {props.tokenCurrency}
                    <div>
                        <p>We have your address already. Now, please enter private key of this address. Don't worry, we don't save it.<br />
                            <input placeholder='Enter private key here' type={'password'} onBlur={(e) => {
                                window.privateKey = e.target.value;
                            }} />
                        </p>
                        <a href='https://metamask.zendesk.com/hc/en-us/articles/360015289632-How-to-Export-an-Account-Private-Key'>Check here if you don't know how to get private key of address.</a>
                    </div>
                </div>
                <div>
                    <Button variant="secondary" onClick={props.onClose}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={addMoreFund}>
                        Deposit
                    </Button>
                </div>
            </Modal>
        </>
    )
}