import 'dotenv/config'
import crypto from 'crypto'
import cors from 'cors'
import express from 'express'
import Razorpay from 'razorpay'

const app = express()
const PORT = Number(process.env.PORT) || 3001
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

app.use(
  cors({
    origin: [CLIENT_ORIGIN, 'http://127.0.0.1:5173'],
    credentials: true,
  }),
)
app.use(express.json())

const keyId = process.env.RAZORPAY_KEY_ID
const keySecret = process.env.RAZORPAY_KEY_SECRET

const rzp =
  keyId && keySecret
    ? new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      })
    : null

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'farmnexus-backend', time: new Date().toISOString() })
})

app.get('/api/info', (_req, res) => {
  res.json({
    message: 'FarmNexus Tech API — Razorpay order + verify; Supabase from the frontend.',
    razorpay: Boolean(rzp),
  })
})

app.post('/api/payments/create-order', async (req, res) => {
  if (!rzp || !keyId) {
    return res.status(503).json({
      error: 'Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env',
    })
  }
  const amountPaise = Number(req.body?.amountPaise)
  const receipt = String(req.body?.receipt ?? '').slice(0, 40)
  if (!Number.isFinite(amountPaise) || amountPaise < 100 || !receipt) {
    return res.status(400).json({ error: 'amountPaise (min 100) and receipt required' })
  }
  try {
    const order = await rzp.orders.create({
      amount: Math.round(amountPaise),
      currency: 'INR',
      receipt,
    })
    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Razorpay error'
    return res.status(500).json({ error: msg })
  }
})

app.post('/api/payments/verify', (req, res) => {
  if (!keySecret) {
    return res.status(503).json({ error: 'RAZORPAY_KEY_SECRET not set' })
  }
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body ?? {}
  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({ error: 'razorpay_order_id, razorpay_payment_id, razorpay_signature required' })
  }
  const body = `${orderId}|${paymentId}`
  const expected = crypto.createHmac('sha256', keySecret).update(body).digest('hex')
  if (expected !== signature) {
    return res.status(400).json({ ok: false, error: 'Invalid signature' })
  }
  return res.json({ ok: true })
})

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.listen(PORT, () => {
  console.log(`Backend listening on http://127.0.0.1:${PORT}`)
})
