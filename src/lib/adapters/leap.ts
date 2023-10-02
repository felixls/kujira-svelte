import IconLeap from "$lib/icons/IconLeap.svelte";
import { CHAIN_INFO, type NETWORK } from "$lib/resources/networks";
import { ConnectionError, type AccountData, WalletAdapter, type WalletMetadata, type IWallet, type KujiraClient } from "$lib/types";
import type { OfflineSigner } from "@cosmjs/proto-signing";
import { GasPrice, SigningStargateClient, } from "@cosmjs/stargate";
import type { Window as KeplrWindow, Keplr } from "@keplr-wallet/types";

declare global {
    interface Window extends KeplrWindow {
        leap: Keplr;
    }
}

export class Leap implements IWallet {
    private constructor(public account: AccountData, public signer: OfflineSigner, private chain: NETWORK) { }

    public static metadata: WalletMetadata = {
        adapter: WalletAdapter.Leap,
        name: 'Leap',
        logo: IconLeap,
        canSign: true,
    };
    public getMetadata(this: IWallet): WalletMetadata { return Leap.metadata; }
    public static async isInstalled(): Promise<boolean> {
        return !!window.leap;
    }
    public static async connect(chain: string): Promise<Leap> {
        if (!Leap.isInstalled()) {
            throw ConnectionError.NotInstalled;
        }

        const leap = window.leap;

        try {
            await leap.enable(chain);
            const offlineSigner = leap.getOfflineSigner(chain);
            const accounts = await offlineSigner.getAccounts();
            if (accounts.length === 0) {
                throw ConnectionError.NoAccounts;
            }
            const account = accounts[0];
            return new Leap(account, offlineSigner, chain as NETWORK);
        } catch (error) {
            console.log(error);
            throw ConnectionError.GenericError;
        }
    }

    public disconnect(): void { /* noop */ }

    public async getSigningClient(client: KujiraClient): Promise<SigningStargateClient> {
        if (!this.account) {
            throw new Error("No account connected");
        }
        const feeDenom = CHAIN_INFO[this.chain].feeCurrencies[0];
        const gasPrice = GasPrice.fromString(`${feeDenom.gasPriceStep!.low}${feeDenom.coinMinimalDenom}`);
        return SigningStargateClient.createWithSigner(client.getTmClient(), this.signer, { gasPrice });
    }
}