import { AlertTriangle, ArrowRight, CheckCircle2, Info } from 'lucide-react';
import { EmptyState, StatCard } from '../components/ui.jsx';
import { dataHealthInsights, formatCurrency, monthLabelFromKey } from '../utils/finance.js';

export function HealthPage({ data, currentMonth, currentYear, setPage }) {
  const health = dataHealthInsights(data, currentMonth, currentYear);
  const problemChecks = health.problemChecks;
  const okChecks = health.checks.filter((item) => item.ok);

  return (
    <div className="content-grid">
      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <h2>Saude dos dados</h2>
            <p>Conferencia do mes de {monthLabelFromKey(health.month)} antes de analisar ou fechar.</p>
          </div>
          <span className={`pill ${health.status === 'risk' ? 'warning' : health.status === 'attention' ? 'muted' : 'positive'}`}>
            {health.status === 'risk' ? 'Requer atencao' : health.status === 'attention' ? 'Revisar pontos' : 'Tudo certo'}
          </span>
        </div>
        <div className="stat-grid">
          <StatCard label="Pontos em aberto" value={String(health.issueCount)} tone={health.issueCount ? 'negative' : 'positive'} />
          <StatCard label="Criticos" value={String(health.highCount)} tone={health.highCount ? 'negative' : 'positive'} />
          <StatCard label="Atencao" value={String(health.mediumCount)} tone={health.mediumCount ? 'info' : 'positive'} />
          <StatCard label="Baixa prioridade" value={String(health.lowCount)} tone={health.lowCount ? 'info' : 'positive'} />
        </div>
      </section>

      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <h2>Pontos para conferir</h2>
            <p>{problemChecks.length} grupo(s) com alguma pendencia.</p>
          </div>
        </div>
        <div className="health-list">
          {problemChecks.map((item) => (
            <HealthRow item={item} key={item.id} setPage={setPage} />
          ))}
          {!problemChecks.length && <EmptyState title="Nenhuma pendencia encontrada para este mes." />}
        </div>
      </section>

      <section className="panel span-2">
        <div className="panel-header">
          <div>
            <h2>Conferencias ok</h2>
            <p>{okChecks.length} item(ns) sem problema aparente.</p>
          </div>
        </div>
        <div className="health-ok-grid">
          {okChecks.map((item) => (
            <div className="health-ok-card" key={item.id}>
              <CheckCircle2 size={18} />
              <span>{item.title}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function HealthRow({ item, setPage }) {
  const Icon = item.severity === 'high' ? AlertTriangle : Info;

  return (
    <div className={`health-row ${item.severity}`}>
      <Icon size={20} />
      <div className="row-main">
        <strong>{item.title}</strong>
        <span>{item.description}</span>
        {!!item.details.length && (
          <div className="health-details">
            {item.details.map((detail) => <small key={detail}>{detail}</small>)}
          </div>
        )}
      </div>
      <div className="health-metric">
        <strong>{item.count}</strong>
        {!!item.amount && <span>{formatCurrency(item.amount)}</span>}
      </div>
      <button className="secondary-button" onClick={() => setPage(item.page)} type="button">
        Abrir <ArrowRight size={16} />
      </button>
    </div>
  );
}
