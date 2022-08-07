import { TokenConfig } from ".";
import { GOERLI } from "../chains/constants/Goerli";
import { POLYGON } from "../chains/constants/Polygon";
import { ETHEREUM } from "../chains/constants/Ethereum";
import { MUMBAI } from "../chains/constants/Mumbai";
import bicoIcon from "../assets/images/tokens/bico-icon.svg";

export const BICO: TokenConfig = {
  symbol: "BICO",
  image: bicoIcon,
  [MUMBAI.chainId]: {
    address: "0xac42d8319ce458b22a72b45f58c0dcfeee824691",
    transferOverhead: 121335,
    decimal: 18,
    symbol: "BICO",
  },
  [GOERLI.chainId]: {
    address: "0xDdc47b0cA071682e8dc373391aCA18dA0Fe28699",
    transferOverhead: 121335,
    decimal: 18,
    symbol: "BICO",
  },
  [POLYGON.chainId]: {
    address: "0x91c89A94567980f0e9723b487b0beD586eE96aa7",
    transferOverhead: 121335,
    decimal: 18,
    symbol: "BICO",
  },
  [ETHEREUM.chainId]: {
    address: "0xf17e65822b568b3903685a7c9f496cf7656cc6c2",
    transferOverhead: 121335,
    decimal: 18,
    symbol: "BICO",
  },
};