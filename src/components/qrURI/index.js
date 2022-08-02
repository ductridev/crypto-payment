import { useState } from "react";
import { QRCodeSVG } from 'qrcode.react';

export default function QRURI(props) {
    const [showURI, setShowURI] = useState(false);
  
    return (
      <div>
        <button onClick={() => { setShowURI(true); }}>Create Request URI</button>
        {showURI === true
          ?
          <div>
            <a href={'bitcoin:' + props.sellerAddress + '?amount=' + props.amount + '&message=' + props.message + '&label=' + props.label}>{'bitcoin:' + props.sellerAddress + '?amount=' + props.amount + '&message=' + props.message + '&label=' + props.label}</a><br />
            or<br />
            <QRCodeSVG value={'bitcoin:' + props.sellerAddress + '?amount=' + props.amount + '&message=' + props.message + '&label=' + props.label} />
          </div>
          : null
        }
      </div>
    )
}