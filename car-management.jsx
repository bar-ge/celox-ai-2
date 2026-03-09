import { useState, useEffect } from "react";

const initialCars = [
  { id: 1, plate: "TLV-001", make: "Toyota", model: "Camry", year: 2022, status: "Available", driver: "", mileage: 34200, fuel: "Petrol", color: "#3B82F6" },
  { id: 2, plate: "TLV-002", make: "Ford", model: "Transit", year: 2021, status: "In Use", driver: "David Levi", mileage: 78400, fuel: "Diesel", color: "#F59E0B" },
  { id: 3, plate: "TLV-003", make: "Hyundai", model: "Tucson", year: 2023, status: "Maintenance", driver: "", mileage: 12100, fuel: "Hybrid", color: "#10B981" },
  { id: 4, plate: "TLV-004", make: "Kia", model: "Sportage", year: 2022, status: "Available", driver: "", mileage: 22800, fuel: "Petrol", color: "#8B5CF6" },
  { id: 5, plate: "TLV-005", make: "Tesla", model: "Model 3", year: 2023, status: "In Use", driver: "Noa Cohen", mileage: 8900, fuel: "Electric", color: "#EF4444" },
];

const STATUS_COLORS = {
  "Available": { bg: "rgba(16,185,129,0.15)", text: "#10B981", border: "#10B981" },
  "In Use": { bg: "rgba(245,158,11,0.15)", text: "#F59E0B", border: "#F59E0B" },
  "Maintenance": { bg: "rgba(239,68,68,0.15)", text: "#EF4444", border: "#EF4444" },
};

const FUEL_ICONS = { Petrol: "⛽", Diesel: "🛢️", Hybrid: "♻️", Electric: "⚡" };

const emptyForm = { plate: "", make: "", model: "", year: new Date().getFullYear(), status: "Available", driver: "", mileage: 0, fuel: "Petrol" };

