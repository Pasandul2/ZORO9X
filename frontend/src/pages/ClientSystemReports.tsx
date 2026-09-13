import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, CalendarDays, ClipboardList, Download, FileSpreadsheet, RefreshCw, TrendingUp, Wallet } from 'lucide-react';

type Row = Record<string, any>;
type ReportData = { summary: Record<string, number>; range: { from: string; to: string; dateField: string }; backup: Row | null; backups?: Row[]; datasets: Record<string, Row[]> & { cashSummary?: Record<string, number> } };

const reports = [
  ['analytics', 'Analytics Dashboard'], ['summary', 'System Summary'], ['loans', 'Loan Ledger'],
  ['overdue', 'Overdue Analysis'], ['renewals', 'Renewal Report'], ['payments', 'Payment Report'],
  ['interest', 'Interest Report'], ['customers', 'Customer Report'], ['inventory', 'Gold Inventory'],
  ['operations', 'Operations'], ['repawning', 'Repawning'],
] as const;

const money = (value: unknown) => `Rs. ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const number = (value: unknown, digits = 0) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
const date = (value: unknown) => value ? String(value).slice(0, 10) : '-';
const label = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase());

const columns: Record<string, string[]> = {
  loans: ['ticket_no', 'customer_name', 'loan_amount', 'status', 'interest_rate', 'overdue_interest_rate', 'issue_date', 'renew_date', 'expire_date', 'total_gold_weight'],
  overdue: ['ticket_no', 'customer_name', 'phone', 'loan_amount', 'expire_date', 'days_overdue', 'interest_rate', 'overdue_interest_rate', 'status'],
  renewals: ['renewed_at', 'ticket_no', 'customer_name', 'old_expire_date', 'new_expire_date', 'new_duration_months', 'payment_amount', 'interest_paid', 'principal_reduction'],
  payments: ['payment_date', 'ticket_no', 'customer_name', 'payment_type', 'amount', 'remarks'],
  interest: ['ticket_no', 'customer_name', 'status', 'loan_amount', 'interest_rate', 'expire_date'],
  customers: ['name', 'nic', 'phone', 'address', 'job', 'created_at'],
  inventory: ['ticket_no', 'customer_name', 'article_type', 'description', 'status', 'quantity', 'total_weight', 'gold_weight', 'carat', 'estimated_value'],
  operations: ['created_at', 'action', 'entity_type', 'entity_id', 'details'],
  repawning: ['ticket_no', 'customer_name', 'payment_amount', 'renewed_at', 'new_expire_date', 'principal_reduction', 'remarks'],
  cash: ['id', 'transaction_type', 'description', 'amount', 'balance_after', 'transaction_date', 'created_at'],
};

const displayValue = (key: string, value: unknown) => {
  if (value === null || value === undefined || value === '') return '-';
  if (key.includes('date') || key.endsWith('_at')) return date(value);
  if (['loan_amount', 'payment_amount', 'amount', 'interest_paid', 'principal_reduction', 'estimated_value', 'balance_after'].includes(key)) return money(value);
  if (['interest_rate', 'overdue_interest_rate'].includes(key)) return number(value, 2);
  if (['gold_weight', 'total_gold_weight', 'total_weight'].includes(key)) return number(value, 3);
  return String(value);
};

const ClientSystemReports: React.FC<{ darkMode: boolean }> = () => {
  const { subscriptionId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportData | null>(null);
  const [activeTab, setActiveTab] = useState<string>('analytics');
  const [section, setSection] = useState<'reports' | 'cash'>('reports');
  const [cashTab, setCashTab] = useState<'overview' | 'transactions' | 'owner'>('overview');
  const [from, setFrom] = useState(() => new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateField, setDateField] = useState('issue');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    const token = localStorage.getItem('token');
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ from, to, dateField });
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/subscriptions/${subscriptionId}/reports?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load reports');
      setReport(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load reports');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [subscriptionId]);

  const summary = report?.summary || {};
  const loans = report?.datasets?.loans || [];
  const activeLoans = loans.filter(row => ['active', 'renewed', 'repawned'].includes(String(row.status).toLowerCase()));
  const overdue = report?.datasets?.overdue || [];
  const totalIssued = loans.reduce((total, row) => total + Number(row.loan_amount || 0), 0);
  const averageTicket = loans.length ? totalIssued / loans.length : 0;
  const chart = useMemo(() => {
    const values = { Active: 0, Redeemed: 0, Forfeited: 0 } as Record<string, number>;
    loans.forEach(row => { const status = String(row.status || '').toLowerCase(); if (status === 'active' || status === 'renewed' || status === 'repawned') values.Active += 1; else if (status === 'redeemed') values.Redeemed += 1; else if (status === 'forfeited') values.Forfeited += 1; });
    return Object.entries(values);
  }, [loans]);
  const monthly = useMemo(() => {
    const values: Record<string, number> = {};
    loans.forEach(row => { const month = date(row.issue_date).slice(0, 7); if (month !== '-') values[month] = (values[month] || 0) + 1; });
    return Object.entries(values).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
  }, [loans]);

  const exportReport = () => {
    const rows = section === 'cash' ? report?.datasets?.cash || [] : report?.datasets?.[activeTab] || [];
    if (!rows.length) return;
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(','), ...rows.map(row => keys.map(key => JSON.stringify(row[key] ?? '')).join(','))].join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); link.download = `${section === 'cash' ? 'cash-flow' : activeTab}-report-${from}-${to}.csv`; link.click(); URL.revokeObjectURL(link.href);
  };

  const card = (title: string, value: React.ReactNode, tone = 'navy') => <div className="report-kpi"><p>{title}</p><strong className={`tone-${tone}`}>{value}</strong></div>;
  const renderTable = (key: string, data = report?.datasets?.[key] || []) => {
    const tableColumns = columns[key] || [];
    return <div className="report-table-wrap"><table className="report-table"><thead><tr>{tableColumns.map(column => <th key={column}>{label(column)}</th>)}</tr></thead><tbody>{data.map((row, index) => <tr key={`${key}-${index}`}>{tableColumns.map(column => <td key={column}>{displayValue(column, column === 'days_overdue' ? Math.max(0, Math.floor((Date.now() - new Date(String(row.expire_date)).getTime()) / 86400000)) : row[column])}</td>)}</tr>)}</tbody></table>{!data.length && <div className="empty-report">No records found for this report.</div>}</div>;
  };

  const reportCards = (key: string) => {
    if (key === 'analytics') return [card('Filtered Loans', loans.length), card('Total Issued', money(totalIssued), 'blue'), card('Average Ticket', money(averageTicket), 'blue'), card('Active', activeLoans.length, 'teal'), card('Redeemed', summary.redeemedLoans, 'orange'), card('Forfeited', summary.forfeitedLoans, 'red')];
    if (key === 'summary') return [card('Total Loans', summary.totalLoans), card('Active Loans', summary.activeLoans, 'blue'), card('Redeemed Loans', summary.redeemedLoans, 'teal'), card('Overdue Loans', summary.overdueLoans, 'red'), card('Total Customers', summary.totalCustomers, 'blue'), card('Active Portfolio', money(activeLoans.reduce((total, row) => total + Number(row.loan_amount || 0), 0)), 'orange'), card('Total Payments Collected', money(summary.totalCollected), 'teal'), card('Total Renewals', summary.totalRenewals, 'blue'), card('Total Gold Weight (g)', number(summary.totalGoldWeight, 3), 'orange')];
    if (key === 'loans') return [card('Total Loan Records', loans.length), card('Total Principal Issued', money(totalIssued), 'blue'), card('Average Ticket Size', money(averageTicket), 'blue'), card('Active Principal Exposure', money(activeLoans.reduce((total, row) => total + Number(row.loan_amount || 0), 0)), 'orange')];
    if (key === 'overdue') { const days = overdue.map(row => Math.max(0, Math.floor((Date.now() - new Date(String(row.expire_date)).getTime()) / 86400000))); return [card('Overdue Accounts', overdue.length, 'red'), card('Overdue Principal', money(overdue.reduce((total, row) => total + Number(row.loan_amount || 0), 0)), 'orange'), card('Avg Overdue Days', number(days.length ? days.reduce((a, b) => a + b, 0) / days.length : 0, 1), 'blue'), card('Max Overdue Days', Math.max(0, ...days), 'red')]; }
    if (key === 'renewals') return [card('Renewal Transactions', report?.datasets?.renewals?.length || 0, 'blue'), card('Renewal Payments', money((report?.datasets?.renewals || []).reduce((total, row) => total + Number(row.payment_amount || 0), 0)), 'teal'), card('Interest Paid', money((report?.datasets?.renewals || []).reduce((total, row) => total + Number(row.interest_paid || 0), 0)), 'blue'), card('Principal Reduction', money((report?.datasets?.renewals || []).reduce((total, row) => total + Number(row.principal_reduction || 0), 0)), 'blue')];
    if (key === 'payments') return [card('Payment Entries', report?.datasets?.payments?.length || 0), card('Total Collected', money(summary.totalCollected), 'teal'), card('Average Payment', money((summary.totalCollected || 0) / Math.max(1, report?.datasets?.payments?.length || 0)), 'blue'), card('Interest Collections', money((report?.datasets?.payments || []).filter(row => row.payment_type === 'interest').reduce((total, row) => total + Number(row.amount || 0), 0)), 'blue')];
    if (key === 'customers') return [card('Total Customers', report?.datasets?.customers?.length || 0, 'blue'), card('Active Borrowers', activeLoans.length, 'blue'), card('Total Active Exposure', money(activeLoans.reduce((total, row) => total + Number(row.loan_amount || 0), 0)), 'orange'), card('Top Customer Exposure', money(Math.max(0, ...activeLoans.map(row => Number(row.loan_amount || 0)))), 'red')];
    if (key === 'inventory') return [card('Active Item Entries', (report?.datasets?.inventory || []).filter(row => row.status === 'active').length, 'blue'), card('Total Gold Weight (g)', number(summary.totalGoldWeight, 3), 'orange'), card('Total Item Weight (g)', number((report?.datasets?.inventory || []).reduce((total, row) => total + Number(row.total_weight || 0), 0), 3), 'blue'), card('Total Estimated Value', money((report?.datasets?.inventory || []).reduce((total, row) => total + Number(row.estimated_value || 0), 0)), 'blue')];
    return [];
  };

  const renderAnalytics = () => <><div className="report-controls compact"><label>Period<select defaultValue="90d"><option>7d</option><option>30d</option><option>90d</option><option>365d</option><option>all</option></select></label><label>Status<select defaultValue="all"><option>all</option><option>active</option><option>redeemed</option><option>forfeited</option></select></label><label>Min Amount<input type="number" defaultValue="0" /></label><button className="primary-button" onClick={load}>Apply Filters</button><button className="soft-button" onClick={load}>Reset</button></div><div className="kpi-grid analytics-kpis">{reportCards('analytics')}</div><div className="chart-grid"><BarChart title="Status Distribution" values={chart} color="#4059d8" /><BarChart title="Loan Issuance Trend (Monthly)" values={monthly} color="#18b5a8" /></div><div className="insight-box"><strong>Suggestions &amp; Insights</strong><p>• {overdue.length ? 'Overdue loans need attention. Review collection and renewal activity.' : 'Portfolio mix looks balanced for current filters. Keep tracking overdue and forfeited trends weekly.'}</p></div>{renderTable('loans')}</>;

  const renderCash = () => {
    const cashSummary = report?.datasets?.cashSummary || {};
    const cashRows = report?.datasets?.cash || [];
    const ownerRows = cashRows.filter(row => ['owner_deposit', 'owner_withdrawal'].includes(row.transaction_type));
    const visibleRows = cashTab === 'owner' ? ownerRows : cashTab === 'transactions' ? cashRows : cashRows.filter(row => date(row.transaction_date) === to);
    return <div className="cash-flow"><div className="cash-heading"><div><Wallet size={30} /><h2>Cash Management</h2></div><strong>Balance: {money(cashSummary.current_balance)}</strong></div><div className="cash-actions"><button className="primary-button">◉ Record Opening Balance</button><button className="dark-button">▣ Owner Adds Money</button><button className="danger-button">▣ Owner Takes Money</button><button className="soft-button export-button" onClick={exportReport}><Download size={15} /> Export Report</button></div><div className="cash-kpis">{card('Opening Balance', money(cashRows.find(row => row.transaction_type === 'opening_balance')?.amount), 'navy')}{card('Total In Today', money(cashSummary.total_in), 'teal')}{card('Total Out Today', money(cashSummary.total_out), 'red')}</div><div className="cash-tabs">{[['overview', '▣ Day Overview'], ['transactions', '▤ All Transactions'], ['owner', '♙ Owner Transactions']].map(([key, text]) => <button key={key} className={cashTab === key ? 'selected' : ''} onClick={() => setCashTab(key as typeof cashTab)}>{text}</button>)}</div><h3 className="section-title"><ClipboardList size={18} /> {cashTab === 'overview' ? `Today's Transactions (${visibleRows.length})` : cashTab === 'owner' ? 'Owner Transaction History' : 'All Transactions'}</h3>{renderTable('cash', visibleRows)}</div>;
  };

  if (loading && !report) return <div className="reports-loading">Loading system reports...</div>;
  return <main className="reports-page"><div className="reports-header"><div><button className="back-link" onClick={() => navigate('/client-dashboard')}><ArrowLeft size={16} /> Client Dashboard</button><h1>Reports</h1></div><span>{new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span></div><div className="reports-layout"><aside className="reports-sidebar"><div className="sidebar-label">WORKSPACE</div><button className={section === 'reports' ? 'active' : ''} onClick={() => setSection('reports')}><BarChart3 size={17} /> Analytics</button><button className={section === 'cash' ? 'active' : ''} onClick={() => setSection('cash')}><Wallet size={17} /> Cash Flow</button><div className="sidebar-divider" /><button onClick={load}><RefreshCw size={17} /> Refresh Data</button><button onClick={exportReport}><FileSpreadsheet size={17} /> Export CSV</button></aside><section className="reports-main">{error && <div className="error-box">{error}</div>}<div className="report-filter"><div><strong>Filter By:</strong><select value={dateField} onChange={event => setDateField(event.target.value)}><option value="issue">Issue Date</option><option value="redeem">Redeem Date</option><option value="forfeited">Forfeited Date</option><option value="repawned">Repawned Date</option><option value="restocked">Restocked Date</option><option value="created">Created Date</option></select></div><label><strong>From:</strong><input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label><strong>To:</strong><input type="date" value={to} onChange={event => setTo(event.target.value)} /></label><span className="format-hint">Format: YYYY-MM-DD</span><button className="primary-button" onClick={load}><CalendarDays size={15} /> Apply Range</button><button className="soft-button" onClick={() => { const end = new Date(); setTo(end.toISOString().slice(0, 10)); setFrom(new Date(end.getTime() - 90 * 86400000).toISOString().slice(0, 10)); }}>Reset 90D</button><button className="soft-button" onClick={() => { const today = new Date().toISOString().slice(0, 10); setFrom(today); setTo(today); }}>Today</button></div>{section === 'reports' && <><div className="report-tabs">{reports.map(([key, text]) => <button key={key} className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key)}>{text}</button>)}</div><div className="report-panel"><div className="panel-heading"><div><p className="eyebrow">Gold Loan System</p><h2>{reports.find(([key]) => key === activeTab)?.[1]}{activeTab !== 'analytics' && activeTab !== 'summary' && activeTab !== 'loans' && <span className="heading-icon"><TrendingUp size={17} /></span>}</h2></div><span className="range-label">{from} to {to}</span></div>{activeTab === 'analytics' ? renderAnalytics() : <><div className="kpi-grid">{reportCards(activeTab)}</div>{activeTab === 'summary' ? <div className="summary-grid">{renderTable('loans')}</div> : renderTable(activeTab)}</>}</div></>}{section === 'cash' && <div className="report-panel cash-panel">{renderCash()}</div>}</section></div></main>;
};

const BarChart: React.FC<{ title: string; values: [string, number][]; color: string }> = ({ title, values, color }) => { const max = Math.max(...values.map(([, value]) => value), 1); return <div className="chart-card"><h3>{title}</h3><div className="bars">{values.map(([name, value]) => <div className="bar-column" key={name}><span>{value}</span><div className="bar" style={{ height: `${Math.max(3, value / max * 165)}px`, background: color }} /><small>{name}</small></div>)}</div></div>; };

export default ClientSystemReports;
