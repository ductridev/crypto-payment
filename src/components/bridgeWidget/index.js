import { useState, useEffect } from "react";
import * as HyphenWidget from "@biconomy/hyphen-widget";
import "@biconomy/hyphen-widget/dist/index.css";

function BridgeWidget() {
    const [hyphenWidget, setHyphenWidget] = useState();
  
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
        }
      );
  
      if (widget) {
        setHyphenWidget(widget);
      }
    }, []);
  
    function handleOpen() {
      hyphenWidget.open();
    }
  
    function handleClose() {
      hyphenWidget.close();
    }
  
    return <div className="BridgeWidget">
      <button onClick={handleOpen}>Open Widget</button>
      <button onClick={handleClose}>Close Widget</button>
  
      <div id="widget"></div>
    </div>;
  }
  
  export default BridgeWidget;