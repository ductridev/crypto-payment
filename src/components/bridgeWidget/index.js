import { useEffect } from "react";
import * as HyphenWidget from "@biconomy/hyphen-widget";
import "@biconomy/hyphen-widget/dist/index.css";

export default function BridgeWidget() {

  useEffect(() => {
    const widget = HyphenWidget.default.init(
      document.getElementById("widget"),
      {
        dAppName: "cp kov",
        showWidget: true,
        showCloseButton: false,
        env: "test",
        apiKeys: {
          Ethereum: "Jy_AJCwnO.49dcee52-b29a-4ec5-91ea-f1a71f9793f6",
        },
        tag: "cp kov"
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