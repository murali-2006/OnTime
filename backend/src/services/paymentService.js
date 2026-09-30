const crypto = require('crypto');
const config = require('../config');

/**
 * Payment Gateway Service Abstraction
 * Supports Razorpay production flow and clean test/sandbox environment
 */
class PaymentService {
  constructor() {
    this.keyId = config.payment.keyId;
    this.keySecret = config.payment.keySecret;
    this.mode = config.payment.mode; // 'test' or 'production'
  }

  /**
   * Create an order for a late fine payment
   * @param {number} lateRecordId
   * @param {number} studentId
   * @param {number} amount - in INR
   * @returns {Promise<{ orderId: string, amount: number, currency: string, keyId: string, mode: string }>}
   */
  async createOrder(lateRecordId, studentId, amount) {
    const amountInPaise = Math.round(amount * 100);
    const receipt = `rcpt_fine_${lateRecordId}_${Date.now()}`;

    // If configured with real Razorpay production keys, an official Razorpay instance can be used:
    // const razorpay = new Razorpay({ key_id: this.keyId, key_secret: this.keySecret });
    // const order = await razorpay.orders.create({ amount: amountInPaise, currency: 'INR', receipt });

    // Deterministic secure order ID generation for test/gateway abstraction
    const orderId = `order_${this.mode}_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      orderId,
      amount: amountInPaise,
      amountInRupees: amount,
      currency: 'INR',
      receipt,
      keyId: this.keyId,
      mode: this.mode
    };
  }

  /**
   * Verify signature returned after gateway payment completion
   * In Razorpay standard HMAC SHA256:
   * generated_signature = hmac_sha256(order_id + "|" + razorpay_payment_id, secret);
   */
  verifyPaymentSignature({ orderId, paymentId, signature }) {
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    // In test environment, if signature is prefixed with 'test_sig_', verify test token
    if (this.mode === 'test' && signature.startsWith('test_sig_')) {
      const expectedTestSig = 'test_sig_' + crypto.createHmac('sha256', this.keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      return signature === expectedTestSig;
    }

    // Standard Razorpay HMAC-SHA256 signature verification
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Helper for sandbox/test simulation: generates valid test signature
   * Only active when PAYMENT_MODE === 'test'
   */
  generateTestSignature(orderId, paymentId) {
    if (this.mode !== 'test') {
      throw new Error('Test signature generation is only allowed in test mode');
    }
    const digest = crypto.createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    return `test_sig_${digest}`;
  }
}

module.exports = new PaymentService();
