import { Interfaces } from "@arkecosystem/crypto";
import uuidv4 from "uuid/v4";
import { IStoreTransaction } from "../interfaces";

class Memory {
    private transactions: { [storeId: string]: IStoreTransaction } = {};
    private lastPurged: number = Date.now();

    // indexes on storeId
    private txStoreIdsBySender: { [senderPublicKey: string]: string[] } = {};
    private txStoreIdsByPublicKey: { [senderPublicKey: string]: string[] } = {};

    public saveTransaction(transaction: IStoreTransaction, id?: string): string {
        const storeId = id || uuidv4();
        transaction.timestamp = Date.now();
        transaction.id = storeId;
        this.transactions[storeId] = transaction;
        this.txStoreIdsBySender[transaction.data.senderPublicKey] =
            this.txStoreIdsBySender[transaction.data.senderPublicKey] || [];
        this.txStoreIdsBySender[transaction.data.senderPublicKey].push(storeId);

        for (const publicKey of transaction.multisigAsset.publicKeys) {
            this.txStoreIdsByPublicKey[publicKey] = this.txStoreIdsByPublicKey[publicKey] || [];
            this.txStoreIdsByPublicKey[publicKey].push(storeId);
        }

        return storeId;
    }

    public updateTransaction(transaction: Interfaces.ITransactionData, storeId: string): void {
        const storeTxToUpdate = this.transactions[storeId];
        if (!storeTxToUpdate) {
            throw new Error(`No transaction found for store ID ${storeId}`);
        }

        // TODO check signature is valid
        this.transactions[storeId].data = transaction;
    }

    public getTransactionById(storeId: string): IStoreTransaction {
        if (Date.now() - this.lastPurged > 60 * 60 * 1000) {
            // launch purge every hour
            this.purgeExpiredTransactions();
            this.lastPurged = Date.now();
        }
        return this.transactions[storeId];
    }

    public getTransactionsByPublicKey(publicKey: string): IStoreTransaction[] {
        const storeIdsBySender = this.txStoreIdsBySender[publicKey] || [];
        const storeIdsByPublicKey = this.txStoreIdsByPublicKey[publicKey] || [];

        const allById = {};
        for (const id of storeIdsBySender.concat(storeIdsByPublicKey)) {
            allById[id] = this.getTransactionById(id);
        }

        return Object.values(allById);
    }

    public getAllTransactions(): IStoreTransaction[] {
        return Object.values(this.transactions);
    }

    public deleteAllTransactions(): void {
        for (const id of Object.keys(this.transactions)) {
            this.removeById(id);
        }
    }

    public loadTransactions(transactions: IStoreTransaction[]) {
        for (const transaction of transactions) {
            this.saveTransaction(transaction);
        }
    }    

    private purgeExpiredTransactions(): void {
        for (const id of Object.keys(this.transactions)) {
            if (Date.now() - this.transactions[id].timestamp > 24 * 60 * 60 * 1000) {
                this.removeById(id);
            }
        }
    }

    private removeById(storeId: string): void {
        const { data, multisigAsset } = this.transactions[storeId];

        // removes indexes
        this.txStoreIdsBySender[data.senderPublicKey] = this.txStoreIdsBySender[data.senderPublicKey].filter(
            id => id !== storeId,
        );
        for (const publicKey of multisigAsset.publicKeys) {
            this.txStoreIdsByPublicKey[publicKey] = this.txStoreIdsByPublicKey[publicKey].filter(id => id !== storeId);
        }

        // remove actual transaction
        delete this.transactions[storeId];
    }
}

export const memory = new Memory();
