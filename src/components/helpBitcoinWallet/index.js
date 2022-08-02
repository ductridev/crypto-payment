import { BrowserView, AndroidView, IOSView } from 'react-device-detect';

export default function HelpBitcoinWallet() {
    return (
      <div>
        <BrowserView>
          <p>Check all Bitcoin Wallet for Windows is available at <a href='https://bitcoin.org/en/wallets/desktop/windows/?step=5&platform=windows'>here</a></p>
        </BrowserView>
        <AndroidView>
          <p>Check all Bitcoin Wallet for Android is available at <a href='https://bitcoin.org/en/wallets/mobile/android?step=5&platform=android'>here</a></p>
        </AndroidView>
        <IOSView>
          <p>Check all Bitcoin Wallet for iOS is available at <a href='https://bitcoin.org/en/wallets/mobile/ios/?step=5&platform=ios'>here</a></p>
        </IOSView>
      </div>
    )
}