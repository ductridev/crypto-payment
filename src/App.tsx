import { useEffect, useState } from 'react';
import {
  Routes,
  Route,
} from "react-router-dom";

import './App.css';
import Header from './components/header';
import Payment from './components/payment';
import BridgeWidget from './components/bridgeWidget';

function App() {
  const [wallet, setWallet] = useState("");
  const [showModalSelectWallet, setShowModalSelectWallet] = useState(false);

  return (
    <>
      <Header wallet={wallet} setWallet={(walletType: string) => { setWallet(walletType) }} setShowModalSelectWallet={(show: boolean) => { setShowModalSelectWallet(show) }} />
      <Routes>
        <Route path="/:paymentID" element={<Payment showModalSelectWallet={showModalSelectWallet} wallet={wallet} setWallet={(walletType: string) => { setWallet(walletType) }} setShowModalSelectWallet={(show: boolean) => { setShowModalSelectWallet(show) }} />} />
        <Route path="/hyphen" element={<BridgeWidget />} />
      </Routes>
    </>
  );
}

export default App;