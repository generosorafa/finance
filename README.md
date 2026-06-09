# Finance

Aplicacao financeira pessoal criada a partir do prototipo legado em HTML unico. A nova base usa React, Vite e Firebase modular para facilitar a evolucao de layout, dados e automacoes.

Decisao de produto atual: nao usar recorrencia generica. O app deve evoluir com conceitos mais claros para gastos fixos, assinaturas e parcelamentos.

## Como rodar

1. Instale as dependencias:

```bash
npm install
```

2. Copie `.env.example` para `.env.local` e preencha com o config do app Web no Firebase.

3. Rode o projeto:

```bash
npm run dev
```

## Firebase usado

- Authentication: login com Google.
- Firestore: dados salvos por usuario em `users/{uid}`.
- App Check: preparado por variavel de ambiente, mas sem enforcement ate configurarmos no console.
- Storage e Realtime Database nao sao usados nesta base.

Publique as regras de `firestore.rules` no console do Firebase antes de usar em producao.

## Ambientes

- `.env.local`: Firebase de desenvolvimento, nao versionado.
- `.env.example`: modelo seguro para novas maquinas.
- Produção deve usar outro projeto Firebase, por exemplo `finance-prod`.

## Validacao

```bash
npm run build
npm test
```
