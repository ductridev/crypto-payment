import { useState } from "react";
import { NavLink } from "react-router-dom";

export default function Header(props) {
    const navLinkStyle = ({ isActive }) => ({
        color: isActive ? '#fff' : '',
        backgroundColor: isActive ? '#0d6efd' : ''
    })
    const [currentNav, setCurrentNav] = useState("default");
    return (
        <div className="header">
            <div className="icon-header">CP</div>
            <div className="page-name">Crypto Payment</div>
            <div className="tab">
                <NavLink to={`/${sessionStorage.getItem('paymentID')}`} style={navLinkStyle} onClick={() => { setCurrentNav("default") }}>Instant Same-Chain Transfers</NavLink>
                <NavLink to="/hyphen" style={navLinkStyle} onClick={() => { setCurrentNav("hyphen") }}>Instant Cross-Chain Transfers</NavLink>
            </div>
            <div className="connect-wallet">
                {currentNav === "default" || props.wallet === ""
                    ?
                    <button onClick={() => { props.setShowModalSelectWallet(true) }} {...props.wallet === "" ? "" : "disabled"}>
                        Connect Wallet
                    </button>
                    : null
                }
            </div>
        </div>
    );
}