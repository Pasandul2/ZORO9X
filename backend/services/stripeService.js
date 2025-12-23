/**
 * Stripe Payment Service
 * 
 * Handles Stripe payment integration
 */

const STRIPE_ENABLED = !!process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_ENABLED ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const { pool } = require('../config/database');

if (!STRIPE_ENABLED) {
  console.warn('⚠️  Stripe not configured - payment features will be disabled');
  console.warn('   Set STRIPE_SECRET_KEY in .env to enable Stripe integration');
}

/**
 * Create Stripe customer
 */
async function createStripeCustomer(email, name, metadata = {}) {
  if (!STRIPE_ENABLED) {
    console.warn('Stripe not configured - skipping customer creation');
    return null;
  }
  
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata
    });
    
    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
}

/**
 * Create Stripe subscription
 */
async function createStripeSubscription(customerId, priceId, trialDays = 0) {
  try {
    const subscriptionData = {
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent']
    };
    
    if (trialDays > 0) {
      subscriptionData.trial_period_days = trialDays;
    }
    
    const subscription = await stripe.subscriptions.create(subscriptionData);
    
    return subscription;
  } catch (error) {
    console.error('Error creating Stripe subscription:', error);
    throw error;
  }
}

/**
 * Create payment intent
 */
async function createPaymentIntent(amount, currency = 'usd', customerId, metadata = {}) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      customer: customerId,
      metadata,
      automatic_payment_methods: {
        enabled: true
      }
    });
    
    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

/**
 * Cancel Stripe subscription
 */
async function cancelStripeSubscription(subscriptionId, immediate = false) {
  try {
    if (immediate) {
      await stripe.subscriptions.cancel(subscriptionId);
    } else {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error canceling Stripe subscription:', error);
    throw error;
  }
}

/**
 * Update Stripe subscription (upgrade/downgrade)
 */
async function updateStripeSubscription(subscriptionId, newPriceId, prorationBehavior = 'create_prorations') {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId
      }],
      proration_behavior: prorationBehavior
    });
    
    return updatedSubscription;
  } catch (error) {
    console.error('Error updating Stripe subscription:', error);
    throw error;
  }
}

/**
 * Retrieve payment method
 */
async function getPaymentMethod(paymentMethodId) {
  try {
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    return paymentMethod;
  } catch (error) {
    console.error('Error retrieving payment method:', error);
    throw error;
  }
}

/**
 * Create Stripe coupon
 */
async function createStripeCoupon(couponData) {
  try {
    const coupon = await stripe.coupons.create({
      name: couponData.name,
      percent_off: couponData.type === 'percentage' ? couponData.value : undefined,
      amount_off: couponData.type === 'fixed_amount' ? Math.round(couponData.value * 100) : undefined,
      currency: 'usd',
      duration: couponData.duration,
      duration_in_months: couponData.duration_months,
      max_redemptions: couponData.max_redemptions
    });
    
    return coupon;
  } catch (error) {
    console.error('Error creating Stripe coupon:', error);
    throw error;
  }
}

/**
 * Apply coupon to subscription
 */
async function applyStripeCoupon(subscriptionId, couponId) {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      coupon: couponId
    });
    
    return subscription;
  } catch (error) {
    console.error('Error applying coupon:', error);
    throw error;
  }
}

/**
 * Generate invoice
 */
async function createStripeInvoice(customerId, subscriptionId = null) {
  try {
    const invoice = await stripe.invoices.create({
      customer: customerId,
      subscription: subscriptionId,
      auto_advance: true
    });
    
    return invoice;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
}

/**
 * Handle webhook events
 */
async function handleStripeWebhook(event) {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error handling webhook:', error);
    throw error;
  }
}

async function handlePaymentSucceeded(paymentIntent) {
  const connection = await pool.getConnection();
  
  try {
    await connection.execute(
      `UPDATE payments SET status = 'completed', stripe_payment_intent_id = ? 
       WHERE transaction_id = ?`,
      [paymentIntent.id, paymentIntent.metadata.transaction_id]
    );
  } finally {
    connection.release();
  }
}

async function handlePaymentFailed(paymentIntent) {
  const connection = await pool.getConnection();
  
  try {
    await connection.execute(
      `UPDATE payments SET status = 'failed' 
       WHERE stripe_payment_intent_id = ?`,
      [paymentIntent.id]
    );
  } finally {
    connection.release();
  }
}

async function handleSubscriptionUpdated(subscription) {
  // Update subscription status in database
  console.log('Subscription updated:', subscription.id);
}

async function handleSubscriptionDeleted(subscription) {
  const connection = await pool.getConnection();
  
  try {
    await connection.execute(
      `UPDATE client_subscriptions SET status = 'cancelled' 
       WHERE stripe_subscription_id = ?`,
      [subscription.id]
    );
  } finally {
    connection.release();
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  console.log('Invoice payment succeeded:', invoice.id);
}

async function handleInvoicePaymentFailed(invoice) {
  console.log('Invoice payment failed:', invoice.id);
}

module.exports = {
  createStripeCustomer,
  createStripeSubscription,
  createPaymentIntent,
  cancelStripeSubscription,
  updateStripeSubscription,
  getPaymentMethod,
  createStripeCoupon,
  applyStripeCoupon,
  createStripeInvoice,
  handleStripeWebhook
};
