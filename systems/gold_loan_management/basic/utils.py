"""
Gold Loan System - Utility Functions
"""

from datetime import datetime, timedelta


def format_currency(amount):
    """Format amount as Rs. with commas."""
    try:
        amount = float(amount)
        return f"Rs. {amount:,.2f}"
    except (ValueError, TypeError):
        return "Rs. 0.00"


def format_date(date_str, fmt='%Y-%m-%d'):
    """Format date string for display."""
    try:
        if date_str is None:
            return ''
        if isinstance(date_str, str):
            if not date_str.strip():
                return ''
            dt = datetime.strptime(date_str.split(' ')[0], '%Y-%m-%d')
        else:
            dt = date_str
        if dt is None:
            return ''
        return dt.strftime(fmt)
    except (ValueError, TypeError, AttributeError):
        return date_str or ''


def calculate_market_value(gold_weight, rate_per_8g):
    """Calculate market value using a rate quoted per 8 grams (1 poun)."""
    per_gram_rate = float(rate_per_8g) / 8.0
    return round(float(gold_weight) * per_gram_rate, 2)


def calculate_assessed_value(market_value, assessed_percentage):
    """Calculate assessed value = market value × assessed percentage / 100."""
    return round(float(market_value) * float(assessed_percentage) / 100.0, 2)


def calculate_interest(principal, rate_per_month, months):
    """Calculate simple interest."""
    return round(float(principal) * float(rate_per_month) / 100.0 * float(months), 2)


def calculate_overdue_days(expire_date_str):
    """Calculate number of overdue days."""
    try:
        expire = datetime.strptime(expire_date_str.split(' ')[0], '%Y-%m-%d')
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        diff = (today - expire).days
        return max(0, diff)
    except (ValueError, TypeError):
        return 0


def calculate_overdue_interest(principal, overdue_rate_monthly, overdue_days):
    """Calculate overdue interest based on days."""
    daily_rate = float(overdue_rate_monthly) / 30.0
    return round(float(principal) * daily_rate / 100.0 * float(overdue_days), 2)


def calculate_total_payable(loan_amount, interest_rate, duration_months, overdue_rate, expire_date_str, issue_date_str, max_interest_months=3):
    """
    Calculate total amount payable for redemption using daily interest.
    Normal interest is charged from issue date until today.
    Once loan is overdue, overdue period uses full monthly rate: base_rate + overdue_rate.
    """
    try:
        issue = datetime.strptime(issue_date_str.split(' ')[0], '%Y-%m-%d')
        expire = datetime.strptime(expire_date_str.split(' ')[0], '%Y-%m-%d')
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Days for normal interest (from issue until today)
        total_days = max(0, (today - issue).days)
        # Days for overdue interest (from expire until today)
        overdue_days = max(0, (today - expire).days)
        
        # Monthly rates divided by 30 to get daily rates
        daily_rate = float(interest_rate) / 30.0
        
        # Keep these values for reporting/compatibility with existing callers.
        overdue_months = overdue_days / 30.0 if overdue_days > 0 else 0
        effective_overdue_months = 1 if overdue_days > 0 else 0
        overdue_daily_rate = float(overdue_rate) / 30.0
        
        # Interest calculation:
        # - Days not yet overdue: only base interest rate applies
        # - Days overdue: base rate + capped overdue rate
        if overdue_days <= 0:
            # Loan not yet overdue
            interest = round(float(loan_amount) * (daily_rate / 100.0) * total_days, 2)
            overdue_base_interest = 0
            overdue_penalty_interest = 0
            overdue_interest = 0
        else:
            # Core (until expiry): base rate only
            days_until_expire = max(0, (expire - issue).days)
            interest = round(float(loan_amount) * (daily_rate / 100.0) * min(total_days, days_until_expire), 2)
            
            # Overdue portion split into base interest + overdue penalty interest.
            overdue_base_interest = round(float(loan_amount) * (daily_rate / 100.0) * overdue_days, 2)
            overdue_penalty_interest = round(float(loan_amount) * (overdue_daily_rate / 100.0) * overdue_days, 2)
            overdue_interest = round(overdue_base_interest + overdue_penalty_interest, 2)
        
        total = float(loan_amount) + interest + overdue_interest
        
        return {
            'loan_amount': float(loan_amount),
            'interest': interest,
            'overdue_days': overdue_days,
            'overdue_base_interest': overdue_base_interest,
            'overdue_penalty_interest': overdue_penalty_interest,
            'overdue_interest': overdue_interest,
            'total': round(total, 2),
            'days_passed': total_days,
            'overdue_months': round(overdue_months, 2),
            'effective_overdue_months': round(effective_overdue_months, 2)
        }
    except Exception:
        return {
            'loan_amount': float(loan_amount),
            'interest': 0,
            'overdue_days': 0,
            'overdue_base_interest': 0,
            'overdue_penalty_interest': 0,
            'overdue_interest': 0,
            'total': float(loan_amount),
            'days_passed': 0
        }


def get_expire_date(issue_date_str, months):
    """Calculate expire date from issue date + months."""
    try:
        issue = datetime.strptime(issue_date_str, '%Y-%m-%d')
        expire = issue + timedelta(days=int(months) * 30)
        return expire.strftime('%Y-%m-%d')
    except (ValueError, TypeError):
        return ''


def is_overdue(expire_date_str):
    """Check if a loan is overdue."""
    return calculate_overdue_days(expire_date_str) > 0


def get_status_color(status, expire_date_str=''):
    """Return color for loan status."""
    if status == 'redeemed':
        return '#14b8a6'
    elif status == 'forfeited':
        return '#ef4444'
    elif status == 'active' and expire_date_str and is_overdue(expire_date_str):
        return '#f97316'
    elif status == 'active':
        return '#415bd8'
    elif status == 'renewed':
        return '#60a5fa'
    return '#64748b'


def get_status_text(status, expire_date_str=''):
    """Return display text for loan status."""
    if status == 'active' and expire_date_str and is_overdue(expire_date_str):
        return 'OVERDUE'
    return status.upper()


ARTICLE_TYPES = [
    'Chain', 'Ring', 'Bracelet', 'Necklace', 'Earrings', 'Pendant',
    'Bangle', 'Anklet', 'Brooch', 'Coin', 'Bar', 'Other'
]

CARAT_OPTIONS = [16, 17, 18, 19, 20, 21, 22, 23, 24]
