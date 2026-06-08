# Finance

Aplicacao financeira pessoal criada a partir do prototipo legado em HTML unico. A nova base usa React, Vite e Firebase modular para facilitar a evolucao de layout, dados e automacoes.

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
- Storage nao e usado nesta primeira base.

Publique as regras de `firestore.rules` no console do Firebase antes de usar em producao.

