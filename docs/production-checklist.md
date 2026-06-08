# Checklist de producao

## Firebase

- [ ] Criar projeto `finance-prod`.
- [ ] Registrar app Web `finance-web`.
- [ ] Criar `.env.production` ou secrets do provedor de deploy.
- [ ] Ativar Authentication com Google.
- [ ] Adicionar dominio final em Authorized domains.
- [ ] Criar Firestore Standard em `southamerica-east1`, se o publico principal estiver no Brasil.
- [ ] Publicar `firestore.rules`.
- [ ] Configurar App Check.
- [ ] Testar App Check em monitoramento.
- [ ] Ativar enforcement para Firestore.

## Aplicacao

- [ ] Build local com `npm run build`.
- [ ] Login Google funcionando no dominio final.
- [ ] Criar transacao e confirmar no Firestore.
- [ ] Validar mobile.
- [ ] Validar exportacao CSV e relatorio.
- [ ] Validar recorrencias.

## GitHub

- [ ] CI verde.
- [ ] Branch protection em `main`.
- [ ] Deploy automatizado configurado.

