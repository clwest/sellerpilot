import { useState, useEffect } from 'react'
import { ShoppingBag, Plus, ArrowLeft, LogIn, LogOut, Sparkles, DollarSign, ChevronRight, BarChart3, Copy } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8005/api'


interface Product { id: string; title: string; description: string; category: string; cost_cents: number; marketplace: string; listing_count: number; listings?: ListingItem[] }
interface ListingItem { id: string; variant_label: string; title_optimized: string; bullets: string[]; description_optimized: string; tags: string[]; suggested_price_cents: number; score: number }
interface AuthUser { id: string; email: string; name: string }
type View = 'home' | 'products' | 'product-detail' | 'login' | 'register'

function authHeaders(token: string) { return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }

export default function App() {
  const [view, setView] = useState<View>('home')
  const [token, setToken] = useState<string | null>(localStorage.getItem('sp_token'))
  const [user, setUser] = useState<AuthUser | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [activeProduct, setActiveProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (token) fetch(`${API}/users/me`, { headers: authHeaders(token) }).then(r => r.ok ? r.json() : Promise.reject()).then(setUser).catch(() => { setToken(null); localStorage.removeItem('sp_token') })
  }, [token])

  useEffect(() => {
    if (view === 'products' && token) fetch(`${API}/products`, { headers: authHeaders(token) }).then(r => r.json()).then(d => setProducts(d.products)).catch(() => {})
  }, [view, token])

  async function handleLogin(email: string, password: string) {
    const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    if (!r.ok) throw new Error(); const d = await r.json()
    setToken(d.token); localStorage.setItem('sp_token', d.token); setUser(d.user); setView('products')
  }
  async function handleRegister(email: string, password: string, name: string) {
    const r = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name }) })
    if (!r.ok) throw new Error(); const d = await r.json()
    setToken(d.token); localStorage.setItem('sp_token', d.token); setUser(d.user); setView('products')
  }
  function logout() { setToken(null); setUser(null); localStorage.removeItem('sp_token'); setView('home') }

  async function createProduct(data: Record<string, string | number>) {
    if (!token) return
    await fetch(`${API}/products`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(data) })
    setView('products')
  }

  async function openProduct(id: string) {
    if (!token) return
    const r = await fetch(`${API}/products/${id}`, { headers: authHeaders(token) })
    if (r.ok) { setActiveProduct(await r.json()); setView('product-detail') }
  }

  async function optimizeListing(productId: string, style: string) {
    if (!token) return
    setLoading(true)
    await fetch(`${API}/products/${productId}/optimize`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ style }) })
    await openProduct(productId)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <nav className="border-b border-gray-800 bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => setView('home')} className="flex items-center gap-2 text-lg font-semibold text-white hover:text-cyan-400 transition">
            <ShoppingBag size={20} className="text-cyan-500" /> SellerPilot
          </button>
          <div className="flex items-center gap-4">
            {token && user ? (
              <>
                <button onClick={() => setView('products')} className="text-sm text-gray-400 hover:text-white transition">Products</button>
                <span className="text-sm text-gray-500">{user.name}</span>
                <button onClick={logout} className="text-gray-500 hover:text-red-400"><LogOut size={16} /></button>
              </>
            ) : (
              <button onClick={() => setView('login')} className="text-sm bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 rounded-lg text-white transition flex items-center gap-1"><LogIn size={14} /> Sign In</button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {view === 'home' && <HomePage onNavigate={setView} />}
        {view === 'products' && <ProductsPage products={products} onCreate={createProduct} onOpen={openProduct} />}
        {view === 'product-detail' && activeProduct && <ProductDetailPage product={activeProduct} onOptimize={optimizeListing} onBack={() => setView('products')} loading={loading} />}
        {view === 'login' && <AuthPage mode="login" onLogin={handleLogin} onSwitch={() => setView('register')} />}
        {view === 'register' && <AuthPage mode="register" onRegister={handleRegister} onSwitch={() => setView('login')} />}
      </main>
    </div>
  )
}

