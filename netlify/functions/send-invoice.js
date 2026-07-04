// netlify/functions/send-invoice.js
// MUHAMEDDISPO — Secure Resend Email Sender
// API key is stored as RESEND_API_KEY env variable in Netlify dashboard
// NEVER put the API key in frontend code.

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': 'https://www.muhameddispo.com',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const {
    orderId, customer_name, customer_email, customer_address,
    payment_method, cart_items, subtotal, customer_phone
  } = body;

  // Input validation
  if (!customer_email || !customer_name || !orderId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  // Build cart items HTML rows
  const itemRows = Array.isArray(cart_items)
    ? cart_items.map(item => `
        <tr>
          <td style="padding:10px 14px; border-bottom:1px solid #222; color:#fff;">${(item.name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}${item.optionLabel ? ` (${item.optionLabel})` : ''}</td>
          <td style="padding:10px 14px; border-bottom:1px solid #222; color:#aaa; text-align:center;">${item.qty || 1}</td>
          <td style="padding:10px 14px; border-bottom:1px solid #222; color:#c5b36f; text-align:right; font-weight:bold;">$${((item.price || 0) * (item.qty || 1)).toFixed(2)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="3" style="padding:14px; color:#aaa; text-align:center;">No items</td></tr>';

  const paymentLabel = {
    Bitcoin: 'Bitcoin',
    CashApp: 'CashApp',
    ApplePay: 'Apple Pay',
    Zelle: 'Zelle',
    Chime: 'Chime',
  }[payment_method] || payment_method;

  // Professional HTML Invoice
  const invoiceHtml = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>MUHAMEDDISPO Invoice #${orderId}</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#111;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a1a,#0a0a0a);padding:40px;text-align:center;border-bottom:2px solid #c5b36f;">
            <div style="font-size:11px;letter-spacing:4px;color:#c5b36f;text-transform:uppercase;margin-bottom:8px;">MUHAMEDDISPO</div>
            <div style="font-size:28px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:2px;">Order Confirmed</div>
            <div style="font-size:13px;color:#888;margin-top:8px;">Invoice #${orderId}</div>
          </td>
        </tr>
        <!-- Greeting -->
        <tr>
          <td style="padding:32px 40px 0;">
            <p style="color:#ccc;font-size:16px;line-height:1.7;margin:0;">
              Hi <strong style="color:#fff;">${(customer_name || '').replace(/</g, '&lt;')}</strong>,<br><br>
              Thank you for your order! We have received your request and noted your preferred payment method: <strong style="color:#c5b36f;">${paymentLabel}</strong>.<br><br>
              Our team will send you the complete payment details (wallet address / handle) via a follow-up email within the next few minutes. Once your payment is confirmed, we will process and ship your order promptly.
            </p>
          </td>
        </tr>
        <!-- Order Details -->
        <tr>
          <td style="padding:32px 40px 0;">
            <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c5b36f;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #2a2a2a;">Order Details</div>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <thead>
                <tr style="background:#1a1a1a;">
                  <th style="padding:10px 14px;text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#888;">Item</th>
                  <th style="padding:10px 14px;text-align:center;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#888;">Qty</th>
                  <th style="padding:10px 14px;text-align:right;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#888;">Price</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
              <tfoot>
                <tr style="background:#1a1a1a;">
                  <td colspan="2" style="padding:14px;font-size:15px;font-weight:bold;color:#fff;text-transform:uppercase;letter-spacing:1px;">Total</td>
                  <td style="padding:14px;font-size:18px;font-weight:900;color:#c5b36f;text-align:right;">$${parseFloat(subtotal || 0).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </td>
        </tr>
        <!-- Shipping Info -->
        <tr>
          <td style="padding:24px 40px 0;">
            <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c5b36f;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #2a2a2a;">Shipping To</div>
            <p style="color:#aaa;font-size:14px;line-height:1.8;margin:0;">${(customer_address || 'Not provided').replace(/</g, '&lt;')}</p>
            ${customer_phone ? `<p style="color:#666;font-size:12px;margin:6px 0 0;">📞 ${customer_phone.replace(/</g, '&lt;')}</p>` : ''}
          </td>
        </tr>
        <!-- Payment note -->
        <tr>
          <td style="padding:24px 40px;">
            <div style="background:rgba(197,179,111,0.07);border:1px solid rgba(197,179,111,0.25);border-radius:10px;padding:20px;">
              <div style="font-size:13px;font-weight:bold;color:#c5b36f;margin-bottom:8px;">⚡ Next Steps</div>
              <p style="color:#aaa;font-size:13px;line-height:1.7;margin:0;">
                Watch your inbox for our follow-up email with your <strong style="color:#fff;">${paymentLabel}</strong> payment details.<br>
                Questions? Email us at <a href="mailto:contact@muhameddispo.com" style="color:#c5b36f;">contact@muhameddispo.com</a>
              </p>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#0d0d0d;padding:24px 40px;text-align:center;border-top:1px solid #1a1a1a;">
            <div style="font-size:10px;letter-spacing:3px;color:#444;text-transform:uppercase;">MUHAMEDDISPO · Inhale Excellence</div>
            <div style="font-size:11px;color:#333;margin-top:6px;">© 2025 MUHAMEDDISPO. All rights reserved.</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set in environment variables');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Email service not configured' }) };
  }

  try {
    // Send invoice to customer
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MUHAMEDDISPO <contact@muhameddispo.com>',
        to: [customer_email],
        subject: `Your MUHAMEDDISPO Order #${orderId} — Invoice`,
        html: invoiceHtml,
      }),
    });

    // Notify site owner
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MUHAMEDDISPO Orders <contact@muhameddispo.com>',
        to: ['contact@muhameddispo.com'],
        subject: `🛒 New Order #${orderId} — ${customer_name} ($${parseFloat(subtotal || 0).toFixed(2)} via ${paymentLabel})`,
        html: `<p>New order received!</p><ul><li>Order ID: ${orderId}</li><li>Customer: ${customer_name}</li><li>Email: ${customer_email}</li><li>Payment: ${paymentLabel}</li><li>Total: $${parseFloat(subtotal || 0).toFixed(2)}</li><li>Address: ${customer_address}</li></ul>`,
      }),
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, orderId }) };

  } catch (err) {
    console.error('Resend API error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to send email' }) };
  }
};
