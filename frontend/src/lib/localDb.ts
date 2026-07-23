// ── FarmNexus Local Storage Proxy database ───────────────────────────────────

function createLocalProxy<T extends object>(key: string, initial: T): T {
  const stored = localStorage.getItem(key)
  const data = stored ? JSON.parse(stored) : initial

  // Initialize window reference for compatibility
  if (key === 'farmnexus_local_orders') (window as any).__farmnexusLocalOrders = data
  if (key === 'farmnexus_local_listings') (window as any).__farmnexusLocalListings = data
  if (key === 'farmnexus_local_messages') (window as any).__farmnexusLocalMessages = data
  if (key === 'farmnexus_local_crop_diagnoses') (window as any).__farmnexusLocalCropDiagnoses = data
  if (key === 'farmnexus_local_loss_reports') (window as any).__farmnexusLocalLossReports = data

  return new Proxy(data, {
    set(target, prop, value) {
      target[prop as keyof T] = value
      localStorage.setItem(key, JSON.stringify(target))
      
      // Update window reference on mutation
      if (key === 'farmnexus_local_orders') (window as any).__farmnexusLocalOrders = target
      if (key === 'farmnexus_local_listings') (window as any).__farmnexusLocalListings = target
      if (key === 'farmnexus_local_messages') (window as any).__farmnexusLocalMessages = target
      if (key === 'farmnexus_local_crop_diagnoses') (window as any).__farmnexusLocalCropDiagnoses = target
      if (key === 'farmnexus_local_loss_reports') (window as any).__farmnexusLocalLossReports = target
      
      return true
    },
    deleteProperty(target, prop) {
      delete target[prop as keyof T]
      localStorage.setItem(key, JSON.stringify(target))
      
      // Update window reference on delete
      if (key === 'farmnexus_local_orders') (window as any).__farmnexusLocalOrders = target
      if (key === 'farmnexus_local_listings') (window as any).__farmnexusLocalListings = target
      if (key === 'farmnexus_local_messages') (window as any).__farmnexusLocalMessages = target
      if (key === 'farmnexus_local_crop_diagnoses') (window as any).__farmnexusLocalCropDiagnoses = target
      if (key === 'farmnexus_local_loss_reports') (window as any).__farmnexusLocalLossReports = target
      
      return true
    }
  }) as T
}

const defaultUsers = {
  'x': { id: 'x', name: 'Meena Krishnan', phone: '9876543210', password: 'password123', role: 'farmer', district: 'Idukki, Kerala', is_suspended: false, created_at: new Date().toISOString() },
  'local-demo-buyer': { id: 'local-demo-buyer', name: 'Demo Buyer', phone: '8765432109', password: 'password123', role: 'buyer', district: 'Anantapur, AP', is_suspended: false, created_at: new Date().toISOString() },
  'local-demo-admin': { id: 'local-demo-admin', name: 'Demo Admin', phone: '9381428026', password: 'sai@123123', role: 'admin', district: 'Anantapur, AP', is_suspended: false, created_at: new Date().toISOString() },
  'local-demo-farmer-ramesh': { id: 'local-demo-farmer-ramesh', name: 'Ramesh Yadav', phone: '9876543211', password: 'password123', role: 'farmer', district: 'Indore, Madhya Pradesh', is_suspended: false, created_at: new Date().toISOString() },
  'local-demo-farmer-anil': { id: 'local-demo-farmer-anil', name: 'Anil Patil', phone: '9876543212', password: 'password123', role: 'farmer', district: 'Ratnagiri, Maharashtra', is_suspended: false, created_at: new Date().toISOString() },
  'local-demo-farmer-sonia': { id: 'local-demo-farmer-sonia', name: 'Sonia Farms', phone: '9876543213', password: 'password123', role: 'farmer', district: 'Nashik, Maharashtra', is_suspended: false, created_at: new Date().toISOString() }
}