function HomePage({ onNavigate }: { onNavigate: (v: View) => void }) {
  return (
    <div className="space-y-12">
      <div className="text-center py-16 space-y-6">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">Optimize Your Listings with AI</h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">Generate SEO-optimized titles, bullet points, descriptions, and pricing for Amazon, Etsy, and Shopify.</p>
        <button onClick={() => onNavigate('products')} className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl text-lg font-medium transition flex items-center gap-2 mx-auto">Get Started <ChevronRight size={20} /></button>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { title: 'Add Your Product', desc: 'Enter title, description, cost, and target marketplace.', icon: <ShoppingBag size={24} /> },
          { title: 'AI Optimizes', desc: 'SEO title, 5 bullets, description, tags, and suggested pricing.', icon: <Sparkles size={24} /> },
          { title: 'Compare & Export', desc: 'Score variants, pick the best, export as CSV.', icon: <BarChart3 size={24} /> },
        ].map(s => (
          <div key={s.title} className="bg-[#12121a] border border-gray-800 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 text-cyan-400">{s.icon}</div>
            <h3 className="font-semibold text-white mb-2">{s.title}</h3>
            <p className="text-sm text-gray-400">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProductsPage({ products, onCreate, onOpen }: { products: Product[]; onCreate: (d: Record<string, string | number>) => void; onOpen: (id: string) => void }) {
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: '', cost_cents: 0, marketplace: 'amazon' })
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">My Products</h1>
        <button onClick={() => setShow(!show)} className="text-sm bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 rounded-lg text-white transition flex items-center gap-1"><Plus size={14} /> Add Product</button>
      </div>
      {show && (
        <form onSubmit={e => { e.preventDefault(); if (form.title) { onCreate(form); setForm({ title: '', description: '', category: '', cost_cents: 0, marketplace: 'amazon' }); setShow(false) } }}
          className="bg-[#12121a] border border-gray-800 rounded-xl p-6 space-y-3">
          <input type="text" placeholder="Product title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="w-full px-3 py-2 bg-[#0a0a0f] border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500" />
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 bg-[#0a0a0f] border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500 resize-y" />
          <div className="flex gap-3">
            <input type="text" placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="flex-1 px-3 py-2 bg-[#0a0a0f] border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500" />
            <input type="number" placeholder="Cost (cents)" value={form.cost_cents || ''} onChange={e => setForm({ ...form, cost_cents: parseInt(e.target.value) || 0 })} className="w-32 px-3 py-2 bg-[#0a0a0f] border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500" />
            <select value={form.marketplace} onChange={e => setForm({ ...form, marketplace: e.target.value })} className="px-3 py-2 bg-[#0a0a0f] border border-gray-800 rounded-lg text-sm text-white focus:outline-none">
              <option value="amazon">Amazon</option><option value="etsy">Etsy</option><option value="shopify">Shopify</option>
            </select>
          </div>
          <button type="submit" className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition">Add Product</button>
        </form>
      )}
      {products.length === 0 ? (
        <div className="text-center py-16"><ShoppingBag size={48} className="text-gray-600 mx-auto mb-4" /><p className="text-gray-400">No products yet</p></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {products.map(p => (
            <button key={p.id} onClick={() => onOpen(p.id)} className="text-left bg-[#12121a] border border-gray-800 rounded-xl p-5 hover:border-cyan-500/50 transition group">
              <div className="font-semibold text-white group-hover:text-cyan-400 transition">{p.title}</div>
              <div className="text-sm text-gray-500 mt-1">{p.category || 'Uncategorized'} &middot; {p.marketplace} &middot; ${(p.cost_cents / 100).toFixed(2)} cost</div>
              <div className="text-xs text-gray-600 mt-2">{p.listing_count} listing{p.listing_count !== 1 ? 's' : ''} generated</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ProductDetailPage({ product, onOptimize, onBack, loading }: { product: Product; onOptimize: (id: string, style: string) => void; onBack: () => void; loading: boolean }) {
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-white transition flex items-center gap-1"><ArrowLeft size={16} /> Back</button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{product.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{product.category} &middot; {product.marketplace} &middot; Cost: ${(product.cost_cents / 100).toFixed(2)}</p>
        </div>
        <div className="flex gap-2">
          {['benefit-led', 'feature-focused', 'story-driven'].map(style => (
            <button key={style} onClick={() => onOptimize(product.id, style)} disabled={loading}
              className="text-xs px-3 py-1.5 bg-cyan-600/10 border border-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-600/20 transition disabled:opacity-50 flex items-center gap-1">
              <Sparkles size={12} /> {loading ? '...' : style}
            </button>
          ))}
        </div>
      </div>
      {product.description && <p className="text-gray-400 text-sm">{product.description}</p>}

      {product.listings && product.listings.length > 0 ? (
        <div className="space-y-4">
          {product.listings.map(l => (
            <div key={l.id} className="bg-[#12121a] border border-gray-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{l.variant_label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-green-400 flex items-center gap-1"><DollarSign size={12} />${(l.suggested_price_cents / 100).toFixed(2)}</span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${l.score >= 70 ? 'text-green-400 bg-green-500/10' : l.score >= 40 ? 'text-amber-400 bg-amber-500/10' : 'text-red-400 bg-red-500/10'}`}>
                    Score: {l.score}
                  </span>
                </div>
              </div>
              <h3 className="text-white font-medium">{l.title_optimized}</h3>
              <ul className="space-y-1">
                {l.bullets.map((b, i) => <li key={i} className="text-sm text-gray-300 flex items-start gap-2"><span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-1.5 shrink-0" />{b}</li>)}
              </ul>
              <p className="text-sm text-gray-400">{l.description_optimized}</p>
              <div className="flex flex-wrap gap-1">
                {l.tags.map(t => <span key={t} className="text-xs px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20">{t}</span>)}
              </div>
              <button onClick={() => navigator.clipboard.writeText(`${l.title_optimized}\n\n${l.bullets.join('\n')}\n\n${l.description_optimized}\n\nTags: ${l.tags.join(', ')}`)} className="text-xs text-gray-500 hover:text-white flex items-center gap-1"><Copy size={12} /> Copy listing</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">No listings yet. Click an optimization style above to generate one.</div>
      )}
    </div>
  )
}

function AuthPage({ mode, onLogin, onRegister, onSwitch }: {
  mode: 'login' | 'register'; onLogin?: (e: string, p: string) => Promise<void>; onRegister?: (e: string, p: string, n: string) => Promise<void>; onSwitch: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState(''); const [error, setError] = useState(''); const [ld, setLd] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLd(true)
    try { if (mode === 'login' && onLogin) await onLogin(email, password); else if (onRegister) await onRegister(email, password, name) }
    catch { setError('Failed') }
    setLd(false)
  }

  return (
    <div className="max-w-sm mx-auto py-16">
      <div className="bg-[#12121a] border border-gray-800 rounded-xl p-6">
        <h1 className="text-xl font-bold text-white mb-6 text-center">{mode === 'login' ? 'Sign In' : 'Create Account'}</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2 bg-[#0a0a0f] border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500" />}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-3 py-2 bg-[#0a0a0f] border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-3 py-2 bg-[#0a0a0f] border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500" />
          {error && <p className="text-sm text-red-400">{error}</p>}
          {/* Demo hint removed */}
          <button type="submit" disabled={ld} className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition disabled:opacity-50">{ld ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}</button>
        </form>
        <p className="text-sm text-gray-500 text-center mt-4">{mode === 'login' ? "No account? " : 'Have an account? '}<button onClick={onSwitch} className="text-cyan-400 hover:text-cyan-300">{mode === 'login' ? 'Sign Up' : 'Sign In'}</button></p>
      </div>
    </div>
  )
}
