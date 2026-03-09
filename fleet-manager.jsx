import { useState, useContext, createContext, useCallback } from "react";

// ─── TRANSLATIONS ───────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  en: {
    dir: "ltr", appName: "Fleet Manager", appSub: "Company Vehicle System",
    nav: { fleet: "Fleet", drivers: "Drivers", branches: "Branches", dashboard: "Dashboard", settings: "Settings" },
    fleet: {
      title: "Vehicle Fleet", subtitle: "Manage your company vehicles",
      addVehicle: "Add Vehicle", search: "Search plate, make, model, driver or branch...",
      filterAll: "All", noResults: "No vehicles found",
      columns: { vehicle: "Vehicle", plate: "Plate", year: "Year", fuel: "Fuel", mileage: "Mileage", branch: "Branch", driver: "Driver", status: "Status", actions: "" },
    },
    drivers: {
      title: "Drivers", subtitle: "Manage company drivers",
      addDriver: "Add Driver", search: "Search name, license, phone or branch...", noResults: "No drivers found",
      columns: { name: "Name", license: "License No.", phone: "Phone", branch: "Branch", assignedCar: "Vehicle", status: "Status", actions: "" },
      form: { addTitle: "Add New Driver", editTitle: "Edit Driver", name: "Full Name", license: "License Number", phone: "Phone", branch: "Branch", car: "Assign Vehicle", status: "Status", save: "Save Driver", cancel: "Cancel" },
      detail: { title: "Driver Details" },
      confirm: { title: "Delete Driver?", body: "The driver will be unassigned from their vehicle.", yes: "Yes, Delete", no: "Cancel" },
      status: { Active: "Active", "Off Duty": "Off Duty", Suspended: "Suspended" },
      toast: { added: "Driver added", updated: "Driver updated", deleted: "Driver removed", error: "Fill required fields" },
      noCar: "No vehicle",
    },
    branches: {
      title: "Branches", subtitle: "Manage company branch locations",
      addBranch: "Add Branch", search: "Search name, city or manager...", noResults: "No branches found",
      columns: { name: "Branch Name", city: "City", manager: "Manager", vehicles: "Vehicles", drivers: "Drivers", actions: "" },
      form: { addTitle: "Add Branch", editTitle: "Edit Branch", name: "Branch Name", city: "City", address: "Address", manager: "Manager Name", phone: "Phone", save: "Save Branch", cancel: "Cancel" },
      detail: { title: "Branch Details" },
      confirm: { title: "Delete Branch?", body: "Vehicles and drivers will become unassigned.", yes: "Yes, Delete", no: "Cancel" },
      toast: { added: "Branch added", updated: "Branch updated", deleted: "Branch removed", error: "Fill required fields" },
    },
    form: {
      addTitle: "Add New Vehicle", editTitle: "Edit Vehicle",
      plate: "License Plate", make: "Make", model: "Model", year: "Year",
      fuel: "Fuel Type", mileage: "Mileage (km)", driver: "Assign Driver",
      branch: "Branch", status: "Status", color: "Color Tag",
      save: "Save Vehicle", cancel: "Cancel", noDriver: "No Driver", noBranch: "No Branch",
    },
    detail: { title: "Vehicle Details", edit: "Edit", close: "Close", delete: "Delete" },
    confirm: { title: "Delete Vehicle?", body: "This action cannot be undone.", yes: "Yes, Delete", no: "Cancel" },
    dashboard: {
      title: "Dashboard", subtitle: "Fleet overview & insights",
      totalVehicles: "Total Vehicles", available: "Available", inUse: "In Use", maintenance: "Maintenance",
      totalDrivers: "Drivers", totalBranches: "Branches",
      fleetStatus: "Fleet Status", fuelBreakdown: "Fuel Types", mileageRank: "Top Mileage", byBranch: "Vehicles by Branch",
    },
    settings: { title: "Settings", subtitle: "System preferences", language: "Language", theme: "Theme", themeLight: "Light", themeDark: "Dark" },
    status: { Available: "Available", "In Use": "In Use", Maintenance: "Maintenance" },
    fuel: { Petrol: "Petrol", Diesel: "Diesel", Hybrid: "Hybrid", Electric: "Electric" },
    toast: { added: "Vehicle added", updated: "Vehicle updated", deleted: "Vehicle removed", error: "Fill required fields" },
    unassigned: "Unassigned", km: "km", noBranch: "No Branch",
  },
  he: {
    dir: "rtl", appName: "מנהל צי", appSub: "מערכת רכבי החברה",
    nav: { fleet: "רכבים", drivers: "נהגים", branches: "סניפים", dashboard: "לוח בקרה", settings: "הגדרות" },
    fleet: {
      title: "צי הרכבים", subtitle: "ניהול רכבי החברה",
      addVehicle: "הוסף רכב", search: "חיפוש לוחית, יצרן, דגם, נהג או סניף...",
      filterAll: "הכל", noResults: "לא נמצאו רכבים",
      columns: { vehicle: "רכב", plate: "לוחית", year: "שנה", fuel: "דלק", mileage: "ק״מ", branch: "סניף", driver: "נהג", status: "סטטוס", actions: "" },
    },
    drivers: {
      title: "נהגים", subtitle: "ניהול נהגי החברה",
      addDriver: "הוסף נהג", search: "חיפוש שם, רישיון, טלפון או סניף...", noResults: "לא נמצאו נהגים",
      columns: { name: "שם", license: "מס׳ רישיון", phone: "טלפון", branch: "סניף", assignedCar: "רכב", status: "סטטוס", actions: "" },
      form: { addTitle: "הוסף נהג חדש", editTitle: "עריכת נהג", name: "שם מלא", license: "מספר רישיון", phone: "טלפון", branch: "סניף", car: "שייך רכב", status: "סטטוס", save: "שמור נהג", cancel: "ביטול" },
      detail: { title: "פרטי נהג" },
      confirm: { title: "למחוק נהג?", body: "הנהג יוסר משיוך הרכב.", yes: "כן, מחק", no: "ביטול" },
      status: { Active: "פעיל", "Off Duty": "לא בתפקיד", Suspended: "מושעה" },
      toast: { added: "נהג נוסף", updated: "נהג עודכן", deleted: "נהג הוסר", error: "מלא שדות חובה" },
      noCar: "ללא רכב",
    },
    branches: {
      title: "סניפים", subtitle: "ניהול סניפי החברה",
      addBranch: "הוסף סניף", search: "חיפוש שם, עיר או מנהל...", noResults: "לא נמצאו סניפים",
      columns: { name: "שם סניף", city: "עיר", manager: "מנהל", vehicles: "רכבים", drivers: "נהגים", actions: "" },
      form: { addTitle: "הוסף סניף חדש", editTitle: "עריכת סניף", name: "שם סניף", city: "עיר", address: "כתובת", manager: "שם מנהל", phone: "טלפון", save: "שמור סניף", cancel: "ביטול" },
      detail: { title: "פרטי סניף" },
      confirm: { title: "למחוק סניף?", body: "רכבים ונהגים בסניף יהפכו ללא משויך.", yes: "כן, מחק", no: "ביטול" },
      toast: { added: "סניף נוסף", updated: "סניף עודכן", deleted: "סניף הוסר", error: "מלא שדות חובה" },
    },
    form: {
      addTitle: "הוסף רכב חדש", editTitle: "עריכת רכב",
      plate: "לוחית רישוי", make: "יצרן", model: "דגם", year: "שנה",
      fuel: "סוג דלק", mileage: "קילומטראז׳", driver: "שייך נהג",
      branch: "סניף", status: "סטטוס", color: "צבע תג",
      save: "שמור רכב", cancel: "ביטול", noDriver: "ללא נהג", noBranch: "ללא סניף",
    },
    detail: { title: "פרטי הרכב", edit: "עריכה", close: "סגור", delete: "מחיקה" },
    confirm: { title: "למחוק רכב?", body: "פעולה זו אינה ניתנת לביטול.", yes: "כן, מחק", no: "ביטול" },
    dashboard: {
      title: "לוח בקרה", subtitle: "סקירת הצי ותובנות",
      totalVehicles: "סה״כ רכבים", available: "פנויים", inUse: "בשימוש", maintenance: "בתחזוקה",
      totalDrivers: "נהגים", totalBranches: "סניפים",
      fleetStatus: "מצב הצי", fuelBreakdown: "סוגי דלק", mileageRank: "קילומטראז׳ גבוה", byBranch: "רכבים לפי סניף",
    },
    settings: { title: "הגדרות", subtitle: "העדפות מערכת", language: "שפה", theme: "ערכת נושא", themeLight: "בהיר", themeDark: "כהה" },
    status: { Available: "פנוי", "In Use": "בשימוש", Maintenance: "תחזוקה" },
    fuel: { Petrol: "בנזין", Diesel: "דיזל", Hybrid: "היברידי", Electric: "חשמלי" },
    toast: { added: "רכב נוסף", updated: "רכב עודכן", deleted: "רכב הוסר", error: "מלא שדות חובה" },
    unassigned: "לא משויך", km: "ק״מ", noBranch: "ללא סניף",
  },
};

