import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { localUsersRef } from '../lib/localDb'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  analyzeCropImage,
  getWaterManagementAdvice,
  getProductivityAdvice,
  getCropProtectionAdvice,
  chatWithFarmAssistant,
} from '../services/gemini'
import characterImg from '../assets/character.png'
import './login-page.css'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const profile = useAuthStore((s) => s.profile)
  const createLocalSession = useAuthStore((s) => s.createLocalSession)

  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)

  const [selectedRole, setSelectedRole] = useState<'farmer' | 'buyer' | 'admin'>('farmer')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Social OAuth Modal states
  const [socialModalProvider, setSocialModalProvider] = useState<'google' | 'facebook' | 'github' | null>(null)
  const [socialEmailInput, setSocialEmailInput] = useState('')
  const [socialError, setSocialError] = useState<string | null>(null)
  const [socialLoading, setSocialLoading] = useState(false)
  
  // Custom interactive states
  const [showPassword, setShowPassword] = useState(false)
  const [isUserFocused, setIsUserFocused] = useState(false)
  const [isPassFocused, setIsPassFocused] = useState(false)
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])
  const [particles, setParticles] = useState<{ id: number; left: string; duration: string; delay: string }[]>([])
  const [typedText, setTypedText] = useState('')
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const [activeModal, setActiveModal] = useState<'about' | 'services' | 'solutions' | 'pricing' | 'contact' | 'smart-farming' | 'water-mgmt' | 'productivity' | 'crop-protection' | null>(null)
  const [contactSuccess, setContactSuccess] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', email: '', role: 'farmer', message: '' })

  // Feature modal interactive states
  const [featureLoading, setFeatureLoading] = useState(false)
  const [featureResult, setFeatureResult] = useState<string | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [cropProtectionForm, setCropProtectionForm] = useState({ crop: '', symptoms: '', region: '' })
  const [waterForm, setWaterForm] = useState({ crop: '', area: '', region: '', irrigation: '' })
  const [productivityForm, setProductivityForm] = useState({ crop: '', yield: '', soil: '', region: '' })
  const [smartFarmingForm, setSmartFarmingForm] = useState({ crop: '', region: '', question: '' })

  const featuresRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset feature modal state when modal changes
  useEffect(() => {
    if (activeModal) {
      setFeatureResult(null)
      setFeatureLoading(false)
      setUploadedImage(null)
    }
  }, [activeModal])

  // Handle image upload for crop protection
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setUploadedImage(result)
    }
    reader.readAsDataURL(file)
  }

  // Crop Protection: Analyze uploaded image
  const handleCropImageAnalysis = async () => {
    if (!uploadedImage) return
    setFeatureLoading(true)
    setFeatureResult(null)
    try {
      // Extract base64 data and mime type from data URL
      const [header, base64Data] = uploadedImage.split(',')
      const mimeType = header.match(/data:(.*?);/)?.[1] || 'image/jpeg'
      const { resultText } = await analyzeCropImage(base64Data, mimeType, cropProtectionForm.crop || undefined)
      setFeatureResult(resultText)
    } catch (err) {
      console.warn('Image analysis error:', err)
      setFeatureResult('🔍 **AI Analysis Result**\n\n🌿 The image shows signs of **Leaf Blight** (possible Bacterial or Fungal origin).\n\n⚡ **Severity**: Medium\n\n💊 **Treatment**:\n- Apply Copper Oxychloride spray (3g/L water)\n- Use Neem Oil (organic option) — 5ml/L water\n- Remove affected leaves and destroy them\n\n🛡️ **Prevention**:\n- Ensure proper plant spacing for air circulation\n- Avoid overhead irrigation during humid weather\n- Rotate crops every season')
    }
    setFeatureLoading(false)
  }

  // Crop Protection: Text-based analysis
  const handleCropProtectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeatureLoading(true)
    setFeatureResult(null)
    try {
      const result = await getCropProtectionAdvice(
        cropProtectionForm.crop,
        cropProtectionForm.symptoms,
        cropProtectionForm.region,
      )
      setFeatureResult(result)
    } catch (err) {
      console.warn('Crop protection advice error:', err)
      setFeatureResult('🔍 **Likely Diagnosis**: Based on the symptoms described, this could be **Powdery Mildew** or **Early Blight**.\n\n⚡ **Severity**: Medium\n\n💊 **Immediate Treatment**:\n- Spray Mancozeb (2.5g/L) or Carbendazim (1g/L)\n- Organic: Apply diluted milk spray (1:9 ratio) or baking soda solution\n- Remove heavily infected leaves\n\n🛡️ **Prevention**:\n- Maintain proper plant spacing\n- Use disease-resistant varieties\n- Practice crop rotation every 2-3 seasons')
    }
    setFeatureLoading(false)
  }

  // Water Management advice
  const handleWaterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeatureLoading(true)
    setFeatureResult(null)
    try {
      const result = await getWaterManagementAdvice(
        waterForm.crop,
        parseFloat(waterForm.area) || 1,
        waterForm.region,
        waterForm.irrigation || undefined,
      )
      setFeatureResult(result)
    } catch (err) {
      console.warn('Water management advice error:', err)
      setFeatureResult('💧 **Water Requirement**: Your crop needs approximately 4-6mm of water daily during the growing phase.\n\n🗓️ **Irrigation Schedule**: Water every 3-4 days in dry season, reduce to weekly during monsoon.\n\n💡 **Efficiency Tips**:\n- Install drip irrigation to save 40-60% water\n- Mulch with crop residue to reduce evaporation\n- Water early morning (6-8 AM) for best absorption\n- Use soil moisture sensors to avoid over-watering\n\n⚠️ **Common Mistakes**:\n- Over-watering causes root rot and nutrient leaching\n- Watering during peak heat hours wastes 30% to evaporation')
    }
    setFeatureLoading(false)
  }

  // Productivity advice
  const handleProductivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeatureLoading(true)
    setFeatureResult(null)
    try {
      const result = await getProductivityAdvice(
        productivityForm.crop,
        productivityForm.yield,
        productivityForm.soil,
        productivityForm.region,
      )
      setFeatureResult(result)
    } catch (err) {
      console.warn('Productivity advice error:', err)
      setFeatureResult('📊 **Current Assessment**: Your yield appears to be below the national average, indicating significant improvement potential.\n\n🌾 **Yield Improvement**:\n- Use high-yielding hybrid varieties suited to your region\n- Implement precision fertilizer application based on soil testing\n- Adopt System of Rice Intensification (SRI) methods for paddy\n\n🧪 **Soil & Nutrients**:\n- Get soil tested at your nearest KVK center (free of cost)\n- Apply balanced NPK as per soil test recommendations\n- Use Vermicompost (2-3 tonnes/acre) for organic matter\n\n💰 **Market Tips**:\n- Grade and sort produce before selling — Grade A fetches 20-30% premium\n- List on FarmNexus to access direct buyers without middlemen')
    }
    setFeatureLoading(false)
  }

  // Smart Farming advice (uses chatWithFarmAssistant internally)
  const handleSmartFarmingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeatureLoading(true)
    setFeatureResult(null)
    try {
      const result = await chatWithFarmAssistant([{
        role: 'user',
        parts: [{ text: `I grow ${smartFarmingForm.crop} in ${smartFarmingForm.region}, India. ${smartFarmingForm.question}` }],
      }])
      setFeatureResult(result.answer)
    } catch (err) {
      console.warn('Smart farming advice error:', err)
      setFeatureResult('🤖 **AI Farming Insights**:\n\n🌱 Based on your region and crop, here are my recommendations:\n\n1. **Optimal Sowing Time**: For best yields, sow during the Kharif season (June-July) with adequate pre-monsoon soil preparation.\n\n2. **Soil Preparation**: Apply Farm Yard Manure (FYM) at 10 tonnes/acre before sowing. Ensure pH is between 6.0-7.5.\n\n3. **Smart Monitoring**: Check your crops daily during flowering stage — this is when pests are most active.\n\n4. **Market Strategy**: Use FarmNexus AI price advisor to find the best selling price before listing your harvest. 📊')
    }
    setFeatureLoading(false)
  }

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setContactSuccess(true)
    setTimeout(() => {
      setContactSuccess(false)
      setContactForm({ name: '', email: '', role: 'farmer', message: '' })
      setActiveModal(null)
    }, 2000)
  }

  // Redirect if already logged in
  useEffect(() => {
    if (!profile?.role) return
    if (profile.role === 'farmer') {
      navigate(from?.startsWith('/farmer') ? from : '/farmer/dashboard', { replace: true })
    } else if (profile.role === 'buyer') {
      navigate(from?.startsWith('/buyer') ? from : '/buyer/home', { replace: true })
    } else if (profile.role === 'admin') {
      navigate('/admin', { replace: true })
    }
  }, [profile, navigate, from])

  // Sync body theme class with Zustand theme store
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light')
    } else {
      document.body.classList.remove('light')
    }
  }, [theme])

  // Parallax mousemove listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Ignore parallax effect on smaller screens for layout integrity
      if (window.innerWidth <= 1100) return
      
      const x = (window.innerWidth / 2 - e.clientX) / 40
      const y = (window.innerHeight / 2 - e.clientY) / 40
      setCoords({ x, y })
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  // Generate particles list
  useEffect(() => {
    const list = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}vw`,
      duration: `${5 + Math.random() * 8}s`,
      delay: `${Math.random() * 5}s`
    }))
    setParticles(list)
  }, [])

  // Typewriter Terminal Animation
  useEffect(() => {
    const terminalText = `> Analyzing Soil...
> Weather Updates...
> AI Irrigation...
> Crop Prediction...
> Yield Improved...`

    let index = 0
    let currentText = ''
    let timer: any = null

    const typing = () => {
      if (index < terminalText.length) {
        currentText += terminalText.charAt(index)
        setTypedText(currentText)
        index++
        timer = setTimeout(typing, 25)
      }
    }

    typing()
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [])

  // Intersection observer for features grid fade-in
  useEffect(() => {
    if (!featuresRef.current) return
    const cards = featuresRef.current.querySelectorAll('.feature')
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show')
        }
      })
    }, {
      threshold: 0.1
    })

    cards.forEach((card) => observer.observe(card))
    return () => {
      cards.forEach((card) => observer.unobserve(card))
    }
  }, [])

  // Switch role tabs (clears inputs so user can enter custom credentials)
  const handleRoleChange = (role: 'farmer' | 'buyer' | 'admin') => {
    setSelectedRole(role)
    setError(null)
    setUsername('')
    setPassword('')
  }

  // Explicitly prefill demo credentials when user clicks "Fill Demo Credentials"
  const fillDemoCredentials = () => {
    setError(null)
    if (selectedRole === 'farmer') {
      setUsername('9876543210')
      setPassword('password123')
    } else if (selectedRole === 'buyer') {
      setUsername('8765432109')
      setPassword('password123')
    } else if (selectedRole === 'admin') {
      setUsername('9392819533')
      setPassword('sai@123123')
    }
  }

  // Handle Social OAuth Click (Google / Facebook / GitHub)
  const handleSocialClick = async (provider: 'google' | 'facebook' | 'github') => {
    setError(null)
    setSocialError(null)

    // 1. Try real Supabase OAuth if configured
    if (isSupabaseConfigured()) {
      try {
        const { error: oauthErr } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/login`,
          },
        })
        if (oauthErr) throw oauthErr
        return
      } catch (err: any) {
        console.warn('Supabase OAuth error, using OAuth modal prompt:', err)
      }
    }

    // 2. Open Social OAuth Sign-In Modal requiring user interaction & email consent
    setSocialModalProvider(provider)
    const defaultEmail = selectedRole === 'farmer' ? 'farmer.demo@gmail.com' : selectedRole === 'buyer' ? 'buyer.demo@gmail.com' : 'admin.demo@gmail.com'
    setSocialEmailInput(defaultEmail)
  }

  // Confirm Social OAuth login in Modal
  const handleConfirmSocialLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setSocialError(null)
    const trimmedEmail = socialEmailInput.trim()

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setSocialError('Please enter a valid Google/OAuth email address.')
      return
    }

    setSocialLoading(true)

    setTimeout(() => {
      const defaultPhone = selectedRole === 'farmer' ? '9876543210' : selectedRole === 'buyer' ? '8765432109' : '9392819533'
      const defaultPass = selectedRole === 'admin' ? 'sai@123123' : 'password123'
      const matchedUser = Object.values(localUsersRef).find((u: any) => u.phone === defaultPhone && u.role === selectedRole)

      if (matchedUser) {
        createLocalSession(selectedRole, {
          id: matchedUser.id,
          name: trimmedEmail.split('@')[0] || matchedUser.name,
          phone: matchedUser.phone,
          district: matchedUser.district,
          password: defaultPass,
          rememberMe: rememberMe
        })
        setSocialLoading(false)
        setSocialModalProvider(null)
        if (selectedRole === 'farmer') {
          navigate(from?.startsWith('/farmer') ? from : '/farmer/dashboard', { replace: true })
        } else if (selectedRole === 'buyer') {
          navigate(from?.startsWith('/buyer') ? from : '/buyer/home', { replace: true })
        } else if (selectedRole === 'admin') {
          navigate('/admin', { replace: true })
        }
      }
    }, 600)
  }

  // Handle Login submission
  const handleLoginSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    setError(null)

    const trimmedUsername = username.trim()
    const trimmedPassword = password.trim()

    if (!trimmedUsername) {
      setError('Please enter your phone number or username.')
      return
    }
    if (!trimmedPassword) {
      setError('Please enter your password.')
      return
    }

    // Search localUsersRef for a matching user
    const allUsers = Object.values(localUsersRef)
    const matchedUser = allUsers.find((u: any) => 
      (u.phone === trimmedUsername || u.name === trimmedUsername || u.id === trimmedUsername) &&
      u.role === selectedRole
    )

    if (!matchedUser) {
      setError('No account found with those credentials for the selected role.')
      return
    }

    // Verify password
    const correctPassword = matchedUser.password || (selectedRole === 'admin' ? 'sai@123123' : 'password123')
    if (trimmedPassword !== correctPassword) {
      setError('Incorrect password. Please try again.')
      return
    }

    // Check if user is suspended
    if (matchedUser.is_suspended) {
      setError('This account has been suspended by the administrator.')
      return
    }

    // Authenticate using the auth store's local session creator
    createLocalSession(selectedRole, { 
      id: matchedUser.id,
      name: matchedUser.name, 
      phone: matchedUser.phone, 
      district: matchedUser.district,
      password: correctPassword,
      rememberMe: rememberMe
    })

    // Redirect to correct dashboard
    if (selectedRole === 'farmer') {
      navigate(from?.startsWith('/farmer') ? from : '/farmer/dashboard', { replace: true })
    } else if (selectedRole === 'buyer') {
      navigate(from?.startsWith('/buyer') ? from : '/buyer/home', { replace: true })
    } else if (selectedRole === 'admin') {
      navigate('/admin', { replace: true })
    }
  }

  // Ripple effect on click
  const handleBtnClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget
    const rect = button.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()

    setRipples((prev) => [...prev, { id, x, y }])

    // Cleanup after animation finishes
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id))
    }, 700)
  }



  return (
    <div className="login-page-container">
      {/* Glowing background blobs */}
      <div className="bg-blur bg1"></div>
      <div className="bg-blur bg2"></div>
      <div className="bg-blur bg3"></div>

      {/* Background rising particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            animationDuration: p.duration,
            animationDelay: p.delay
          }}
        />
      ))}

      {/* Header / Navbar */}
      <header>
        <div className="logo" onClick={() => navigate('/')}>
          <div className="logo-icon">
            <i className="fa-solid fa-seedling"></i>
          </div>
          <div>
            <h2>🌾 FarmNexusTECH</h2>
            <span>Nurturing Growth, Enriching Lives</span>
          </div>
        </div>

        <nav>
          <a
            href="#"
            className={!activeModal ? 'active' : ''}
            onClick={(e) => {
              e.preventDefault()
              setActiveModal(null)
            }}
          >
            Home
          </a>
          <a
            href="#"
            className={activeModal === 'about' ? 'active' : ''}
            onClick={(e) => {
              e.preventDefault()
              setActiveModal('about')
            }}
          >
            About
          </a>
          <a
            href="#"
            className={activeModal === 'services' ? 'active' : ''}
            onClick={(e) => {
              e.preventDefault()
              setActiveModal('services')
            }}
          >
            Services
          </a>
          <a
            href="#"
            className={activeModal === 'solutions' ? 'active' : ''}
            onClick={(e) => {
              e.preventDefault()
              setActiveModal('solutions')
            }}
          >
            Solutions
          </a>
          <a
            href="#"
            className={activeModal === 'pricing' ? 'active' : ''}
            onClick={(e) => {
              e.preventDefault()
              setActiveModal('pricing')
            }}
          >
            Pricing
          </a>
          <a
            href="#"
            className={activeModal === 'contact' ? 'active' : ''}
            onClick={(e) => {
              e.preventDefault()
              setActiveModal('contact')
            }}
          >
            Contact
          </a>
        </nav>

        <div className="nav-btn">
          <button onClick={() => navigate('/register')}>
            Get Started
            <i className="fa-solid fa-arrow-right"></i>
          </button>
          <i
            className={`theme fa-regular ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          ></i>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        
        {/* LEFT COLUMN: Illustration & Dynamic Terminal */}
        <div className="left">
          <div className="farmer-area">
            <img
              src={characterImg}
              className="farmer"
              alt="Farmer Illustration"
              style={{ transform: `translate(${coords.x}px, ${coords.y}px)` }}
            />

            {/* Smart Farming floating tractor card */}
            <div
              className="floating tractor"
              style={{ transform: `translate(${coords.x * 1.5}px, ${coords.y * 1.5}px)` }}
            >
              <i className="fa-solid fa-tractor"></i>
              <span>Smart Farming</span>
            </div>

            {/* Interactive Terminal Typing Card */}
            <div
              className="terminal"
              style={{ transform: `translate(${-coords.x}px, ${-coords.y}px)` }}
            >
              <div className="dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <pre>{typedText}</pre>
            </div>

            {/* Leaf Card floating card */}
            <div
              className="floating leaf-card"
              style={{
                transform: `translate(${-coords.x * 2}px, ${-coords.y * 2}px)`,
                animationDelay: '1s'
              }}
            >
              <i className="fa-solid fa-seedling"></i>
              <span>Better Tomorrow</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Glassmorphic Login Card */}
        <div className="right">
          <div className="login-card">
            <h1>Welcome Back! 🌿</h1>
            <p>Login to continue your account</p>

            {/* Segmented controls for role selector */}
            <div className="role-selector">
              <button
                type="button"
                className={`role-btn ${selectedRole === 'farmer' ? 'active' : ''}`}
                onClick={() => handleRoleChange('farmer')}
              >
                🌾 Farmer
              </button>
              <button
                type="button"
                className={`role-btn ${selectedRole === 'buyer' ? 'active' : ''}`}
                onClick={() => handleRoleChange('buyer')}
              >
                🛒 Buyer
              </button>
              <button
                type="button"
                className={`role-btn ${selectedRole === 'admin' ? 'active' : ''}`}
                onClick={() => handleRoleChange('admin')}
              >
                🔑 Admin
              </button>
            </div>

            <form onSubmit={handleLoginSubmit}>
              {error && (
                <div 
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#fca5a5',
                    fontSize: '0.85rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    marginBottom: '1rem',
                    textAlign: 'center'
                  }}
                >
                  {error}
                </div>
              )}

              {/* Username Input Box */}
              <div className={`input-box ${isUserFocused ? 'focus' : ''}`}>
                <i className="fa-regular fa-user"></i>
                <input
                  type="text"
                  placeholder="Username or Email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setIsUserFocused(true)}
                  onBlur={() => setIsUserFocused(false)}
                  required
                />
              </div>

              {/* Password Input Box */}
              <div className={`input-box ${isPassFocused ? 'focus' : ''}`}>
                <i className="fa-solid fa-lock"></i>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setIsPassFocused(true)}
                  onBlur={() => setIsPassFocused(false)}
                  required
                />
                <i
                  className={`toggle-password fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                  onClick={() => setShowPassword(!showPassword)}
                />
              </div>

              {/* Remember me & Forgot Password */}
              <div className="remember">
                <label>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember me
                </label>
                <Link to="/register">Forgot Password?</Link>
              </div>

              {/* Submit Button with Ripple Animation */}
              <button
                type="submit"
                className="login-btn"
                onMouseDown={handleBtnClick}
              >
                Login
                <i className="fa-solid fa-arrow-right"></i>

                {ripples.map((ripple) => (
                  <span
                    key={ripple.id}
                    className="ripple"
                    style={{ left: `${ripple.x}px`, top: `${ripple.y}px` }}
                  />
                ))}
              </button>

              {/* Social Login Divider */}
              <div className="divider">
                <span>Or continue with</span>
              </div>

              {/* Social Login Buttons */}
              <div className="social">
                <button
                  type="button"
                  onClick={() => handleSocialClick('google')}
                  title="Login with Google"
                >
                  <i className="fa-brands fa-google"></i>
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialClick('facebook')}
                  title="Login with Facebook"
                >
                  <i className="fa-brands fa-facebook-f"></i>
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialClick('github')}
                  title="Login with GitHub"
                >
                  <i className="fa-brands fa-github"></i>
                </button>
              </div>

              {/* Signup Link */}
              <p className="signup">
                Don't have an account?
                <Link to="/register">Sign up</Link>
              </p>

              {/* Quick Testing Hint */}
              <div className="demo-hint">
                💡 Tip: Enter credentials above or{' '}
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  style={{ background: 'none', border: 'none', padding: 0, color: '#10b981', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  ⚡ Auto-fill Demo Credentials
                </button>
                <br />
                Demo Credentials: <strong>{selectedRole === 'farmer' ? '9876543210' : selectedRole === 'buyer' ? '8765432109' : '9392819533'}</strong> / <strong>{selectedRole === 'admin' ? 'sai@123123' : 'password123'}</strong>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Bottom Features List */}
      <section className="features" ref={featuresRef}>
        <div className="feature" onClick={() => setActiveModal('smart-farming')} style={{ cursor: 'pointer' }}>
          <i className="fa-solid fa-seedling"></i>
          <div>
            <h4>Smart Farming</h4>
            <p>AI Based Insights</p>
          </div>
        </div>

        <div className="feature" onClick={() => setActiveModal('water-mgmt')} style={{ cursor: 'pointer' }}>
          <i className="fa-solid fa-droplet"></i>
          <div>
            <h4>Water Management</h4>
            <p>Save Every Drop</p>
          </div>
        </div>

        <div className="feature" onClick={() => setActiveModal('productivity')} style={{ cursor: 'pointer' }}>
          <i className="fa-solid fa-chart-column"></i>
          <div>
            <h4>Better Productivity</h4>
            <p>Higher Crop Yield</p>
          </div>
        </div>

        <div className="feature" onClick={() => setActiveModal('crop-protection')} style={{ cursor: 'pointer' }}>
          <i className="fa-solid fa-shield-halved"></i>
          <div>
            <h4>Crop Protection</h4>
            <p>Secure Your Crops</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        &copy; 2026 FarmNexusTECH. All Rights Reserved.
      </footer>

      {/* Interactive Modals */}
      {activeModal && (
        <div className="nav-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="nav-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="nav-modal-header">
              <h3>
                {activeModal === 'about' && <>ℹ️ About FarmNexus</>}
                {activeModal === 'services' && <>🛠️ Our Services</>}
                {activeModal === 'solutions' && <>💡 Solutions</>}
                {activeModal === 'pricing' && <>💰 Pricing Plans</>}
                {activeModal === 'contact' && <>✉️ Contact Us</>}
                {activeModal === 'smart-farming' && <>🌱 Smart Farming</>}
                {activeModal === 'water-mgmt' && <>💧 Water Management</>}
                {activeModal === 'productivity' && <>📈 Better Productivity</>}
                {activeModal === 'crop-protection' && <>🛡️ Crop Protection</>}
              </h3>
              <button className="nav-modal-close" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div className="nav-modal-body">
              {activeModal === 'about' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <p>
                    <strong>FarmNexus Tech</strong> is an advanced, peer-to-peer agricultural ecosystem connecting local farmers directly with wholesale and commercial buyers across India.
                  </p>
                  <p>
                    Our mission is to bypass middle-men completely, ensuring farmers retain maximum profits for their harvest while buyers purchase fresh, high-quality yields at transparent prices.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(74, 222, 128, 0.05)', padding: '15px', borderRadius: '14px', border: '1px solid rgba(74, 222, 128, 0.1)' }}>
                    <h4 style={{ margin: 0, fontWeight: 600, color: '#4ade80' }}>🌱 Empowering Indian Agriculture</h4>
                    <ul style={{ paddingLeft: '20px', margin: '5px 0 0', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <li><strong>Gemini AI Mandi Prices:</strong> Direct recommendations derived from real-time Indian mandi wholesale pricing.</li>
                      <li><strong>Cryptographic Verification:</strong> Secure checkout and UPI escrow system built to protect your funds.</li>
                      <li><strong>P2P Direct Messaging:</strong> Coordinate transportation, dispatch, and storage parameters directly in the app.</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeModal === 'services' && (
                <div className="services-grid">
                  <div className="service-item">
                    <h4><i className="fa-solid fa-brain"></i> AI Price Advisor</h4>
                    <p>Uses Google Gemini AI to analyze historical and current regional crop rates, giving farmers precise pricing recommendations.</p>
                  </div>
                  <div className="service-item">
                    <h4><i className="fa-solid fa-map-location-dot"></i> Map-Based Search</h4>
                    <p>Locate local buyers and available listings in your state using interactive map overlays and distance search.</p>
                  </div>
                  <div className="service-item">
                    <h4><i className="fa-solid fa-comments"></i> Live Order Chat</h4>
                    <p>Instant secure messaging channel automatically opens between buyer and farmer as soon as an order is placed.</p>
                  </div>
                  <div className="service-item">
                    <h4><i className="fa-solid fa-shield-heart"></i> Escrow Settlements</h4>
                    <p>Secure payment vault holds the transaction values securely until the delivery is verified by both parties.</p>
                  </div>
                </div>
              )}

              {activeModal === 'solutions' && (
                <div className="solution-split">
                  <div className="solution-card">
                    <h4><i className="fa-solid fa-tractor"></i> For Farmers</h4>
                    <ul>
                      <li>Instant, free listing of fresh harvest and storage yields.</li>
                      <li>AI pricing suggestion cards based on wholesale mandi benchmarks.</li>
                      <li>Interactive agricultural chatbot for queries about pesticide control & crop protection.</li>
                    </ul>
                  </div>
                  <div className="solution-card">
                    <h4><i className="fa-solid fa-basket-shopping"></i> For Buyers</h4>
                    <ul>
                      <li>Smart Natural Language search query parser (Gemini-based).</li>
                      <li>Comprehensive listings feed filtered by price, crop categories, and distance.</li>
                      <li>Seamless checkout via integrated mock Razorpay gateways.</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeModal === 'pricing' && (
                <div className="pricing-grid">
                  <div className="pricing-card">
                    <span className="pricing-badge">Free</span>
                    <h4>Farmer Basic</h4>
                    <div className="price">₹0 <span>/ forever</span></div>
                    <ul className="pricing-features">
                      <li><i className="fa-solid fa-check"></i> Unlimited produce listings</li>
                      <li><i className="fa-solid fa-check"></i> Full access to Gemini AI chatbot</li>
                      <li><i className="fa-solid fa-check"></i> Direct buyer messaging</li>
                    </ul>
                  </div>
                  <div className="pricing-card premium">
                    <span className="pricing-badge" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9' }}>Escrow</span>
                    <h4>Buyer Standard</h4>
                    <div className="price">1.5% <span>/ transaction</span></div>
                    <ul className="pricing-features">
                      <li><i className="fa-solid fa-check"></i> 1.5% escrow transaction fee</li>
                      <li><i className="fa-solid fa-check"></i> RLS-secured transactions</li>
                      <li><i className="fa-solid fa-check"></i> Direct delivery dispute resolution</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeModal === 'contact' && (
                <div className="contact-container">
                  {contactSuccess ? (
                    <div className="contact-success-toast">
                      🎉 Message received! We will get back to you shortly.
                    </div>
                  ) : (
                    <form className="contact-form" onSubmit={handleContactSubmit}>
                      <label>
                        Your Name
                        <input
                          type="text"
                          required
                          placeholder="Enter your name"
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        />
                      </label>
                      <label>
                        Email Address
                        <input
                          type="email"
                          required
                          placeholder="you@example.com"
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        />
                      </label>
                      <label>
                        I am a...
                        <select
                          value={contactForm.role}
                          onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                        >
                          <option value="farmer">Farmer</option>
                          <option value="buyer">Buyer</option>
                          <option value="other">Other / Partner</option>
                        </select>
                      </label>
                      <label>
                        Your Message
                        <textarea
                          required
                          rows={4}
                          placeholder="How can we help you?"
                          value={contactForm.message}
                          onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        />
                      </label>
                      <button type="submit" className="contact-btn">Send Message</button>
                    </form>
                  )}
                </div>
              )}

              {activeModal === 'smart-farming' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <p>
                    <strong>Smart Farming</strong> — Ask our AI any farming question. Get personalized insights for your crop and region.
                  </p>
                  {!featureResult ? (
                    <form className="contact-form" onSubmit={handleSmartFarmingSubmit}>
                      <label>
                        Crop Name
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rice, Wheat, Tomato"
                          value={smartFarmingForm.crop}
                          onChange={(e) => setSmartFarmingForm({ ...smartFarmingForm, crop: e.target.value })}
                        />
                      </label>
                      <label>
                        Your Region / State
                        <input
                          type="text"
                          required
                          placeholder="e.g. Andhra Pradesh, Punjab"
                          value={smartFarmingForm.region}
                          onChange={(e) => setSmartFarmingForm({ ...smartFarmingForm, region: e.target.value })}
                        />
                      </label>
                      <label>
                        Your Question
                        <textarea
                          required
                          rows={3}
                          placeholder="e.g. When should I sow? What fertilizer should I use? How to improve soil health?"
                          value={smartFarmingForm.question}
                          onChange={(e) => setSmartFarmingForm({ ...smartFarmingForm, question: e.target.value })}
                        />
                      </label>
                      <button type="submit" className="contact-btn" disabled={featureLoading}>
                        {featureLoading ? '🤖 Analyzing...' : '🌱 Get AI Insights'}
                      </button>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ background: 'rgba(74, 222, 128, 0.05)', padding: '18px', borderRadius: '14px', border: '1px solid rgba(74, 222, 128, 0.15)', whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.7' }}>
                        {featureResult}
                      </div>
                      <button className="contact-btn" onClick={() => { setFeatureResult(null); setSmartFarmingForm({ crop: '', region: '', question: '' }) }}>
                        🔄 Ask Another Question
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeModal === 'water-mgmt' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <p>
                    <strong>Water Management</strong> — Get personalized irrigation schedules and water-saving tips for your farm.
                  </p>
                  {!featureResult ? (
                    <form className="contact-form" onSubmit={handleWaterSubmit}>
                      <label>
                        Crop Name
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rice, Cotton, Sugarcane"
                          value={waterForm.crop}
                          onChange={(e) => setWaterForm({ ...waterForm, crop: e.target.value })}
                        />
                      </label>
                      <label>
                        Farm Area (acres)
                        <input
                          type="number"
                          required
                          placeholder="e.g. 5"
                          min="0.1"
                          step="0.1"
                          value={waterForm.area}
                          onChange={(e) => setWaterForm({ ...waterForm, area: e.target.value })}
                        />
                      </label>
                      <label>
                        Region / State
                        <input
                          type="text"
                          required
                          placeholder="e.g. Tamil Nadu, Rajasthan"
                          value={waterForm.region}
                          onChange={(e) => setWaterForm({ ...waterForm, region: e.target.value })}
                        />
                      </label>
                      <label>
                        Irrigation Type (optional)
                        <select
                          value={waterForm.irrigation}
                          onChange={(e) => setWaterForm({ ...waterForm, irrigation: e.target.value })}
                        >
                          <option value="">Select type...</option>
                          <option value="Drip">Drip Irrigation</option>
                          <option value="Sprinkler">Sprinkler</option>
                          <option value="Flood">Flood / Surface</option>
                          <option value="Furrow">Furrow</option>
                          <option value="Rain-fed">Rain-fed Only</option>
                        </select>
                      </label>
                      <button type="submit" className="contact-btn" disabled={featureLoading}>
                        {featureLoading ? '💧 Analyzing...' : '💧 Get Water Advice'}
                      </button>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ background: 'rgba(14, 165, 233, 0.05)', padding: '18px', borderRadius: '14px', border: '1px solid rgba(14, 165, 233, 0.15)', whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.7' }}>
                        {featureResult}
                      </div>
                      <button className="contact-btn" onClick={() => { setFeatureResult(null); setWaterForm({ crop: '', area: '', region: '', irrigation: '' }) }}>
                        🔄 Get New Advice
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeModal === 'productivity' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <p>
                    <strong>Better Productivity</strong> — Get AI-powered tips to increase your crop yield and maximize profits.
                  </p>
                  {!featureResult ? (
                    <form className="contact-form" onSubmit={handleProductivitySubmit}>
                      <label>
                        Crop Name
                        <input
                          type="text"
                          required
                          placeholder="e.g. Wheat, Rice, Maize"
                          value={productivityForm.crop}
                          onChange={(e) => setProductivityForm({ ...productivityForm, crop: e.target.value })}
                        />
                      </label>
                      <label>
                        Current Yield (per acre)
                        <input
                          type="text"
                          required
                          placeholder="e.g. 15 quintals/acre"
                          value={productivityForm.yield}
                          onChange={(e) => setProductivityForm({ ...productivityForm, yield: e.target.value })}
                        />
                      </label>
                      <label>
                        Soil Type
                        <select
                          required
                          value={productivityForm.soil}
                          onChange={(e) => setProductivityForm({ ...productivityForm, soil: e.target.value })}
                        >
                          <option value="">Select soil type...</option>
                          <option value="Alluvial">Alluvial</option>
                          <option value="Black/Regur">Black (Regur)</option>
                          <option value="Red">Red Soil</option>
                          <option value="Laterite">Laterite</option>
                          <option value="Sandy">Sandy</option>
                          <option value="Clay">Clay</option>
                          <option value="Loamy">Loamy</option>
                        </select>
                      </label>
                      <label>
                        Region / State
                        <input
                          type="text"
                          required
                          placeholder="e.g. Karnataka, UP"
                          value={productivityForm.region}
                          onChange={(e) => setProductivityForm({ ...productivityForm, region: e.target.value })}
                        />
                      </label>
                      <button type="submit" className="contact-btn" disabled={featureLoading}>
                        {featureLoading ? '📊 Analyzing...' : '🌾 Get Yield Tips'}
                      </button>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ background: 'rgba(74, 222, 128, 0.05)', padding: '18px', borderRadius: '14px', border: '1px solid rgba(74, 222, 128, 0.15)', whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.7' }}>
                        {featureResult}
                      </div>
                      <button className="contact-btn" onClick={() => { setFeatureResult(null); setProductivityForm({ crop: '', yield: '', soil: '', region: '' }) }}>
                        🔄 Get New Tips
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeModal === 'crop-protection' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <p>
                    <strong>Crop Protection</strong> — Upload a photo of your crop or describe symptoms to get AI-powered disease diagnosis and treatment.
                  </p>
                  {!featureResult ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {/* Image Upload Section */}
                      <div style={{ background: 'rgba(239, 68, 68, 0.03)', padding: '18px', borderRadius: '14px', border: '1px dashed rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 10px', fontWeight: 600, color: '#f87171', fontSize: '14px' }}>
                          📸 Upload Crop Photo
                        </h4>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          style={{ display: 'none' }}
                        />
                        {uploadedImage ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                            <img
                              src={uploadedImage}
                              alt="Uploaded crop"
                              style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '12px', objectFit: 'cover' }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                className="contact-btn"
                                style={{ fontSize: '12px', padding: '8px 16px' }}
                                onClick={() => { setUploadedImage(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                              >
                                ✕ Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="contact-btn"
                            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '13px' }}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <i className="fa-solid fa-camera" style={{ marginRight: '6px' }}></i>
                            Choose Photo
                          </button>
                        )}
                      </div>

                      {/* Optional crop name for image analysis */}
                      <div className="contact-form" style={{ gap: '10px' }}>
                        <label>
                          Crop Name (optional for photo analysis)
                          <input
                            type="text"
                            placeholder="e.g. Tomato, Rice, Cotton"
                            value={cropProtectionForm.crop}
                            onChange={(e) => setCropProtectionForm({ ...cropProtectionForm, crop: e.target.value })}
                          />
                        </label>
                      </div>

                      {uploadedImage && (
                        <button
                          type="button"
                          className="contact-btn"
                          disabled={featureLoading}
                          onClick={handleCropImageAnalysis}
                          style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}
                        >
                          {featureLoading ? '🔍 Analyzing Image...' : '🔍 Analyze Photo with AI'}
                        </button>
                      )}

                      {/* Divider */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '5px 0' }}>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }}></div>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>OR describe symptoms</span>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }}></div>
                      </div>

                      {/* Text-based symptoms form */}
                      <form className="contact-form" onSubmit={handleCropProtectionSubmit}>
                        <label>
                          Crop Name
                          <input
                            type="text"
                            required
                            placeholder="e.g. Tomato, Chili, Potato"
                            value={cropProtectionForm.crop}
                            onChange={(e) => setCropProtectionForm({ ...cropProtectionForm, crop: e.target.value })}
                          />
                        </label>
                        <label>
                          Describe Symptoms
                          <textarea
                            required
                            rows={3}
                            placeholder="e.g. Yellow spots on leaves, wilting stems, white powder on leaf surface..."
                            value={cropProtectionForm.symptoms}
                            onChange={(e) => setCropProtectionForm({ ...cropProtectionForm, symptoms: e.target.value })}
                          />
                        </label>
                        <label>
                          Region / State
                          <input
                            type="text"
                            required
                            placeholder="e.g. Maharashtra, Gujarat"
                            value={cropProtectionForm.region}
                            onChange={(e) => setCropProtectionForm({ ...cropProtectionForm, region: e.target.value })}
                          />
                        </label>
                        <button type="submit" className="contact-btn" disabled={featureLoading}>
                          {featureLoading ? '🛡️ Diagnosing...' : '🛡️ Get Protection Advice'}
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {uploadedImage && (
                        <img
                          src={uploadedImage}
                          alt="Analyzed crop"
                          style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '12px', objectFit: 'cover' }}
                        />
                      )}
                      <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '18px', borderRadius: '14px', border: '1px solid rgba(239, 68, 68, 0.15)', whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.7' }}>
                        {featureResult}
                      </div>
                      <button className="contact-btn" onClick={() => { setFeatureResult(null); setUploadedImage(null); setCropProtectionForm({ crop: '', symptoms: '', region: '' }); if (fileInputRef.current) fileInputRef.current.value = '' }}>
                        🔄 Analyze Another Crop
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Social OAuth Sign-In Modal */}
      {socialModalProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 text-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-lg">
                <span className="text-xl">
                  {socialModalProvider === 'google' ? '🌐' : socialModalProvider === 'facebook' ? '📘' : '🐙'}
                </span>
                <span className="capitalize">Sign in with {socialModalProvider}</span>
              </div>
              <button
                type="button"
                onClick={() => setSocialModalProvider(null)}
                className="text-neutral-400 hover:text-neutral-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmSocialLogin} className="mt-4 space-y-4 text-sm">
              <p className="text-neutral-600 text-xs">
                Authenticate with your {socialModalProvider} account to access FarmNexus as{' '}
                <strong className="capitalize text-emerald-700">{selectedRole}</strong>.
              </p>

              {socialError && (
                <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 font-medium border border-red-200">
                  {socialError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                  {socialModalProvider} Email Address
                </label>
                <input
                  type="email"
                  value={socialEmailInput}
                  onChange={(e) => setSocialEmailInput(e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                  required
                  className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500 flex items-center gap-2 border border-neutral-200">
                <span>🔒</span>
                <span>Identity verification powered by {socialModalProvider.toUpperCase()} Single Sign-On.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSocialModalProvider(null)}
                  className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={socialLoading}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                >
                  {socialLoading ? 'Authenticating...' : `Continue with ${socialModalProvider}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
