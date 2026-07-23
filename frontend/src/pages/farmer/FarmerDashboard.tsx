import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { localListingsRef, localOrdersRef, localUsersRef, localCropDiagnosesRef, localLossReportsRef } from '../../lib/localDb'
import { chatWithFarmAssistant, type GeminiMessage, getRegionalDemandTrends, type DemandTrend, getTopCropsPredictions, type TopCropPrediction, analyzeCropImage, assessCropDamage } from '../../services/gemini'
import { initializeKnowledgeBase, generateRAGResponse, isRAGReady } from '../../services/ragEngine'
import { askAgenticAI, type ExecutedTool } from '../../services/agentService'

type DashboardMetrics = {
  totalEarnings: number
  pendingOrders: number
  activeListings: number
  monthOrders: number
}

type OrderRow = {
  id: string
  produce_name: string
  buyer_name: string
  quantity_kg: number
  total_amount: number
  status: string
}

const mockMetrics: DashboardMetrics = {
  totalEarnings: 99500,
  pendingOrders: 1200,
  activeListings: 120,
  monthOrders: 450,
}

const mockRecentOrders: OrderRow[] = [
  { id: '1', produce_name: 'Tomatoes', buyer_name: 'Raj Traders', quantity_kg: 50, total_amount: 1100, status: 'pending' },
  { id: '2', produce_name: 'Tomatoes', buyer_name: 'Fresh Mart', quantity_kg: 100, total_amount: 1800, status: 'delivered' },
  { id: '3', produce_name: 'Tomatoes', buyer_name: 'Annapurna Foods', quantity_kg: 200, total_amount: 4600, status: 'delivered' },
]

// using dynamic state instead of mockProductsItems

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

