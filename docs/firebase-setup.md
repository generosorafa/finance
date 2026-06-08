# Configuracao do Firebase

## 1. Criar projeto

1. Acesse https://console.firebase.google.com/.
2. Crie um novo projeto.
3. O Google Analytics pode ficar desativado neste momento.

## 2. Criar app Web

1. Dentro do projeto, clique no icone Web `</>`.
2. Registre o app.
3. Copie o objeto `firebaseConfig`.
4. Preencha `.env.local` usando `.env.example` como modelo.

## 3. Ativar login com Google

1. Acesse Authentication.
2. Clique em Get started.
3. Em Sign-in method, ative Google.
4. Em Settings > Authorized domains, adicione o dominio de publicacao quando existir.

## 4. Criar Firestore

1. Acesse Firestore Database.
2. Clique em Create database.
3. Escolha Production mode.
4. Publique as regras em `firestore.rules`.

## 5. Estrutura dos dados

Todos os dados ficam dentro do usuario logado:

```txt
users/{uid}/transactions
users/{uid}/installments
users/{uid}/cards
users/{uid}/categories
users/{uid}/wallet
users/{uid}/investments
users/{uid}/goals
users/{uid}/debts
users/{uid}/allocations
users/{uid}/config/settings
```

As chaves Web do Firebase nao sao senha privada. A protecao real vem do login e das regras do Firestore.

## 6. App Check

O codigo ja suporta App Check, mas ele deve ser ativado em duas fases:

1. Registrar o app em App Check no Firebase console.
2. Preencher no `.env.local`:

```env
VITE_FIREBASE_APPCHECK_SITE_KEY=sua_chave_publica
VITE_FIREBASE_APPCHECK_PROVIDER=recaptcha-enterprise
```

Depois que o login e as gravacoes forem testados com App Check recebendo tokens, podemos ativar enforcement para Firestore no console.

Nao ative enforcement antes da chave estar configurada no app, porque isso bloqueia leituras e escritas.

## 7. Dominios autorizados

Em Authentication > Settings > Authorized domains, mantenha:

```txt
localhost
127.0.0.1
```

Quando publicarmos, adicione tambem o dominio final do app.
