import { supabase } from './supabaseClient'
import { useState, useEffect } from 'react'

function FleetManager() {
  const [branches, setBranches] = useState([])
  const [drivers, setDrivers] = useState([])
  const [cars, setCars] = useState([])
  const [activeTab, setActiveTab] = useState('cars')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)

  const [carForm, setCarForm] = useState({ plate: '', model: '', branch_id: '' })
  const [driverForm, setDriverForm] = useState({ name: '', license: '', branch_id: '' })
  const [branchForm, setBranchForm] = useState({ name: '', location: '' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: b }, { data: d }, { data: c }] = await Promise.all([
      supabase.from('branches').select('*').order('created_at'),
      supabase.from('drivers').select('*').order('created_at'),
      supabase.from('cars').select('*').order('created_at'),
    ])
    if (b) setBranches(b)
    if (d) setDrivers(d)
    if (c) setCars(c)
    setLoading(false)
  }

  async function addCar(e) {
    e.preventDefault()
    const { data } = await supabase.from('cars').insert([carForm]).select()
    if (data) setCars(prev => [...prev, data[0]])
    setCarForm({ plate: '', model: '', branch_id: '' })
  }
  async function updateCar(form) {
    await supabase.from('cars').update(form).eq('id', form.id)
    setCars(prev => prev.map(c => c.id === form.id ? form : c))
    setEditingId(null)
  }
  async function deleteCar(id) {
    await supabase.from('cars').delete().eq('id', id)
    setCars(prev => prev.filter(c => c.id !== id))
  }

  async function addDriver(e) {
    e.preventDefault()
    const { data } = await supabase.from('drivers').insert([driverForm]).select()
    if (data) setDrivers(prev => [...prev, data[0]])
    setDriverForm({ name: '', license: '', branch_id: '' })
  }
  async function updateDriver(form) {
    await supabase.from('drivers').update(form).eq('id', form.id)
    setDrivers(prev => prev.map(d => d.id === form.id ? form : d))
    setEditingId(null)
  }
  async function deleteDriver(id) {
    await supabase.from('drivers').delete().eq('id', id)
    setDrivers(prev => prev.filter(d => d.id !== id))
  }

  async function addBranch(e) {
    e.preventDefault()
    const { data } = await supabase.from('branches').insert([branchForm]).select()
    if (data) setBranches(prev => [...prev, data[0]])
    setBranchForm({ name: '', location: '' })
  }
  async function updateBranch(form) {
    await supabase.from('branches').update(form).eq('id', form.id)
    setBranches(prev => prev.map(b => b.id === form.id ? form : b))
    setEditingId(null)
  }
  async function deleteBranch(id) {
    await supabase.from('branches').delete().eq('id', id)
    setBranches(prev => prev.filter(b => b.id !== id))
  }

  function getBranchName(id) {
    const branch = branches.find(b => b.id === id)
    return branch ? branch.name : '\u2014'
  }

  if (loading) return <div style={styles.loading}>Loading...</div>

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Fleet Manager</h1>
      <div style={styles.tabs}>
        {['cars', 'drivers', 'branches'].map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setEditingId(null) }}
            style={activeTab === tab ? { ...styles.tab, ...styles.activeTab } : styles.tab}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)} ({tab === 'cars' ? cars.length : tab === 'drivers' ? drivers.length : branches.length})
          </button>
        ))}
      </div>

      {activeTab === 'cars' && (
        <div>
          <form onSubmit={addCar} style={styles.form}>
            <input placeholder="Plate number" value={carForm.plate} onChange={e => setCarForm({ ...carForm, plate: e.target.value })} required style={styles.input} />
            <input placeholder="Model" value={carForm.model} onChange={e => setCarForm({ ...carForm, model: e.target.value })} required style={styles.input} />
            <select value={carForm.branch_id} onChange={e => setCarForm({ ...carForm, branch_id: e.target.value })} style={styles.input}>
              <option value="">No branch</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button type="submit" style={styles.addBtn}>+ Add Car</button>
          </form>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Plate</th><th style={styles.th}>Model</th><th style={styles.th}>Branch</th><th style={styles.th}>Actions</th></tr></thead>
            <tbody>
              {cars.map(car => (
                <tr key={car.id}>
                  {editingId === car.id ? <EditableCarRow car={car} branches={branches} onSave={updateCar} onCancel={() => setEditingId(null)} /> : (
                    <><td style={styles.td}>{car.plate}</td><td style={styles.td}>{car.model}</td><td style={styles.td}>{getBranchName(car.branch_id)}</td>
                    <td style={styles.td}><button onClick={() => setEditingId(car.id)} style={styles.editBtn}>Edit</button><button onClick={() => deleteCar(car.id)} style={styles.deleteBtn}>Delete</button></td></>
                  )}
                </tr>
              ))}
              {cars.length === 0 && <tr><td colSpan={4} style={styles.empty}>No cars yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'drivers' && (
        <div>
          <form onSubmit={addDriver} style={styles.form}>
            <input placeholder="Driver name" value={driverForm.name} onChange={e => setDriverForm({ ...driverForm, name: e.target.value })} required style={styles.input} />
            <input placeholder="License number" value={driverForm.license} onChange={e => setDriverForm({ ...driverForm, license: e.target.value })} required style={styles.input} />
            <select value={driverForm.branch_id} onChange={e => setDriverForm({ ...driverForm, branch_id: e.target.value })} style={styles.input}>
              <option value="">No branch</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button type="submit" style={styles.addBtn}>+ Add Driver</button>
          </form>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Name</th><th style={styles.th}>License</th><th style={styles.th}>Branch</th><th style={styles.th}>Actions</th></tr></thead>
            <tbody>
              {drivers.map(driver => (
                <tr key={driver.id}>
                  {editingId === driver.id ? <EditableDriverRow driver={driver} branches={branches} onSave={updateDriver} onCancel={() => setEditingId(null)} /> : (
                    <><td style={styles.td}>{driver.name}</td><td style={styles.td}>{driver.license}</td><td style={styles.td}>{getBranchName(driver.branch_id)}</td>
                    <td style={styles.td}><button onClick={() => setEditingId(driver.id)} style={styles.editBtn}>Edit</button><button onClick={() => deleteDriver(driver.id)} style={styles.deleteBtn}>Delete</button></td></>
                  )}
                </tr>
              ))}
              {drivers.length === 0 && <tr><td colSpan={4} style={styles.empty}>No drivers yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'branches' && (
        <div>
          <form onSubmit={addBranch} style={styles.form}>
            <input placeholder="Branch name" value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} required style={styles.input} />
            <input placeholder="Location" value={branchForm.location} onChange={e => setBranchForm({ ...branchForm, location: e.target.value })} required style={styles.input} />
            <button type="submit" style={styles.addBtn}>+ Add Branch</button>
          </form>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Name</th><th style={styles.th}>Location</th><th style={styles.th}>Actions</th></tr></thead>
            <tbody>
              {branches.map(branch => (
                <tr key={branch.id}>
                  {editingId === branch.id ? <EditableBranchRow branch={branch} onSave={updateBranch} onCancel={() => setEditingId(null)} /> : (
                    <><td style={styles.td}>{branch.name}</td><td style={styles.td}>{branch.location}</td>
                    <td style={styles.td}><button onClick={() => setEditingId(branch.id)} style={styles.editBtn}>Edit</button><button onClick={() => deleteBranch(branch.id)} style={styles.deleteBtn}>Delete</button></td></>
                  )}
                </tr>
              ))}
              {branches.length === 0 && <tr><td colSpan={3} style={styles.empty}>No branches yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function EditableCarRow({ car, branches, onSave, onCancel }) {
  const [form, setForm] = useState({ ...car })
  return (<>
    <td style={styles.td}><input value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} style={styles.editInput} /></td>
    <td style={styles.td}><input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} style={styles.editInput} /></td>
    <td style={styles.td}><select value={form.branch_id || ''} onChange={e => setForm({ ...form, branch_id: e.target.value })} style={styles.editInput}><option value="">No branch</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></td>
    <td style={styles.td}><button onClick={() => onSave(form)} style={styles.saveBtn}>Save</button><button onClick={onCancel} style={styles.cancelBtn}>Cancel</button></td>
  </>)
}

function EditableDriverRow({ driver, branches, onSave, onCancel }) {
  const [form, setForm] = useState({ ...driver })
  return (<>
    <td style={styles.td}><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={styles.editInput} /></td>
    <td style={styles.td}><input value={form.license} onChange={e => setForm({ ...form, license: e.target.value })} style={styles.editInput} /></td>
    <td style={styles.td}><select value={form.branch_id || ''} onChange={e => setForm({ ...form, branch_id: e.target.value })} style={styles.editInput}><option value="">No branch</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></td>
    <td style={styles.td}><button onClick={() => onSave(form)} style={styles.saveBtn}>Save</button><button onClick={onCancel} style={styles.cancelBtn}>Cancel</button></td>
  </>)
}

function EditableBranchRow({ branch, onSave, onCancel }) {
  const [form, setForm] = useState({ ...branch })
  return (<>
    <td style={styles.td}><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={styles.editInput} /></td>
    <td style={styles.td}><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} style={styles.editInput} /></td>
    <td style={styles.td}><button onClick={() => onSave(form)} style={styles.saveBtn}>Save</button><button onClick={onCancel} style={styles.cancelBtn}>Cancel</button></td>
  </>)
}

const styles = {
  container: { maxWidth: 900, margin: '0 auto', padding: '1rem', textAlign: 'left' },
  title: { textAlign: 'center', marginBottom: '1.5rem' },
  loading: { textAlign: 'center', padding: '3rem', fontSize: '1.2rem' },
  tabs: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', justifyContent: 'center' },
  tab: { padding: '0.5rem 1.5rem', cursor: 'pointer', borderRadius: 8, border: '1px solid #444', background: 'transparent' },
  activeTab: { background: '#646cff', color: '#fff', borderColor: '#646cff' },
  form: { display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' },
  input: { padding: '0.5rem', borderRadius: 6, border: '1px solid #444', background: 'transparent', color: 'inherit', flex: 1, minWidth: 120 },
  addBtn: { padding: '0.5rem 1rem', background: '#646cff', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '0.75rem', borderBottom: '2px solid #444', fontWeight: 600 },
  td: { padding: '0.6rem 0.75rem', borderBottom: '1px solid #333' },
  empty: { textAlign: 'center', padding: '2rem', color: '#888' },
  editBtn: { marginRight: '0.5rem', padding: '0.3rem 0.8rem', fontSize: '0.85rem' },
  deleteBtn: { padding: '0.3rem 0.8rem', fontSize: '0.85rem', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
  saveBtn: { marginRight: '0.5rem', padding: '0.3rem 0.8rem', fontSize: '0.85rem', background: '#27ae60', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
  cancelBtn: { padding: '0.3rem 0.8rem', fontSize: '0.85rem' },
  editInput: { padding: '0.4rem', borderRadius: 4, border: '1px solid #555', background: 'transparent', color: 'inherit', width: '100%', boxSizing: 'border-box' },
}

export default FleetManager