// ─── CONTEXT ─────────────────────────────────────────────────────────────────
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const TOKENS = {
  light: {
    bg:"#EEF2F7", surface:"#FFFFFF", surfaceAlt:"#F5F8FC", surfaceHover:"#EEF2F7",
    border:"#DDE3EC", borderStrong:"#B8C4D4",
    text:"#1A2332", textSub:"#5A6A7E", textMuted:"#98A8B8",
    primary:"#2563EB", primaryHover:"#1D4ED8", primaryText:"#FFFFFF",
    danger:"#DC2626", dangerBg:"#FEF2F2",
    success:"#16A34A", successBg:"#F0FDF4",
    warning:"#D97706", warningBg:"#FFFBEB",
    info:"#0891B2", infoBg:"#ECFEFF",
    shadow:"0 1px 3px rgba(0,0,0,0.07)", shadowMd:"0 4px 20px rgba(0,0,0,0.10)",
    r:{ xs:"4px", sm:"8px", md:"10px", lg:"14px", xl:"18px", full:"999px" },
  },
  dark: {
    bg:"#0D1321", surface:"#172030", surfaceAlt:"#111827", surfaceHover:"#1E2D3D",
    border:"#1E2D3D", borderStrong:"#2D3F55",
    text:"#E8EDF5", textSub:"#8A9BB0", textMuted:"#4A5A6E",
    primary:"#3B82F6", primaryHover:"#2563EB", primaryText:"#FFFFFF",
    danger:"#EF4444", dangerBg:"#1F0909",
    success:"#22C55E", successBg:"#052E16",
    warning:"#F59E0B", warningBg:"#1C1205",
    info:"#22D3EE", infoBg:"#0C1929",
    shadow:"0 1px 3px rgba(0,0,0,0.3)", shadowMd:"0 4px 20px rgba(0,0,0,0.4)",
    r:{ xs:"4px", sm:"8px", md:"10px", lg:"14px", xl:"18px", full:"999px" },
  },
};

const STATUS_META     = { Available:"success", "In Use":"warning", Maintenance:"danger" };
const DRV_STATUS_META = { Active:"success", "Off Duty":"warning", Suspended:"danger" };
const FUEL_ICON       = { Petrol:"⛽", Diesel:"🛢", Hybrid:"♻️", Electric:"⚡" };
const CAR_COLORS      = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4","#84CC16","#F97316","#64748B"];
const BRANCH_COLORS   = ["#3B82F6","#8B5CF6","#10B981","#F59E0B","#EC4899","#06B6D4","#EF4444","#84CC16"];

// ─── SEED DATA ───────────────────────────────────────────────────────────────
const INIT_BRANCHES = [
  { id:"b1", name:"Tel Aviv HQ",  city:"Tel Aviv",  address:"Rothschild 22", manager:"Avi Shapiro", phone:"03-1234567", color:"#3B82F6" },
  { id:"b2", name:"Jerusalem",    city:"Jerusalem", address:"Jaffa Gate 5",  manager:"Sara Levi",   phone:"02-7654321", color:"#8B5CF6" },
  { id:"b3", name:"Haifa North",  city:"Haifa",     address:"Port Area 10",  manager:"Moshe Cohen", phone:"04-9876543", color:"#10B981" },
];
const INIT_DRIVERS = [
  { id:"d1", name:"David Levi",    license:"IL-442231", phone:"052-1111111", branchId:"b1", carId:2,    status:"Active"   },
  { id:"d2", name:"Noa Cohen",     license:"IL-338822", phone:"054-2222222", branchId:"b2", carId:5,    status:"Active"   },
  { id:"d3", name:"Yossi Ben-Ami", license:"IL-991100", phone:"050-3333333", branchId:"b1", carId:null, status:"Off Duty" },
  { id:"d4", name:"Rina Peretz",   license:"IL-556677", phone:"058-4444444", branchId:"b3", carId:null, status:"Active"   },
];
const INIT_CARS = [
  { id:1, plate:"123-45-678", make:"Toyota",  model:"Camry",    year:2022, status:"Available",   driverId:null, branchId:"b1", mileage:34200, fuel:"Petrol",  color:"#3B82F6" },
  { id:2, plate:"234-56-789", make:"Ford",    model:"Transit",  year:2021, status:"In Use",       driverId:"d1", branchId:"b1", mileage:78400, fuel:"Diesel",  color:"#F59E0B" },
  { id:3, plate:"345-67-890", make:"Hyundai", model:"Tucson",   year:2023, status:"Maintenance",  driverId:null, branchId:"b2", mileage:12100, fuel:"Hybrid",  color:"#10B981" },
  { id:4, plate:"456-78-901", make:"Kia",     model:"Sportage", year:2022, status:"Available",   driverId:null, branchId:"b3", mileage:22800, fuel:"Petrol",  color:"#8B5CF6" },
  { id:5, plate:"567-89-012", make:"Tesla",   model:"Model 3",  year:2023, status:"In Use",       driverId:"d2", branchId:"b2", mileage:8900,  fuel:"Electric",color:"#EC4899" },
];

// ════════════════════════════════════════════════════════════
//  GLOBAL COMPONENTS
// ════════════════════════════════════════════════════════════

function Button({ children, onClick, variant="primary", size="md", disabled, icon, fullWidth, style:ex={} }) {
  const { theme } = useApp(); const t = TOKENS[theme];
  const [hov, setHov] = useState(false);
  const sizes = {
    xs:{ padding:"4px 10px", fontSize:"11px" },
    sm:{ padding:"6px 14px", fontSize:"12px" },
    md:{ padding:"8px 18px", fontSize:"14px" },
    lg:{ padding:"10px 22px",fontSize:"14px" },
  };
  const vars = {
    primary:  { background: hov?t.primaryHover:t.primary, color:t.primaryText, border:"none", boxShadow:`0 2px 8px ${t.primary}35` },
    secondary:{ background: hov?t.surfaceHover:t.surface, color:t.text,        border:`1px solid ${t.border}` },
    ghost:    { background: hov?t.surfaceHover:"transparent", color:t.textSub, border:`1px solid transparent` },
    danger:   { background: hov?"#b91c1c":t.dangerBg, color:hov?"#fff":t.danger, border:`1px solid ${t.danger}40` },
  };
  return (
    <button onClick={disabled?undefined:onClick} disabled={disabled}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", gap:"6px",
        cursor:disabled?"not-allowed":"pointer", fontFamily:"inherit", fontWeight:600,
        borderRadius:t.r.md, transition:"all 0.17s", opacity:disabled?0.5:1,
        whiteSpace:"nowrap", width:fullWidth?"100%":"auto",
        transform:hov&&!disabled?"translateY(-1px)":"none",
        ...sizes[size], ...vars[variant], ...ex }}>
      {icon && <span style={{fontSize:"13px",lineHeight:1}}>{icon}</span>}
      {children}
    </button>
  );
}

function Input({ label, value, onChange, placeholder, type="text", required, autoFocus }) {
  const { theme, isRTL } = useApp(); const t = TOKENS[theme];
  const [focus, setFocus] = useState(false);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
      {label && <label style={{fontSize:"11px",fontWeight:700,color:t.textSub,textTransform:"uppercase",letterSpacing:"0.07em"}}>
        {label}{required && <span style={{color:t.danger}}> *</span>}
      </label>}
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type} autoFocus={autoFocus}
        onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
        style={{ background:t.surfaceAlt, border:`1.5px solid ${focus?t.primary:t.border}`,
          borderRadius:t.r.md, padding:"9px 12px", fontSize:"14px", color:t.text,
          fontFamily:"inherit", outline:"none", transition:"border-color 0.17s",
          textAlign:isRTL?"right":"left", width:"100%" }} />
    </div>
  );
}

