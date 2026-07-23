import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { loadRazorpayScript } from '../../lib/razorpay'
import { formatINR } from '../../lib/format'

import { localOrdersRef, localListingsRef, localMessagesRef } from '../../lib/localDb'
import { negotiateVoiceOffer } from '../../services/gemini'

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

  // Voice Agent State Hooks
  const [voiceActive, setVoiceActive] = useState(false)
  const [selectedLang, setSelectedLang] = useState('en')
  const [micListening, setMicListening] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [voiceUnderstood, setVoiceUnderstood] = useState<any | null>(null)
  const [voiceThinking, setVoiceThinking] = useState(false)
  const [voiceSpeaking, setVoiceSpeaking] = useState(false)
  const [recognitionInstance, setRecognitionInstance] = useState<any | null>(null)

  // Presets list for validation and testing fallback (extremely premium feature!)
  const speechPresets: Record<string, string[]> = {
    en: [
      "Can we agree on ₹39 per kg for the basmati rice if I pick it up?",
      "The price is a bit high. Can you offer a ₹500 flat discount?",
      "Okay, I will accept your terms and pay now."
    ],
    hi: [
      "क्या हम बासमती चावल के लिए ₹39 प्रति किलो पर सहमत हो सकते हैं?",
      "कीमत थोड़ी ज्यादा है। क्या आप ₹500 की छूट दे सकते हैं?",
      "ठीक है, मैं आपकी शर्तों को स्वीकार करता हूँ और भुगतान करता हूँ।"
    ],
    te: [
      "నేను తీసుకుంటే బాస్మతి బియ్యానికి కేజీ ₹39 ఒప్పందం కుదుర్చుకోవచ్చా?",
      "ధర కొంచెం ఎక్కువగా ఉంది. ₹500 తగ్గింపు ఇవ్వగలరా?",
      "సరే, నేను మీ నిబంధనలను అంగీకరిస్తున్నాను మరియు ఇప్పుడే చెల్లిస్తాను।"
    ],
    ta: [
      "நான் வந்து எடுத்துக்கொண்டால் பாசுமதி அரிசிக்கு கிலோவிற்கு ₹39 ஒத்துக்கொள்ளலாமா?",
      "விலை கொஞ்சம் அதிகமாக உள்ளது. ₹500 தள்ளுபடி தர முடியுமா?",
      "சரி, நான் உங்கள் நிபந்தனைகளை ஏற்றுக்கொள்கிறேன், இப்போது பணம் செலுத்துகிறேன்."
    ],
    mr: [
      "मी स्वतः माल घेऊन गेलो तर बासमती तांदळासाठी आपण ₹३९ प्रति किलोवर सहमत होऊ शकतो का?",
      "किंमत थोडी जास्त आहे. आपण ₹५०० ची सूट देऊ शकता का?",
      "ठीक आहे, मला तुमच्या अटी मान्य आहेत आणि मी आता पैसे भरतो."
    ]
  }

  // Web Speech API Voice Recognition
  const startListening = () => {
    setError(null)
    setVoiceTranscript('')
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError("Web Speech API is not supported in this browser. Please use the simulated speech presets below.")
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      
      const localeMap: Record<string, string> = {
        en: 'en-US',
        hi: 'hi-IN',
        te: 'te-IN',
        kn: 'kn-IN'
      }
      recognition.lang = localeMap[selectedLang] || 'en-US'

      recognition.onstart = () => {
        setMicListening(true)
      }

      recognition.onerror = (e: any) => {
        console.error('Speech recognition error:', e)
        setError(`Microphone error: ${e.error}. Try selecting a text preset below.`)
        setMicListening(false)
      }

      recognition.onend = () => {
        setMicListening(false)
      }

      recognition.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript
        setVoiceTranscript(resultText)
        void processSpokenOffer(resultText)
      }

      recognition.start()
      setRecognitionInstance(recognition)
    } catch (err: any) {
      console.error(err)
      setError("Failed to initialize microphone. Please use simulated speech presets.")
      setMicListening(false)
    }
  }

  const stopListening = () => {
    if (recognitionInstance) {
      recognitionInstance.stop()
      setMicListening(false)
    }
  }

  // Web Speech API Readback voice synth
  const speakText = (phrase: string) => {
    if (!phrase) return
    window.speechSynthesis.cancel() // Stop any previous speech
    const utterance = new SpeechSynthesisUtterance(phrase)
    
    const localeMap: Record<string, string> = {
      en: 'en-US',
      hi: 'hi-IN',
      te: 'te-IN',
      kn: 'kn-IN'
    }
    utterance.lang = localeMap[selectedLang] || 'en-US'
    
    utterance.onstart = () => {
      setVoiceSpeaking(true)
    }
    utterance.onend = () => {
      setVoiceSpeaking(false)
    }
    utterance.onerror = () => {
      setVoiceSpeaking(false)
    }

    window.speechSynthesis.speak(utterance)
  }

  const processSpokenOffer = async (phrase: string) => {
    const thread = threads.find((t) => t.id === selectedOrderId)
    if (!thread) return
    
    setVoiceThinking(true)
    setError(null)
    
    try {
      const history = messages.slice(-10).map((m) => ({
        sender: m.sender_id === user?.id ? (role === 'farmer' ? 'Farmer' : 'Buyer') : (role === 'farmer' ? 'Buyer' : 'Farmer'),
        text: m.text
      }))

      const quantity = 1000
      const initialPrice = thread.total_amount ? Number(thread.total_amount) / quantity : 40

      const result = await negotiateVoiceOffer(
        phrase,
        selectedLang,
        role,
        {
          name: thread.produce_name,
          quantity: quantity,
          initialPrice: initialPrice
        },
        history
      )

      setVoiceUnderstood(result)
      
      if (result.suggestedSpeech) {
        speakText(result.suggestedSpeech)
      }
    } catch (err: any) {
      console.error(err)
      setError("AI Negotiation agent failed to parse request.")
    } finally {
      setVoiceThinking(false)
    }
  }

  const applyAIResponse = (draftedText: string) => {
    if (!draftedText) return
    setText(draftedText)
    setVoiceActive(false)
    window.speechSynthesis.cancel()
  }

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

        <div className="flex flex-1 flex-col relative">
          
          {/* Custom style for dynamic voice animation bars */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes voice-wave {
              0%, 100% { transform: scaleY(0.3); }
              50% { transform: scaleY(1); }
            }
            .voice-bar {
              animation: voice-wave 1s ease-in-out infinite;
              transform-origin: bottom;
            }
          `}} />

          {voiceActive && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-20 flex flex-col p-5 overflow-y-auto space-y-6">
              
              {/* Header */}
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${micListening ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${micListening ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                  </span>
                  <h3 className="font-extrabold text-sm text-neutral-800 tracking-wide uppercase">AI Native-Voice Negotiation Agent</h3>
                </div>
                
                {/* Language Select Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500 font-semibold">Talk in:</span>
                  <select 
                    value={selectedLang}
                    onChange={(e) => {
                      setSelectedLang(e.target.value)
                      setVoiceUnderstood(null)
                      setVoiceTranscript('')
                    }}
                    className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-neutral-700 outline-none focus:border-emerald-400 transition-all font-semibold"
                  >
                    <option value="en">🇺🇸 English</option>
                    <option value="hi">🇮🇳 हिंदी (Hindi)</option>
                    <option value="te">🇮🇳 తెలుగు (Telugu)</option>
                    <option value="kn">🇮🇳 ಕನ್ನಡ (Kannada)</option>
                  </select>
                </div>
              </div>

              {/* Main waveform and micro controls */}
              <div className="flex flex-col items-center justify-center py-6 bg-gradient-to-b from-neutral-50 to-transparent rounded-2xl border border-neutral-100/50 p-4">
                
                {/* Animated sound wave SVG */}
                <div className="h-16 flex items-center justify-center gap-1.5 mb-4">
                  {[...Array(9)].map((_, i) => {
                    const delay = `${i * 0.15}s`
                    const animateClass = micListening 
                      ? 'voice-bar' 
                      : voiceSpeaking 
                        ? 'voice-bar' 
                        : ''
                    return (
                      <span 
                        key={i} 
                        style={{ animationDelay: delay }}
                        className={`w-1 bg-gradient-to-t from-primary to-[#F57C00] rounded-full transition-all duration-300 ${animateClass} ${
                          micListening ? 'h-10' : voiceSpeaking ? 'h-8' : 'h-3'
                        }`}
                      />
                    )
                  })}
                </div>

                {/* Mic recording trigger button */}
                <div className="flex items-center gap-3">
                  {micListening ? (
                    <button
                      type="button"
                      onClick={stopListening}
                      className="px-5 py-2.5 rounded-full bg-red-650 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                    >
                      ⏹️ Stop Listening
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startListening}
                      className="px-6 py-3 rounded-full bg-primary hover:opacity-90 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2"
                    >
                      🎙️ Press & Speak Now
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-neutral-400 mt-2.5">
                  {micListening ? "Go ahead, start speaking your offer..." : "Tap the button above to speak in your language."}
                </p>
              </div>

              {/* Presets testing block */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Simulated Speech Presets (Test Fallback)</h4>
                <div className="grid grid-cols-1 gap-2">
                  {speechPresets[selectedLang]?.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setVoiceTranscript(preset)
                        void processSpokenOffer(preset)
                      }}
                      className="w-full text-left p-3 rounded-xl border border-neutral-100 bg-white hover:border-emerald-300 hover:bg-emerald-50/10 text-xs text-neutral-700 transition-all font-medium flex justify-between items-center group"
                    >
                      <span>💬 "{preset}"</span>
                      <span className="text-[10px] text-neutral-400 group-hover:text-emerald-600 transition-colors">Test preset ›</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Captions transcript scroll */}
              {voiceTranscript && (
                <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-3.5 text-xs text-neutral-700">
                  <p className="font-semibold text-neutral-500 uppercase tracking-wider text-[9px] mb-1">Your Voice Input:</p>
                  <p className="italic text-neutral-800 font-medium">"{voiceTranscript}"</p>
                </div>
              )}

              {/* Gemini translation and suggestion report */}
              {voiceThinking ? (
                <div className="flex items-center justify-center py-6 gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                  <span className="text-xs text-neutral-500 font-semibold animate-pulse">Gemini is translating and evaluating offer...</span>
                </div>
              ) : voiceUnderstood ? (
                <div className="space-y-4 border-t pt-4">
                  
                  {/* Bilingual translation layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-emerald-50/20 to-transparent border border-emerald-100/50 rounded-2xl p-4">
                      <h4 className="text-[9px] font-bold text-emerald-800 uppercase tracking-widest mb-1.5">Understood Terms (AI Translation)</h4>
                      <p className="text-xs font-bold text-neutral-800 leading-relaxed">{voiceUnderstood.understoodTranslation}</p>
                      <p className="text-[10px] text-neutral-500 mt-2 font-medium italic">{voiceUnderstood.analysis}</p>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50/20 to-transparent border border-amber-100/50 rounded-2xl p-4">
                      <h4 className="text-[9px] font-bold text-amber-800 uppercase tracking-widest mb-1.5">Suggested Action (Assistant)</h4>
                      <p className="text-xs font-bold text-neutral-800 leading-relaxed">Response: {voiceUnderstood.suggestedResponse}</p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => applyAIResponse(voiceUnderstood.suggestedResponse)}
                          className="px-3.5 py-1.5 bg-[#2E7D32] text-white text-[10px] font-black rounded-lg shadow-sm hover:opacity-90 transition-opacity"
                        >
                          Use Response Draft
                        </button>
                        {voiceUnderstood.suggestedSpeech && (
                          <button
                            type="button"
                            onClick={() => speakText(voiceUnderstood.suggestedSpeech)}
                            className="px-3 py-1.5 border border-amber-200 text-amber-800 text-[10px] font-semibold rounded-lg hover:bg-amber-50/20 transition-all flex items-center gap-1"
                          >
                            🔊 Speak Again
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Interactive Quick action pills */}
                  {voiceUnderstood.quickActions && voiceUnderstood.quickActions.length > 0 && (
                    <div className="space-y-1.5">
                      <h5 className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Quick Negotiation Actions</h5>
                      <div className="flex flex-wrap gap-2">
                        {voiceUnderstood.quickActions.map((act: string, idx: number) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => applyAIResponse(act)}
                            className="px-3 py-1.5 rounded-full border border-neutral-300 bg-white hover:border-primary hover:text-primary transition-all text-xs font-semibold"
                          >
                            ⚡ {act}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : null}

            </div>
          )}

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

          <div className="flex gap-2 border-t p-3 items-center">
            {selectedOrderId && (
              <button
                type="button"
                onClick={() => {
                  setVoiceActive(!voiceActive)
                  setVoiceUnderstood(null)
                  setVoiceTranscript('')
                }}
                className={`rounded-lg p-2.5 text-sm transition-all border shrink-0 ${
                  voiceActive 
                    ? 'bg-red-50 border-red-200 text-red-650 font-bold' 
                    : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-600'
                }`}
                title="AI Multilingual Voice Agent"
              >
                🎙️ {voiceActive ? 'Close Mic' : 'AI Mic'}
              </button>
            )}
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
