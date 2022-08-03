export default function Header(props) {
    return (
        <div className="header">
            <div className="icon">CP</div>
            <div className="page-name">Crypto Payment</div>
            <div className="connect-wallet">
                <button onClick={() => { props.setShowModalSelectWallet(true); }} {...props.wallet === "" ? "" : "disabled"}>
                    Connect Wallet
                </button>
            </div>
            <div className="tab">
                <div onClick={() => { props.setTab('default'); }}>Payment</div>
                <div onClick={() => { props.setTab('hyphenBridge'); }}>Bridge Tokens</div>
            </div>
        </div>
    );
}