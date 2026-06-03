"""Text.lk SMS gateway helpers for the gold loan basic package."""

import re
from datetime import datetime

import requests

from database import (
    get_customer,
    get_latest_loan_for_customer,
    get_loan,
    get_setting,
    get_sms_settings,
    log_sms_message,
)


TEXTLK_DEFAULT_URL = 'https://app.text.lk/api/v3/sms/send'


def normalize_phone_number(phone, default_country_code='94'):
    digits = re.sub(r'\D+', '', str(phone or ''))
    if not digits:
        return ''

    if digits.startswith('00'):
        digits = digits[2:]

    if digits.startswith('+'):
        digits = digits[1:]

    if digits.startswith('0') and len(digits) >= 10:
        digits = default_country_code + digits[1:]
    elif digits.startswith('7') and len(digits) == 9:
        digits = default_country_code + digits

    return digits


def render_template(text, context=None):
    context = context or {}
    template = str(text or '')

    def replace(match):
        key = match.group(1).strip()
        value = context.get(key, '')
        return '' if value is None else str(value)

    return re.sub(r'\{\{\s*([a-zA-Z0-9_]+)\s*\}\}', replace, template)


def build_sms_context(customer=None, loan=None, message=''):
    customer = customer or {}
    loan = loan or {}

    # Auto-resolve latest customer loan so loan placeholders work in custom/promotion SMS.
    if not loan and customer and customer.get('id'):
        resolved = get_latest_loan_for_customer(customer.get('id'))
        if resolved:
            loan = resolved

    def _to_float(value):
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0

    company_name = get_setting('company_name', 'Gold Loan Center')
    company_phone = get_setting('company_phone', '')
    company_address = get_setting('company_address', '')

    context = {
        'company_name': company_name,
        'company_phone': company_phone,
        'company_address': company_address,
        'message': message,
        'date': datetime.now().strftime('%Y-%m-%d'),
        'time': datetime.now().strftime('%H:%M'),
        'loan_status': loan.get('status', ''),
        'ticket_no': '',
        'loan_amount': '',
        'market_value': '',
        'assessed_value': '',
        'interest_rate': '',
        'duration': '',
        'issue_date': '',
        'renew_date': '',
        'expire_date': '',
        'total_payable': '',
    }

    if customer:
        context.update({
            'customer_id': customer.get('id', ''),
            'customer_name': customer.get('name', ''),
            'customer_nic': customer.get('nic', ''),
            'customer_phone': customer.get('phone', ''),
            'customer_address': customer.get('address', ''),
            'customer_job': customer.get('job', ''),
            'customer_marital_status': customer.get('marital_status', ''),
            'customer_language': customer.get('language', ''),
            'birthday_date': customer.get('birthday', ''),
        })

    if loan:
        principal = _to_float(loan.get('loan_amount'))
        monthly_rate_pct = _to_float(loan.get('interest_rate'))
        duration_months = _to_float(loan.get('duration_months'))
        # Simple payable projection used in templates: principal + normal interest for duration.
        total_payable = principal + (principal * (monthly_rate_pct / 100.0) * duration_months)

        context.update({
            'loan_id': loan.get('id', ''),
            'ticket_no': loan.get('ticket_no', ''),
            'loan_amount': loan.get('loan_amount', ''),
            'market_value': loan.get('market_value', ''),
            'assessed_value': loan.get('assessed_value', ''),
            'interest_rate': loan.get('interest_rate', ''),
            'duration': loan.get('duration_months', ''),
            'issue_date': loan.get('issue_date', ''),
            'renew_date': loan.get('renew_date', ''),
            'expire_date': loan.get('expire_date', ''),
            'total_payable': f"{total_payable:.2f}",
            'customer_name': loan.get('customer_name', context.get('customer_name', '')),
            'customer_nic': loan.get('customer_nic', context.get('customer_nic', '')),
            'customer_phone': loan.get('customer_phone', context.get('customer_phone', '')),
        })

    return context


def send_sms(recipient, message, *, customer=None, loan=None, category='custom', sent_by=None, db_path=None):
    settings = get_sms_settings(db_path)
    sender_id = (settings.get('sms_sender_id') or '').strip()
    token = (settings.get('sms_gateway_token') or '').strip()
    url = (settings.get('sms_gateway_base_url') or TEXTLK_DEFAULT_URL).strip() or TEXTLK_DEFAULT_URL

    recipient = normalize_phone_number(recipient, settings.get('sms_default_country_code', '94'))
    if not recipient:
        return False, 'A valid recipient phone number is required.', None

    if not token:
        return False, 'SMS gateway token is not configured.', None
    if not sender_id:
        return False, 'SMS sender ID is not configured.', None

    payload = {
        'recipient': recipient,
        'sender_id': sender_id,
        'type': 'plain',
        'message': str(message or '').strip(),
    }

    if not payload['message']:
        return False, 'SMS message cannot be empty.', None

    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=25)
        try:
            data = response.json()
        except Exception:
            data = {'status': response.ok, 'message': response.text}

        ok = bool(response.ok and data.get('status', True))
        message_text = data.get('message') or ('SMS sent successfully.' if ok else 'SMS sending failed.')
        provider_message_id = ''
        if isinstance(data.get('data'), dict):
            provider_message_id = str(data['data'].get('sms_id', '') or '')

        log_sms_message(
            recipient=recipient,
            recipients=recipient,
            message=payload['message'],
            category=category,
            status='sent' if ok else 'failed',
            provider='text.lk',
            provider_message_id=provider_message_id,
            response=data,
            customer_id=(customer or {}).get('id'),
            loan_id=(loan or {}).get('id'),
            sent_by=sent_by,
            db_path=db_path,
        )
        return ok, message_text, data
    except Exception as exc:
        log_sms_message(
            recipient=recipient,
            recipients=recipient,
            message=payload['message'],
            category=category,
            status='failed',
            provider='text.lk',
            provider_message_id='',
            response={'error': str(exc)},
            customer_id=(customer or {}).get('id'),
            loan_id=(loan or {}).get('id'),
            sent_by=sent_by,
            db_path=db_path,
        )
        return False, f'Unable to send SMS: {exc}', None


def send_sms_to_customer(customer_id, message, *, category='custom', sent_by=None, db_path=None):
    customer = get_customer(customer_id, db_path)
    if not customer:
        return False, 'Customer not found.', None
    return send_sms(customer.get('phone', ''), message, customer=customer, category=category, sent_by=sent_by, db_path=db_path)


def send_sms_to_loan(loan_id, message, *, category='order_status', sent_by=None, db_path=None):
    loan = get_loan(loan_id, db_path)
    if not loan:
        return False, 'Loan not found.', None
    customer = {
        'id': loan.get('customer_id'),
        'name': loan.get('customer_name', ''),
        'nic': loan.get('customer_nic', ''),
        'phone': loan.get('customer_phone', ''),
        'address': loan.get('customer_address', ''),
        'job': loan.get('customer_job', ''),
        'marital_status': loan.get('customer_marital_status', ''),
        'language': loan.get('customer_language', ''),
    }
    return send_sms(loan.get('customer_phone', ''), message, customer=customer, loan=loan, category=category, sent_by=sent_by, db_path=db_path)