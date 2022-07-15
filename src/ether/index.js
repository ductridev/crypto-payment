import { Biconomy } from "@biconomy/mexa";

export const EthereumBiconomy = new Biconomy(window.ethereum || window.BinanceChain, {
    apiKey: process.env.REACT_APP_ETH_BICONOMY_APIKEY,
    debug: false
});