function Select({ label, value, onChange, options, required }) {
  const { theme, isRTL } = useApp(); const t = TOKENS[theme];
  const [focus, setFocus] = useState(false);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
      {label && <label style={{fontSize:"11px",fontWeight:700,color:t.textSub,textTransform:"uppercase",letterSpacing:"0.07em"}}>
        {label}{required && <span style={{color:t.danger}}> *</span>}
      </label>}
      <select value={value} onChange={e=>onChange(e.target.value)}
        onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
        style={{ background:t.surfaceAlt, border:`1.5px solid ${focus?t.primary:t.border}`,
          borderRadius:t.r.md, padding:"9px 12px", fontSize:"14px", color:t.text,
          fontFamily:"inherit", outline:"none", cursor:"pointer",
          transition:"border-color 0.17s", appearance:"none",
          direction:isRTL?"rtl":"ltr", width:"100%" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Badge({ label, colorKey }) {
  const { theme } = useApp(); const t = TOKENS[theme];
  const map = {
    success:{ bg:t.successBg, text:t.success },
    warning:{ bg:t.warningBg, text:t.warning },
    danger: { bg:t.dangerBg,  text:t.danger  },
    info:   { bg:t.infoBg,    text:t.info    },
    muted:  { bg:t.surfaceAlt,text:t.textMuted},
  };
  const c = map[colorKey]||map.muted;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 10px",
      borderRadius:t.r.full, background:c.bg, color:c.text,
      fontSize:"11px", fontWeight:700, whiteSpace:"nowrap" }}>
      {label}
    </span>
  );
}

function Card({ children, style:ex={}, onClick, hoverable }) {
  const { theme } = useApp(); const t = TOKENS[theme];
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:t.surface, border:`1px solid ${hov&&hoverable?t.borderStrong:t.border}`,
        borderRadius:t.r.lg, boxShadow:hov&&hoverable?t.shadowMd:t.shadow,
        transition:"all 0.18s", cursor:hoverable?"pointer":"default", ...ex }}>
      {children}
    </div>
  );
}

function Divider({ my=0 }) {
  const { theme } = useApp();
  return <div style={{height:"1px",background:TOKENS[theme].border,margin:`${my}px 0`}}/>;
}

function Modal({ open, onClose, title, children, width=560 }) {
  const { theme } = useApp(); const t = TOKENS[theme];
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)",
      backdropFilter:"blur(5px)", zIndex:1000, display:"flex", alignItems:"center",
      justifyContent:"center", padding:"16px" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:t.surface, borderRadius:t.r.xl,
        boxShadow:"0 24px 64px rgba(0,0,0,0.35)", width:"100%", maxWidth:width,
        maxHeight:"92vh", overflow:"auto", animation:"modalIn 0.22s ease" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"18px 24px", borderBottom:`1px solid ${t.border}`,
          position:"sticky", top:0, background:t.surface, zIndex:1 }}>
          <h2 style={{fontSize:"16px",fontWeight:800,color:t.text,margin:0}}>{title}</h2>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",
            fontSize:"22px",color:t.textMuted,lineHeight:1,padding:"2px 6px",borderRadius:t.r.sm}}>×</button>
        </div>
        <div style={{padding:"24px"}}>{children}</div>
      </div>
    </div>
  );
}

function Toast({ toast }) {
  const { theme } = useApp(); const t = TOKENS[theme];
  if (!toast) return null;
  const map = { success:{bg:t.success,icon:"✓"}, error:{bg:t.danger,icon:"✕"}, info:{bg:t.primary,icon:"i"} };
  const c = map[toast.type]||map.info;
  return (
    <div style={{ position:"fixed", bottom:"24px", left:"50%", transform:"translateX(-50%)",
      background:c.bg, color:"#fff", padding:"11px 22px", borderRadius:t.r.full,
      fontWeight:700, fontSize:"13px", zIndex:9999, boxShadow:"0 8px 32px rgba(0,0,0,0.3)",
      display:"flex", alignItems:"center", gap:"8px", animation:"toastIn 0.3s ease", whiteSpace:"nowrap" }}>
      <span style={{width:18,height:18,borderRadius:"50%",background:"rgba(255,255,255,0.25)",
        display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:900}}>{c.icon}</span>
      {toast.msg}
    </div>
  );
}

function StatCard({ icon, label, value, colorKey }) {
  const { theme } = useApp(); const t = TOKENS[theme];
  const clr = { success:t.success, warning:t.warning, danger:t.danger, primary:t.primary, info:t.info, muted:t.textMuted };
  return (
    <Card style={{padding:"18px 20px",flex:1,minWidth:120}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:"26px",fontWeight:900,color:clr[colorKey]||t.primary,letterSpacing:"-0.02em",lineHeight:1}}>{value}</div>
          <div style={{fontSize:"12px",color:t.textSub,marginTop:"4px",fontWeight:600}}>{label}</div>
        </div>
        <span style={{fontSize:"19px",opacity:0.65,marginTop:"2px"}}>{icon}</span>
      </div>
    </Card>
  );
}

function NavItem({ icon, label, active, onClick, collapsed, badge }) {
  const { theme } = useApp(); const t = TOKENS[theme];
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:"flex", alignItems:"center", gap:"9px",
        padding:collapsed?"10px":"9px 12px", borderRadius:t.r.md,
        cursor:"pointer", transition:"all 0.17s",
        background:active?`${t.primary}18`:hov?`${t.text}07`:"transparent",
        color:active?t.primary:hov?t.text:t.textSub,
        fontWeight:active?700:500, fontSize:"13px",
        justifyContent:collapsed?"center":"flex-start" }}>
      <span style={{fontSize:"16px",flexShrink:0}}>{icon}</span>
      {!collapsed && <span style={{flex:1}}>{label}</span>}
      {!collapsed && badge>0 && (
        <span style={{background:t.primary,color:"#fff",fontSize:"10px",fontWeight:800,
          padding:"1px 6px",borderRadius:t.r.full,minWidth:18,textAlign:"center"}}>{badge}</span>
      )}
    </div>
  );
}

function ColorPicker({ label, value, onChange, colors=CAR_COLORS }) {
  const { theme } = useApp(); const t = TOKENS[theme];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
      {label && <label style={{fontSize:"11px",fontWeight:700,color:t.textSub,textTransform:"uppercase",letterSpacing:"0.07em"}}>{label}</label>}
      <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
        {colors.map(c=>(
          <div key={c} onClick={()=>onChange(c)}
            style={{width:24,height:24,borderRadius:"50%",background:c,cursor:"pointer",
              border:value===c?`3px solid ${t.text}`:"3px solid transparent",
              transition:"transform 0.15s",transform:value===c?"scale(1.25)":"scale(1)"}}/>
        ))}
      </div>
    </div>
  );
}

