import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { loadRazorpayScript } from '../../lib/razorpay'
import { formatINR } from '../../lib/format'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const localOrdersRef: Record<string, any> = (window as any).__farmnexusLocalOrders ??
  ((window as any).__farmnexusLocalOrders = {})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const localListingsRef: Record<string, any> = (window as any).__farmnexusLocalListings ??
  ((window as any).__farmnexusLocalListings = {})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const localMessagesRef: Record<string, any[]> = (window as any).__farmnexusLocalMessages ??
  ((window as any).__farmnexusLocalMessages = {})

type Thread = {
  id: string
  produce_name: string
  other_party: string
  updated_hint: string
  status: string
  payment_status: string
  total_amount: number
  buyer_id: string
  farmer_id: string
}

type Msg = {
  id: string
  text: string
  sender_id: string
  created_at: string
}

export function OrderChatPage({ role }: { role: 'farmer' | 'buyer' }) {
  const user = useAuthStore((s) => s.user)
  const isLocal = useAuthStore((s) => s.isLocal)
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedOrderId = searchParams.get('orderId')

  const [threads, setThreads] = useState<Thread[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mobileList, setMobileList] = useState(true)
  const [paying, setPaying] = useState(false)

  const col = role === 'farmer' ? 'farmer_id' : 'buyer_id'

  const loadThreads = useCallback(async () => {
    if (!user?.id) return
    setLoadingThreads(true)

    if (isLocal || !isSupabaseConfigured()) {
      const orders = Object.values(localOrdersRef)
        .filter((o: any) => o[col] === user.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      const listingIds = [...new Set(orders.map((o: any) => o.listing_id))]
      const otherIds = [
        ...new Set(
          orders.map((o: any) => (role === 'farmer' ? o.buyer_id : o.farmer_id)),
        ),
      ]

      const lmap = Object.fromEntries(
        listingIds.map((lid) => [lid, localListingsRef[lid]?.produce_name ?? 'Local Produce'])
      )

      const pmap: Record<string, string> = {}
      for (const id of otherIds) {
        if (role === 'farmer') {
          const matchedOrder = orders.find((o: any) => o.buyer_id === id)
          pmap[id] = matchedOrder?.buyer_name ?? 'Local Buyer'
        } else {
          const matchedOrder = orders.find((o: any) => o.farmer_id === id)
          const listing = matchedOrder ? localListingsRef[matchedOrder.listing_id] : null
          pmap[id] = listing?.farmer_name ?? 'Local Farmer'
        }
      }

      setThreads(
        orders.map((o: any) => ({
          id: o.id,
          produce_name: lmap[o.listing_id] ?? 'Order',
          other_party: pmap[role === 'farmer' ? o.buyer_id : o.farmer_id] ?? '—',
          updated_hint: o.created_at,
          status: o.status,
          payment_status: o.payment_status,
          total_amount: Number(o.total_amount),
          buyer_id: o.buyer_id,
          farmer_id: o.farmer_id,
        })),
      )
      setError(null)
      setLoadingThreads(false)
      return
    }

    const { data: orders, error: oe } = await supabase
      .from('orders')
      .select('id, listing_id, buyer_id, farmer_id, status, payment_status, total_amount, created_at')
      .eq(col, user.id)
      .order('created_at', { ascending: false })

    if (oe) {
      setError(oe.message)
      setThreads([])
      setLoadingThreads(false)
      return
    }

    const listingIds = [...new Set((orders ?? []).map((o) => o.listing_id))]
    const otherIds = [
      ...new Set(
        (orders ?? []).map((o) => (role === 'farmer' ? o.buyer_id : o.farmer_id)),
      ),
    ]

    let lmap: Record<string, string> = {}
    if (listingIds.length) {
      const { data: listings } = await supabase.from('listings').select('id, produce_name').in('id', listingIds)
      lmap = Object.fromEntries((listings ?? []).map((l) => [l.id, l.produce_name]))
    }
    let pmap: Record<string, string> = {}
    if (otherIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', otherIds)
      pmap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.name ?? (role === 'farmer' ? 'Buyer' : 'Farmer')]))
    }

    setThreads(
      (orders ?? []).map((o) => ({
        id: o.id,
        produce_name: lmap[o.listing_id] ?? 'Order',
        other_party: pmap[role === 'farmer' ? o.buyer_id : o.farmer_id] ?? '—',
        updated_hint: o.created_at,
        status: o.status,
        payment_status: o.payment_status,
        total_amount: Number(o.total_amount),
        buyer_id: o.buyer_id,
        farmer_id: o.farmer_id,
      })),
    )
    setError(null)
    setLoadingThreads(false)
  }, [col, role, user?.id, isLocal])

  useEffect(() => {
    void loadThreads()
  }, [loadThreads])

  useEffect(() => {
    if (searchParams.get('orderId')) setMobileList(false)
  }, [searchParams])

  const loadMessages = useCallback(
    async (orderId: string) => {
      setLoadingMsgs(true)
      if (isLocal || !isSupabaseConfigured()) {
        const msgs = localMessagesRef[orderId] ?? []
        setMessages(msgs)
        setLoadingMsgs(false)
        return
      }

      const { data, error: me } = await supabase
        .from('messages')
        .select('id, text, sender_id, created_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })
      setLoadingMsgs(false)
      if (me) {
        setError(me.message)
        setMessages([])
        return
      }
      setMessages((data as Msg[]) ?? [])
    },
    [isLocal],
  )

  useEffect(() => {
    if (!selectedOrderId) {
      setMessages([])
      return
    }
    void loadMessages(selectedOrderId)
    setMobileList(false)

    if (isLocal || !isSupabaseConfigured()) {
      const interval = setInterval(() => {
        const msgs = localMessagesRef[selectedOrderId] ?? []
        setMessages((prev) => {
          if (prev.length !== msgs.length || prev[prev.length - 1]?.id !== msgs[msgs.length - 1]?.id) {
            return msgs
          }
          return prev
        })
        void loadThreads()
      }, 1000)
      return () => clearInterval(interval)
    }

    const channel = supabase
      .channel(`messages-${selectedOrderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `order_id=eq.${selectedOrderId}`,
        },
        (payload) => {
          const row = payload.new as Msg
          setMessages((m) =>
            m.some((x) => x.id === row.id) ? m : [...m, row].sort((a, b) => a.created_at.localeCompare(b.created_at)),
          )
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadMessages, loadThreads, selectedOrderId, isLocal])

  async function send() {
    if (!selectedOrderId || !user?.id || !text.trim()) return
    const textMsg = text.trim()
    setText('')

    if (isLocal || !isSupabaseConfigured()) {
      const newMsg: Msg = {
        id: 'msg-' + Math.random().toString(36).slice(2, 10),
        text: textMsg,
        sender_id: user.id,
        created_at: new Date().toISOString(),
      }
      if (!localMessagesRef[selectedOrderId]) {
        localMessagesRef[selectedOrderId] = []
      }
      localMessagesRef[selectedOrderId].push(newMsg)
      setMessages([...localMessagesRef[selectedOrderId]])
      return
    }

    const { error: se } = await supabase.from('messages').insert({
      order_id: selectedOrderId,
      sender_id: user.id,
      text: textMsg,
    })
    if (se) {
      setError(se.message)
      return
    }
  }

  async function updateOrderStatus(status: string, rejectReason?: string | null) {
    if (!selectedOrderId) return
    setError(null)

    if (isLocal || !isSupabaseConfigured()) {
      if (localOrdersRef[selectedOrderId]) {
        localOrdersRef[selectedOrderId].status = status
        if (rejectReason !== undefined) {
          localOrdersRef[selectedOrderId].reject_reason = rejectReason
        }
      }
      await loadThreads()
      return
    }

    const patch: Record<string, unknown> = { status }
    if (rejectReason !== undefined) patch.reject_reason = rejectReason

    const { error: e } = await supabase
      .from('orders')
      .update(patch)
      .eq('id', selectedOrderId)

    if (e) {
      setError(e.message)
      return
    }
    await loadThreads()
  }

  function handleReject() {
    const reason = prompt('Reason for rejection?') ?? ''
    void updateOrderStatus('rejected', reason || null)
  }

  async function payUPI() {
    const thread = threads.find((t) => t.id === selectedOrderId)
    if (!thread || !user) {
      setError('Missing order or sign-in.')
      return
    }
    const amountPaise = Math.max(100, Math.round(Number(thread.total_amount) * 100))
    setPaying(true)
    setError(null)

    if (isLocal || !isSupabaseConfigured()) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1500))
        if (localOrdersRef[thread.id]) {
          localOrdersRef[thread.id].payment_status = 'paid'
        }
        await loadThreads()
      } catch (e) {
        setError('Payment simulation failed')
      } finally {
        setPaying(false)
      }
      return
    }

    try {
      await loadRazorpayScript()
      const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined
      if (!keyId) {
        setError('Set VITE_RAZORPAY_KEY_ID in frontend/.env (same as Razorpay Key Id).')
        setPaying(false)
        return
      }

      const createRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountPaise, receipt: thread.id }),
      })
      const createJson = (await createRes.json()) as { orderId?: string; keyId?: string; error?: string }
      if (!createRes.ok) {
        throw new Error(createJson.error ?? 'Could not create Razorpay order.')
      }

      const rzOrderId = createJson.orderId
      if (!rzOrderId || !window.Razorpay) throw new Error('Razorpay init failed')

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay!({
          key: createJson.keyId ?? keyId,
          amount: amountPaise,
          currency: 'INR',
          name: 'FarmNexus Tech',
          description: thread.produce_name,
          order_id: rzOrderId,
          handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
            try {
              const verifyRes = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              })
              if (!verifyRes.ok) throw new Error('Payment verification failed')
              
              const { error: ue } = await supabase
                .from('orders')
                .update({
                  payment_status: 'paid',
                  razorpay_payment_id: response.razorpay_payment_id,
                })
                .eq('id', thread.id)
                .eq('buyer_id', user.id)
              if (ue) throw new Error(ue.message)
              resolve()
            } catch (err) {
              reject(err instanceof Error ? err : new Error('Verify failed'))
            }
          },
          prefill: {
            name: user.user_metadata?.name ?? user.phone ?? '',
            contact: user.phone ?? '',
          },
          theme: { color: '#1b6b3a' },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
          },
        })
        rzp.open()
      })

      await loadThreads()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment error')
    } finally {
      setPaying(false)
    }
  }

  const title = useMemo(() => threads.find((t) => t.id === selectedOrderId), [threads, selectedOrderId])

  return (
    <main className="mx-auto flex max-w-6xl min-h-[calc(100dvh-120px)] flex-col px-4 py-6 md:flex-row md:gap-4">
      <aside
        className={`mb-4 w-full shrink-0 border border-neutral-200 bg-white md:mb-0 md:w-72 md:rounded-xl md:shadow-sm ${
          !mobileList && selectedOrderId ? 'hidden md:block' : ''
        }`}
      >
        <div className="border-b px-3 py-2 text-sm font-semibold text-neutral-800">Conversations</div>
        {loadingThreads ? (
          <p className="p-3 text-sm text-neutral-600">Loading…</p>
        ) : threads.length === 0 ? (
          <p className="p-3 text-sm text-neutral-600">No orders to chat about yet.</p>
        ) : (
          <ul className="max-h-[50vh] overflow-y-auto md:max-h-[70vh]">
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`w-full border-b px-3 py-3 text-left text-sm hover:bg-neutral-50 ${
                    selectedOrderId === t.id ? 'bg-primary/5 font-medium text-primary' : ''
                  }`}
                  onClick={() => {
                    setSearchParams({ orderId: t.id })
                    setMobileList(false)
                  }}
                >
                  <div className="font-medium text-neutral-900">{t.produce_name}</div>
                  <div className="text-xs text-neutral-600">{t.other_party}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section
        className={`flex flex-1 flex-col border border-neutral-200 bg-white md:rounded-xl md:shadow-sm ${
          mobileList && !selectedOrderId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <button
            type="button"
            className="text-sm text-primary md:hidden"
            onClick={() => {
              setMobileList(true)
              setSearchParams({})
            }}
          >
            ← Orders
          </button>
          <div className="text-sm font-semibold text-neutral-900">{title ? `${title.produce_name} · ${title.other_party}` : 'Select a conversation'}</div>
        </div>

        {error && <p className="px-3 py-2 text-xs text-red-600">{error}</p>}

        {title && (
          <div className="border-b bg-neutral-50 px-4 py-3 text-xs md:text-sm text-neutral-700 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shadow-inner">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="font-semibold text-neutral-900">{formatINR(title.total_amount)}</span>
              <span className="text-neutral-300 hidden sm:inline">|</span>
              <span className="flex items-center gap-1.5">
                <span className="text-neutral-500">Status:</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                  title.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                  title.status === 'dispatched' ? 'bg-blue-100 text-blue-800' :
                  title.status === 'accepted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  title.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {title.status}
                </span>
              </span>
              <span className="text-neutral-300 hidden sm:inline">|</span>
              <span className="flex items-center gap-1.5">
                <span className="text-neutral-500">Payment:</span>
                <span className={`font-semibold capitalize ${title.payment_status === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {title.payment_status}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Farmer Controls */}
              {role === 'farmer' && title.status === 'placed' && (
                <>
                  <button
                    type="button"
                    className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
                    onClick={() => void updateOrderStatus('accepted')}
                  >
                    Accept Order
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
                    onClick={handleReject}
                  >
                    Reject
                  </button>
                </>
              )}
              {role === 'farmer' && title.status === 'accepted' && title.payment_status === 'paid' && (
                <button
                  type="button"
                  className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
                  onClick={() => void updateOrderStatus('dispatched')}
                >
                  Mark Dispatched
                </button>
              )}

              {/* Buyer Controls */}
              {role === 'buyer' && title.status === 'accepted' && title.payment_status === 'pending' && (
                <button
                  type="button"
                  disabled={paying}
                  className="rounded-lg bg-accent px-4 py-1.5 text-xs font-extrabold text-white hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm animate-pulse"
                  onClick={() => void payUPI()}
                >
                  {paying ? 'Opening Razorpay…' : 'Pay via UPI (Razorpay)'}
                </button>
              )}
              {role === 'buyer' && title.status === 'dispatched' && (
                <button
                  type="button"
                  className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-white hover:opacity-90 transition-opacity"
                  onClick={() => void updateOrderStatus('delivered')}
                >
                  Mark Delivered
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col">
          <div className="flex-1 space-y-2 overflow-y-auto p-3" style={{ maxHeight: 'min(55vh, 480px)' }}>
            {loadingMsgs ? (
              <p className="text-sm text-neutral-600">Loading messages…</p>
            ) : !selectedOrderId ? (
              <p className="text-sm text-neutral-600">Pick an order on the left.</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-neutral-600">No messages yet — say hello.</p>
            ) : (
              messages.map((m) => {
                const mine = m.sender_id === user?.id
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        mine ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-900'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="flex gap-2 border-t p-3">
            <input
              className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Type a message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
              disabled={!selectedOrderId}
            />
            <button
              type="button"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={!selectedOrderId || !text.trim()}
              onClick={() => void send()}
            >
              Send
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
