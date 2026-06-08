# Security

## Dados e autenticacao

- O app usa Firebase Authentication com Google.
- Cada usuario grava dados dentro de `users/{uid}`.
- As regras do Firestore bloqueiam acesso cruzado entre usuarios.
- Realtime Database e Storage nao sao usados.

## Chaves Firebase Web

As chaves Web do Firebase identificam o projeto/app, mas nao autorizam acesso sozinhas. A autorizacao acontece por Firebase Auth, Firestore Rules e, futuramente, App Check.

Mesmo assim, o projeto nao versiona `.env.local`.

## Antes de producao

- Criar projeto Firebase separado para producao.
- Adicionar dominio final em Authentication > Settings > Authorized domains.
- Configurar App Check e testar em modo monitoramento.
- Ativar enforcement do App Check para Firestore apenas depois de confirmar tokens validos.
- Publicar as regras de `firestore.rules`.
- Manter CI verde em todos os merges para `main`.