function Table({ columns, data, onRowClick, emptyMsg }) {
  const { theme, isRTL } = useApp(); const t = TOKENS[theme];
  return (
    <Card style={{overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:t.surfaceAlt}}>
              {columns.map(col=>(
                <th key={col.key} style={{ padding:"11px 16px", textAlign:isRTL?"right":"left",
                  fontSize:"11px", fontWeight:800, color:t.textMuted, textTransform:"uppercase",
                  letterSpacing:"0.08em", borderBottom:`1px solid ${t.border}`,
                  whiteSpace:"nowrap", width:col.width }}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length===0 ? (
              <tr><td colSpan={columns.length} style={{textAlign:"center",padding:"44px",color:t.textMuted,fontSize:"14px"}}>🔍 {emptyMsg}</td></tr>
            ) : data.map((row,idx)=>(
              <tr key={row.id} onClick={()=>onRowClick&&onRowClick(row)}
                style={{borderBottom:idx<data.length-1?`1px solid ${t.border}`:"none",
                  cursor:onRowClick?"pointer":"default",transition:"background 0.14s"}}
                onMouseEnter={e=>{if(onRowClick)e.currentTarget.style.background=t.surfaceAlt}}
                onMouseLeave={e=>{if(onRowClick)e.currentTarget.style.background="transparent"}}>
                {columns.map(col=>(
                  <td key={col.key} style={{padding:"12px 16px",fontSize:"13px"}}
                    onClick={col.noClick?e=>e.stopPropagation():undefined}>
                    {col.render?col.render(row):row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PageHeader({ title, subtitle, action }) {
  const { theme } = useApp(); const t = TOKENS[theme];
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px",flexWrap:"wrap",gap:"12px"}}>
      <div>
        <h1 style={{fontSize:"22px",fontWeight:900,letterSpacing:"-0.02em",color:t.text}}>{title}</h1>
        {subtitle && <p style={{color:t.textSub,fontSize:"13px",marginTop:"2px"}}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function ConfirmModal({ open, onClose, title, body, onConfirm, yesLabel, noLabel }) {
  const { theme } = useApp(); const t = TOKENS[theme];
  return (
    <Modal open={open} onClose={onClose} title={title} width={380}>
      <p style={{color:t.textSub,fontSize:"14px",marginBottom:"24px",lineHeight:1.65}}>{body}</p>
      <div style={{display:"flex",gap:"10px",justifyContent:"flex-end"}}>
        <Button variant="secondary" onClick={onClose}>{noLabel}</Button>
        <Button onClick={onConfirm} style={{background:t.danger,color:"#fff",border:"none"}} icon="🗑">{yesLabel}</Button>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
//  FLEET TAB
// ════════════════════════════════════════════════════════════
function FleetTab({ cars, setCars, drivers, branches, showToast }) {
  const { theme, T, isRTL } = useApp(); const t = TOKENS[theme];
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilter] = useState("All");
  const [modal, setModal]         = useState(null);
  const [form, setForm]           = useState({});
  const [selected, setSelected]   = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const EMPTY = { plate:"", make:"", model:"", year:new Date().getFullYear(), status:"Available", driverId:"", branchId:"", mileage:0, fuel:"Petrol", color:"#3B82F6" };

  const filtered = cars.filter(c=>{
    const br = branches.find(b=>b.id===c.branchId)?.name||"";
    const dr = drivers.find(d=>d.id===c.driverId)?.name||"";
    return `${c.plate} ${c.make} ${c.model} ${dr} ${br}`.toLowerCase().includes(search.toLowerCase())
      && (filterStatus==="All"||c.status===filterStatus);
  });

  const sf = k => v => setForm(p=>({...p,[k]:v}));
  const openAdd  = ()  => { setForm({...EMPTY}); setSelected(null); setModal("form"); };
  const openEdit = car => { setForm({...car}); setSelected(car); setModal("form"); };
  const openView = car => { setSelected(car); setModal("view"); };

  const handleSave = () => {
    if(!form.plate||!form.make||!form.model){ showToast(T.toast.error,"error"); return; }
    if(selected){ setCars(p=>p.map(c=>c.id===form.id?form:c)); showToast(T.toast.updated); }
    else { setCars(p=>[...p,{...form,id:Date.now()}]); showToast(T.toast.added); }
    setModal(null);
  };
  const handleDelete = id => { setCars(p=>p.filter(c=>c.id!==id)); setConfirmId(null); setModal(null); showToast(T.toast.deleted,"error"); };

  const stats = { total:cars.length, available:cars.filter(c=>c.status==="Available").length, inUse:cars.filter(c=>c.status==="In Use").length, maintenance:cars.filter(c=>c.status==="Maintenance").length };

  const columns = [
    { key:"vehicle", label:T.fleet.columns.vehicle, render:c=>(
      <div style={{display:"flex",alignItems:"center",gap:"9px"}}>
        <div style={{width:5,height:30,borderRadius:3,background:c.color,flexShrink:0}}/>
        <span style={{fontWeight:700}}>{c.make} {c.model}</span>
      </div>
    )},
    { key:"plate",   label:T.fleet.columns.plate,   render:c=><span style={{fontFamily:"monospace",fontWeight:700,color:t.primary,fontSize:"12px"}}>{c.plate}</span> },
    { key:"year",    label:T.fleet.columns.year,    render:c=><span style={{color:t.textSub}}>{c.year}</span> },
    { key:"fuel",    label:T.fleet.columns.fuel,    render:c=><span>{FUEL_ICON[c.fuel]} {T.fuel[c.fuel]}</span> },
    { key:"mileage", label:T.fleet.columns.mileage, render:c=><span style={{fontFamily:"monospace",color:t.textSub,fontSize:"12px"}}>{c.mileage.toLocaleString()} {T.km}</span> },
    { key:"branch",  label:T.fleet.columns.branch,  render:c=>{
      const br=branches.find(b=>b.id===c.branchId);
      return br?<div style={{display:"flex",alignItems:"center",gap:"6px"}}><div style={{width:8,height:8,borderRadius:"50%",background:br.color}}/><span style={{fontWeight:600,fontSize:"12px"}}>{br.name}</span></div>:<span style={{color:t.textMuted}}>—</span>;
    }},
    { key:"driver",  label:T.fleet.columns.driver,  render:c=>{
      const dr=drivers.find(d=>d.id===c.driverId);
      return <span style={{color:dr?t.text:t.textMuted}}>{dr?dr.name:T.unassigned}</span>;
    }},
    { key:"status",  label:T.fleet.columns.status,  render:c=><Badge label={T.status[c.status]} colorKey={STATUS_META[c.status]}/> },
    { key:"actions", label:"", noClick:true, width:80, render:c=>(
      <div style={{display:"flex",gap:"4px"}}>
        <Button variant="ghost" size="xs" icon="✏️" onClick={()=>openEdit(c)}/>
        <Button variant="danger" size="xs" icon="🗑" onClick={()=>setConfirmId(c.id)}/>
      </div>
    )},
  ];

  const branchOpts = [{value:"",label:T.form.noBranch},...branches.map(b=>({value:b.id,label:b.name}))];
  const driverOpts = [{value:"",label:T.form.noDriver},...drivers.map(d=>({value:d.id,label:d.name}))];
  const statusOpts = ["Available","In Use","Maintenance"].map(s=>({value:s,label:T.status[s]}));
  const fuelOpts   = ["Petrol","Diesel","Hybrid","Electric"].map(f=>({value:f,label:`${FUEL_ICON[f]} ${T.fuel[f]}`}));

  return (
    <div className="fade-up">
      <PageHeader title={T.fleet.title} subtitle={T.fleet.subtitle} action={<Button onClick={openAdd} icon="＋">{T.fleet.addVehicle}</Button>}/>

      <div style={{display:"flex",gap:"12px",marginBottom:"18px",flexWrap:"wrap"}}>
        <StatCard icon="🚗" label={T.dashboard.totalVehicles} value={stats.total}       colorKey="primary"/>
        <StatCard icon="✅" label={T.dashboard.available}      value={stats.available}   colorKey="success"/>
        <StatCard icon="🔑" label={T.dashboard.inUse}          value={stats.inUse}       colorKey="warning"/>
        <StatCard icon="🔧" label={T.dashboard.maintenance}    value={stats.maintenance} colorKey="danger"/>
      </div>

      <Card style={{padding:"12px 16px",marginBottom:"12px",display:"flex",gap:"12px",flexWrap:"wrap",alignItems:"center"}}>
        <div style={{flex:1,minWidth:220}}><Input value={search} onChange={setSearch} placeholder={T.fleet.search}/></div>
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
          {["All","Available","In Use","Maintenance"].map(s=>(
            <Button key={s} variant={filterStatus===s?"primary":"secondary"} size="sm" onClick={()=>setFilter(s)}>
              {s==="All"?T.fleet.filterAll:T.status[s]}
            </Button>
          ))}
        </div>
      </Card>

      <Table columns={columns} data={filtered} onRowClick={openView} emptyMsg={T.fleet.noResults}/>

      {/* Form Modal */}
      <Modal open={modal==="form"} onClose={()=>setModal(null)} title={selected?T.form.editTitle:T.form.addTitle}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
          <Input label={T.form.plate}   value={form.plate||""}   onChange={sf("plate")}  required autoFocus/>
          <Input label={T.form.make}    value={form.make||""}    onChange={sf("make")}   required/>
          <Input label={T.form.model}   value={form.model||""}   onChange={sf("model")}  required/>
          <Input label={T.form.year}    value={form.year||""}    onChange={sf("year")}   type="number"/>
          <Input label={T.form.mileage} value={form.mileage||0}  onChange={v=>sf("mileage")(Number(v))} type="number"/>
          <Select label={T.form.status} value={form.status||"Available"} onChange={sf("status")} options={statusOpts}/>
          <Select label={T.form.fuel}   value={form.fuel||"Petrol"}      onChange={sf("fuel")}   options={fuelOpts}/>
          <Select label={T.form.branch} value={form.branchId||""}        onChange={sf("branchId")} options={branchOpts}/>
          <Select label={T.form.driver} value={form.driverId||""}        onChange={sf("driverId")} options={driverOpts}/>
        </div>
        <div style={{marginTop:"14px"}}><ColorPicker label={T.form.color} value={form.color||"#3B82F6"} onChange={sf("color")}/></div>
        <Divider my={18}/>
        <div style={{display:"flex",gap:"10px",justifyContent:"flex-end"}}>
          <Button variant="secondary" onClick={()=>setModal(null)}>{T.form.cancel}</Button>
          <Button onClick={handleSave} icon="💾">{T.form.save}</Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={modal==="view"} onClose={()=>setModal(null)} title={T.detail.title} width={420}>
        {selected&&(()=>{
          const br=branches.find(b=>b.id===selected.branchId);
          const dr=drivers.find(d=>d.id===selected.driverId);
          return <>
            <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"18px"}}>
              <div style={{width:7,height:50,borderRadius:4,background:selected.color,flexShrink:0}}/>
              <div>
                <div style={{fontWeight:900,fontSize:"19px"}}>{selected.make} {selected.model}</div>
                <div style={{fontFamily:"monospace",color:t.primary,fontSize:"13px",marginTop:"2px"}}>{selected.plate}</div>
              </div>
            </div>
            {[
              [T.fleet.columns.year,   selected.year],
              [T.fleet.columns.fuel,   `${FUEL_ICON[selected.fuel]} ${T.fuel[selected.fuel]}`],
              [T.fleet.columns.mileage,`${selected.mileage.toLocaleString()} ${T.km}`],
              [T.fleet.columns.branch, br?<div style={{display:"flex",alignItems:"center",gap:"6px"}}><div style={{width:8,height:8,borderRadius:"50%",background:br.color}}/>{br.name}</div>:T.noBranch],
              [T.fleet.columns.driver, dr?dr.name:T.unassigned],
              [T.fleet.columns.status, <Badge label={T.status[selected.status]} colorKey={STATUS_META[selected.status]}/>],
            ].map(([lbl,val],i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${t.border}`,fontSize:"13px"}}>
                <span style={{color:t.textSub,fontWeight:600}}>{lbl}</span>
                <span style={{fontWeight:700}}>{val}</span>
              </div>
            ))}
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",marginTop:"18px"}}>
              <Button variant="danger" size="sm" icon="🗑" onClick={()=>{setConfirmId(selected.id);setModal(null);}}>{T.detail.delete}</Button>
              <Button variant="secondary" size="sm" onClick={()=>setModal(null)}>{T.detail.close}</Button>
              <Button size="sm" icon="✏️" onClick={()=>openEdit(selected)}>{T.detail.edit}</Button>
            </div>
          </>;
        })()}
      </Modal>

      <ConfirmModal open={!!confirmId} onClose={()=>setConfirmId(null)} title={T.confirm.title} body={T.confirm.body} onConfirm={()=>handleDelete(confirmId)} yesLabel={T.confirm.yes} noLabel={T.confirm.no}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  DRIVERS TAB
// ════════════════════════════════════════════════════════════
function DriversTab({ drivers, setDrivers, cars, branches, showToast }) {
  const { theme, T } = useApp(); const t = TOKENS[theme];
  const Td = T.drivers;
  const [search, setSearch]       = useState("");
  const [modal, setModal]         = useState(null);
  const [form, setForm]           = useState({});
  const [selected, setSelected]   = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const EMPTY = { name:"", license:"", phone:"", branchId:"", carId:"", status:"Active" };

  const filtered = drivers.filter(d=>{
    const br=branches.find(b=>b.id===d.branchId)?.name||"";
    return `${d.name} ${d.license} ${d.phone} ${br}`.toLowerCase().includes(search.toLowerCase());
  });

  const sf = k => v => setForm(p=>({...p,[k]:v}));
  const openAdd  = ()  => { setForm({...EMPTY}); setSelected(null); setModal("form"); };
  const openEdit = dr  => { setForm({...dr,carId:dr.carId||""}); setSelected(dr); setModal("form"); };
  const openView = dr  => { setSelected(dr); setModal("view"); };

  const handleSave = () => {
    if(!form.name||!form.license){ showToast(Td.toast.error,"error"); return; }
    if(selected){ setDrivers(p=>p.map(d=>d.id===form.id?{...form,carId:form.carId||null}:d)); showToast(Td.toast.updated); }
    else { setDrivers(p=>[...p,{...form,id:"d"+Date.now(),carId:form.carId||null}]); showToast(Td.toast.added); }
    setModal(null);
  };
  const handleDelete = id => { setDrivers(p=>p.filter(d=>d.id!==id)); setConfirmId(null); setModal(null); showToast(Td.toast.deleted,"error"); };

  const avatar = name => {
    const hue = (name.charCodeAt(0)*13+name.charCodeAt(1||0)*7)%360;
    return { bg:`hsl(${hue},55%,48%)`, initials:name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase() };
  };

  const columns = [
    { key:"name", label:Td.columns.name, render:d=>{const av=avatar(d.name);return(
      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
        <div style={{width:30,height:30,borderRadius:"50%",background:av.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:800,color:"#fff",flexShrink:0}}>{av.initials}</div>
        <span style={{fontWeight:700}}>{d.name}</span>
      </div>
    );}},
    { key:"license", label:Td.columns.license, render:d=><span style={{fontFamily:"monospace",fontWeight:700,color:t.primary,fontSize:"12px"}}>{d.license}</span> },
    { key:"phone",   label:Td.columns.phone,   render:d=><span style={{color:t.textSub,fontFamily:"monospace",fontSize:"12px"}}>{d.phone||"—"}</span> },
    { key:"branch",  label:Td.columns.branch,  render:d=>{
      const br=branches.find(b=>b.id===d.branchId);
      return br?<div style={{display:"flex",alignItems:"center",gap:"6px"}}><div style={{width:8,height:8,borderRadius:"50%",background:br.color}}/><span style={{fontWeight:600,fontSize:"12px"}}>{br.name}</span></div>:<span style={{color:t.textMuted}}>—</span>;
    }},
    { key:"car", label:Td.columns.assignedCar, render:d=>{
      const car=cars.find(c=>c.id===d.carId||String(c.id)===String(d.carId));
      return car?<span style={{fontWeight:600,fontSize:"12px"}}>{car.make} {car.model} <span style={{fontFamily:"monospace",color:t.primary}}>({car.plate})</span></span>:<span style={{color:t.textMuted}}>{Td.noCar}</span>;
    }},
    { key:"status", label:Td.columns.status, render:d=><Badge label={Td.status[d.status]} colorKey={DRV_STATUS_META[d.status]}/> },
    { key:"actions", label:"", noClick:true, width:80, render:d=>(
      <div style={{display:"flex",gap:"4px"}}>
        <Button variant="ghost" size="xs" icon="✏️" onClick={()=>openEdit(d)}/>
        <Button variant="danger" size="xs" icon="🗑" onClick={()=>setConfirmId(d.id)}/>
      </div>
    )},
  ];

  const branchOpts = [{value:"",label:"—"},...branches.map(b=>({value:b.id,label:b.name}))];
  const carOpts    = [{value:"",label:Td.noCar},...cars.map(c=>({value:String(c.id),label:`${c.make} ${c.model} (${c.plate})`}))];
  const statusOpts = ["Active","Off Duty","Suspended"].map(s=>({value:s,label:Td.status[s]}));

  return (
    <div className="fade-up">
      <PageHeader title={Td.title} subtitle={Td.subtitle} action={<Button onClick={openAdd} icon="＋">{Td.addDriver}</Button>}/>

      <div style={{display:"flex",gap:"12px",marginBottom:"18px",flexWrap:"wrap"}}>
        <StatCard icon="👥" label={T.dashboard.totalDrivers}   value={drivers.length}                                  colorKey="primary"/>
        <StatCard icon="✅" label={Td.status.Active}           value={drivers.filter(d=>d.status==="Active").length}    colorKey="success"/>
        <StatCard icon="🟡" label={Td.status["Off Duty"]}     value={drivers.filter(d=>d.status==="Off Duty").length}  colorKey="warning"/>
        <StatCard icon="🚫" label={Td.status.Suspended}       value={drivers.filter(d=>d.status==="Suspended").length} colorKey="danger"/>
      </div>

      <Card style={{padding:"12px 16px",marginBottom:"12px"}}>
        <Input value={search} onChange={setSearch} placeholder={Td.search}/>
      </Card>

      <Table columns={columns} data={filtered} onRowClick={openView} emptyMsg={Td.noResults}/>

      <Modal open={modal==="form"} onClose={()=>setModal(null)} title={selected?Td.form.editTitle:Td.form.addTitle}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
          <Input label={Td.form.name}    value={form.name||""}    onChange={sf("name")}    required autoFocus/>
          <Input label={Td.form.license} value={form.license||""} onChange={sf("license")} required/>
          <Input label={Td.form.phone}   value={form.phone||""}   onChange={sf("phone")}/>
          <Select label={Td.form.status} value={form.status||"Active"} onChange={sf("status")} options={statusOpts}/>
          <Select label={Td.form.branch} value={form.branchId||""}     onChange={sf("branchId")} options={branchOpts}/>
          <Select label={Td.form.car}    value={String(form.carId||"")} onChange={v=>sf("carId")(v||null)} options={carOpts}/>
        </div>
        <Divider my={18}/>
        <div style={{display:"flex",gap:"10px",justifyContent:"flex-end"}}>
          <Button variant="secondary" onClick={()=>setModal(null)}>{Td.form.cancel}</Button>
          <Button onClick={handleSave} icon="💾">{Td.form.save}</Button>
        </div>
      </Modal>

      <Modal open={modal==="view"} onClose={()=>setModal(null)} title={Td.detail.title} width={400}>
        {selected&&(()=>{
          const br=branches.find(b=>b.id===selected.branchId);
          const car=cars.find(c=>c.id===selected.carId||String(c.id)===String(selected.carId));
          const av=avatar(selected.name);
          return <>
            <div style={{display:"flex",alignItems:"center",gap:"14px",marginBottom:"18px"}}>
              <div style={{width:48,height:48,borderRadius:"50%",background:av.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",fontWeight:900,color:"#fff",flexShrink:0}}>{av.initials}</div>
              <div>
                <div style={{fontWeight:900,fontSize:"18px"}}>{selected.name}</div>
                <div style={{fontFamily:"monospace",color:t.primary,fontSize:"12px",marginTop:"2px"}}>{selected.license}</div>
              </div>
            </div>
            {[
              [Td.columns.phone, selected.phone||"—"],
              [Td.columns.branch, br?<div style={{display:"flex",alignItems:"center",gap:"6px"}}><div style={{width:8,height:8,borderRadius:"50%",background:br.color}}/>{br.name}</div>:"—"],
              [Td.columns.assignedCar, car?`${car.make} ${car.model} (${car.plate})`:Td.noCar],
              [Td.columns.status, <Badge label={Td.status[selected.status]} colorKey={DRV_STATUS_META[selected.status]}/>],
            ].map(([lbl,val],i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${t.border}`,fontSize:"13px"}}>
                <span style={{color:t.textSub,fontWeight:600}}>{lbl}</span>
                <span style={{fontWeight:700}}>{val}</span>
              </div>
            ))}
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",marginTop:"18px"}}>
              <Button variant="danger" size="sm" icon="🗑" onClick={()=>{setConfirmId(selected.id);setModal(null);}}>{T.detail.delete}</Button>
              <Button variant="secondary" size="sm" onClick={()=>setModal(null)}>{T.detail.close}</Button>
              <Button size="sm" icon="✏️" onClick={()=>openEdit(selected)}>{T.detail.edit}</Button>
            </div>
          </>;
        })()}
      </Modal>

      <ConfirmModal open={!!confirmId} onClose={()=>setConfirmId(null)} title={Td.confirm.title} body={Td.confirm.body} onConfirm={()=>handleDelete(confirmId)} yesLabel={Td.confirm.yes} noLabel={Td.confirm.no}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  BRANCHES TAB
// ════════════════════════════════════════════════════════════
function BranchesTab({ branches, setBranches, cars, drivers, showToast }) {
  const { theme, T } = useApp(); const t = TOKENS[theme];
  const Tb = T.branches;
  const [search, setSearch]       = useState("");
  const [modal, setModal]         = useState(null);
  const [form, setForm]           = useState({});
  const [selected, setSelected]   = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const EMPTY = { name:"", city:"", address:"", manager:"", phone:"", color:"#3B82F6" };

  const filtered = branches.filter(b=>`${b.name} ${b.city} ${b.manager}`.toLowerCase().includes(search.toLowerCase()));

  const sf = k => v => setForm(p=>({...p,[k]:v}));
  const openAdd  = ()  => { setForm({...EMPTY}); setSelected(null); setModal("form"); };
  const openEdit = br  => { setForm({...br}); setSelected(br); setModal("form"); };
  const openView = br  => { setSelected(br); setModal("view"); };

  const handleSave = () => {
    if(!form.name||!form.city){ showToast(Tb.toast.error,"error"); return; }
    if(selected){ setBranches(p=>p.map(b=>b.id===form.id?form:b)); showToast(Tb.toast.updated); }
    else { setBranches(p=>[...p,{...form,id:"b"+Date.now()}]); showToast(Tb.toast.added); }
    setModal(null);
  };
  const handleDelete = id => { setBranches(p=>p.filter(b=>b.id!==id)); setConfirmId(null); setModal(null); showToast(Tb.toast.deleted,"error"); };

  const tableColumns = [
    { key:"name", label:Tb.columns.name, render:b=>(
      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
        <div style={{width:10,height:10,borderRadius:"50%",background:b.color,flexShrink:0}}/>
        <span style={{fontWeight:800}}>{b.name}</span>
      </div>
    )},
    { key:"city",    label:Tb.columns.city,    render:b=><span style={{color:t.textSub,fontWeight:600}}>{b.city}</span> },
    { key:"manager", label:Tb.columns.manager, render:b=><span>{b.manager||"—"}</span> },
    { key:"vehicles",label:Tb.columns.vehicles, render:b=><Badge label={`🚗 ${cars.filter(c=>c.branchId===b.id).length}`} colorKey="info"/> },
    { key:"drivers", label:Tb.columns.drivers,  render:b=><Badge label={`👤 ${drivers.filter(d=>d.branchId===b.id).length}`} colorKey="success"/> },
    { key:"actions", label:"", noClick:true, width:80, render:b=>(
      <div style={{display:"flex",gap:"4px"}}>
        <Button variant="ghost" size="xs" icon="✏️" onClick={()=>openEdit(b)}/>
        <Button variant="danger" size="xs" icon="🗑" onClick={()=>setConfirmId(b.id)}/>
      </div>
    )},
  ];

  return (
    <div className="fade-up">
      <PageHeader title={Tb.title} subtitle={Tb.subtitle} action={<Button onClick={openAdd} icon="＋">{Tb.addBranch}</Button>}/>

      <div style={{display:"flex",gap:"12px",marginBottom:"18px",flexWrap:"wrap"}}>
        <StatCard icon="🏢" label={T.dashboard.totalBranches} value={branches.length} colorKey="primary"/>
        <StatCard icon="🚗" label={T.dashboard.totalVehicles} value={cars.length}     colorKey="info"/>
        <StatCard icon="👥" label={T.dashboard.totalDrivers}  value={drivers.length}  colorKey="success"/>
      </div>

      {/* Branch Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:"12px",marginBottom:"18px"}}>
        {filtered.map(b=>{
          const bCars=cars.filter(c=>c.branchId===b.id);
          const bDrivers=drivers.filter(d=>d.branchId===b.id);
          const avail=bCars.filter(c=>c.status==="Available").length;
          return (
            <Card key={b.id} hoverable style={{padding:"18px 20px"}} onClick={()=>openView(b)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <div style={{width:34,height:34,borderRadius:t.r.md,background:`${b.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"17px"}}>🏢</div>
                  <div>
                    <div style={{fontWeight:800,fontSize:"14px"}}>{b.name}</div>
                    <div style={{fontSize:"12px",color:t.textSub}}>{b.city}</div>
                  </div>
                </div>
                <div style={{width:9,height:9,borderRadius:"50%",background:b.color,marginTop:4}}/>
              </div>
              <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"10px"}}>
                <Badge label={`🚗 ${bCars.length}`} colorKey="info"/>
                <Badge label={`👤 ${bDrivers.length}`} colorKey="success"/>
                {avail>0&&<Badge label={`✅ ${avail}`} colorKey="success"/>}
              </div>
              {b.manager&&<div style={{fontSize:"11px",color:t.textMuted}}>👔 {b.manager}</div>}
              <div style={{height:3,borderRadius:2,background:`${b.color}20`,marginTop:"10px",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${bCars.length?((bCars.filter(c=>c.status!=="Maintenance").length/bCars.length)*100):0}%`,background:b.color,borderRadius:2}}/>
              </div>
            </Card>
          );
        })}
      </div>

      <Card style={{padding:"12px 16px",marginBottom:"12px"}}>
        <Input value={search} onChange={setSearch} placeholder={Tb.search}/>
      </Card>

      <Table columns={tableColumns} data={filtered} onRowClick={openView} emptyMsg={Tb.noResults}/>

      <Modal open={modal==="form"} onClose={()=>setModal(null)} title={selected?Tb.form.editTitle:Tb.form.addTitle}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
          <Input label={Tb.form.name}    value={form.name||""}    onChange={sf("name")}    required autoFocus/>
          <Input label={Tb.form.city}    value={form.city||""}    onChange={sf("city")}    required/>
          <Input label={Tb.form.address} value={form.address||""} onChange={sf("address")}/>
          <Input label={Tb.form.manager} value={form.manager||""} onChange={sf("manager")}/>
          <Input label={Tb.form.phone}   value={form.phone||""}   onChange={sf("phone")}/>
        </div>
        <div style={{marginTop:"14px"}}><ColorPicker label={T.form.color} value={form.color||"#3B82F6"} onChange={sf("color")} colors={BRANCH_COLORS}/></div>
        <Divider my={18}/>
        <div style={{display:"flex",gap:"10px",justifyContent:"flex-end"}}>
          <Button variant="secondary" onClick={()=>setModal(null)}>{Tb.form.cancel}</Button>
          <Button onClick={handleSave} icon="💾">{Tb.form.save}</Button>
        </div>
      </Modal>

      <Modal open={modal==="view"} onClose={()=>setModal(null)} title={Tb.detail.title} width={480}>
        {selected&&(()=>{
          const bCars=cars.filter(c=>c.branchId===selected.id);
          const bDrivers=drivers.filter(d=>d.branchId===selected.id);
          return <>
            <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"18px"}}>
              <div style={{width:42,height:42,borderRadius:t.r.lg,background:`${selected.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px"}}>🏢</div>
              <div>
                <div style={{fontWeight:900,fontSize:"18px"}}>{selected.name}</div>
                <div style={{color:t.textSub,fontSize:"13px",marginTop:"2px"}}>{selected.city}{selected.address?` · ${selected.address}`:""}</div>
              </div>
            </div>
            {[[Tb.columns.manager,selected.manager||"—"],[Tb.form.phone,selected.phone||"—"]].map(([lbl,val],i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${t.border}`,fontSize:"13px"}}>
                <span style={{color:t.textSub,fontWeight:600}}>{lbl}</span>
                <span style={{fontWeight:700}}>{val}</span>
              </div>
            ))}
            <div style={{margin:"14px 0 6px",fontWeight:800,fontSize:"13px"}}>{T.fleet.title} ({bCars.length})</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginBottom:"14px"}}>
              {bCars.length===0?<span style={{color:t.textMuted,fontSize:"13px"}}>—</span>:bCars.map(c=><Badge key={c.id} label={`${c.make} ${c.model}`} colorKey={STATUS_META[c.status]}/>)}
            </div>
            <div style={{marginBottom:"6px",fontWeight:800,fontSize:"13px"}}>{T.drivers.title} ({bDrivers.length})</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginBottom:"16px"}}>
              {bDrivers.length===0?<span style={{color:t.textMuted,fontSize:"13px"}}>—</span>:bDrivers.map(d=><Badge key={d.id} label={d.name} colorKey={DRV_STATUS_META[d.status]}/>)}
            </div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",borderTop:`1px solid ${t.border}`,paddingTop:"14px"}}>
              <Button variant="danger" size="sm" icon="🗑" onClick={()=>{setConfirmId(selected.id);setModal(null);}}>{T.detail.delete}</Button>
              <Button variant="secondary" size="sm" onClick={()=>setModal(null)}>{T.detail.close}</Button>
              <Button size="sm" icon="✏️" onClick={()=>openEdit(selected)}>{T.detail.edit}</Button>
            </div>
          </>;
        })()}
      </Modal>

      <ConfirmModal open={!!confirmId} onClose={()=>setConfirmId(null)} title={Tb.confirm.title} body={Tb.confirm.body} onConfirm={()=>handleDelete(confirmId)} yesLabel={Tb.confirm.yes} noLabel={Tb.confirm.no}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  DASHBOARD TAB
// ════════════════════════════════════════════════════════════
function DashboardTab({ cars, drivers, branches }) {
  const { theme, T } = useApp(); const t = TOKENS[theme];
  const D = T.dashboard;
  const stats = { total:cars.length, available:cars.filter(c=>c.status==="Available").length, inUse:cars.filter(c=>c.status==="In Use").length, maintenance:cars.filter(c=>c.status==="Maintenance").length };

  return (
    <div className="fade-up">
      <PageHeader title={D.title} subtitle={D.subtitle}/>
      <div style={{display:"flex",gap:"12px",marginBottom:"18px",flexWrap:"wrap"}}>
        <StatCard icon="🚗" label={D.totalVehicles} value={stats.total}       colorKey="primary"/>
        <StatCard icon="✅" label={D.available}      value={stats.available}   colorKey="success"/>
        <StatCard icon="🔑" label={D.inUse}          value={stats.inUse}       colorKey="warning"/>
        <StatCard icon="🔧" label={D.maintenance}    value={stats.maintenance} colorKey="danger"/>
        <StatCard icon="👥" label={D.totalDrivers}   value={drivers.length}    colorKey="info"/>
        <StatCard icon="🏢" label={D.totalBranches}  value={branches.length}   colorKey="muted"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
        {/* Fleet Status */}
        <Card style={{padding:"20px"}}>
          <div style={{fontWeight:800,fontSize:"14px",marginBottom:"14px"}}>{D.fleetStatus}</div>
          {[["available",D.available,t.success],["inUse",D.inUse,t.warning],["maintenance",D.maintenance,t.danger]].map(([key,label,color])=>{
            const pct=stats.total?(stats[key]/stats.total)*100:0;
            return (
              <div key={key} style={{marginBottom:"13px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px",fontSize:"12px"}}>
                  <span style={{color:t.textSub,fontWeight:600}}>{label}</span>
                  <span style={{fontFamily:"monospace",color,fontWeight:700}}>{stats[key]}/{stats.total}</span>
                </div>
                <div style={{height:"7px",background:t.surfaceAlt,borderRadius:"4px",overflow:"hidden",border:`1px solid ${t.border}`}}>
                  <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:"4px",transition:"width 0.8s"}}/>
                </div>
              </div>
            );
          })}
        </Card>
        {/* Fuel */}
        <Card style={{padding:"20px"}}>
          <div style={{fontWeight:800,fontSize:"14px",marginBottom:"14px"}}>{D.fuelBreakdown}</div>
          {["Petrol","Diesel","Hybrid","Electric"].map(fuel=>{
            const count=cars.filter(c=>c.fuel===fuel).length;
            return (
              <div key={fuel} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${t.border}`}}>
                <span style={{fontSize:"13px",fontWeight:600}}>{FUEL_ICON[fuel]} {T.fuel[fuel]}</span>
                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  <div style={{height:"5px",width:`${count*26}px`,background:t.primary,borderRadius:"3px"}}/>
                  <span style={{fontFamily:"monospace",fontSize:"12px",fontWeight:700,color:t.primary,minWidth:16,textAlign:"center"}}>{count}</span>
                </div>
              </div>
            );
          })}
        </Card>
        {/* By Branch */}
        <Card style={{padding:"20px"}}>
          <div style={{fontWeight:800,fontSize:"14px",marginBottom:"14px"}}>{D.byBranch}</div>
          {branches.map(b=>{
            const count=cars.filter(c=>c.branchId===b.id).length;
            const pct=cars.length?(count/cars.length)*100:0;
            return (
              <div key={b.id} style={{marginBottom:"12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px",fontSize:"12px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"7px"}}><div style={{width:8,height:8,borderRadius:"50%",background:b.color}}/><span style={{fontWeight:600,color:t.textSub}}>{b.name}</span></div>
                  <span style={{fontFamily:"monospace",fontWeight:700,color:b.color}}>{count}</span>
                </div>
                <div style={{height:"7px",background:t.surfaceAlt,borderRadius:"4px",overflow:"hidden",border:`1px solid ${t.border}`}}>
                  <div style={{height:"100%",width:`${pct}%`,background:b.color,borderRadius:"4px",transition:"width 0.8s"}}/>
                </div>
              </div>
            );
          })}
        </Card>
        {/* Mileage */}
        <Card style={{padding:"20px"}}>
          <div style={{fontWeight:800,fontSize:"14px",marginBottom:"14px"}}>{D.mileageRank}</div>
          {[...cars].sort((a,b)=>b.mileage-a.mileage).slice(0,5).map((car,i)=>{
            const max=Math.max(...cars.map(c=>c.mileage));
            return (
              <div key={car.id} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px"}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:i===0?t.primary:t.surfaceAlt,color:i===0?"#fff":t.textMuted,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:900,flexShrink:0}}>{i+1}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"12px",fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{car.make} {car.model}</div>
                  <div style={{height:"5px",background:t.surfaceAlt,borderRadius:"3px",overflow:"hidden",marginTop:"3px"}}>
                    <div style={{height:"100%",width:`${(car.mileage/max)*100}%`,background:car.color,borderRadius:"3px"}}/>
                  </div>
                </div>
                <div style={{fontFamily:"monospace",fontSize:"11px",color:t.textSub,flexShrink:0}}>{car.mileage.toLocaleString()}</div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  SETTINGS TAB
// ════════════════════════════════════════════════════════════
function SettingsTab({ lang, setLang, theme, setTheme }) {
  const { T, t } = useApp(); const S = T.settings;
  return (
    <div className="fade-up" style={{maxWidth:440}}>
      <PageHeader title={S.title} subtitle={S.subtitle}/>
      <Card style={{padding:"4px 24px"}}>
        {[
          { label:S.language, sub:lang==="en"?"English":"עברית", action:<Button variant="secondary" size="sm" icon="🌐" onClick={()=>setLang(l=>l==="en"?"he":"en")}>{lang==="en"?"עברית":"English"}</Button> },
          { label:S.theme,    sub:theme==="light"?S.themeLight:S.themeDark, action:<Button variant="secondary" size="sm" onClick={()=>setTheme(x=>x==="light"?"dark":"light")}>{theme==="light"?"🌙 "+S.themeDark:"☀️ "+S.themeLight}</Button> },
        ].map((row,i,arr)=>(
          <div key={row.label}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 0"}}>
              <div>
                <div style={{fontWeight:700,fontSize:"14px",color:t.text}}>{row.label}</div>
                <div style={{fontSize:"12px",color:t.textSub,marginTop:"2px"}}>{row.sub}</div>
              </div>
              {row.action}
            </div>
            {i<arr.length-1&&<Divider/>}
          </div>
        ))}
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  ROOT
// ════════════════════════════════════════════════════════════
export default function App() {
  const [lang,      setLang]      = useState("he");
  const [theme,     setTheme]     = useState("light");
  const [activeTab, setActiveTab] = useState("fleet");
  const [cars,      setCars]      = useState(INIT_CARS);
  const [drivers,   setDrivers]   = useState(INIT_DRIVERS);
  const [branches,  setBranches]  = useState(INIT_BRANCHES);
  const [toast,     setToast]     = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const T      = TRANSLATIONS[lang];
  const t      = TOKENS[theme];
  const isRTL  = T.dir === "rtl";

  const showToast = useCallback((msg, type="success") => {
    setToast({msg,type});
    setTimeout(()=>setToast(null),3000);
  },[]);

  const ctx = { theme, lang, T, t, isRTL };

  const NAV = [
    { id:"fleet",     icon:"🚗", key:"fleet",     badge: cars.filter(c=>c.status==="In Use").length },
    { id:"drivers",   icon:"👤", key:"drivers",   badge: drivers.filter(d=>d.status==="Active").length },
    { id:"branches",  icon:"🏢", key:"branches",  badge: null },
    { id:"dashboard", icon:"📊", key:"dashboard", badge: null },
    { id:"settings",  icon:"⚙️", key:"settings",  badge: null },
  ];

  return (
    <AppCtx.Provider value={ctx}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        select option { background: ${t.surface}; color: ${t.text}; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 4px; }
        @keyframes modalIn { from{opacity:0;transform:translateY(12px) scale(0.97)} to{opacity:1;transform:none} }
        @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .fade-up { animation: fadeUp 0.25s ease both; }
      `}</style>

      <div dir={T.dir} style={{ display:"flex", minHeight:"100vh", background:t.bg, fontFamily:isRTL?"'Heebo',sans-serif":"'Outfit',sans-serif", color:t.text }}>

        {/* SIDEBAR */}
        <aside style={{ width:collapsed?58:218, flexShrink:0, background:t.surface, [isRTL?"borderLeft":"borderRight"]:`1px solid ${t.border}`, display:"flex", flexDirection:"column", padding:"12px 8px", transition:"width 0.22s", overflow:"hidden" }}>
          <div style={{display:"flex",alignItems:"center",justifyContent:collapsed?"center":"space-between",marginBottom:"18px",paddingInline:"4px",minHeight:38}}>
            {!collapsed && (
              <div>
                <div style={{fontSize:"16px",fontWeight:900,color:t.primary,letterSpacing:"-0.02em",lineHeight:1.1}}>{T.appName}</div>
                <div style={{fontSize:"10px",color:t.textMuted,marginTop:"2px",whiteSpace:"nowrap"}}>{T.appSub}</div>
              </div>
            )}
            <button onClick={()=>setCollapsed(p=>!p)} style={{background:"none",border:"none",cursor:"pointer",fontSize:"16px",color:t.textMuted,padding:"4px",borderRadius:t.r.sm,lineHeight:1,flexShrink:0}}>
              {collapsed?(isRTL?"‹":"›"):(isRTL?"›":"‹")}
            </button>
          </div>

          <nav style={{display:"flex",flexDirection:"column",gap:"2px",flex:1}}>
            {NAV.map(item=>(
              <NavItem key={item.id} icon={item.icon} label={T.nav[item.key]} active={activeTab===item.id} onClick={()=>setActiveTab(item.id)} collapsed={collapsed} badge={item.badge}/>
            ))}
          </nav>

          {!collapsed && (
            <div style={{padding:"10px 12px",background:t.surfaceAlt,borderRadius:t.r.md,border:`1px solid ${t.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:t.success}}/>
                <span style={{fontSize:"11px",color:t.success,fontWeight:700}}>{lang==="he"?"פעיל":"Active"}</span>
              </div>
              <div style={{fontSize:"11px",color:t.textMuted,marginTop:"2px"}}>{cars.length} {lang==="he"?"רכבים":"veh"} · {drivers.length} {lang==="he"?"נהגים":"drv"} · {branches.length} {lang==="he"?"סניפים":"br"}</div>
            </div>
          )}
        </aside>

        {/* MAIN */}
        <main style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
          <header style={{background:t.surface,borderBottom:`1px solid ${t.border}`,padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:50,flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <span style={{fontSize:"15px"}}>{NAV.find(n=>n.id===activeTab)?.icon}</span>
              <span style={{fontSize:"15px",fontWeight:800}}>{T.nav[activeTab]}</span>
            </div>
            <div style={{display:"flex",gap:"6px"}}>
              <Button variant="ghost" size="sm" onClick={()=>setLang(l=>l==="en"?"he":"en")} icon="🌐">{lang==="en"?"עברית":"EN"}</Button>
              <Button variant="ghost" size="sm" onClick={()=>setTheme(x=>x==="light"?"dark":"light")}>{theme==="light"?"🌙":"☀️"}</Button>
            </div>
          </header>

          <div style={{flex:1,padding:"22px 26px",overflowY:"auto"}}>
            {activeTab==="fleet"     && <FleetTab    cars={cars} setCars={setCars} drivers={drivers} branches={branches} showToast={showToast}/>}
            {activeTab==="drivers"   && <DriversTab  drivers={drivers} setDrivers={setDrivers} cars={cars} branches={branches} showToast={showToast}/>}
            {activeTab==="branches"  && <BranchesTab branches={branches} setBranches={setBranches} cars={cars} drivers={drivers} showToast={showToast}/>}
            {activeTab==="dashboard" && <DashboardTab cars={cars} drivers={drivers} branches={branches}/>}
            {activeTab==="settings"  && <SettingsTab lang={lang} setLang={setLang} theme={theme} setTheme={setTheme}/>}
          </div>
        </main>
      </div>

      <Toast toast={toast}/>
    </AppCtx.Provider>
  );
}
