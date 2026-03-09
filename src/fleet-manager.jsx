import { supabase } from './supabaseClient'
import { useState, useEffect } from 'react'

function FleetManager() {
  const [branches, setBranches] = useState([])
  const [drivers, setDrivers] = useState([])
  // Instead of: const [cars, setCars] = useState(INIT_CARS)
  const [cars, setCars] = useState([])

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const [{ data: branches }, { data: drivers }, { data: cars }] = await Promise.all([
      supabase.from('branches').select('*').order('created_at'),
      supabase.from('drivers').select('*').order('created_at'),
      supabase.from('cars').select('*').order('created_at'),
    ])
    if (branches) setBranches(branches)
    if (drivers)  setDrivers(drivers)
    if (cars)     setCars(cars)
  }

  // Cars CRUD
  async function addCar(newCar) {
    const { data, error } = await supabase.from('cars').insert([newCar]).select()
    if (data) setCars(prev => [...prev, data[0]])
  }

  async function updateCar(form) {
    await supabase.from('cars').update(form).eq('id', form.id)
    setCars(prev => prev.map(c => c.id === form.id ? form : c))
  }

  async function deleteCar(id) {
    await supabase.from('cars').delete().eq('id', id)
    setCars(prev => prev.filter(c => c.id !== id))
  }

  // Drivers CRUD
  async function addDriver(newDriver) {
    const { data, error } = await supabase.from('drivers').insert([newDriver]).select()
    if (data) setDrivers(prev => [...prev, data[0]])
  }

  async function updateDriver(form) {
    await supabase.from('drivers').update(form).eq('id', form.id)
    setDrivers(prev => prev.map(d => d.id === form.id ? form : d))
  }

  async function deleteDriver(id) {
    await supabase.from('drivers').delete().eq('id', id)
    setDrivers(prev => prev.filter(d => d.id !== id))
  }

  // Branches CRUD
  async function addBranch(newBranch) {
    const { data, error } = await supabase.from('branches').insert([newBranch]).select()
    if (data) setBranches(prev => [...prev, data[0]])
  }

  async function updateBranch(form) {
    await supabase.from('branches').update(form).eq('id', form.id)
    setBranches(prev => prev.map(b => b.id === form.id ? form : b))
  }

  async function deleteBranch(id) {
    await supabase.from('branches').delete().eq('id', id)
    setBranches(prev => prev.filter(b => b.id !== id))
  }

  return (
    <div>
      <h1>Fleet Manager</h1>
      {/* Add your UI here */}
    </div>
  )
}

export default FleetManager