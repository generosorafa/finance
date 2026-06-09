import { useCallback, useEffect, useMemo, useState } from 'react';
import { COLLECTIONS, DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS } from '../data/defaults.js';
import {
  loadCollection,
  loadSettings,
  removeUserDocument,
  saveSettings as persistSettings,
  saveUserDocument,
} from '../firebase/client.js';
import { walletEntryForTransaction } from '../utils/finance.js';

const EMPTY_DATA = {
  transactions: [],
  installments: [],
  fixedItems: [],
  cards: [],
  categories: [],
  wallet: [],
  investments: [],
  goals: [],
  debts: [],
  allocations: [],
  settings: {},
};

export function useFinanceData(user) {
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const userId = user?.uid;

  const refresh = useCallback(async () => {
    if (!userId) {
      setData(EMPTY_DATA);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const entries = await Promise.all(COLLECTIONS.map(async (name) => [name, await loadCollection(userId, name)]));
      const loaded = Object.fromEntries(entries);
      const settings = await loadSettings(userId);

      let categories = loaded.categories || [];
      if (!categories.length) {
        await Promise.all(DEFAULT_CATEGORIES.map((item) => saveUserDocument(userId, 'categories', item.id, item)));
        categories = DEFAULT_CATEGORIES;
      } else {
        const missing = DEFAULT_CATEGORIES.filter((item) => item.special && !categories.some((cat) => cat.id === item.id));
        if (missing.length) {
          await Promise.all(missing.map((item) => saveUserDocument(userId, 'categories', item.id, item)));
          categories = [...categories, ...missing];
        }
      }

      let wallet = loaded.wallet || [];
      const transactions = loaded.transactions || [];
      const missingWalletEntries = transactions
        .map((transaction) => walletEntryForTransaction(transaction))
        .filter((entry) => entry && !wallet.some((walletEntry) => walletEntry.id === entry.id));

      let hydratedTransactions = transactions;
      if (missingWalletEntries.length) {
        await Promise.all(missingWalletEntries.map((entry) => saveUserDocument(userId, 'wallet', entry.id, entry)));
        await Promise.all(transactions
          .filter((transaction) => missingWalletEntries.some((entry) => entry.transactionId === transaction.id) && !transaction.walletEntryId)
          .map((transaction) => saveUserDocument(userId, 'transactions', transaction.id, {
            ...transaction,
            walletEntryId: `wallet_tx_${transaction.id}`,
          })));
        wallet = [...wallet, ...missingWalletEntries];
        hydratedTransactions = transactions.map((transaction) => {
          const entry = missingWalletEntries.find((walletEntry) => walletEntry.transactionId === transaction.id);
          return entry && !transaction.walletEntryId
            ? { ...transaction, walletEntryId: entry.id }
            : transaction;
        });
      }

      setData({ ...EMPTY_DATA, ...loaded, categories, transactions: hydratedTransactions, wallet, settings });
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const actions = useMemo(() => ({
    async save(collectionName, item) {
      if (!userId) return;
      await saveUserDocument(userId, collectionName, item.id, item);
      setData((current) => ({
        ...current,
        [collectionName]: upsert(current[collectionName], item),
      }));
    },
    async saveTransaction(item, previousItem = null) {
      if (!userId) return;

      const walletEntry = walletEntryForTransaction(item);
      const previousWalletEntry = previousItem ? walletEntryForTransaction(previousItem) : null;
      const transaction = {
        ...item,
        walletEntryId: walletEntry?.id || '',
      };

      await saveUserDocument(userId, 'transactions', transaction.id, transaction);

      if (previousWalletEntry && previousWalletEntry.id !== walletEntry?.id) {
        await removeUserDocument(userId, 'wallet', previousWalletEntry.id);
      }

      if (walletEntry) {
        await saveUserDocument(userId, 'wallet', walletEntry.id, walletEntry);
      } else if (previousWalletEntry) {
        await removeUserDocument(userId, 'wallet', previousWalletEntry.id);
      }

      setData((current) => {
        let wallet = current.wallet;
        if (previousWalletEntry && previousWalletEntry.id !== walletEntry?.id) {
          wallet = wallet.filter((entry) => entry.id !== previousWalletEntry.id);
        }
        if (walletEntry) {
          wallet = upsert(wallet, walletEntry);
        } else if (previousWalletEntry) {
          wallet = wallet.filter((entry) => entry.id !== previousWalletEntry.id);
        }

        return {
          ...current,
          transactions: upsert(current.transactions, transaction),
          wallet,
        };
      });
    },
    async remove(collectionName, id) {
      if (!userId) return;
      await removeUserDocument(userId, collectionName, id);
      setData((current) => ({
        ...current,
        [collectionName]: current[collectionName].filter((item) => item.id !== id),
      }));
    },
    async removeTransaction(transaction) {
      if (!userId) return;

      const walletEntry = walletEntryForTransaction(transaction);
      await removeUserDocument(userId, 'transactions', transaction.id);
      if (walletEntry) {
        await removeUserDocument(userId, 'wallet', walletEntry.id);
      }

      setData((current) => ({
        ...current,
        transactions: current.transactions.filter((item) => item.id !== transaction.id),
        wallet: walletEntry
          ? current.wallet.filter((item) => item.id !== walletEntry.id)
          : current.wallet,
      }));
    },
    async saveSettings(nextSettings) {
      if (!userId) return;
      await persistSettings(userId, nextSettings);
      setData((current) => ({
        ...current,
        settings: { ...current.settings, ...nextSettings },
      }));
    },
  }), [userId]);

  const paymentMethods = data.settings.paymentMethods?.length
    ? data.settings.paymentMethods
    : DEFAULT_PAYMENT_METHODS;

  return {
    data,
    loading,
    error,
    actions,
    refresh,
    paymentMethods,
  };
}

function upsert(list, item) {
  const exists = list.some((entry) => entry.id === item.id);
  return exists ? list.map((entry) => (entry.id === item.id ? item : entry)) : [item, ...list];
}
