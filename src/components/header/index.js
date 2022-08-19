import { NavLink } from "react-router-dom";

export default function Header(props) {
    const navLinkStyle = ({ isActive }) => ({
        color: isActive ? '#fff' : '',
        backgroundColor: isActive ? '#0d6efd' : ''
    })
    return (
        <div className="header">
            <div className="icon-header">CP</div>
            <div className="page-name">Crypto Payment</div>
            <div className="tab">
                <NavLink to={`/${sessionStorage.getItem('paymentID')}`} style={navLinkStyle}>Instant Same-Chain Transfers</NavLink>
                <NavLink to="/hyphen" style={navLinkStyle}>Instant Cross-Chain Transfers</NavLink>
            </div>
            <div className="connect-wallet">
                <button onClick={() => { props.setShowModalSelectWallet(true)}} {...props.wallet === "" ? "" : "disabled"}>
                    Connect Wallet
                </button>
            </div>
        </div>
    );
}