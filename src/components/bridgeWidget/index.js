import { useEffect } from "react";
import * as HyphenWidget from "@biconomy/hyphen-widget";
import "@biconomy/hyphen-widget/dist/index.css";

export default function BridgeWidget() {

  useEffect(() => {
    const widget = HyphenWidget.default.init(
      document.getElementById("widget"),
      {
        dAppName: "cp goerli",
        showWidget: true,
        showCloseButton: false,
        showChangeAddress: false,
        env: "test",
        apiKeys: {
          Ethereum: process.env.REACT_APP_ETH_BICONOMY_APIKEY,
          Polygon: process.env.REACT_APP_POLY_BICONOMY_APIKEY,
          Avalanche: process.env.REACT_APP_AVA_BICONOMY_APIKEY,
          Binance: process.env.REACT_APP_BSC_BICONOMY_APIKEY
        },
        tag: "cp goerli"
      }
    );

    if (widget) {
      widget.open();
    }
  }, []);

  return (
    <div className='container'>
      <div className='main'>
        <div id="widget"></div>
      </div>
    </div>
  )
}