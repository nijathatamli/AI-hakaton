// Supabase Edge Function: keeps profiles.plan in sync with Stripe.
// Deploy:  supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_CONNECT, STRIPE_PRICE_STUDIO
// The website's checkout must pass the Supabase user id as `client_reference_id`.

import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const planForPrice = (priceId?: string) =>
  priceId === Deno.env.get('STRIPE_PRICE_STUDIO') ? 'studio' : priceId === Deno.env.get('STRIPE_PRICE_CONNECT') ? 'connect' : 'free';

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, Deno.env.get('STRIPE_WEBHOOK_SECRET')!);
  } catch (e) {
    return new Response(`bad signature: ${e}`, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.mode === 'subscription' && s.client_reference_id) {
        const sub = await stripe.subscriptions.retrieve(s.subscription as string);
        await db.from('profiles').update({
          plan: planForPrice(sub.items.data[0]?.price.id),
          stripe_customer_id: s.customer as string,
          stripe_subscription_id: sub.id,
        }).eq('id', s.client_reference_id);
      }
      if (s.mode === 'payment' && s.client_reference_id) {
        // one-off purchase of hosted director credits
        const { data } = await db.from('profiles').select('credits_cents').eq('id', s.client_reference_id).single();
        await db.from('profiles').update({ credits_cents: (data?.credits_cents ?? 0) + (s.amount_total ?? 0) }).eq('id', s.client_reference_id);
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const active = sub.status === 'active' || sub.status === 'trialing';
      await db.from('profiles').update({ plan: active ? planForPrice(sub.items.data[0]?.price.id) : 'free' }).eq('stripe_customer_id', sub.customer as string);
      break;
    }
  }
  return new Response('ok');
});
