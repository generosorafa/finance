import { makeId, monthKey } from '../utils/finance.js';

export async function applyRecurrentTransactions(data, actions) {
  const key = monthKey();
  const [year, month] = key.split('-').map(Number);
  const recurrent = data.transactions.filter((item) => item.recurrent === 'sim' && item.generatedMonth !== key);

  for (const item of recurrent) {
    const rootId = item.recurrentRootId || item.id;
    const exists = data.transactions.some((entry) => entry.recurrentRootId === rootId && entry.generatedMonth === key);
    const sourceIsCurrentMonth = item.date?.startsWith(key);
    if (exists || sourceIsCurrentMonth) continue;

    const sourceDay = Number(item.date?.slice(8, 10) || 1);
    const lastDay = new Date(year, month, 0).getDate();
    const date = `${key}-${String(Math.min(sourceDay, lastDay)).padStart(2, '0')}`;

    await actions.save('transactions', {
      ...item,
      id: makeId('tx'),
      date,
      recurrentRootId: rootId,
      generatedMonth: key,
      createdAt: Date.now(),
    });
  }
}

