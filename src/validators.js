// ── Validation functions ──────────────────────────────────────────────────────

export const isEmpty  = v => !v?.toString().trim()
export const isEmail  = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v?.trim())
export const isMinLen = (v, n) => v?.trim().length >= n

export const isIsraeliPhone = v => {
  const c = v?.replace(/[\s\-().]/g, '') ?? ''
  return /^(\+972|972|0)(5[0-9]|7[2-9]|7[01]|[2-9])\d{7}$/.test(c)
}

export const isIsraeliPlate = v => {
  const c = v?.replace(/[-\s]/g, '') ?? ''
  return /^\d{7,8}$/.test(c)
}

export const isDriverLicense = v => {
  const c = v?.replace(/[\s\-]/g, '') ?? ''
  return /^\d{6,9}$/.test(c)
}

export const isYear = v => {
  const n = parseInt(v, 10)
  return !isNaN(n) && n >= 1900 && n <= 2099
}

export const isPositive = v => {
  const n = parseFloat(v)
  return !isNaN(n) && n >= 0
}

// ── Error messages ────────────────────────────────────────────────────────────

export const ERR = {
  he: {
    required:      'שדה חובה',
    minLen:        n => `לפחות ${n} תווים`,
    email:         'כתובת אימייל לא תקינה',
    phone:         'מספר טלפון לא תקין (לדוגמה: 050-1234567)',
    plate:         'לוחית רישוי לא תקינה (7–8 ספרות)',
    driverLicense: 'מספר רישיון נהיגה לא תקין',
    year:          'שנה לא תקינה (1900–2099)',
    positive:      'חייב להיות מספר חיובי',
    name:          'שם לא תקין (לפחות 2 תווים)',
  },
  en: {
    required:      'Required',
    minLen:        n => `At least ${n} characters`,
    email:         'Invalid email address',
    phone:         'Invalid phone number (e.g. 050-1234567)',
    plate:         'Invalid license plate (7–8 digits)',
    driverLicense: 'Invalid driver license number',
    year:          'Invalid year (1900–2099)',
    positive:      'Must be a positive number',
    name:          'Invalid name (at least 2 characters)',
  },
}

// ── Validate a single field value ─────────────────────────────────────────────
// Returns error string or null

export function validateField(field, value, lang = 'he') {
  const e = ERR[lang] ?? ERR.he
  const v = value?.toString() ?? ''

  switch (field) {
    case 'name':
    case 'submitter_name':
      if (isEmpty(v)) return e.required
      if (!isMinLen(v, 2)) return e.name
      return null

    case 'email':
      if (isEmpty(v)) return e.required
      if (!isEmail(v)) return e.email
      return null

    case 'phone':
      if (isEmpty(v)) return e.required
      if (!isIsraeliPhone(v)) return e.phone
      return null

    case 'plate':
    case 'my_plate':
    case 'other_plate':
      if (isEmpty(v)) return e.required
      if (!isIsraeliPlate(v)) return e.plate
      return null

    case 'license':
    case 'driver_license':
      if (isEmpty(v)) return null // optional in most forms
      if (!isDriverLicense(v)) return e.driverLicense
      return null

    case 'year':
      if (isEmpty(v)) return null
      if (!isYear(v)) return e.year
      return null

    case 'mileage':
    case 'cost':
    case 'km_interval':
    case 'month_interval':
    case 'next_service_mileage':
      if (isEmpty(v)) return null
      if (!isPositive(v)) return e.positive
      return null

    default:
      return null
  }
}

// ── Validate a whole form object ──────────────────────────────────────────────
// Returns { fieldName: errorString } — only invalid fields included

export function validateForm(form, requiredFields = [], lang = 'he') {
  const e = ERR[lang] ?? ERR.he
  const errors = {}

  for (const [field, value] of Object.entries(form)) {
    const err = validateField(field, value, lang)
    if (err) errors[field] = err
  }

  for (const field of requiredFields) {
    if (!errors[field] && isEmpty(form[field])) {
      errors[field] = e.required
    }
  }

  return errors
}
