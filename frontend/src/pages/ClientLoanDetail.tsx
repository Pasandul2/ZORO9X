import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Gem, Landmark, UserRound } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

type Loan = Record<string, any>;
type Item = Record<string, any>;

const money = (value: unknown) => `Rs. ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (value: unknown) => value ? String(value).slice(0, 10) : '-';
const valueOrDash = (value: unknown) => value === null || value === undefined || value === '' ? '-' : String(value);

const daysBetween = (from: unknown, to = new Date()) => {
  const start = new Date(date(from)).getTime();
  const end = to instanceof Date ? to.getTime() : new Date(date(to)).getTime();
  return Number.isFinite(start) ? Math.max(0, Math.floor((end - start) / 86400000)) : 0;
};

const DetailCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className = '' }) => (
  <section className={`loan-detail-card ${className}`}>
    <h2>{icon}{title}</h2>
    {children}
  </section>
);

const DetailRows: React.FC<{ rows: [string, React.ReactNode][] }> = ({ rows }) => (
  <div className="loan-detail-rows">
    {rows.map(([label, value]) => <div className="loan-detail-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}
  </div>
);

const ClientLoanDetail: React.FC = () => {
  const { subscriptionId, loanId } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/subscriptions/${subscriptionId}/reports/loans/${loanId}`, {
          headers: { Authorization: `Bearer ${token || ''}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to load loan details');
        setLoan(data.loan);
        setItems(data.items || []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load loan details');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [loanId, subscriptionId]);

  const financial = useMemo(() => {
    if (!loan) return null;
    const principal = Number(loan.interest_principal_amount || loan.loan_amount || 0);
    const totalDays = daysBetween(loan.renew_date || loan.issue_date);
    const overdueDays = daysBetween(loan.expire_date);
    const normalDays = Math.max(0, totalDays - overdueDays);
    const interest = principal * Number(loan.interest_rate || 0) / 30 / 100 * normalDays;
    const overdueInterest = principal * Number(loan.overdue_interest_rate || 0) / 30 / 100 * overdueDays;
    const assessedPercent = Number(loan.market_value) ? Number(loan.assessed_value) / Number(loan.market_value) * 100 : 0;
    return { principal, interest, overdueInterest, overdueDays, assessedPercent, total: principal + interest + overdueInterest };
  }, [loan]);

  if (loading) return <div className="reports-loading">Loading loan details...</div>;
  if (error || !loan || !financial) return <main className="loan-detail-page"><div className="error-box">{error || 'Loan not found'}</div></main>;

  const customerRows: [string, React.ReactNode][] = [
    ['Name', valueOrDash(loan.customer_name)], ['NIC', valueOrDash(loan.customer_nic)],
    ['Phone', valueOrDash(loan.customer_phone)], ['Birthday', valueOrDash(loan.customer_birthday)],
    ['Job', valueOrDash(loan.customer_job)], ['Married Status', valueOrDash(loan.customer_marital_status)],
    ['Language', valueOrDash(loan.customer_language)], ['Address', valueOrDash(loan.customer_address)],
    ['Purpose', valueOrDash(loan.purpose)], ['Another Bank Ticket', Number(loan.is_other_bank_ticket) ? 'Yes' : 'No'],
  ];
  const financialRows: [string, React.ReactNode][] = [
    ['Market Value', money(loan.market_value)], ['Assessed Value', money(loan.assessed_value)],
    ['Assessed %', `${financial.assessedPercent.toFixed(1)}%`], ['Advance Amount', money(loan.advance_amount || loan.loan_amount)],
    ['Interest Principal', money(financial.principal)], ['Interest Rate', `${Number(loan.interest_rate || 0).toFixed(2)}% / month`],
    ['Duration', `${valueOrDash(loan.duration_months)} month(s)`], ['Issue Date', date(loan.issue_date)],
    ['Renew Date', date(loan.renew_date)], ['Expire Date', date(loan.expire_date)],
    ['Total Weight', `${Number(loan.total_item_weight || 0).toFixed(3)} g`],
    ['Deduction Wt', `${(Number(loan.total_item_weight || 0) - Number(loan.total_gold_weight || 0)).toFixed(3)} g`],
    ['Gold Weight', `${Number(loan.total_gold_weight || 0).toFixed(3)} g`],
    ['Accrued Interest', money(financial.interest)], ['Overdue Days', financial.overdueDays],
    ['Overdue Interest', money(financial.overdueInterest)], ['Total Interest', money(financial.interest + financial.overdueInterest)],
  ];

  return <main className="loan-detail-page">
    <header className="loan-detail-header">
      <button className="back-link" onClick={() => navigate(`/client-dashboard/${subscriptionId}/reports`)}><ArrowLeft size={16} /> Back to Reports</button>
      <div><p className="eyebrow">Gold Loan System</p><h1>Loan: {loan.ticket_no}</h1></div>
      <span className="loan-detail-status">{String(loan.status || '').toUpperCase()}</span>
    </header>
    <div className="loan-detail-grid">
      <div>
        <DetailCard title="Customer" icon={<UserRound size={19} />}><DetailRows rows={customerRows} /></DetailCard>
        <DetailCard title={`Articles (${items.length} item(s))`} icon={<Gem size={19} />} className="article-card">
          {items.length ? items.map(item => <div className="article-detail" key={item.id}>
            <strong>{valueOrDash(item.article_type)} ({valueOrDash(item.carat)}K)</strong>
            {item.description && <span>{item.description}</span>}
            <small>Total: {Number(item.total_weight || 0).toFixed(3)} g | Deduct: {(Number(item.total_weight || 0) - Number(item.gold_weight || 0)).toFixed(3)} g | Gold: {Number(item.gold_weight || 0).toFixed(3)} g</small>
          </div>) : <p className="empty-report">No articles found.</p>}
        </DetailCard>
      </div>
      <DetailCard title="Financial Details" icon={<Landmark size={19} />} className="financial-card">
        <DetailRows rows={financialRows} />
        <div className="loan-total"><span>TOTAL PAYABLE</span><strong>{money(financial.total)}</strong></div>
      </DetailCard>
    </div>
  </main>;
};

export default ClientLoanDetail;
