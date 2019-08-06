import { Interfaces } from "@arkecosystem/crypto";

export interface IStoreTransaction {
    data: Interfaces.ITransactionData;
    multisigAsset: Interfaces.IMultiSignatureAsset;
    timestamp?: number;
}
