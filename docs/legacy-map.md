# Mapa do prototipo legado

O arquivo original enviado pelo usuario era um `index.html` unico com CSS, HTML, Firebase e toda a logica de negocio no mesmo arquivo.

## Recursos que devem permanecer

- Login com Google.
- Dados separados por usuario.
- Dashboard mensal.
- Transacoes com receitas, despesas, natureza, necessidade e forma de pagamento.
- Gastos fixos, assinaturas e parcelamentos devem substituir a recorrencia generica do prototipo.
- Parcelamentos vinculados a cartoes.
- Cartoes de credito com fechamento, vencimento e fatura.
- Categorias editaveis.
- Carteira/saldo inicial/entradas/saidas.
- Investimentos.
- Metas.
- Dividas.
- Alocacao de saldo para metas, investimentos e dividas.
- Recorrencia generica removida por decisao de produto.
- Exportacao CSV.
- Relatorio mensal em HTML para baixar/imprimir.

## Colecoes do Firestore

```txt
transactions
installments
fixedItems
categoryBudgets
cards
categories
wallet
investments
goals
debts
allocations
config/settings
```

## Decisoes da nova base

- Firebase sai do HTML e vai para `src/firebase/client.js`.
- Configuracoes do Firebase ficam em `.env.local`.
- Regras de seguranca ficam versionadas em `firestore.rules`.
- Interface passa a ser React para facilitar telas, componentes e estados.
- A primeira etapa prioriza preservar o fluxo de dados e preparar a reestilizacao.
