import { useState } from 'react';

import './App.css';
import Header from './components/header';
import Payment from './components/payment';
import BridgeWidget from './components/bridgeWidget';

function App() {
  const [wallet, setWallet] = useState("");
  const [showModalSelectWallet, setShowModalSelectWallet] = useState(false);
  const [tab, setTab] = useState("default");
  return (
    <>
      <Header wallet={wallet} setWallet={(walletType: string) => { setWallet(walletType) }} setShowModalSelectWallet={(show: boolean) => { setShowModalSelectWallet(show) }} setTab={(tab: string) => { setTab(tab); }} />
      {tab === "default"
        ?
        <Payment showModalSelectWallet={showModalSelectWallet} wallet={wallet} setWallet={(walletType: string) => { setWallet(walletType) }} setShowModalSelectWallet={(show: boolean) => { setShowModalSelectWallet(show) }} />
        : null}
      {tab === "hyphenBridge"
        ?
        <BridgeWidget />
        : null}
    </>
  );
}

export default App;