export function FarmerDashboard() {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const isLocal = useAuthStore((s) => s.isLocal)
  const [metrics, setMetrics] = useState<DashboardMetrics>(mockMetrics)
  const [recent, setRecent] = useState<OrderRow[]>(mockRecentOrders)
  const [usingMock, setUsingMock] = useState(true)

  const [activeTab, setActiveTab] = useState<'overview' | 'health' | 'loss'>('overview')

  // Crop health state hooks
  const [diagnoses, setDiagnoses] = useState<any[]>([])
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<any | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [scanCropName, setScanCropName] = useState('')
  const [scanSymptoms, setScanSymptoms] = useState('')
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [featureLoading, setFeatureLoading] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Crop loss assessment state hooks
  const [lossReports, setLossReports] = useState<any[]>([])
  const [selectedLossReport, setSelectedLossReport] = useState<any | null>(null)
  const [loadingLossHistory, setLoadingLossHistory] = useState(false)
  const [lossCropName, setLossCropName] = useState('')
  const [cropAgeWeeks, setCropAgeWeeks] = useState<number>(4)
  const [lossCause, setLossCause] = useState<string>('flood')
  const [affectedAreaAcres, setAffectedAreaAcres] = useState<number>(1)
  const [damageDescription, setDamageDescription] = useState('')
  const [uploadedLossImage, setUploadedLossImage] = useState<string | null>(null)
  const [uploadLossFile, setUploadLossFile] = useState<File | null>(null)
  const [lossAssessing, setLossAssessing] = useState(false)
  const [lossError, setLossError] = useState<string | null>(null)

  const lossFileInputRef = useRef<HTMLInputElement>(null)


  const [globalActiveListings, setGlobalActiveListings] = useState(120)
  const [globalRegisteredFarmers, setGlobalRegisteredFarmers] = useState(450)
  const [globalOrdersCompleted, setGlobalOrdersCompleted] = useState(1200)
  const [globalSatisfactionRate] = useState(4.8)
  const [trends, setTrends] = useState<DemandTrend[]>([
    { region: 'Andhra Pradesh', crop: 'Rice', demand: 92, color: '#2E7D32' },
    { region: 'Maharashtra', crop: 'Mangoes', demand: 85, color: '#F57C00' },
    { region: 'Karnataka', crop: 'Tomatoes', demand: 78, color: '#D32F2F' },
    { region: 'Punjab', crop: 'Wheat', demand: 70, color: '#1F8A70' },
    { region: 'Tamil Nadu', crop: 'Bananas', demand: 65, color: '#7B1FA2' },
  ])
  const [trendsLoading, setTrendsLoading] = useState(false)

  const [products, setProducts] = useState<TopCropPrediction[]>([
    { name: 'Rice', sub: 'Basmati', aiPrice: 42, marketPrice: 40, img: '🌾', highlight: 'orange' },
    { name: 'Wheat', sub: 'Sharbati', aiPrice: 28, marketPrice: 26, img: '🌾', highlight: 'orange' },
    { name: 'Tomatoes', sub: 'Red Cherry', aiPrice: 23, marketPrice: 25, img: '🍅', highlight: 'teal' },
    { name: 'Mangoes', sub: 'Alphonso', aiPrice: 109, marketPrice: 105, img: '🥭', highlight: 'green' },
  ])
  const [productsLoading, setProductsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setTrendsLoading(true)
      setProductsLoading(true)
      try {
        const [trendsData, productsData] = await Promise.all([
          getRegionalDemandTrends(),
          getTopCropsPredictions()
        ])
        if (!cancelled) {
          setTrends(trendsData)
          setProducts(productsData)
        }
      } catch (e) {
        // Using initial fallback state
      } finally {
        if (!cancelled) {
          setTrendsLoading(false)
          setProductsLoading(false)
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  // AI Farm Assistant chat state (with RAG sources & Agentic Tools)
  type ChatSource = { title: string; topic?: string; source: string; similarity: number }
  type ChatMsg = { role: 'user' | 'model'; text: string; sources?: ChatSource[]; toolsUsed?: ExecutedTool[]; retrievalMs?: number }
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { role: 'model', text: `🌾 Hi! I'm FarmNexus Agentic AI — powered by Tool Calling & RAG knowledge! Ask me anything about farming, pricing suggestions, your sales analytics, or recent orders!` },
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatSearching, setChatSearching] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatMountedRef = useRef(false)
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set())

  // RAG initialization state
  const [ragInitProgress, setRagInitProgress] = useState<{ current: number; total: number } | null>(null)
  const [ragReady, setRagReady] = useState(false)

  // Initialize RAG knowledge base on mount
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await initializeKnowledgeBase((current, total) => {
          if (!cancelled) setRagInitProgress({ current, total })
        })
        if (!cancelled) {
          setRagReady(true)
          setRagInitProgress(null)
        }
      } catch (e) {
        console.warn('RAG initialization failed, will fall back to standard chat:', e)
        if (!cancelled) {
          setRagReady(false)
          setRagInitProgress(null)
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  function toggleSourceExpand(idx: number) {
    setExpandedSources((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  async function sendChatMessage() {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    setChatInput('')
    const newMsg: ChatMsg = { role: 'user', text }
    const updatedMsgs = [...chatMessages, newMsg]
    setChatMessages(updatedMsgs)
    setChatLoading(true)
    setChatSearching(true)

    const startTime = performance.now()

    try {
      // 1. Try Backend Agentic AI Orchestrator first
      const agentRes = await askAgenticAI(text, updatedMsgs.map((m) => ({ role: m.role, text: m.text })))
      const totalMs = Math.round(performance.now() - startTime)

      setChatSearching(false)
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: agentRes.response,
          toolsUsed: agentRes.toolsUsed,
          sources: agentRes.sources,
          retrievalMs: totalMs,
        },
      ])
    } catch (agentErr) {
      console.warn('Backend Agent API unavailable, using Client-Side RAG Engine:', agentErr)
      try {
        if (isRAGReady()) {
          const geminiHistory: GeminiMessage[] = updatedMsgs
            .filter((m) => m.role !== 'model' || updatedMsgs.indexOf(m) > 0)
            .map((m) => ({ role: m.role, parts: [{ text: m.text }] }))

          const ragResult = await generateRAGResponse(text, geminiHistory)
          setChatSearching(false)
          setChatMessages((prev) => [
            ...prev,
            {
              role: 'model',
              text: ragResult.answer,
              sources: ragResult.sources,
              retrievalMs: ragResult.retrievalTimeMs,
            },
          ])
        } else {
          setChatSearching(false)
          const geminiHistory: GeminiMessage[] = updatedMsgs
            .filter((m) => m.role !== 'model' || updatedMsgs.indexOf(m) > 0)
            .map((m) => ({ role: m.role, parts: [{ text: m.text }] }))
          const reply = await chatWithFarmAssistant(geminiHistory)
          setChatMessages((prev) => [...prev, { role: 'model', text: reply }])
        }
      } catch (e) {
        console.warn('Fallback chat responder error:', e)
        setChatSearching(false)
        setChatMessages((prev) => [
          ...prev,
          { role: 'model', text: `🌾 FarmNexus AI: Mandi wholesale prices for staple crops like paddy and wheat are holding stable. Drip irrigation is highly recommended to conserve up to 40% water.` },
        ])
      }
    } finally {
      setChatLoading(false)
      setChatSearching(false)
    }
  }

  useEffect(() => {
    if (!chatMountedRef.current) {
      chatMountedRef.current = true
      return
    }
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  const farmerId = user?.id

  useEffect(() => {
    if (!farmerId) return
    let cancelled = false
    async function load() {
      try {
        if (isLocal) {
          const localOrders = Object.values(localOrdersRef).filter((o: any) => o.farmer_id === farmerId)
          const allLocalOrders = Object.values(localOrdersRef)
          const localListings = Object.values(localListingsRef)

          const totalEarnings = localOrders
            .filter((o: any) => o.status === 'delivered' || o.payment_status === 'paid')
            .reduce((sum: number, o: any) => sum + Number(o.total_amount ?? 0), 0)

          const pendingOrders = localOrders
            .filter((o: any) => o.status === 'pending' || o.status === 'placed' || o.status === 'accepted')
            .length

          const activeListings = localListings
            .filter((l: any) => l.farmer_id === farmerId && l.is_active)
            .length

          const monthOrders = localOrders
            .filter((o: any) => o.created_at && o.created_at.startsWith(new Date().toISOString().substring(0, 7)))
            .length

          if (!cancelled) {
            setMetrics({
              totalEarnings,
              pendingOrders,
              activeListings,
              monthOrders
            })

            // Calculate global stats dynamically based on local storage
            const actList = localListings.filter((l: any) => l.is_active && Number(l.quantity_kg) > 0).length
            const regFarm = Object.values(localUsersRef).filter((u: any) => u.role === 'farmer').length
            const ordComp = allLocalOrders.filter((o: any) => o.status === 'delivered').length

            setGlobalActiveListings(actList)
            setGlobalRegisteredFarmers(regFarm)
            setGlobalOrdersCompleted(ordComp)

            // Recent orders
            const recentRows = localOrders
              .sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''))
              .slice(0, 5)

            setRecent(
              recentRows.map((r: any) => ({
                id: String(r.id),
                produce_name: localListingsRef[r.listing_id]?.produce_name ?? 'Local Produce',
                buyer_name: localUsersRef[r.buyer_id]?.name ?? 'Buyer',
                quantity_kg: Number(r.quantity_kg),
                total_amount: Number(r.total_amount),
                status: String(r.status),
              }))
            )
            // Load diagnoses from local storage proxy
            const localDiags = localCropDiagnosesRef[farmerId!] ?? []
            setDiagnoses(localDiags)
            if (localDiags.length > 0 && !selectedDiagnosis) {
              setSelectedDiagnosis(localDiags[0])
            }

            // Load crop loss reports from local storage proxy
            const localLosses = localLossReportsRef[farmerId!] ?? []
            setLossReports(localLosses)
            if (localLosses.length > 0 && !selectedLossReport) {
              setSelectedLossReport(localLosses[0])
            }

            setUsingMock(false)
          }
          return
        }

        // Supabase mode
        const [
          listRes, 
          ordersRes, 
          earningsRes, 
          monthRes,
          globalListingsRes,
          globalFarmersRes,
          globalOrdersRes
        ] = await Promise.all([
          supabase.from('listings').select('id', { count: 'exact', head: true }).eq('farmer_id', farmerId).eq('is_active', true),
          supabase.from('orders').select('id', { count: 'exact', head: true }).eq('farmer_id', farmerId).in('status', ['placed']),
          supabase
            .from('orders')
            .select('total_amount')
            .eq('farmer_id', farmerId)
            .eq('payment_status', 'paid')
            .in('status', ['delivered', 'dispatched', 'accepted']),
          supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('farmer_id', farmerId)
            .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
          supabase.from('listings').select('id', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'farmer'),
          supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'delivered')
        ])

        if (cancelled || listRes.error || ordersRes.error || earningsRes.error || monthRes.error) {
          setUsingMock(true)
          return
        }

        const { data: recentRows, error: recentErr } = await supabase
          .from('orders')
          .select('id, listing_id, buyer_id, quantity_kg, total_amount, status')
          .eq('farmer_id', farmerId)
          .order('created_at', { ascending: false })
          .limit(5)

        if (cancelled) return

        const earnings =
          earningsRes.data?.reduce((sum, r: { total_amount: number | string | null }) => sum + Number(r.total_amount ?? 0), 0) ?? 0

        setMetrics({
          totalEarnings: earnings,
          pendingOrders: ordersRes.count ?? 0,
          activeListings: listRes.count ?? 0,
          monthOrders: monthRes.count ?? 0,
        })

        // Global stats from Supabase
        const actList = globalListingsRes.count ?? 0
        const regFarm = globalFarmersRes.count ?? 0
        const ordComp = globalOrdersRes.count ?? 0

        setGlobalActiveListings(actList)
        setGlobalRegisteredFarmers(regFarm)
        setGlobalOrdersCompleted(ordComp)
        setUsingMock(false)

        if (!recentErr && recentRows && recentRows.length > 0) {
          const listingIds = [...new Set(recentRows.map((r) => r.listing_id).filter(Boolean))] as string[]
          const buyerIds = [...new Set(recentRows.map((r) => r.buyer_id).filter(Boolean))] as string[]
          const { data: nameByListing } = listingIds.length ? await supabase.from('listings').select('id, produce_name').in('id', listingIds) : { data: [] }
          const { data: buyers } = buyerIds.length ? await supabase.from('profiles').select('id, name').in('id', buyerIds) : { data: [] }
          
          const produceMap = Object.fromEntries((nameByListing ?? []).map((l: any) => [l.id, l.produce_name]))
          const buyerMap = Object.fromEntries((buyers ?? []).map((b: any) => [b.id, b.name ?? '—']))
          
          setRecent(
            recentRows.map((r) => ({
              id: String(r.id),
              produce_name: produceMap[r.listing_id as string] ?? '—',
              buyer_name: buyerMap[r.buyer_id as string] ?? '—',
              quantity_kg: Number(r.quantity_kg),
              total_amount: Number(r.total_amount),
              status: String(r.status),
            }))
          )
        }

        // Load diagnoses independently so it doesn't block dashboard if table doesn't exist
        try {
          setLoadingHistory(true)
          const { data: diagsData, error: diagsErr } = await supabase
            .from('crop_diagnoses')
            .select('*')
            .eq('farmer_id', farmerId)
            .order('created_at', { ascending: false })

          if (!cancelled && !diagsErr && diagsData) {
            setDiagnoses(diagsData)
            if (diagsData.length > 0 && !selectedDiagnosis) {
              setSelectedDiagnosis(diagsData[0])
            }
          }
        } catch (err) {
          console.warn('Could not load diagnoses from Supabase:', err)
        } finally {
          if (!cancelled) setLoadingHistory(false)
        }

        // Load crop loss reports independently
        try {
          setLoadingLossHistory(true)
          const { data: lossesData, error: lossesErr } = await supabase
            .from('crop_loss_reports')
            .select('*')
            .eq('farmer_id', farmerId)
            .order('created_at', { ascending: false })

          if (!cancelled && !lossesErr && lossesData) {
            setLossReports(lossesData)
            if (lossesData.length > 0 && !selectedLossReport) {
              setSelectedLossReport(lossesData[0])
            }
          }
        } catch (err) {
          console.warn('Could not load loss reports from Supabase:', err)
        } finally {
          if (!cancelled) setLoadingLossHistory(false)
        }

      } catch {
        if (!cancelled) setUsingMock(true)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [farmerId, isLocal])

  function parseSeverity(text: string): 'low' | 'medium' | 'high' | 'healthy' {
    const normalized = text.toLowerCase()
    if (normalized.includes('severity: high') || normalized.includes('severity**: high')) {
      return 'high'
    }
    if (normalized.includes('severity: low') || normalized.includes('severity**: low')) {
      return 'low'
    }
    if (normalized.includes('healthy') && !normalized.includes('unhealthy')) {
      return 'healthy'
    }
    return 'medium'
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setUploadedImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function handleRunScan(e: React.FormEvent) {
    e.preventDefault()
    if (!uploadedImage || !farmerId) return
    setFeatureLoading(true)
    setScanError(null)

    try {
      const [header, base64Data] = uploadedImage.split(',')
      const mimeType = header.match(/data:(.*?);/)?.[1] || 'image/jpeg'

      const resultText = await analyzeCropImage(base64Data, mimeType, scanCropName || undefined)
      const severity = parseSeverity(resultText)

      if (isLocal) {
        const newDiag = {
          id: `diag-${Date.now()}`,
          farmer_id: farmerId,
          crop_name: scanCropName,
          symptoms: scanSymptoms || null,
          diagnosis: resultText,
          severity,
          image_url: uploadedImage,
          created_at: new Date().toISOString()
        }
        const updatedList = [newDiag, ...(localCropDiagnosesRef[farmerId] ?? [])]
        localCropDiagnosesRef[farmerId] = updatedList
        setDiagnoses(updatedList)
        setSelectedDiagnosis(newDiag)
      } else {
        let finalImageUrl = null
        if (uploadFile) {
          const ext = uploadFile.name.split('.').pop() || 'jpg'
          const path = `${farmerId}/diagnoses/${Date.now()}.${ext}`
          const { error: uploadErr } = await supabase.storage.from('produce-photos').upload(path, uploadFile, { upsert: false })
          if (!uploadErr) {
            const { data: pub } = supabase.storage.from('produce-photos').getPublicUrl(path)
            finalImageUrl = pub.publicUrl
          } else {
            console.warn('Storage upload error:', uploadErr.message)
          }
        }

        const { data: insertedData, error: dbErr } = await supabase
          .from('crop_diagnoses')
          .insert({
            farmer_id: farmerId,
            crop_name: scanCropName,
            symptoms: scanSymptoms || null,
            diagnosis: resultText,
            severity,
            image_url: finalImageUrl
          })
          .select()

        if (dbErr) throw dbErr
        if (insertedData && insertedData[0]) {
          setDiagnoses(prev => [insertedData[0], ...prev])
          setSelectedDiagnosis(insertedData[0])
        }
      }

      setScanCropName('')
      setScanSymptoms('')
      setUploadedImage(null)
      setUploadFile(null)
    } catch (err: any) {
      console.error('Scan error:', err)
      setScanError(err.message || 'An error occurred during diagnostic scan.')
    } finally {
      setFeatureLoading(false)
    }
  }

  async function handleDeleteDiagnosis(id: string) {
    if (!farmerId || !confirm('Are you sure you want to delete this diagnosis record?')) return
    try {
      if (isLocal) {
        const remaining = (localCropDiagnosesRef[farmerId] ?? []).filter((d: any) => d.id !== id)
        localCropDiagnosesRef[farmerId] = remaining
        setDiagnoses(remaining)
        if (selectedDiagnosis?.id === id) {
          setSelectedDiagnosis(remaining.length > 0 ? remaining[0] : null)
        }
      } else {
        const { error } = await supabase.from('crop_diagnoses').delete().eq('id', id)
        if (error) throw error
        setDiagnoses(prev => prev.filter((d: any) => d.id !== id))
        if (selectedDiagnosis?.id === id) {
          const rem = diagnoses.filter((d: any) => d.id !== id)
          setSelectedDiagnosis(rem.length > 0 ? rem[0] : null)
        }
      }
    } catch (err) {
      console.error('Error deleting diagnosis:', err)
      alert('Failed to delete diagnosis')
    }
  }

  const handleLossFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadLossFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setUploadedLossImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function handleRunLossAssessment(e: React.FormEvent) {
    e.preventDefault()
    if (!farmerId) return
    setLossAssessing(true)
    setLossError(null)

    try {
      let base64Data = null
      let mimeType = null
      if (uploadedLossImage) {
        const [header, data] = uploadedLossImage.split(',')
        base64Data = data
        mimeType = header.match(/data:(.*?);/)?.[1] || 'image/jpeg'
      }

      const result = await assessCropDamage(
        base64Data,
        mimeType,
        lossCropName,
        cropAgeWeeks,
        lossCause,
        affectedAreaAcres,
        damageDescription
      )

      if (isLocal) {
        const newReport = {
          id: `loss-${Date.now()}`,
          farmer_id: farmerId,
          crop_name: lossCropName,
          cause_type: lossCause,
          crop_age_weeks: cropAgeWeeks,
          affected_area_acres: affectedAreaAcres,
          description: damageDescription || null,
          assessment_summary: result.summary,
          severity: result.severity,
          estimated_loss_percent: result.estimatedLossPercent,
          remedies: result.remedies,
          insurance_eligibility: result.insuranceEligibility,
          image_url: uploadedLossImage,
          created_at: new Date().toISOString()
        }
        const updatedList = [newReport, ...(localLossReportsRef[farmerId] ?? [])]
        localLossReportsRef[farmerId] = updatedList
        setLossReports(updatedList)
        setSelectedLossReport(newReport)
      } else {
        let finalImageUrl = null
        if (uploadLossFile) {
          const ext = uploadLossFile.name.split('.').pop() || 'jpg'
          const path = `${farmerId}/loss_reports/${Date.now()}.${ext}`
          const { error: uploadErr } = await supabase.storage.from('produce-photos').upload(path, uploadLossFile, { upsert: false })
          if (!uploadErr) {
            const { data: pub } = supabase.storage.from('produce-photos').getPublicUrl(path)
            finalImageUrl = pub.publicUrl
          } else {
            console.warn('Storage upload error:', uploadErr.message)
          }
        }

        const { data: insertedData, error: dbErr } = await supabase
          .from('crop_loss_reports')
          .insert({
            farmer_id: farmerId,
            crop_name: lossCropName,
            cause_type: lossCause,
            crop_age_weeks: cropAgeWeeks,
            affected_area_acres: affectedAreaAcres,
            description: damageDescription || null,
            assessment_summary: result.summary,
            severity: result.severity,
            estimated_loss_percent: result.estimatedLossPercent,
            remedies: result.remedies,
            insurance_eligibility: result.insuranceEligibility,
            image_url: finalImageUrl
          })
          .select()

        if (dbErr) throw dbErr
        if (insertedData && insertedData[0]) {
          setLossReports(prev => [insertedData[0], ...prev])
          setSelectedLossReport(insertedData[0])
        }
      }

      setLossCropName('')
      setCropAgeWeeks(4)
      setLossCause('flood')
      setAffectedAreaAcres(1)
      setDamageDescription('')
      setUploadedLossImage(null)
      setUploadLossFile(null)
    } catch (err: any) {
      console.error('Loss assessment error:', err)
      setLossError(err.message || 'An error occurred during loss assessment.')
    } finally {
      setLossAssessing(false)
    }
  }

  async function handleDeleteLossReport(id: string) {
    if (!farmerId || !confirm('Are you sure you want to delete this loss report record?')) return
    try {
      if (isLocal) {
        const remaining = (localLossReportsRef[farmerId] ?? []).filter((d: any) => d.id !== id)
        localLossReportsRef[farmerId] = remaining
        setLossReports(remaining)
        if (selectedLossReport?.id === id) {
          setSelectedLossReport(remaining.length > 0 ? remaining[0] : null)
        }
      } else {
        const { error } = await supabase.from('crop_loss_reports').delete().eq('id', id)
        if (error) throw error
        setLossReports(prev => prev.filter((d: any) => d.id !== id))
        if (selectedLossReport?.id === id) {
          const rem = lossReports.filter((d: any) => d.id !== id)
          setSelectedLossReport(rem.length > 0 ? rem[0] : null)
        }
      }
    } catch (err) {
      console.error('Error deleting loss report:', err)
      alert('Failed to delete report')
    }
  }

  return (
    <div className="min-h-screen bg-light font-sans pb-16">

      {/* Hero Header mimicking the mockup */}
      <div className="relative mx-auto mt-6 max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col-reverse lg:flex-row items-center justify-between rounded-3xl bg-white p-8 shadow-sm overflow-hidden relative">
          
          <div className="z-10 flex flex-col space-y-4 lg:w-1/2">
            <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl">
              Connecting <br/><span className="text-[#333F4D]">Farmers & Buyers</span>
            </h1>
            <p className="mt-2 max-w-md text-base text-neutral-500 leading-relaxed">
              Empowering agriculture through a smart marketplace for real-time crop trading and direct negotiations.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link to="/farmer/listings/new" className="rounded-full bg-[#2E7D32] px-6 py-3 text-sm font-semibold text-white shadow hover:opacity-90 transition-all">
                Get Started
              </Link>
              <Link to="/farmer/listings" className="rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 transition-all">
                Explore Marketplace ›
              </Link>
            </div>
          </div>

          {/* Hero Illustration placed absolutely or flex box on the right */}
          <div className="lg:w-1/2 flex justify-end h-64 lg:h-[400px] mb-8 lg:mb-0 relative">
             <img 
               src="/images/hero_farmer.png" 
               alt="Farmer connecting via tablet" 
               className="object-contain h-full relative z-10 hover:scale-105 transition-transform duration-700 w-full lg:w-auto"
             />
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#2E7D32]/10 blur-[80px] rounded-full z-0"></div>
          </div>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="mx-auto max-w-7xl px-4 lg:px-8 mt-6 no-print">
        <div className="flex border-b border-neutral-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-[#2E7D32] text-[#2E7D32]'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            🌾 Marketplace Overview
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'health'
                ? 'border-[#2E7D32] text-[#2E7D32]'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            🏥 Crop Health Diagnostics
          </button>
          <button
            onClick={() => setActiveTab('loss')}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'loss'
                ? 'border-[#2E7D32] text-[#2E7D32]'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            🛡️ Loss Assessment Reports
          </button>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <main className="mx-auto max-w-7xl px-4 lg:px-8 mt-8">
        
        {activeTab === 'overview' && (
          <>
            <h2 className="text-xl font-bold text-neutral-800 mb-4">Marketplace Overview</h2>
            
            {/* Metric Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard 
                label="Active Listings" 
                value={String(globalActiveListings)} 
                gradient="from-[#2E7D32] to-[#14532D]" 
                icon="📊" 
              />
              <MetricCard 
                label="Registered Farmers" 
                value={String(globalRegisteredFarmers)} 
                gradient="from-[#F57C00] to-[#E65100]" 
                icon="🍃" 
              />
              <MetricCard 
                label="Orders Completed" 
                value={globalOrdersCompleted >= 1000 ? `${(globalOrdersCompleted / 1000).toFixed(1)}K` : String(globalOrdersCompleted)} 
                gradient="from-[#1F8A70] to-[#0D5C46]" 
                icon="📦" 
              />
              <MetricCard 
                label="Satisfaction Rate" 
                value={globalSatisfactionRate.toFixed(1)} 
                gradient="from-[#333F4D] to-[#1E293B]" 
                icon="⭐⭐⭐⭐" 
                highlight="⭐"
              />
            </div>

            {usingMock && (
              <p className="mt-4 rounded-lg bg-white/60 p-3 text-xs text-neutral-500 backdrop-blur">
                Showing sample data. Map and dynamic prices adapt upon active orders.
              </p>
            )}

            {/* Mid Section: Trending Crops & Products */}
            <div className="mt-6 flex flex-col lg:flex-row gap-6">
              <section className="flex-1 rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-neutral-800 mb-4 flex justify-between items-center">
                  Regional Demand Trends
                  <div className="flex items-center gap-2">
                    {trendsLoading && <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />}
                    <span className="text-[10px] font-semibold text-neutral-400 bg-gradient-to-r from-violet-100 to-indigo-100 px-2 py-1 rounded-full uppercase tracking-wider shadow-sm">✨ AI Generated</span>
                  </div>
                </h2>
                <div className="w-full rounded-2xl bg-gradient-to-br from-[#E8F5E9] to-[#E0F2F1] p-5 space-y-4">
                  {trends.map((item, idx) => (
                    <div key={idx} className="bg-white/80 backdrop-blur rounded-xl p-3 flex items-center gap-4 hover:shadow-md transition-shadow">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ backgroundColor: item.color }}>
                        {item.region.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-semibold text-neutral-800 truncate">{item.region}</p>
                          <span className="text-xs font-bold ml-2 shrink-0" style={{ color: item.color }}>{item.demand}%</span>
                        </div>
                        <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.demand}%`, backgroundColor: item.color }} />
                        </div>
                        <p className="text-[10px] text-neutral-500 mt-1">Top crop: {item.crop}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="flex-1 flex flex-col gap-4">
                 <div className="grid grid-cols-2 gap-4 relative">
                    {productsLoading && (
                      <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center">
                        <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                      </div>
                    )}
                    {products.map((item, idx) => (
                      <div key={idx} className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-50 to-transparent w-16 h-full z-0 opacity-50"></div>
                        <div className="flex gap-3 items-center z-10 w-full">
                           <div className="w-12 h-12 bg-neutral-50 rounded-xl text-2xl flex items-center justify-center shadow-inner shrink-0">{item.img}</div>
                           <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-start">
                               <p className="font-bold text-neutral-800 text-sm truncate">{item.name}</p>
                               <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-2 shrink-0">AI</span>
                             </div>
                             <p className="text-[10px] text-neutral-500 truncate leading-none mt-0.5">{item.sub}</p>
                             <div className="mt-2 flex items-baseline justify-between gap-1 flex-wrap">
                               <p className={`text-[13px] font-extrabold ${item.highlight === 'orange' ? 'text-[#F57C00]' : 'text-[#2E7D32]'}`}>
                                 ₹{item.aiPrice}<span className="text-[9px] font-medium text-neutral-500">/kg</span>
                               </p>
                               <p className="text-[9px] text-neutral-400 font-medium">Market: ₹{item.marketPrice}</p>
                             </div>
                           </div>
                        </div>
                      </div>
                    ))}
                 </div>

                 <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm flex-1 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                       <div>
                         <p className="text-xs text-neutral-500 font-medium tracking-wide">Total Earnings</p>
                         <p className="text-3xl font-extrabold text-neutral-900 mt-1">{formatINR(metrics.totalEarnings)}</p>
                       </div>
                       <div className="w-10 h-10 rounded-full bg-[#1F8A70]/10 flex items-center justify-center text-[#1F8A70]">📈</div>
                    </div>
                    <div className="mt-4">
                       <p className="text-sm font-semibold text-neutral-800 mb-2">Analytics Insights</p>
                       <div className="flex justify-between items-center text-xs border-b border-neutral-50 pb-2">
                         <span className="text-neutral-600">▲ 12% Revenue Growth</span>
                         <span className="font-mono text-neutral-800">{formatINR(5400)}</span>
                       </div>
                       <div className="flex justify-between items-center text-xs pt-2">
                         <span className="font-bold text-[#2E7D32]">■ 94% Order Success</span>
                         <span className="font-mono text-neutral-800">{formatINR(5100)}</span>
                       </div>
                    </div>
                 </div>
              </section>
            </div>

            {/* Bottom Section: Chat & Orders */}
            <div className="mt-6 flex flex-col lg:flex-row gap-6">
               {/* AI Farm Assistant Chat Panel — RAG-Powered */}
               <section className="flex-1 rounded-3xl border border-neutral-100 bg-white shadow-sm overflow-hidden flex flex-col" style={{ minHeight: '360px', maxHeight: '480px' }}>
                 <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-100 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">🌾</div>
                      <div>
                        <h2 className="text-sm font-bold text-neutral-800 leading-none">FarmNexus AI</h2>
                        <p className="text-[10px] text-emerald-500 font-medium">{ragReady ? '● RAG Online' : ragInitProgress ? `⏳ Loading knowledge base... ${ragInitProgress.current}/${ragInitProgress.total}` : '● Online'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {ragReady && (
                        <span className="text-[9px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5"><path d="M5 4a.75.75 0 0 0-.75.75v6.5c0 .414.336.75.75.75h6a.75.75 0 0 0 .75-.75v-6.5A.75.75 0 0 0 11 4H5ZM2.75 2A.75.75 0 0 1 3.5 1.25h9a.75.75 0 0 1 .75.75v1h.5a.75.75 0 0 1 0 1.5h-.5v2h.5a.75.75 0 0 1 0 1.5h-.5v2h.5a.75.75 0 0 1 0 1.5h-.5v1a.75.75 0 0 1-.75.75h-9a.75.75 0 0 1-.75-.75v-1h-.5a.75.75 0 0 1 0-1.5h.5v-2h-.5a.75.75 0 0 1 0-1.5h.5v-2h-.5a.75.75 0 0 1 0-1.5h.5V2Z" /></svg>
                          RAG
                        </span>
                      )}
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">🌾 FarmNexusTECH</span>
                    </div>
                 </div>

                 {/* Message thread */}
                 <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#F8FAFB]">
                   {chatMessages.map((msg, idx) => (
                     <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       {msg.role === 'model' && (
                         <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-[10px] mr-2 shrink-0 mt-1">🌾</div>
                       )}
                       <div className={`max-w-[80%] ${msg.role === 'user' ? '' : ''}`}>
                         <div
                           className={`rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm ${
                             msg.role === 'user'
                               ? 'bg-[#2E7D32] text-white rounded-br-sm'
                               : 'bg-white text-neutral-800 border border-neutral-100 rounded-bl-sm'
                           }`}
                         >
                           {msg.text}
                         </div>

                         {/* Executed Tools Badges */}
                         {msg.role === 'model' && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                           <div className="mt-1.5 flex flex-wrap items-center gap-1">
                             {msg.toolsUsed.map((tool, ti) => (
                               <span
                                 key={ti}
                                 className="text-[9px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 flex items-center gap-1 shadow-xs"
                                 title={JSON.stringify(tool.args)}
                               >
                                 🔧 {tool.name}
                               </span>
                             ))}
                           </div>
                         )}

                         {/* RAG Source Citations */}
                         {msg.role === 'model' && msg.sources && msg.sources.length > 0 && (
                           <div className="mt-1.5 ml-0">
                             <button
                               onClick={() => toggleSourceExpand(idx)}
                               className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-violet-800 transition-colors cursor-pointer bg-violet-50/70 hover:bg-violet-50 px-2 py-1 rounded-lg border border-violet-100/50"
                             >
                               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                 <path d="M2 4a2 2 0 0 1 2-2h4.586A2 2 0 0 1 10 2.586L13.414 6A2 2 0 0 1 14 7.414V12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Z" />
                               </svg>
                               📚 Sources ({msg.sources.length})
                               {msg.retrievalMs != null && (
                                 <span className="text-violet-400 font-normal ml-1">• {msg.retrievalMs}ms</span>
                               )}
                               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={`w-2.5 h-2.5 transition-transform ${expandedSources.has(idx) ? 'rotate-180' : ''}`}>
                                 <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 0 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                               </svg>
                             </button>
                             {expandedSources.has(idx) && (
                               <div className="mt-1 space-y-1 animate-in slide-in-from-top-1 duration-200">
                                 {msg.sources.map((src, si) => (
                                   <div
                                     key={si}
                                     className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-white border border-neutral-100 shadow-sm"
                                   >
                                     <span className="text-[10px] mt-0.5">📄</span>
                                     <div className="flex-1 min-w-0">
                                       <p className="text-[10px] font-semibold text-neutral-700 leading-tight truncate">{src.title}</p>
                                       <p className="text-[9px] text-neutral-400 truncate">{src.source}</p>
                                     </div>
                                     <span className="text-[9px] font-mono text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded shrink-0">
                                       {(src.similarity * 100).toFixed(0)}%
                                     </span>
                                   </div>
                                 ))}
                               </div>
                             )}
                           </div>
                         )}
                       </div>
                     </div>
                   ))}
                   {chatLoading && (
                     <div className="flex justify-start">
                       <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-[10px] mr-2 shrink-0">🌾</div>
                       <div className="bg-white border border-neutral-100 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
                         {chatSearching ? (
                           <span className="flex items-center gap-1.5 text-[10px] text-violet-600">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 animate-spin">
                               <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z" clipRule="evenodd" />
                             </svg>
                             🔍 Searching knowledge base...
                           </span>
                         ) : (
                           <span className="flex gap-1">
                             <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                             <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                             <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                           </span>
                         )}
                       </div>
                     </div>
                   )}
                   <div ref={chatEndRef} />
                 </div>

                 {/* Input row */}
                 <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-t border-neutral-100 bg-white">
                   <input
                     id="farm-assistant-input"
                     type="text"
                     value={chatInput}
                     onChange={(e) => setChatInput(e.target.value)}
                     onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendChatMessage() } }}
                     placeholder="Ask anything about farming…"
                     className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 transition-all"
                   />
                   <button
                     type="button"
                     id="farm-assistant-send-btn"
                     onClick={() => void sendChatMessage()}
                     disabled={chatLoading || !chatInput.trim()}
                     className="w-8 h-8 rounded-xl bg-[#2E7D32] flex items-center justify-center text-white shadow hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                       <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
                     </svg>
                   </button>
                 </div>
               </section>

               {/* Recent Orders Panel */}
               <section className="flex-1 rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-neutral-800">Recent Orders</h2>
                    <Link to="/farmer/orders" className="text-xs font-normal text-primary hover:underline bg-neutral-100 px-2 py-1 rounded">ALL ORDERS ››</Link>
                 </div>
                 <div className="space-y-4">
                    {recent.slice(0, 3).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 rounded-2xl border border-neutral-50 hover:shadow-sm transition-all bg-[#fafafa]">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl">
                              {order.produce_name.includes('Tomato') ? '🍅' : '🌾'}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-neutral-800">{order.buyer_name}</p>
                              <p className="text-xs text-neutral-500">■ {order.quantity_kg}kg</p>
                            </div>
                         </div>
                         <div className="flex flex-col items-end">
                           <p className="font-mono text-sm font-bold text-neutral-600">{formatINR(order.total_amount)}</p>
                           <span className={`px-2 py-0.5 mt-1 rounded text-[10px] font-bold uppercase tracking-wide ${
                              order.status === 'delivered' ? 'bg-[#1F8A70]/10 text-[#1F8A70]' : 'bg-amber-100 text-amber-800'
                           }`}>
                             {order.status}
                           </span>
                         </div>
                      </div>
                    ))}
                    {recent.length === 0 && (
                       <p className="text-sm text-neutral-500 italic p-4 text-center">No recent orders found.</p>
                    )}
                 </div>
               </section>
            </div>
          </>
        )}

          {activeTab === 'health' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
            {/* Diagnostics Form Panel */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl border border-neutral-100 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-neutral-800 mb-2 flex items-center gap-2">
                  🌿 Crop Diagnostic Scanner
                </h2>
                <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
                  Take a high-quality photo of your affected crop or plants, enter any symptoms you observe, and let Gemini AI run a diagnostic scan to detect diseases and suggest treatments.
                </p>

                <form onSubmit={handleRunScan} className="space-y-5">
                  {/* Image Upload Area */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">Crop Image (Required)</label>
                    <div 
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                        uploadedImage 
                          ? 'border-emerald-300 bg-emerald-50/20' 
                          : 'border-neutral-200 hover:border-emerald-400 bg-neutral-50/50'
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadedImage ? (
                        <div className="relative inline-block">
                          <img 
                            src={uploadedImage} 
                            alt="Crop preview" 
                            className="max-h-48 object-contain rounded-xl shadow-sm mx-auto"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setUploadedImage(null)
                              setUploadFile(null)
                            }}
                            className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 shadow"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-4xl">📸</div>
                          <p className="text-xs font-medium text-neutral-600">Click to upload or take a photo of the crop</p>
                          <p className="text-[10px] text-neutral-400">Supports PNG, JPG, JPEG up to 5MB</p>
                        </div>
                      )}
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">Crop Name (e.g. Tomatoes, Mangoes)</label>
                      <input 
                        type="text" 
                        value={scanCropName}
                        onChange={(e) => setScanCropName(e.target.value)}
                        placeholder="Enter crop type..." 
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-700 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">Symptoms Observed (Optional)</label>
                      <input 
                        type="text" 
                        value={scanSymptoms}
                        onChange={(e) => setScanSymptoms(e.target.value)}
                        placeholder="e.g. yellow spots on leaves, dry roots" 
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-700 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 transition-all"
                      />
                    </div>
                  </div>

                  {scanError && (
                    <p className="text-xs text-red-500 font-semibold">{scanError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={featureLoading || !uploadedImage}
                    className="w-full py-3 bg-[#2E7D32] hover:opacity-90 disabled:opacity-40 text-white font-bold rounded-xl shadow transition-all flex items-center justify-center gap-2 text-xs"
                  >
                    {featureLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Analyzing Crop Health via Gemini...
                      </>
                    ) : (
                      <>
                        ⚡ Run Diagnostic Scan
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Scan Result Viewer */}
              {selectedDiagnosis ? (
                <div className="bg-white rounded-3xl border border-neutral-100 p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-start flex-wrap gap-2 pb-4 border-b border-neutral-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🏥</span>
                        <h3 className="text-lg font-bold text-neutral-800">{selectedDiagnosis.crop_name} Report</h3>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-1">
                        Scanned on {new Date(selectedDiagnosis.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        selectedDiagnosis.severity === 'high' ? 'bg-red-50 text-red-700 border border-red-100' :
                        selectedDiagnosis.severity === 'medium' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                        selectedDiagnosis.severity === 'low' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}>
                        {selectedDiagnosis.severity} severity
                      </span>
                    </div>
                  </div>

                  {selectedDiagnosis.image_url && (
                    <div className="rounded-2xl overflow-hidden max-h-64 border border-neutral-100 shadow-inner bg-neutral-50 flex items-center justify-center">
                      <img 
                        src={selectedDiagnosis.image_url} 
                        alt="Scanned crop" 
                        className="max-h-64 object-contain"
                      />
                    </div>
                  )}

                  {selectedDiagnosis.symptoms && (
                    <div className="bg-neutral-50 rounded-2xl p-4 text-xs">
                      <p className="font-semibold text-neutral-600 mb-1">Symptoms Described:</p>
                      <p className="text-neutral-700">{selectedDiagnosis.symptoms}</p>
                    </div>
                  )}

                  {/* Analysis details parsed from markdown */}
                  <div className="prose max-w-none text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap font-sans bg-emerald-50/10 rounded-2xl border border-emerald-100/50 p-5">
                    {selectedDiagnosis.diagnosis}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-neutral-100 p-8 shadow-sm text-center text-neutral-500">
                  <span className="text-5xl block mb-3">🌿</span>
                  <p className="text-sm font-semibold">No Scan Loaded</p>
                  <p className="text-xs text-neutral-400 mt-1">Run a diagnostic scan above or select a previous diagnosis from the log history.</p>
                </div>
              )}
            </div>

            {/* History Log Sidebar */}
            <div className="bg-white rounded-3xl border border-neutral-100 p-6 shadow-sm flex flex-col h-[600px]">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-neutral-800">Diagnosis Log History</h3>
                <p className="text-[10px] text-neutral-400 mt-0.5">Records of past crop health checks</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {loadingHistory ? (
                  <div className="flex items-center justify-center h-48">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                  </div>
                ) : diagnoses.length > 0 ? (
                  diagnoses.map((diag) => (
                    <div 
                      key={diag.id} 
                      onClick={() => setSelectedDiagnosis(diag)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 relative ${
                        selectedDiagnosis?.id === diag.id 
                          ? 'border-emerald-500 bg-emerald-50/10 shadow-sm' 
                          : 'border-neutral-100 hover:border-neutral-200 bg-neutral-50/30'
                      }`}
                    >
                      {diag.image_url ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-neutral-100 bg-white">
                          <img src={diag.image_url} alt="Crop" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-neutral-100 shrink-0 flex items-center justify-center text-xl">
                          🌾
                        </div>
                      )}
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <p className="font-bold text-sm text-neutral-800 truncate">{diag.crop_name}</p>
                        </div>
                        <p className="text-[10px] text-neutral-500 truncate">{diag.symptoms || 'No description'}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            diag.severity === 'high' ? 'bg-red-100 text-red-800' :
                            diag.severity === 'medium' ? 'bg-orange-100 text-orange-800' :
                            diag.severity === 'low' ? 'bg-amber-100 text-amber-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {diag.severity}
                          </span>
                          <span className="text-[9px] text-neutral-400">
                            {new Date(diag.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleDeleteDiagnosis(diag.id)
                        }}
                        className="absolute top-2 right-2 text-neutral-300 hover:text-red-500 transition-colors p-1"
                        title="Delete log entry"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-neutral-400 py-12 text-xs italic">
                    No previous diagnoses.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'loss' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
            {/* Loss Assessment Form Panel */}
            <div className="lg:col-span-2 space-y-6 no-print">
              <div className="bg-white rounded-3xl border border-neutral-100 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-neutral-800 mb-2 flex items-center gap-2">
                  🛡️ Crop Loss Surveyor
                </h2>
                <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
                  Submit details of crop damages caused by adverse weather conditions, diseases, or pests. Gemini AI will audit the parameters and generate an official survey report for insurance PMFBY eligibility claims.
                </p>

                <form onSubmit={handleRunLossAssessment} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">Upload Crop Damage Photo (Optional)</label>
                    <div 
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                        uploadedLossImage 
                          ? 'border-emerald-300 bg-emerald-50/20' 
                          : 'border-neutral-200 hover:border-emerald-400 bg-neutral-50/50'
                      }`}
                      onClick={() => lossFileInputRef.current?.click()}
                    >
                      {uploadedLossImage ? (
                        <div className="relative inline-block">
                          <img 
                            src={uploadedLossImage} 
                            alt="Crop damage preview" 
                            className="max-h-48 object-contain rounded-xl shadow-sm mx-auto"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setUploadedLossImage(null)
                              setUploadLossFile(null)
                            }}
                            className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 shadow"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-4xl">📸</div>
                          <p className="text-xs font-medium text-neutral-600">Click to upload photo of crop damage</p>
                          <p className="text-[10px] text-neutral-400">Supports PNG, JPG, JPEG up to 5MB</p>
                        </div>
                      )}
                      <input 
                        type="file" 
                        ref={lossFileInputRef} 
                        onChange={handleLossFileChange}
                        accept="image/*"
                        className="hidden" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">Crop Name (e.g. Wheat, Basmati Rice)</label>
                      <input 
                        type="text" 
                        value={lossCropName}
                        onChange={(e) => setLossCropName(e.target.value)}
                        placeholder="e.g. Wheat flour, Paddy" 
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-700 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">Crop Age (Weeks)</label>
                      <input 
                        type="number" 
                        value={cropAgeWeeks}
                        onChange={(e) => setCropAgeWeeks(Number(e.target.value))}
                        min="1"
                        max="52"
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-700 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">Hazard / Cause of Damage</label>
                      <select
                        value={lossCause}
                        onChange={(e) => setLossCause(e.target.value)}
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-700 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 transition-all"
                      >
                        <option value="flood">🌊 Flood / Waterlogging</option>
                        <option value="drought">☀️ Drought / Heatwave</option>
                        <option value="hail">❄️ Hailstorm / Frost</option>
                        <option value="pest">🐛 Pest Infestation</option>
                        <option value="disease">🍂 Crop Disease outbreak</option>
                        <option value="other">❓ Other cause</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">Affected Area (Acres)</label>
                      <input 
                        type="number" 
                        value={affectedAreaAcres}
                        onChange={(e) => setAffectedAreaAcres(Number(e.target.value))}
                        min="0.1"
                        step="0.1"
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-700 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">Damage Description & Context</label>
                    <textarea 
                      value={damageDescription}
                      onChange={(e) => setDamageDescription(e.target.value)}
                      placeholder="Explain what happened (e.g. unseasonal rain flooded Nashik fields, crop fully submerged for 4 days)..." 
                      rows={3}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-700 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 transition-all resize-none"
                      required
                    />
                  </div>

                  {lossError && (
                    <p className="text-xs text-red-500 font-semibold">{lossError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={lossAssessing}
                    className="w-full py-3 bg-[#2E7D32] hover:opacity-90 disabled:opacity-40 text-white font-bold rounded-xl shadow transition-all flex items-center justify-center gap-2 text-xs"
                  >
                    {lossAssessing ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Auditing loss calculations via Gemini...
                      </>
                    ) : (
                      <>
                        🛡️ Assess Damage & Generate Report
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Assessment Report View */}
            <div className="lg:col-span-2 space-y-6">
              {selectedLossReport ? (
                <div className="bg-white rounded-3xl border border-neutral-200 p-6 shadow-md relative overflow-hidden space-y-6" id="printable-loss-report">
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-50 to-transparent w-32 h-full z-0 opacity-40 no-print"></div>
                  
                  {/* Print Stylesheet */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                      body {
                        background-color: white !important;
                        color: black !important;
                      }
                      .no-print, nav, header, footer, button, form, aside, .tabs-container {
                        display: none !important;
                      }
                      #printable-loss-report {
                        border: 2px solid #1b4332 !important;
                        padding: 40px !important;
                        margin: 0 !important;
                        border-radius: 12px !important;
                        box-shadow: none !important;
                        width: 100% !important;
                      }
                      .print-border {
                        border: 1px solid #ddd !important;
                      }
                    }
                  `}} />

                  {/* Document Header */}
                  <div className="text-center border-b-2 border-[#1b4332] pb-6 relative z-10">
                    <span className="text-3xl block mb-1">🌾</span>
                    <h2 className="text-lg font-extrabold text-[#1b4332] tracking-wider uppercase">FARMNEX DIGITAL CROP ASSURANCE REPORT</h2>
                    <p className="text-[10px] text-neutral-500 font-semibold tracking-widest uppercase">Agricultural Audit & Surveyor Loss Assessment Certificate</p>
                  </div>

                  {/* Print Control Option */}
                  <div className="flex justify-between items-center no-print">
                    <span className="text-[10px] text-neutral-400 bg-neutral-100 px-2.5 py-1 rounded">Report ID: {selectedLossReport.id}</span>
                    <button 
                      onClick={() => window.print()}
                      className="px-4 py-2 border border-neutral-300 rounded-xl bg-white hover:bg-neutral-50 text-neutral-700 font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-all"
                    >
                      🖨️ Print Certificate / Save PDF
                    </button>
                  </div>

                  {/* Survey parameters table */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs relative z-10 bg-neutral-50/50 rounded-2xl p-4 border border-neutral-100 print-border">
                    <div>
                      <p className="font-semibold text-neutral-500 uppercase tracking-wide text-[9px]">Farmer Name</p>
                      <p className="font-bold text-neutral-800 mt-0.5">{profile?.name || 'Assigned Farmer'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-500 uppercase tracking-wide text-[9px]">Date Generated</p>
                      <p className="font-bold text-neutral-800 mt-0.5">
                        {new Date(selectedLossReport.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-500 uppercase tracking-wide text-[9px]">Crop Name</p>
                      <p className="font-bold text-neutral-800 mt-0.5">{selectedLossReport.crop_name}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-500 uppercase tracking-wide text-[9px]">Crop Age</p>
                      <p className="font-bold text-[#2E7D32] mt-0.5">{selectedLossReport.crop_age_weeks} Weeks</p>
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-500 uppercase tracking-wide text-[9px]">Affected Area</p>
                      <p className="font-bold text-neutral-800 mt-0.5">{selectedLossReport.affected_area_acres} Acres</p>
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-500 uppercase tracking-wide text-[9px]">Reported Hazard</p>
                      <p className="font-bold text-neutral-800 mt-0.5 capitalize">{selectedLossReport.cause_type}</p>
                    </div>
                  </div>

                  {/* Loss Metrics Panel */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                    <div className="rounded-2xl bg-red-50/50 border border-red-100 p-4 text-center flex flex-col justify-center items-center">
                      <p className="text-[10px] font-bold text-red-800 uppercase tracking-widest mb-1">Estimated Yield Loss</p>
                      <p className="text-4xl font-extrabold text-red-600">{selectedLossReport.estimated_loss_percent}%</p>
                    </div>
                    <div className="rounded-2xl bg-amber-50/50 border border-amber-100 p-4 text-center flex flex-col justify-center items-center">
                      <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-1">Severity Classification</p>
                      <span className={`px-3 py-1 mt-1 rounded-full text-xs font-black uppercase tracking-widest ${
                        selectedLossReport.severity === 'catastrophic' ? 'bg-red-200 text-red-900 border border-red-300 animate-pulse' :
                        selectedLossReport.severity === 'high' ? 'bg-orange-200 text-orange-900 border border-orange-300' :
                        selectedLossReport.severity === 'medium' ? 'bg-amber-200 text-amber-900 border border-amber-300' :
                        'bg-emerald-200 text-emerald-900 border border-emerald-300'
                      }`}>
                        {selectedLossReport.severity}
                      </span>
                    </div>
                  </div>

                  {selectedLossReport.image_url && (
                    <div className="rounded-2xl overflow-hidden max-h-64 border border-neutral-100 shadow-inner bg-neutral-50 flex items-center justify-center relative z-10 no-print">
                      <img 
                        src={selectedLossReport.image_url} 
                        alt="Audited crop damage" 
                        className="max-h-64 object-contain"
                      />
                    </div>
                  )}

                  {selectedLossReport.description && (
                    <div className="bg-neutral-50 rounded-2xl p-4 text-xs relative z-10 print-border">
                      <p className="font-semibold text-neutral-600 mb-1">Farmer Description & Claim Context:</p>
                      <p className="text-neutral-700 italic">"{selectedLossReport.description}"</p>
                    </div>
                  )}

                  {/* Audit details */}
                  <div className="space-y-4 relative z-10">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2 flex items-center gap-1.5 text-[#1b4332]">
                        <span>🔍</span> Loss Survey Analysis Summary
                      </h4>
                      <p className="text-xs text-neutral-700 leading-relaxed bg-[#f8fafb] rounded-2xl p-4 border border-neutral-100/50 print-border">
                        {selectedLossReport.assessment_summary}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2 flex items-center gap-1.5 text-[#1b4332]">
                          <span>🩹</span> Recommended Remedies
                        </h4>
                        <div className="text-xs text-neutral-700 leading-relaxed bg-[#f8fafb] rounded-2xl p-4 border border-neutral-100/50 prose print-border whitespace-pre-wrap">
                          {selectedLossReport.remedies}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2 flex items-center gap-1.5 text-[#1b4332]">
                          <span>🛡️</span> PMFBY Insurance Claim Advisory
                        </h4>
                        <div className="text-xs text-neutral-700 leading-relaxed bg-[#f8fafb] rounded-2xl p-4 border border-neutral-100/50 print-border whitespace-pre-wrap">
                          {selectedLossReport.insurance_eligibility}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Certified Signoff stamp */}
                  <div className="flex justify-between items-end border-t border-neutral-200 pt-6 mt-4 relative z-10">
                    <div className="text-[10px] text-neutral-400">
                      <p>Survey Generated digitally via FarmNexus AI.</p>
                      <p className="mt-0.5 font-medium text-neutral-500">Google Gemini 2.5 Flash Auditor</p>
                    </div>
                    <div className="text-center relative">
                      <div className="absolute -top-12 -left-4 w-20 h-20 rounded-full border-4 border-emerald-700/10 flex items-center justify-center select-none text-[8px] font-black text-emerald-700/20 rotate-12 pointer-events-none">
                        FARMNEX AUDIT
                      </div>
                      <div className="w-32 border-b border-neutral-300 pb-2">
                        <span className="font-mono text-xs italic text-emerald-800 select-none">AI Auditor Stamp</span>
                      </div>
                      <p className="text-[9px] text-neutral-400 mt-1 uppercase tracking-wider">Verification Signature</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-neutral-100 p-8 shadow-sm text-center text-neutral-500">
                  <span className="text-5xl block mb-3">🛡️</span>
                  <p className="text-sm font-semibold">No Report Loaded</p>
                  <p className="text-xs text-neutral-400 mt-1">Complete the survey scanner form on the left or select a previous report from history.</p>
                </div>
              )}
            </div>

            {/* History Log Sidebar */}
            <div className="bg-white rounded-3xl border border-neutral-100 p-6 shadow-sm flex flex-col h-[600px] no-print">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-neutral-800">Survey History Log</h3>
                <p className="text-[10px] text-neutral-400 mt-0.5">Records of past crop weather audits</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {loadingLossHistory ? (
                  <div className="flex items-center justify-center h-48">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                  </div>
                ) : lossReports.length > 0 ? (
                  lossReports.map((diag) => (
                    <div 
                      key={diag.id} 
                      onClick={() => setSelectedLossReport(diag)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 relative ${
                        selectedLossReport?.id === diag.id 
                          ? 'border-emerald-500 bg-emerald-50/10 shadow-sm' 
                          : 'border-neutral-100 hover:border-neutral-200 bg-neutral-50/30'
                      }`}
                    >
                      {diag.image_url ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-neutral-100 bg-white">
                          <img src={diag.image_url} alt="Crop damage" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-neutral-100 shrink-0 flex items-center justify-center text-xl">
                          🛡️
                        </div>
                      )}
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <p className="font-bold text-sm text-neutral-800 truncate">{diag.crop_name}</p>
                        </div>
                        <p className="text-[10px] text-neutral-500 truncate capitalize">{diag.cause_type} damage</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            diag.severity === 'catastrophic' ? 'bg-red-100 text-red-850 font-black' :
                            diag.severity === 'high' ? 'bg-red-100 text-red-800' :
                            diag.severity === 'medium' ? 'bg-orange-100 text-orange-850' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {diag.estimated_loss_percent}% Loss
                          </span>
                          <span className="text-[9px] text-neutral-400">
                            {new Date(diag.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleDeleteLossReport(diag.id)
                        }}
                        className="absolute top-2 right-2 text-neutral-300 hover:text-red-500 transition-colors p-1"
                        title="Delete log entry"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-neutral-400 py-12 text-xs italic">
                    No loss reports.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function MetricCard({ label, value, icon, gradient, highlight }: { label: string; value: string; icon: string; gradient: string; highlight?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg hover:-translate-y-1 transition-transform duration-300`}>
      <div className="relative z-10">
        <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">{label}</p>
        <div className="mt-3 flex items-end justify-between">
          <p className="text-3xl font-extrabold">{value}</p>
          <span className="text-base font-bold bg-white/20 px-2 py-1 rounded-lg backdrop-blur flex items-center gap-1">
             {highlight} {icon}
          </span>
        </div>
      </div>
      {/* Abstract decorative orb */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl z-0"></div>
    </div>
  )
}