export default function CarManagement() {
  const [cars, setCars] = useState(initialCars);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'view'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState("fleet");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = cars.filter(c => {
    const matchSearch = `${c.plate} ${c.make} ${c.model} ${c.driver}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: cars.length,
    available: cars.filter(c => c.status === "Available").length,
    inUse: cars.filter(c => c.status === "In Use").length,
    maintenance: cars.filter(c => c.status === "Maintenance").length,
  };

  const openAdd = () => { setForm(emptyForm); setModal("add"); };
  const openEdit = (car) => { setForm({ ...car }); setSelected(car); setModal("edit"); };
  const openView = (car) => { setSelected(car); setModal("view"); };

  const handleSave = () => {
    if (!form.plate || !form.make || !form.model) { showToast("Fill in all required fields", "error"); return; }
    if (modal === "add") {
      const newCar = { ...form, id: Date.now(), color: `hsl(${Math.random() * 360},70%,55%)` };
      setCars(prev => [...prev, newCar]);
      showToast(`${form.make} ${form.model} added!`);
    } else {
      setCars(prev => prev.map(c => c.id === form.id ? form : c));
      showToast(`${form.make} ${form.model} updated!`);
    }
    setModal(null);
  };

  const handleDelete = (id) => {
    setCars(prev => prev.filter(c => c.id !== id));
    setConfirm(null);
    setModal(null);
    showToast("Vehicle removed", "error");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0B0F1A", color: "#E2E8F0", fontFamily: "'Syne', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0B0F1A; } ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        input, select { outline: none; }
        .row-hover { transition: background 0.15s; } .row-hover:hover { background: rgba(255,255,255,0.04) !important; cursor: pointer; }
        .btn { cursor: pointer; border: none; font-family: 'Syne', sans-serif; font-weight: 600; transition: all 0.2s; }
        .btn:hover { transform: translateY(-1px); }
        .tab { cursor: pointer; padding: 8px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; transition: all 0.2s; }
        .pulse { animation: pulse 2s infinite; } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .slide-in { animation: slideIn 0.3s ease; } @keyframes slideIn { from{transform:translateY(10px);opacity:0} to{transform:translateY(0);opacity:1} }
        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); z-index: 50; display: flex; align-items: center; justify-content: center; }
        .modal { background: #131929; border: 1px solid #1E2D3D; border-radius: 16px; padding: 32px; width: 90%; max-width: 520px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .label { font-size: 12px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.08em; }
        .input { background: #0B0F1A; border: 1px solid #1E2D3D; border-radius: 8px; padding: 10px 14px; color: #E2E8F0; font-family: 'JetBrains Mono'; font-size: 14px; transition: border 0.2s; }
        .input:focus { border-color: #F59E0B; }
        .tag { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; border: 1px solid; }
        .nav-item { cursor: pointer; padding: 10px 16px; border-radius: 10px; display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; transition: all 0.2s; color: #64748B; }
        .nav-item:hover { color: #E2E8F0; background: rgba(255,255,255,0.05); }
        .nav-item.active { color: #F59E0B; background: rgba(245,158,11,0.1); }
        .stat-card { background: #131929; border: 1px solid #1E2D3D; border-radius: 14px; padding: 20px 24px; flex: 1; min-width: 140px; transition: border 0.2s; }
        .stat-card:hover { border-color: #F59E0B; }
      `}</style>

      {/* Sidebar */}
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <aside style={{ width: 220, background: "#0D1321", borderRight: "1px solid #1E2D3D", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
          <div style={{ padding: "8px 16px 24px" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#F59E0B", letterSpacing: "-0.02em" }}>FLEET<span style={{ color: "#E2E8F0" }}>OS</span></div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 2, fontFamily: "JetBrains Mono" }}>Company Car Manager</div>
          </div>
          {[
            { id: "fleet", icon: "🚗", label: "Fleet" },
            { id: "stats", icon: "📊", label: "Analytics" },
            { id: "guide", icon: "🗄️", label: "DB Setup Guide" },
          ].map(item => (
            <div key={item.id} className={`nav-item ${activeTab === item.id ? "active" : ""}`} onClick={() => setActiveTab(item.id)}>
              <span>{item.icon}</span> {item.label}
            </div>
          ))}
          <div style={{ marginTop: "auto", padding: "16px", background: "#131929", borderRadius: 12, border: "1px solid #1E2D3D" }}>
            <div style={{ fontSize: 11, color: "#475569", fontFamily: "JetBrains Mono" }}>STATUS</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <div className="pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }}></div>
              <span style={{ fontSize: 13, color: "#10B981", fontWeight: 600 }}>System Online</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: "32px", overflowY: "auto" }}>

          {/* FLEET TAB */}
          {activeTab === "fleet" && (
            <div className="slide-in">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>Fleet Management</h1>
                  <p style={{ color: "#475569", fontSize: 14, marginTop: 4 }}>{cars.length} vehicles registered</p>
                </div>
                <button className="btn" onClick={openAdd} style={{ background: "#F59E0B", color: "#0B0F1A", padding: "10px 20px", borderRadius: 10, fontSize: 14 }}>
                  + Add Vehicle
                </button>
              </div>

              {/* Stats */}
              <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
                {[
                  { label: "Total", value: stats.total, color: "#94A3B8", icon: "🚗" },
                  { label: "Available", value: stats.available, color: "#10B981", icon: "✅" },
                  { label: "In Use", value: stats.inUse, color: "#F59E0B", icon: "🔑" },
                  { label: "Maintenance", value: stats.maintenance, color: "#EF4444", icon: "🔧" },
                ].map(s => (
                  <div key={s.label} className="stat-card">
                    <div style={{ fontSize: 20 }}>{s.icon}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: "#475569", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <input className="input" placeholder="🔍  Search plate, make, driver..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
                <div style={{ display: "flex", gap: 6 }}>
                  {["All", "Available", "In Use", "Maintenance"].map(s => (
                    <button key={s} className="btn tab" onClick={() => setFilterStatus(s)}
                      style={{ background: filterStatus === s ? "#F59E0B" : "#131929", color: filterStatus === s ? "#0B0F1A" : "#64748B", border: "1px solid", borderColor: filterStatus === s ? "#F59E0B" : "#1E2D3D" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div style={{ background: "#131929", border: "1px solid #1E2D3D", borderRadius: 14, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1E2D3D" }}>
                      {["Vehicle", "Plate", "Year", "Fuel", "Mileage", "Driver", "Status", "Actions"].map(h => (
                        <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((car, i) => (
                      <tr key={car.id} className="row-hover" style={{ borderBottom: i < filtered.length - 1 ? "1px solid #1E2D3D" : "none" }} onClick={() => openView(car)}>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 8, height: 36, borderRadius: 4, background: car.color, flexShrink: 0 }}></div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14 }}>{car.make} {car.model}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px", fontFamily: "JetBrains Mono", fontSize: 13, color: "#F59E0B" }}>{car.plate}</td>
                        <td style={{ padding: "14px 16px", fontSize: 13, color: "#94A3B8" }}>{car.year}</td>
                        <td style={{ padding: "14px 16px", fontSize: 13 }}>{FUEL_ICONS[car.fuel]} {car.fuel}</td>
                        <td style={{ padding: "14px 16px", fontFamily: "JetBrains Mono", fontSize: 13, color: "#94A3B8" }}>{car.mileage.toLocaleString()} km</td>
                        <td style={{ padding: "14px 16px", fontSize: 13, color: car.driver ? "#E2E8F0" : "#334155" }}>{car.driver || "—"}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span className="tag" style={{ background: STATUS_COLORS[car.status].bg, color: STATUS_COLORS[car.status].text, borderColor: STATUS_COLORS[car.status].border }}>
                            {car.status}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px" }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn" onClick={() => openEdit(car)} style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B", padding: "6px 12px", borderRadius: 7, fontSize: 12 }}>Edit</button>
                            <button className="btn" onClick={() => setConfirm(car.id)} style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", padding: "6px 12px", borderRadius: 7, fontSize: 12 }}>Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={8} style={{ textAlign: "center", padding: "48px", color: "#334155" }}>No vehicles found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === "stats" && (
            <div className="slide-in">
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 28 }}>Analytics</h1>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Fleet Status Chart */}
                <div style={{ background: "#131929", border: "1px solid #1E2D3D", borderRadius: 14, padding: 24 }}>
                  <div style={{ fontWeight: 700, marginBottom: 20 }}>Fleet Status</div>
                  {[
                    { label: "Available", value: stats.available, total: stats.total, color: "#10B981" },
                    { label: "In Use", value: stats.inUse, total: stats.total, color: "#F59E0B" },
                    { label: "Maintenance", value: stats.maintenance, total: stats.total, color: "#EF4444" },
                  ].map(item => (
                    <div key={item.label} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                        <span style={{ color: "#94A3B8" }}>{item.label}</span>
                        <span style={{ fontFamily: "JetBrains Mono", color: item.color }}>{item.value}/{item.total}</span>
                      </div>
                      <div style={{ height: 8, background: "#0B0F1A", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(item.value / item.total) * 100}%`, background: item.color, borderRadius: 4, transition: "width 1s ease" }}></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Fuel Type */}
                <div style={{ background: "#131929", border: "1px solid #1E2D3D", borderRadius: 14, padding: 24 }}>
                  <div style={{ fontWeight: 700, marginBottom: 20 }}>Fuel Types</div>
                  {["Petrol", "Diesel", "Hybrid", "Electric"].map(fuel => {
                    const count = cars.filter(c => c.fuel === fuel).length;
                    return (
                      <div key={fuel} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1E2D3D" }}>
                        <span style={{ fontSize: 14 }}>{FUEL_ICONS[fuel]} {fuel}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ height: 6, width: count * 30, background: "#F59E0B", borderRadius: 3 }}></div>
                          <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "#F59E0B", minWidth: 20 }}>{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Top Mileage */}
                <div style={{ background: "#131929", border: "1px solid #1E2D3D", borderRadius: 14, padding: 24, gridColumn: "1/-1" }}>
                  <div style={{ fontWeight: 700, marginBottom: 20 }}>Mileage Ranking</div>
                  {[...cars].sort((a, b) => b.mileage - a.mileage).map((car, i) => (
                    <div key={car.id} style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: i === 0 ? "#F59E0B" : "#1E2D3D", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: i === 0 ? "#0B0F1A" : "#475569", flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ width: 100, fontSize: 13 }}>{car.make} {car.model}</div>
                      <div style={{ flex: 1, height: 8, background: "#0B0F1A", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(car.mileage / Math.max(...cars.map(c => c.mileage))) * 100}%`, background: car.color, borderRadius: 4 }}></div>
                      </div>
                      <div style={{ fontFamily: "JetBrains Mono", fontSize: 13, color: "#94A3B8", width: 80, textAlign: "right" }}>{car.mileage.toLocaleString()} km</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DB GUIDE TAB */}
          {activeTab === "guide" && (
            <div className="slide-in" style={{ maxWidth: 760 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8 }}>Database & URL Setup Guide</h1>
              <p style={{ color: "#475569", marginBottom: 28 }}>Connect this app to a real backend in 3 steps</p>

              {[
                {
                  step: "01", title: "Create Your Database (Supabase — Free)", color: "#10B981",
                  content: [
                    "Go to supabase.com → Create new project",
                    "In SQL Editor, run this to create your cars table:",
                  ],
                  code: `CREATE TABLE cars (\n  id SERIAL PRIMARY KEY,\n  plate VARCHAR(20) UNIQUE NOT NULL,\n  make VARCHAR(50),\n  model VARCHAR(50),\n  year INTEGER,\n  status VARCHAR(20) DEFAULT 'Available',\n  driver VARCHAR(100),\n  mileage INTEGER DEFAULT 0,\n  fuel VARCHAR(20),\n  created_at TIMESTAMP DEFAULT NOW()\n);`,
                },
                {
                  step: "02", title: "Connect Your Frontend", color: "#F59E0B",
                  content: ["Install Supabase client: npm install @supabase/supabase-js", "Create a .env file with your keys:", "Replace the mock data in this app with real API calls:"],
                  code: `// .env\nVITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_KEY=your-anon-key\n\n// In your app:\nimport { createClient } from '@supabase/supabase-js'\nconst supabase = createClient(URL, KEY)\n\n// Fetch all cars:\nconst { data } = await supabase.from('cars').select('*')\n\n// Add a car:\nawait supabase.from('cars').insert([newCar])\n\n// Update:\nawait supabase.from('cars').update(form).eq('id', id)\n\n// Delete:\nawait supabase.from('cars').delete().eq('id', id)`,
                },
                {
                  step: "03", title: "Deploy to Your URL", color: "#8B5CF6",
                  content: ["Option A — Vercel (Recommended):", "  1. Push code to GitHub", "  2. Go to vercel.com → Import repo", "  3. Add your .env variables in Vercel dashboard", "  4. Click Deploy → get your live URL!", "Option B — Use with existing celox-ai.com:", "  Export as a React app (npm run build) and upload the /dist folder to your hosting"],
                  code: `# Deploy in 3 commands:\nnpm install\nnpm run build\nvercel --prod\n\n# Your app will be live at:\n# https://your-app.vercel.app`,
                },
              ].map(section => (
                <div key={section.step} style={{ background: "#131929", border: "1px solid #1E2D3D", borderRadius: 14, padding: 24, marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 14, marginBottom: 16, alignItems: "flex-start" }}>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 28, fontWeight: 700, color: section.color, lineHeight: 1 }}>{section.step}</div>
                    <div style={{ fontWeight: 700, fontSize: 16, paddingTop: 4 }}>{section.title}</div>
                  </div>
                  {section.content.map((line, i) => (
                    <div key={i} style={{ fontSize: 14, color: "#94A3B8", marginBottom: 6, paddingLeft: 8, borderLeft: `2px solid ${section.color}30` }}>{line}</div>
                  ))}
                  <pre style={{ background: "#0B0F1A", border: "1px solid #1E2D3D", borderRadius: 10, padding: 16, fontFamily: "JetBrains Mono", fontSize: 12, color: "#10B981", marginTop: 14, overflowX: "auto", lineHeight: 1.6 }}>
                    {section.code}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Add/Edit Modal */}
      {(modal === "add" || modal === "edit") && (
        <div className="modal-bg" onClick={() => setModal(null)}>
          <div className="modal slide-in" onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 24 }}>{modal === "add" ? "Add New Vehicle" : "Edit Vehicle"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
              {[
                { label: "License Plate *", key: "plate", type: "text" },
                { label: "Make *", key: "make", type: "text" },
                { label: "Model *", key: "model", type: "text" },
                { label: "Year", key: "year", type: "number" },
                { label: "Mileage (km)", key: "mileage", type: "number" },
                { label: "Driver Name", key: "driver", type: "text" },
              ].map(f => (
                <div key={f.key} className="field">
                  <label className="label">{f.label}</label>
                  <input className="input" type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div className="field">
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {["Available", "In Use", "Maintenance"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Fuel Type</label>
                <select className="input" value={form.fuel} onChange={e => setForm(p => ({ ...p, fuel: e.target.value }))}>
                  {["Petrol", "Diesel", "Hybrid", "Electric"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setModal(null)} style={{ background: "#1E2D3D", color: "#94A3B8", padding: "10px 20px", borderRadius: 10, fontSize: 14 }}>Cancel</button>
              <button className="btn" onClick={handleSave} style={{ background: "#F59E0B", color: "#0B0F1A", padding: "10px 24px", borderRadius: 10, fontSize: 14 }}>
                {modal === "add" ? "Add Vehicle" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modal === "view" && selected && (
        <div className="modal-bg" onClick={() => setModal(null)}>
          <div className="modal slide-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div style={{ width: 10, height: 48, borderRadius: 5, background: selected.color }}></div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 22 }}>{selected.make} {selected.model}</div>
                <div style={{ fontFamily: "JetBrains Mono", color: "#F59E0B", fontSize: 14 }}>{selected.plate}</div>
              </div>
            </div>
            {[
              ["Year", selected.year], ["Fuel", `${FUEL_ICONS[selected.fuel]} ${selected.fuel}`],
              ["Mileage", `${selected.mileage.toLocaleString()} km`], ["Driver", selected.driver || "Unassigned"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #1E2D3D", fontSize: 14 }}>
                <span style={{ color: "#475569" }}>{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontSize: 14 }}>
              <span style={{ color: "#475569" }}>Status</span>
              <span className="tag" style={{ background: STATUS_COLORS[selected.status].bg, color: STATUS_COLORS[selected.status].text, borderColor: STATUS_COLORS[selected.status].border }}>{selected.status}</span>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn" onClick={() => setModal(null)} style={{ background: "#1E2D3D", color: "#94A3B8", padding: "10px 20px", borderRadius: 10, fontSize: 14 }}>Close</button>
              <button className="btn" onClick={() => openEdit(selected)} style={{ background: "#F59E0B", color: "#0B0F1A", padding: "10px 20px", borderRadius: 10, fontSize: 14 }}>Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirm && (
        <div className="modal-bg" onClick={() => setConfirm(null)}>
          <div className="modal slide-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 360, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Remove Vehicle?</div>
            <p style={{ color: "#475569", fontSize: 14, marginBottom: 24 }}>This action cannot be undone.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn" onClick={() => setConfirm(null)} style={{ background: "#1E2D3D", color: "#94A3B8", padding: "10px 24px", borderRadius: 10, fontSize: 14 }}>Cancel</button>
              <button className="btn" onClick={() => handleDelete(confirm)} style={{ background: "#EF4444", color: "#fff", padding: "10px 24px", borderRadius: 10, fontSize: 14 }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.type === "error" ? "#EF4444" : "#10B981", color: "#fff", padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
