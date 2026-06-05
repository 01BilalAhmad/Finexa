import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ReceiptData } from '@/types';
import { formatDate, formatTime } from '@/utils/format';

/**
 * Generate a professional receipt HTML matching the reference design:
 * Royal blue background, white/teal/yellow text, icon circles, dark balance box.
 */
export function generateReceiptHTML(receipt: ReceiptData): string {
  const dateStr = formatDate(receipt.date);
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
      background: #3F3D9B;
      color: #fff;
      width: 100%;
    }
    .receipt {
      max-width: 340px;
      margin: 0 auto;
      padding: 24px 20px 20px;
    }

    /* ── Header ─────────────────────────────── */
    .header {
      text-align: center;
      padding-bottom: 16px;
    }
    .company-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .company-icon {
      font-size: 22px;
    }
    .company-name {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #fff;
    }
    .shop-name {
      font-size: 22px;
      font-weight: 700;
      color: #4ECDC4;
      margin-bottom: 2px;
    }
    .receipt-label {
      font-size: 14px;
      color: #fff;
      font-weight: 500;
      margin-bottom: 12px;
    }
    .dist-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.12);
      padding: 5px 14px;
      border-radius: 20px;
    }
    .dist-pill .icon { font-size: 14px; }
    .dist-pill .label {
      font-size: 13px;
      color: #B8B8D4;
    }
    .dist-pill .value {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
    }

    /* ── Divider ────────────────────────────── */
    .divider {
      height: 1px;
      background: rgba(255,255,255,0.15);
      margin: 0 0;
    }

    /* ── Shop Details ───────────────────────── */
    .details {
      padding: 14px 0 10px;
    }
    .detail-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 0;
    }
    .icon-circle {
      width: 26px;
      height: 26px;
      border-radius: 13px;
      background: rgba(255,255,255,0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }
    .detail-item .label {
      font-size: 13px;
      color: #B8B8D4;
      font-weight: 500;
      min-width: 90px;
    }
    .detail-item .value {
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      text-align: right;
      flex: 1;
    }

    /* ── Balance Box ────────────────────────── */
    .balance-box {
      margin: 10px 0;
      background: #2E2C7A;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.1);
      padding: 16px;
    }
    .bal-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      font-size: 14px;
    }
    .bal-row .b-label {
      color: #B8B8D4;
      font-weight: 500;
    }
    .bal-row .b-value {
      font-weight: 700;
      color: #fff;
    }
    .bal-row.payment .b-value {
      color: #4ECDC4;
      font-weight: 700;
    }
    .bal-row.total {
      border-top: 1px solid rgba(255,255,255,0.2);
      margin-top: 4px;
      padding-top: 10px;
    }
    .bal-row.total .b-label {
      color: #fff;
      font-weight: 700;
    }
    .bal-row.total .b-value {
      font-size: 22px;
      font-weight: 800;
      color: #FFD166;
    }

    /* ── Thank You ──────────────────────────── */
    .thank-you {
      text-align: center;
      padding: 10px 0;
    }
    .thank-you .icon { font-size: 18px; }
    .thank-you .text {
      font-size: 14px;
      font-weight: 600;
      color: #4ECDC4;
      display: inline;
      margin-left: 6px;
    }

    /* ── Urdu Footer ────────────────────────── */
    .urdu-section {
      padding: 8px 0 4px;
    }
    .urdu-1 {
      font-size: 12px;
      color: #fff;
      direction: rtl;
      text-align: right;
      line-height: 1.8;
      margin-bottom: 4px;
    }
    .urdu-2 {
      font-size: 12px;
      color: #fff;
      font-weight: 700;
      direction: rtl;
      text-align: right;
      line-height: 1.8;
    }

    /* ── Txn ID ─────────────────────────────── */
    .txn-id {
      font-size: 10px;
      color: #B8B8D4;
      text-align: center;
      margin-top: 6px;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- Header -->
    <div class="header">
      <div class="company-row">
        <span class="company-icon">&#127968;</span>
        <span class="company-name">${receipt.companyName}</span>
      </div>
      <div class="shop-name">${receipt.shopName}</div>
      <div class="receipt-label">Payment Receipt</div>
      <div class="dist-pill">
        <span class="icon">&#128222;</span>
        <span class="label">Distributor No:</span>
        <span class="value">${receipt.distributorPhone || 'N/A'}</span>
      </div>
    </div>

    <div class="divider"></div>

    <!-- Shop Details -->
    <div class="details">
      <div class="detail-item">
        <div class="icon-circle">&#127978;</div>
        <span class="label">Shop:</span>
        <span class="value">${receipt.shopName}</span>
      </div>
      <div class="detail-item">
        <div class="icon-circle">&#128205;</div>
        <span class="label">Address:</span>
        <span class="value">${receipt.address || 'N/A'}</span>
      </div>
      <div class="detail-item">
        <div class="icon-circle">&#128100;</div>
        <span class="label">Owner:</span>
        <span class="value">${receipt.ownerName || 'N/A'}</span>
      </div>
      <div class="detail-item">
        <div class="icon-circle">&#128197;</div>
        <span class="label">Date:</span>
        <span class="value">${dateStr}</span>
      </div>
      <div class="detail-item">
        <div class="icon-circle">&#127380;</div>
        <span class="label">Orderbooker:</span>
        <span class="value">${receipt.orderbookerName}</span>
      </div>
    </div>

    <!-- Balance Box -->
    <div class="balance-box">
      <div class="bal-row">
        <span class="b-label">Opening Balance</span>
        <span class="b-value">Rs. ${receipt.openingBalance.toLocaleString('en-PK')}</span>
      </div>
      <div class="bal-row payment">
        <span class="b-label">Payment Received</span>
        <span class="b-value">Rs. ${receipt.paymentAmount.toLocaleString('en-PK')}</span>
      </div>
      <div class="bal-row total">
        <span class="b-label">Remaining Balance</span>
        <span class="b-value">Rs. ${receipt.remainingBalance.toLocaleString('en-PK')}</span>
      </div>
    </div>

    <!-- Thank You -->
    <div class="thank-you">
      <span class="icon">&#9989;</span>
      <span class="text">Thank you for your Payment!</span>
    </div>

    <div class="divider"></div>

    <!-- Urdu Footer -->
    <div class="urdu-section">
      <div class="urdu-1">
        جب تک آپ کا کریڈٹ لیمٹ 15 ہزار روپے تک ہو گا آپ ہر دن 5 روپے کا سود دے گے<br/>
        جب آپ کا کریڈٹ لیمٹ 15 ہزار روپے سے زیادہ ہو گا تو
      </div>
      <div class="urdu-2">
        اگر آپ کو بلنس میں کسی قسم کا کوئی فرق محسوس ہوتا ہے تو اوپر دیے گئے نمبر پر لازمی رابطہ کریں شکریہ
      </div>
    </div>

    <div class="txn-id">Txn: ${txnLabel}</div>
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
 * Generate PDF and open the system share sheet.
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
 * Share receipt text via WhatsApp deep link.
 */
export async function shareReceiptWhatsApp(receipt: ReceiptData): Promise<void> {
  const dateStr = formatDate(receipt.date);

  const text = [
    `*${receipt.companyName}*`,
    `Distributor No: ${receipt.distributorPhone || 'N/A'}`,
    `━━━━━━━━━━━━━━━━━━`,
    `*Payment Receipt*`,
    ``,
    `Shop: ${receipt.shopName}`,
    `Owner: ${receipt.ownerName || 'N/A'}`,
    `Address: ${receipt.address || 'N/A'}`,
    `Orderbooker: ${receipt.orderbookerName}`,
    `Date: ${dateStr}`,
    `━━━━━━━━━━━━━━━━━━`,
    `Opening Balance: Rs. ${receipt.openingBalance.toLocaleString('en-PK')}`,
    `Payment Received: Rs. ${receipt.paymentAmount.toLocaleString('en-PK')}`,
    `*Remaining Balance: Rs. ${receipt.remainingBalance.toLocaleString('en-PK')}*`,
    `━━━━━━━━━━━━━━━━━━`,
    `Txn: ${receipt.transactionId || 'Pending (offline)'}`,
    ``,
    `Thank you for your Payment!`,
  ].join('\n');

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
    // WhatsApp not installed
  }

  await shareReceipt(receipt);
}