const defaultListings = {
  '1': { id: '1', produce_name: 'Green Cardamom', category: 'spices', price_per_kg: 1800, quantity_kg: 50, min_order_kg: 1, photos: null, available_from: null, location_lat: 10, location_lng: 10, farmer_id: 'x', farmer_name: 'Meena Krishnan', farmer_district: 'Idukki, Kerala', is_active: true, created_at: new Date().toISOString() },
  '2': { id: '2', produce_name: 'Wheat Flour', category: 'grain', price_per_kg: 40, quantity_kg: 1500, min_order_kg: 10, photos: null, available_from: null, location_lat: 10, location_lng: 10, farmer_id: 'local-demo-farmer-ramesh', farmer_name: 'Ramesh Yadav', farmer_district: 'Indore, Madhya Pradesh', is_active: true, created_at: new Date().toISOString() },
  '3': { id: '3', produce_name: 'Alphonso Mangoes', category: 'fruit', price_per_kg: 450, quantity_kg: 300, min_order_kg: 5, photos: null, available_from: null, location_lat: 10, location_lng: 10, farmer_id: 'local-demo-farmer-anil', farmer_name: 'Anil Patil', farmer_district: 'Ratnagiri, Maharashtra', is_active: true, created_at: new Date().toISOString() },
  '4': { id: '4', produce_name: 'Fresh Vegetables', category: 'vegetable', price_per_kg: 40, quantity_kg: 500, min_order_kg: 2, photos: null, available_from: null, location_lat: 10, location_lng: 10, farmer_id: 'local-demo-farmer-sonia', farmer_name: 'Sonia Farms', farmer_district: 'Nashik, Maharashtra', is_active: true, created_at: new Date().toISOString() }
}

const defaultOrders = {
  'ord-1': { id: 'ord-1', listing_id: '1', farmer_id: 'x', buyer_id: 'local-demo-buyer', quantity_kg: 5, total_amount: 9000, status: 'delivered', payment_status: 'paid', created_at: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 15).toISOString() },
  'ord-2': { id: 'ord-2', listing_id: '2', farmer_id: 'local-demo-farmer-ramesh', buyer_id: 'local-demo-buyer', quantity_kg: 200, total_amount: 8000, status: 'delivered', payment_status: 'paid', created_at: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 20).toISOString() },
  'ord-3': { id: 'ord-3', listing_id: '3', farmer_id: 'local-demo-farmer-anil', buyer_id: 'local-demo-buyer', quantity_kg: 10, total_amount: 4500, status: 'delivered', payment_status: 'paid', created_at: new Date().toISOString() }
}

export const localOrdersRef = createLocalProxy<Record<string, any>>('farmnexus_local_orders', defaultOrders)
export const localListingsRef = createLocalProxy<Record<string, any>>('farmnexus_local_listings', defaultListings)
export const localMessagesRef = createLocalProxy<Record<string, any[]>>('farmnexus_local_messages', {})
export const localUsersRef = createLocalProxy<Record<string, any>>('farmnexus_local_users', defaultUsers)
export const localCropDiagnosesRef = createLocalProxy<Record<string, any>>('farmnexus_local_crop_diagnoses', {})
export const localLossReportsRef = createLocalProxy<Record<string, any>>('farmnexus_local_loss_reports', {})

// Sync default users to local storage if they are missing or outdated
for (const [key, val] of Object.entries(defaultUsers)) {
  if (!localUsersRef[key] || localUsersRef[key].phone !== val.phone || localUsersRef[key].password !== val.password) {
    localUsersRef[key] = {
      ...localUsersRef[key],
      ...val
    }
  }
}

// Sync default listings to local storage if they are missing
for (const [key, val] of Object.entries(defaultListings)) {
  if (!localListingsRef[key]) {
    localListingsRef[key] = val
  }
}

// Sync default orders to local storage if they are missing
for (const [key, val] of Object.entries(defaultOrders)) {
  if (!localOrdersRef[key]) {
    localOrdersRef[key] = val
  }
}
