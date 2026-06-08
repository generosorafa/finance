import { useCallback, useEffect, useMemo, useState } from 'react';
import { COLLECTIONS, DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS } from '../data/defaults.js';
import {
  loadCollection,
  loadSettings,
  removeUserDocument,
  saveSettings as persistSettings,
  saveUserDocument,
} from '../firebase/client.js';

const EMPTY_DATA = {
  transactions: [],
  installments: [],
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

      setData({ ...EMPTY_DATA, ...loaded, categories, settings });
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
    async remove(collectionName, id) {
      if (!userId) return;
      await removeUserDocument(userId, collectionName, id);
      setData((current) => ({
        ...current,
        [collectionName]: current[collectionName].filter((item) => item.id !== id),
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
