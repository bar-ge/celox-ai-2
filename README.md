# Celox AI - Fleet Management System

Professional fleet management platform for Israeli businesses. Manage vehicles, drivers, maintenance schedules, and reporting with PDF/Excel exports. Built for fleet managers who need powerful tools without the complexity.

---

## 🎯 Overview

Celox AI helps fleet managers across Israel (transport, agriculture, construction, services) manage:
- **Vehicle Fleet** — Track all vehicles, maintenance, alerts
- **Driver Management** — Manage driver assignments, hours, compliance
- **Cost Tracking** — Monitor fuel, maintenance, and operational costs
- **Reporting** — Generate PDF and Excel reports for analysis
- **Compliance** — Israeli Privacy Law compliant data handling

---

## ✨ Features

- **Dashboard** — At-a-glance fleet overview
- **Vehicle Management** — Add, edit, track vehicles with maintenance history
- **Driver Management** — Assign drivers, track certifications, hours
- **Alerts System** — Maintenance alerts, compliance warnings
- **PDF Export** — Generate professional fleet reports
- **Excel Export** — Bulk export for analysis
- **Bilingual** — Hebrew (RTL) and English support
- **Responsive Design** — Desktop and mobile ready
- **Privacy-First** — Israeli Privacy Law compliance built-in
- **Input Validation** — Client-side validation on all forms
- **Rate Limiting** — API rate limiting for security

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account with a project
- Resend account for email (optional, for contact form)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/bar-ge/celox-ai-2.git
   cd my-fleet-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   RESEND_API_KEY=re_your_api_key_here
   RESEND_RECIPIENT_EMAIL=your-email@example.com
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🛠️ Development

### Available Scripts

```bash
npm run dev       # Start dev server with hot reload
npm run build     # Build for production (Vercel-optimized)
npm run preview   # Preview production build locally
npm run lint      # Run ESLint
```

### Project Structure

```
src/
├── App.jsx                  # Main dashboard
├── CRM.jsx                  # CRM module
├── LandingPage.jsx          # Public landing page
├── PublicForm.jsx           # Contact form (public)
├── PrivacyPage.jsx          # Privacy policy
├── fleet-manager.jsx        # ⚠️ LARGE: Core fleet management
├── LogoIcon.jsx              # Logo component
├── supabaseClient.js        # Supabase client setup
├── validators.js            # Form validation utilities
└── assets/                  # Images, icons

api/
└── contact.js               # Vercel serverless endpoint for contact form

supabase/
└── migrations/              # Database migrations

docs/
└── ...                      # Documentation (ISMS, privacy/terms, etc.)
```

---

## ⚠️ Architecture Note

**`fleet-manager.jsx` is a large monolithic component (~8,600 lines).** A component-based refactor (splitting it into `components/`, `hooks/`, `services/`, `utils/`) was attempted but never merged — the app continues to build directly on the monolith. Revisit this if the file keeps growing.

---

## 🗄️ Database Setup

Required Supabase tables:
- `vehicles` — Fleet vehicles with details
- `drivers` — Driver information
- `assignments` — Driver-to-vehicle mappings
- `maintenance` — Maintenance history and alerts
- `costs` — Operational costs tracking
- `reports` — Generated reports archive

See `database-setup.sql` for full schema.

---

## 🔐 Security

- ✅ Environment variables for API keys (RESEND_API_KEY, Supabase keys)
- ✅ Email recipient in .env (not hardcoded)
- ✅ Input validation on all forms
- ✅ Rate limiting on API endpoints
- ✅ Error message sanitization
- ✅ Cloudflare Turnstile on public forms
- ✅ Row-level security (RLS) on Supabase
- ✅ Israeli Privacy Law compliance / ISO 27001 ISMS documentation

---

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 📦 Dependencies

### Production
- `react@^19.2.0` — UI library
- `@supabase/supabase-js@^2.100.0` — Backend
- `jspdf` — PDF generation
- `exceljs` — Excel generation
- `@marsidev/react-turnstile` — CAPTCHA
- `@vercel/speed-insights` — Performance monitoring

### Development
- `vite@^7.3.1` — Build tool
- `eslint@^9.39.1` — Linting
- `@vitejs/plugin-react@^5.1.1` — React support

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run linting (`npm run lint`)
5. Commit (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 📄 License

Private project — All rights reserved

---

## 📞 Support

For issues, feature requests, or questions:
- GitHub Issues: [Create an issue](https://github.com/bar-ge/celox-ai-2/issues)
- Email: bar.gershenzon@gmail.com

---

## 🚀 Deployment

### Vercel (Current)
The app is configured for Vercel deployment:
- Frontend: Vite SPA
- API Routes: Vercel serverless functions

See `vercel.json` for configuration.

### Environment Variables (Vercel)
Set in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `RESEND_API_KEY`
- `RESEND_RECIPIENT_EMAIL`

---

**Maintainer**: bar-ge
