import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ReceiptData } from '@/types';
import { formatDate, formatTime } from '@/utils/format';

/**
 * Generate a professional receipt HTML for printing/sharing.
 * Layout:
 *   TOP    — Company name + Distributor phone
 *   MIDDLE — Shop name, Owner name, Address, Orderbooker name, Date/Time, Txn ID
 *   BOTTOM — Opening Balance, Payment, Remaining Balance
 */
export function generateReceiptHTML(receipt: ReceiptData): string {
  const dateStr = formatDate(receipt.date);
  const timeStr = formatTime(receipt.date);
  const txnLabel = receipt.transactionId || 'Pending (offline)';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      background: #fff;
      color: #1a1a2e;
      padding: 0;
      width: 100%;
    }
    .receipt {
      max-width: 320px;
      margin: 0 auto;
      padding: 24px 20px 16px;
    }

    /* ── Header ─────────────────────────────── */
    .header {
      text-align: center;
      border-bottom: 2px solid #1a1a2e;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .company-name {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #1a1a2e;
      text-transform: uppercase;
    }
    .distributor-phone {
      font-size: 13px;
      color: #555;
      margin-top: 4px;
    }
    .distributor-phone span {
      font-weight: 600;
      color: #1a1a2e;
    }
    .receipt-title {
      display: inline-block;
      margin-top: 10px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #fff;
      background: #1a1a2e;
      padding: 3px 14px;
      border-radius: 3px;
    }

    /* ── Shop Details ───────────────────────── */
    .shop-section {
      margin-bottom: 14px;
      padding-bottom: 12px;
      border-bottom: 1px dashed #ccc;
    }
    .shop-name {
      font-size: 16px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 6px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      padding: 2px 0;
      color: #444;
    }
    .detail-row .label {
      color: #888;
      font-weight: 500;
      min-width: 110px;
    }
    .detail-row .value {
      font-weight: 600;
      color: #1a1a2e;
      text-align: right;
      flex: 1;
    }

    /* ── Balance Table ──────────────────────── */
    .balance-section {
      margin-bottom: 14px;
    }
    .balance-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      font-size: 13px;
    }
    .balance-row.total {
      border-top: 2px solid #1a1a2e;
      margin-top: 4px;
      padding-top: 10px;
    }
    .balance-row .b-label {
      color: #666;
      font-weight: 500;
    }
    .balance-row.total .b-label {
      color: #1a1a2e;
      font-weight: 700;
    }
    .balance-row .b-value {
      font-weight: 700;
      color: #1a1a2e;
    }
    .balance-row.total .b-value {
      font-size: 18px;
      color: #16a34a;
    }
    .balance-row.payment .b-value {
      color: #dc2626;
    }

    /* ── Footer ─────────────────────────────── */
    .footer {
      text-align: center;
      padding-top: 12px;
      border-top: 1px dashed #ccc;
      margin-top: 4px;
    }
    .footer-text {
      font-size: 10px;
      color: #999;
      line-height: 1.5;
    }
    .txn-id {
      font-size: 10px;
      color: #888;
      margin-top: 8px;
      word-break: break-all;
    }
    .thank-you {
      font-size: 12px;
      font-weight: 600;
      color: #1a1a2e;
      margin-top: 6px;
    }
    .urdu-text {
      font-size: 12px;
      color: #333;
      direction: rtl;
      text-align: right;
      line-height: 1.8;
      margin-top: 8px;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
      font-family: 'Noto Naskh Arabic', 'Arial', sans-serif;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- Header -->
    <div class="header">
      <div class="company-name">${receipt.companyName}</div>
      <div class="distributor-phone">Distributor Name: <span>${receipt.companyName}</span></div>
      <div class="distributor-phone">Distributor No: <span>${receipt.distributorPhone || 'N/A'}</span></div>
      <div class="receipt-title">Payment Receipt</div>
    </div>

    <!-- Shop Details -->
    <div class="shop-section">
      <div class="shop-name">${receipt.shopName}</div>
      <div class="detail-row">
        <span class="label">Owner</span>
        <span class="value">${receipt.ownerName || 'N/A'}</span>
      </div>
      <div class="detail-row">
        <span class="label">Address</span>
        <span class="value">${receipt.address || 'N/A'}</span>
      </div>
      ${receipt.shopPhone ? `<div class="detail-row">
        <span class="label">Shop Phone</span>
        <span class="value">${receipt.shopPhone}</span>
      </div>` : ''}
      <div class="detail-row">
        <span class="label">Orderbooker</span>
        <span class="value">${receipt.orderbookerName}</span>
      </div>
      <div class="detail-row">
        <span class="label">Date / Time</span>
        <span class="value">${dateStr} · ${timeStr}</span>
      </div>
    </div>

    <!-- Balance Details -->
    <div class="balance-section">
      <div class="balance-row">
        <span class="b-label">Opening Balance</span>
        <span class="b-value">PKR ${receipt.openingBalance.toLocaleString('en-PK')}</span>
      </div>
      <div class="balance-row payment">
        <span class="b-label">Payment Received</span>
        <span class="b-value">- PKR ${receipt.paymentAmount.toLocaleString('en-PK')}</span>
      </div>
      <div class="balance-row total">
        <span class="b-label">Remaining Balance</span>
        <span class="b-value">PKR ${receipt.remainingBalance.toLocaleString('en-PK')}</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="thank-you">Thank you for your Payment!</div>
      <div class="urdu-text">
        جب تک آپ کا کریڈٹ لیمٹ 15 ہزار روپے تک ہو گا آپ ہر دن 5 روپے کا سود دے گے<br/>
        جب آپ کا کریڈٹ لیمٹ 15 ہزار روپے سے زیادہ ہو گا تو
      </div>
      <div class="txn-id">Txn: ${txnLabel}</div>
      <div class="footer-text">
        This is a system-generated receipt from ${receipt.companyName}.<br/>
        Distributor: ${receipt.companyName} | Contact: ${receipt.distributorPhone || 'N/A'}
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate receipt as a PDF using expo-print and return the URI.
 */
export async function generateReceiptPDF(receipt: ReceiptData): Promise<string> {
  const html = generateReceiptHTML(receipt);
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

/**
 * Print the receipt directly using the system print dialog.
 */
export async function printReceipt(receipt: ReceiptData): Promise<void> {
  const html = generateReceiptHTML(receipt);
  await Print.printAsync({ html });
}

/**
 * Generate PDF and open the system share sheet (WhatsApp, Email, etc.)
 */
export async function shareReceipt(receipt: ReceiptData): Promise<void> {
  const uri = await generateReceiptPDF(receipt);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Receipt - ${receipt.shopName}`,
      UTI: 'com.adobe.pdf',
    });
  }
}

/**
 * Share receipt text via WhatsApp (uses wa.me deep link).
 * Falls back to system share if WhatsApp not installed.
 */
export async function shareReceiptWhatsApp(receipt: ReceiptData): Promise<void> {
  const dateStr = formatDate(receipt.date);
  const timeStr = formatTime(receipt.date);

  const text = [
    `*${receipt.companyName}*`,
    `Distributor Name: ${receipt.companyName}`,
    `Distributor No: ${receipt.distributorPhone || 'N/A'}`,
    `━━━━━━━━━━━━━━━━━━`,
    `*Payment Receipt*`,
    ``,
    `Shop: ${receipt.shopName}`,
    `Owner: ${receipt.ownerName || 'N/A'}`,
    `Address: ${receipt.address || 'N/A'}`,
    `Orderbooker: ${receipt.orderbookerName}`,
    `Date: ${dateStr} · ${timeStr}`,
    `━━━━━━━━━━━━━━━━━━`,
    `Opening Balance: PKR ${receipt.openingBalance.toLocaleString('en-PK')}`,
    `Payment: PKR ${receipt.paymentAmount.toLocaleString('en-PK')}`,
    `*Remaining: PKR ${receipt.remainingBalance.toLocaleString('en-PK')}*`,
    `━━━━━━━━━━━━━━━━━━`,
    `Txn: ${receipt.transactionId || 'Pending (offline)'}`,
    ``,
    `Thank you for your payment!`,
  ].join('\n');

  // Try WhatsApp deep link
  const encoded = encodeURIComponent(text);
  const whatsappUrl = `whatsapp://send?text=${encoded}`;

  try {
    const { Linking } = require('react-native');
    const supported = await Linking.canOpenURL(whatsappUrl);
    if (supported) {
      await Linking.openURL(whatsappUrl);
      return;
    }
  } catch {
    // WhatsApp not installed, fall through to system share
  }

  // Fallback: share as PDF via system share sheet
  await shareReceipt(receipt);
}
