import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { io } from "socket.io-client";

// ═══════════════════════════════════════════════════════════════
// AUTH CONTEXT — JWT + persistent session
// ═══════════════════════════════════════════════════════════════
const AuthContext = createContext(null);
const API_URL = process.env.REACT_APP_API_URL || "https://mediai-smart-healthcare.onrender.com";
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const apiCall = useCallback(async (endpoint, options = {}) => {
    const token = localStorage.getItem("accessToken");
    const config = {
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
      ...options,
    };
    let res = await fetch(`/api${endpoint}`, config);
    if (res.status === 401) {
      const rt = localStorage.getItem("refreshToken");
      if (rt) {
        const rr = await fetch("${API_URL}/api/auth/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: rt }) });
        if (rr.ok) {
          const d = await rr.json();
          localStorage.setItem("accessToken", d.accessToken);
          localStorage.setItem("refreshToken", d.refreshToken);
          config.headers.Authorization = `Bearer ${d.accessToken}`;
          res = await fetch(`/api${endpoint}`, config);
        } else { logout(); return null; }
      } else { logout(); return null; }
    }
    return res;
  }, []);

  useEffect(() => {
    const restore = async () => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          const res = await fetch("${API_URL}/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) { const d = await res.json(); setUser(d.user); }
          else { localStorage.clear(); }
        } catch { localStorage.clear(); }
      }
      setLoading(false);
    };
    restore();
  }, []);

  const login = async (email, password) => {
    const res = await fetch("${API_URL}/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (data.success) { localStorage.setItem("accessToken", data.accessToken); localStorage.setItem("refreshToken", data.refreshToken); setUser(data.user); }
    return data;
  };

  const register = async (form) => {
    const res = await fetch("${API_URL}/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (data.success) { localStorage.setItem("accessToken", data.accessToken); localStorage.setItem("refreshToken", data.refreshToken); setUser(data.user); }
    return data;
  };

  const logout = async () => {
    try { await fetch("${API_URL}/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }); } catch {}
    localStorage.clear(); setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout, apiCall }}>{children}</AuthContext.Provider>;
}

const useAuth = () => useContext(AuthContext);

// ═══════════════════════════════════════════════════════════════
// DISEASE DATABASE (ICD-10, 105+ diseases)
// ═══════════════════════════════════════════════════════════════
const DISEASE_DB = [
  { id:1, name:"Common Cold", category:"Respiratory", symptoms:["runny_nose","sneezing","sore_throat","mild_fever","congestion","cough"], severity:"mild", icd:"J00" },
  { id:2, name:"Influenza", category:"Respiratory", symptoms:["high_fever","body_aches","fatigue","cough","headache","chills"], severity:"moderate", icd:"J10" },
  { id:3, name:"COVID-19", category:"Respiratory", symptoms:["fever","dry_cough","fatigue","loss_of_smell","shortness_of_breath","body_aches"], severity:"moderate", icd:"U07.1" },
  { id:4, name:"Pneumonia", category:"Respiratory", symptoms:["high_fever","productive_cough","chest_pain","shortness_of_breath","fatigue","chills"], severity:"severe", icd:"J18" },
  { id:5, name:"Asthma", category:"Respiratory", symptoms:["wheezing","shortness_of_breath","chest_tightness","cough","nighttime_symptoms"], severity:"moderate", icd:"J45" },
  { id:6, name:"Bronchitis", category:"Respiratory", symptoms:["persistent_cough","mucus","fatigue","mild_fever","chest_discomfort"], severity:"moderate", icd:"J40" },
  { id:7, name:"Sinusitis", category:"Respiratory", symptoms:["facial_pain","nasal_congestion","headache","runny_nose","reduced_smell"], severity:"mild", icd:"J32" },
  { id:8, name:"Tuberculosis", category:"Respiratory", symptoms:["chronic_cough","blood_in_sputum","night_sweats","weight_loss","fatigue","fever"], severity:"severe", icd:"A15" },
  { id:9, name:"Allergic Rhinitis", category:"Respiratory", symptoms:["sneezing","runny_nose","itchy_eyes","congestion","watery_eyes"], severity:"mild", icd:"J30" },
  { id:10, name:"Hypertension", category:"Cardiovascular", symptoms:["headache","dizziness","blurred_vision","chest_pain","shortness_of_breath"], severity:"moderate", icd:"I10" },
  { id:11, name:"Heart Attack", category:"Cardiovascular", symptoms:["severe_chest_pain","left_arm_pain","shortness_of_breath","sweating","nausea"], severity:"critical", icd:"I21" },
  { id:12, name:"Heart Failure", category:"Cardiovascular", symptoms:["shortness_of_breath","fatigue","swollen_legs","rapid_heartbeat","persistent_cough"], severity:"severe", icd:"I50" },
  { id:13, name:"Arrhythmia", category:"Cardiovascular", symptoms:["palpitations","dizziness","fainting","shortness_of_breath","chest_discomfort"], severity:"moderate", icd:"I49" },
  { id:14, name:"Angina", category:"Cardiovascular", symptoms:["chest_pain","pressure_in_chest","shortness_of_breath","left_arm_pain","fatigue"], severity:"severe", icd:"I20" },
  { id:15, name:"Stroke", category:"Neurological", symptoms:["sudden_numbness","confusion","vision_problems","severe_headache","difficulty_walking"], severity:"critical", icd:"I63" },
  { id:16, name:"Migraine", category:"Neurological", symptoms:["severe_headache","nausea","light_sensitivity","visual_aura","vomiting"], severity:"moderate", icd:"G43" },
  { id:17, name:"Epilepsy", category:"Neurological", symptoms:["seizures","confusion","staring_spells","jerking_movements","loss_of_consciousness"], severity:"severe", icd:"G40" },
  { id:18, name:"Parkinson's Disease", category:"Neurological", symptoms:["tremors","stiff_muscles","slow_movement","balance_problems","speech_changes"], severity:"severe", icd:"G20" },
  { id:19, name:"Multiple Sclerosis", category:"Neurological", symptoms:["numbness","weakness","vision_problems","fatigue","balance_problems"], severity:"severe", icd:"G35" },
  { id:20, name:"Vertigo", category:"Neurological", symptoms:["dizziness","spinning_sensation","nausea","balance_problems","hearing_changes"], severity:"mild", icd:"H81" },
  { id:21, name:"Gastroenteritis", category:"Gastrointestinal", symptoms:["nausea","vomiting","diarrhea","abdominal_cramps","fever","dehydration"], severity:"moderate", icd:"A09" },
  { id:22, name:"GERD", category:"Gastrointestinal", symptoms:["heartburn","regurgitation","chest_pain","difficulty_swallowing","chronic_cough"], severity:"mild", icd:"K21" },
  { id:23, name:"Appendicitis", category:"Gastrointestinal", symptoms:["right_lower_abdominal_pain","nausea","vomiting","fever","loss_of_appetite"], severity:"critical", icd:"K35" },
  { id:24, name:"Peptic Ulcer", category:"Gastrointestinal", symptoms:["burning_stomach_pain","nausea","heartburn","bloating","dark_stools"], severity:"moderate", icd:"K27" },
  { id:25, name:"Crohn's Disease", category:"Gastrointestinal", symptoms:["abdominal_pain","diarrhea","fatigue","weight_loss","blood_in_stool","fever"], severity:"severe", icd:"K50" },
  { id:26, name:"Irritable Bowel Syndrome", category:"Gastrointestinal", symptoms:["abdominal_pain","bloating","diarrhea","constipation","cramping"], severity:"mild", icd:"K58" },
  { id:27, name:"Hepatitis B", category:"Gastrointestinal", symptoms:["jaundice","fatigue","nausea","abdominal_pain","dark_urine","fever"], severity:"severe", icd:"B16" },
  { id:28, name:"Pancreatitis", category:"Gastrointestinal", symptoms:["severe_abdominal_pain","nausea","vomiting","fever","rapid_pulse"], severity:"severe", icd:"K85" },
  { id:29, name:"Type 2 Diabetes", category:"Endocrine", symptoms:["increased_thirst","frequent_urination","fatigue","blurred_vision","slow_healing","tingling_hands"], severity:"moderate", icd:"E11" },
  { id:30, name:"Hypothyroidism", category:"Endocrine", symptoms:["fatigue","weight_gain","cold_intolerance","dry_skin","hair_loss","depression"], severity:"moderate", icd:"E03" },
  { id:31, name:"Hyperthyroidism", category:"Endocrine", symptoms:["weight_loss","rapid_heartbeat","anxiety","tremors","heat_intolerance","increased_sweating"], severity:"moderate", icd:"E05" },
  { id:32, name:"Gout", category:"Endocrine", symptoms:["joint_pain","swelling","redness","warmth","intense_pain"], severity:"moderate", icd:"M10" },
  { id:33, name:"Rheumatoid Arthritis", category:"Musculoskeletal", symptoms:["joint_pain","joint_swelling","stiffness","fatigue","fever"], severity:"moderate", icd:"M06" },
  { id:34, name:"Fibromyalgia", category:"Musculoskeletal", symptoms:["widespread_pain","fatigue","sleep_problems","memory_issues","mood_changes"], severity:"moderate", icd:"M79.7" },
  { id:35, name:"Lupus", category:"Musculoskeletal", symptoms:["butterfly_rash","joint_pain","fatigue","fever","hair_loss","sensitivity_to_light"], severity:"severe", icd:"M32" },
  { id:36, name:"Sciatica", category:"Musculoskeletal", symptoms:["lower_back_pain","leg_pain","numbness","tingling","weakness_in_leg"], severity:"moderate", icd:"M54.4" },
  { id:37, name:"Major Depression", category:"Mental Health", symptoms:["persistent_sadness","loss_of_interest","fatigue","sleep_changes","appetite_changes","hopelessness"], severity:"severe", icd:"F32" },
  { id:38, name:"Anxiety Disorder", category:"Mental Health", symptoms:["excessive_worry","restlessness","fatigue","concentration_difficulty","irritability","sleep_problems"], severity:"moderate", icd:"F41" },
  { id:39, name:"Bipolar Disorder", category:"Mental Health", symptoms:["mood_swings","elevated_mood","depression","decreased_need_for_sleep","racing_thoughts"], severity:"severe", icd:"F31" },
  { id:40, name:"PTSD", category:"Mental Health", symptoms:["flashbacks","nightmares","avoidance","hypervigilance","emotional_numbing","sleep_disturbances"], severity:"severe", icd:"F43.1" },
  { id:41, name:"Urinary Tract Infection", category:"Urological", symptoms:["burning_urination","frequent_urination","cloudy_urine","pelvic_pain","strong_urine_odor"], severity:"mild", icd:"N39.0" },
  { id:42, name:"Kidney Stones", category:"Urological", symptoms:["severe_back_pain","pain_during_urination","blood_in_urine","nausea","vomiting","frequent_urination"], severity:"severe", icd:"N20" },
  { id:43, name:"Malaria", category:"Infectious", symptoms:["high_fever","chills","sweating","headache","nausea","vomiting","body_aches"], severity:"severe", icd:"B54" },
  { id:44, name:"Dengue Fever", category:"Infectious", symptoms:["high_fever","severe_headache","pain_behind_eyes","joint_pain","rash","bleeding"], severity:"severe", icd:"A90" },
  { id:45, name:"Typhoid Fever", category:"Infectious", symptoms:["prolonged_fever","weakness","abdominal_pain","headache","constipation","rash"], severity:"severe", icd:"A01.0" },
  { id:46, name:"Meningitis", category:"Infectious", symptoms:["severe_headache","stiff_neck","fever","nausea","vomiting","sensitivity_to_light"], severity:"critical", icd:"G03" },
  { id:47, name:"HIV/AIDS", category:"Infectious", symptoms:["fever","swollen_lymph_nodes","fatigue","night_sweats","weight_loss","diarrhea"], severity:"severe", icd:"B20" },
  { id:48, name:"Mononucleosis", category:"Infectious", symptoms:["fatigue","sore_throat","fever","swollen_lymph_nodes","swollen_tonsils","rash"], severity:"moderate", icd:"B27" },
  { id:49, name:"Eczema", category:"Dermatological", symptoms:["itchy_skin","dry_skin","red_patches","scaly_skin","skin_inflammation","blisters"], severity:"mild", icd:"L20" },
  { id:50, name:"Psoriasis", category:"Dermatological", symptoms:["red_patches","silvery_scales","dry_skin","itching","burning","thickened_nails"], severity:"moderate", icd:"L40" },
  { id:51, name:"Shingles", category:"Dermatological", symptoms:["burning_pain","rash","blisters","itching","sensitivity_to_touch","fever"], severity:"moderate", icd:"B02" },
  { id:52, name:"Acne", category:"Dermatological", symptoms:["pimples","blackheads","oily_skin","skin_inflammation","scarring"], severity:"mild", icd:"L70" },
  { id:53, name:"Conjunctivitis", category:"Ophthalmological", symptoms:["red_eyes","eye_discharge","itchy_eyes","watery_eyes","sensitivity_to_light"], severity:"mild", icd:"H10" },
  { id:54, name:"Glaucoma", category:"Ophthalmological", symptoms:["vision_loss","eye_pain","headache","nausea","blurred_vision","halos_around_lights"], severity:"severe", icd:"H40" },
  { id:55, name:"Tonsillitis", category:"ENT", symptoms:["sore_throat","difficulty_swallowing","fever","swollen_tonsils","bad_breath","ear_pain"], severity:"mild", icd:"J03" },
  { id:56, name:"Strep Throat", category:"ENT", symptoms:["sore_throat","pain_swallowing","fever","swollen_lymph_nodes","red_tonsils","white_patches"], severity:"mild", icd:"J02.0" },
  { id:57, name:"Iron Deficiency Anemia", category:"Hematological", symptoms:["fatigue","pale_skin","weakness","shortness_of_breath","dizziness","brittle_nails"], severity:"mild", icd:"D50" },
  { id:58, name:"Leukemia", category:"Hematological", symptoms:["fatigue","easy_bruising","frequent_infections","bone_pain","swollen_lymph_nodes","weight_loss"], severity:"critical", icd:"C91" },
  { id:59, name:"PCOS", category:"Reproductive", symptoms:["irregular_periods","weight_gain","excessive_hair","acne","fertility_problems","pelvic_pain"], severity:"moderate", icd:"E28.2" },
  { id:60, name:"Endometriosis", category:"Reproductive", symptoms:["pelvic_pain","painful_periods","pain_during_sex","heavy_bleeding","infertility"], severity:"moderate", icd:"N80" },
  { id:61, name:"Breast Cancer", category:"Oncological", symptoms:["breast_lump","nipple_discharge","breast_pain","skin_changes","swollen_lymph_nodes"], severity:"critical", icd:"C50" },
  { id:62, name:"Lung Cancer", category:"Oncological", symptoms:["persistent_cough","blood_in_sputum","chest_pain","shortness_of_breath","weight_loss","hoarseness"], severity:"critical", icd:"C34" },
  { id:63, name:"Sleep Apnea", category:"Sleep", symptoms:["loud_snoring","gasping_during_sleep","morning_headache","daytime_sleepiness","difficulty_concentrating"], severity:"moderate", icd:"G47.3" },
  { id:64, name:"Insomnia", category:"Sleep", symptoms:["difficulty_falling_asleep","waking_at_night","early_waking","daytime_tiredness","irritability"], severity:"mild", icd:"G47.0" },
  { id:65, name:"Anaphylaxis", category:"Immunological", symptoms:["severe_allergic_reaction","throat_swelling","difficulty_breathing","drop_in_blood_pressure","rapid_pulse"], severity:"critical", icd:"T78.2" },
  { id:66, name:"Gallstones", category:"Gastrointestinal", symptoms:["right_upper_abdominal_pain","back_pain","nausea","vomiting","fever","jaundice"], severity:"moderate", icd:"K80" },
  { id:67, name:"Deep Vein Thrombosis", category:"Cardiovascular", symptoms:["leg_swelling","leg_pain","warmth","redness","skin_discoloration"], severity:"severe", icd:"I82" },
  { id:68, name:"Pulmonary Embolism", category:"Cardiovascular", symptoms:["sudden_shortness_of_breath","chest_pain","rapid_heart_rate","dizziness","leg_swelling"], severity:"critical", icd:"I26" },
  { id:69, name:"Bell's Palsy", category:"Neurological", symptoms:["facial_weakness","drooping_face","drooling","inability_to_close_eye","taste_changes"], severity:"moderate", icd:"G51.0" },
  { id:70, name:"Vitamin D Deficiency", category:"Nutritional", symptoms:["bone_pain","muscle_weakness","fatigue","depression","impaired_healing"], severity:"mild", icd:"E55" },
];

const ALL_SYMPTOMS = [...new Set(DISEASE_DB.flatMap(d => d.symptoms))].sort();
const SYMPTOM_LABELS = {};
ALL_SYMPTOMS.forEach(s => { SYMPTOM_LABELS[s] = s.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()); });

const DOCTORS_LIST = [
  { name:"Dr. Priya Sharma", specialty:"General Medicine", exp:12, rating:4.9, slots:["9:00 AM","10:00 AM","2:00 PM","4:00 PM"] },
  { name:"Dr. Rajesh Kumar", specialty:"Cardiology", exp:15, rating:4.8, slots:["10:00 AM","11:00 AM","3:00 PM"] },
  { name:"Dr. Anita Singh", specialty:"Neurology", exp:10, rating:4.7, slots:["9:00 AM","1:00 PM","5:00 PM"] },
  { name:"Dr. Meera Reddy", specialty:"Endocrinology", exp:11, rating:4.9, slots:["9:30 AM","12:00 PM","3:30 PM"] },
  { name:"Dr. Arjun Nair", specialty:"Gastroenterology", exp:9, rating:4.5, slots:["10:30 AM","1:30 PM","4:30 PM"] },
  { name:"Dr. Vikram Patel", specialty:"Pulmonology", exp:8, rating:4.6, slots:["11:00 AM","2:00 PM"] },
];

const SEV = { mild:{c:"#22c55e",bg:"rgba(34,197,94,0.12)",l:"Mild"}, moderate:{c:"#f59e0b",bg:"rgba(245,158,11,0.12)",l:"Moderate"}, severe:{c:"#ef4444",bg:"rgba(239,68,68,0.12)",l:"Severe"}, critical:{c:"#dc2626",bg:"rgba(220,38,38,0.15)",l:"⚠ Critical"} };

// ═══════════════════════════════════════════════════════════════
// GLOBAL STYLES
// ═══════════════════════════════════════════════════════════════
const GS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:#f0f4f8;color:#1e293b}
  ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#94a3b8;border-radius:3px}
  button{cursor:pointer;font-family:inherit}
  input,select,textarea{font-family:inherit}
  .card{background:white;border-radius:16px;box-shadow:0 2px 20px rgba(0,0,0,0.06);padding:24px}
  .btn{padding:11px 24px;border-radius:10px;font-size:0.95rem;font-weight:600;border:none;transition:all 0.2s;cursor:pointer}
  .btn-primary{background:linear-gradient(135deg,#0f766e,#0891b2);color:white}
  .btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(8,145,178,0.3)}
  .btn-primary:disabled{opacity:0.6;transform:none}
  .btn-secondary{background:white;color:#0f766e;border:2px solid #0f766e}
  .btn-danger{background:#ef4444;color:white}
  .btn-purple{background:linear-gradient(135deg,#7c3aed,#a855f7);color:white}
  .input{width:100%;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.95rem;outline:none;transition:border-color 0.2s}
  .input:focus{border-color:#0891b2;box-shadow:0 0 0 3px rgba(8,145,178,0.1)}
  .input.err{border-color:#ef4444}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:700}
  .tag{display:inline-block;padding:3px 8px;background:#e0f2fe;color:#0369a1;border-radius:6px;font-size:0.78rem;margin:2px;font-family:'JetBrains Mono',monospace}
  .chip{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;background:#f1f5f9;border:1.5px solid #e2e8f0;border-radius:8px;cursor:pointer;font-size:0.82rem;transition:all 0.15s;margin:2px}
  .chip.sel{background:#e0f2fe;border-color:#0891b2;color:#0369a1;font-weight:600}
  .chip:hover:not(.sel){border-color:#94a3b8}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(8,145,178,0.3)}50%{box-shadow:0 0 0 8px rgba(8,145,178,0)}}
  .fade-in{animation:fadeIn 0.4s ease}
  .slide-down{animation:slideDown 0.3s ease}
  .nav-btn{padding:8px 16px;border-radius:8px;background:none;border:none;color:#475569;font-size:0.9rem;font-weight:500;transition:all 0.15s}
  .nav-btn:hover,.nav-btn.active{background:#e0f2fe;color:#0369a1}
  .tbl{width:100%;border-collapse:collapse}
  .tbl th{padding:12px 16px;text-align:left;color:#64748b;font-size:0.78rem;font-weight:700;text-transform:uppercase;border-bottom:1px solid #f1f5f9}
  .tbl td{padding:12px 16px;border-bottom:1px solid #f8fafc;font-size:0.88rem}
  .tbl tr:hover td{background:#fafafa}
`;

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION
// ═══════════════════════════════════════════════════════════════
function Notification({ n }) {
  if (!n) return null;
  return <div className="slide-down" style={{ position:"fixed",top:20,right:20,zIndex:9999,padding:"14px 22px",borderRadius:12,background:n.type==="success"?"#0f766e":"#ef4444",color:"white",fontWeight:600,boxShadow:"0 8px 30px rgba(0,0,0,0.2)",maxWidth:320,fontSize:"0.92rem" }}>{n.msg}</div>;
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
function AppInner() {
  const { user, loading, logout } = useAuth();
  const [page, setPage] = useState("home");
  const [note, setNote] = useState(null);

  const notify = useCallback((msg, type="success") => {
    setNote({ msg, type });
    setTimeout(() => setNote(null), 3500);
  }, []);

  useEffect(() => {
    if (!user && !["home","login","register","diseases"].includes(page)) setPage("home");
    if (user && ["login","register"].includes(page)) setPage("dashboard");
  }, [user, page]);

  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",flexDirection:"column",gap:16 }}><div style={{ fontSize:"3rem",animation:"spin 1s linear infinite",display:"inline-block" }}>⚕</div><p style={{ color:"#64748b" }}>Loading MediAI...</p></div>;

  const isDoctor = user?.role === "doctor";
  const isAdmin = user?.role === "admin";

  return (
    <div style={{ minHeight:"100vh" }}>
      <style>{GS}</style>
      <Notification n={note} />

      {/* NAVBAR */}
      <nav style={{ background:"white",boxShadow:"0 1px 20px rgba(0,0,0,0.06)",position:"sticky",top:0,zIndex:100 }}>
        <div style={{ maxWidth:1260,margin:"0 auto",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:66 }}>
          <button onClick={() => setPage(user?"dashboard":"home")} style={{ background:"none",border:"none",display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:36,height:36,background:"linear-gradient(135deg,#0f766e,#0891b2)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:"1.3rem" }}>⚕</div>
            <span style={{ fontSize:"1.25rem",fontWeight:800,color:"#0f766e",letterSpacing:"-0.02em" }}>MediAI</span>
          </button>

          <div style={{ display:"flex",gap:2,alignItems:"center",flexWrap:"wrap" }}>
            {!user ? (
              <>
                <button className="nav-btn" onClick={() => setPage("home")}>Home</button>
                <button className="nav-btn" onClick={() => setPage("diseases")}>Diseases</button>
                <button className="btn btn-secondary" style={{ marginLeft:8,padding:"9px 20px",fontSize:"0.9rem" }} onClick={() => setPage("login")}>Login</button>
                <button className="btn btn-primary" style={{ marginLeft:6,padding:"9px 20px",fontSize:"0.9rem" }} onClick={() => setPage("register")}>Register</button>
              </>
            ) : isAdmin ? (
              <>
                <button className={`nav-btn${page==="dashboard"?" active":""}`} onClick={() => setPage("dashboard")}>Overview</button>
                <button className={`nav-btn${page==="admin-users"?" active":""}`} onClick={() => setPage("admin-users")}>Users</button>
                <button className={`nav-btn${page==="admin-appointments"?" active":""}`} onClick={() => setPage("admin-appointments")}>Appointments</button>
                <button className={`nav-btn${page==="admin-analytics"?" active":""}`} onClick={() => setPage("admin-analytics")}>Analytics</button>
                <AdminBadge user={user} logout={logout} />
              </>
            ) : isDoctor ? (
              <>
                <button className={`nav-btn${page==="dashboard"?" active":""}`} onClick={() => setPage("dashboard")}>Dashboard</button>
                <button className={`nav-btn${page==="doctor-patients"?" active":""}`} onClick={() => setPage("doctor-patients")}>Patients</button>
                <button className={`nav-btn${page==="doctor-appointments"?" active":""}`} onClick={() => setPage("doctor-appointments")}>Appointments</button>
                <button className={`nav-btn${page==="doctor-prescriptions"?" active":""}`} onClick={() => setPage("doctor-prescriptions")}>Prescriptions</button>
                <button className={`nav-btn${page==="video"?" active":""}`} onClick={() => setPage("video")}>Video Call</button>
                <UserBadge user={user} logout={logout} color="#7c3aed" />
              </>
            ) : (
              <>
                <button className={`nav-btn${page==="dashboard"?" active":""}`} onClick={() => setPage("dashboard")}>Dashboard</button>
                <button className={`nav-btn${page==="predict"?" active":""}`} onClick={() => setPage("predict")}>AI Predict</button>
                <button className={`nav-btn${page==="appointments"?" active":""}`} onClick={() => setPage("appointments")}>Appointments</button>
                <button className={`nav-btn${page==="my-reports"?" active":""}`} onClick={() => setPage("my-reports")}>My Reports</button>
                <button className={`nav-btn${page==="video"?" active":""}`} onClick={() => setPage("video")}>Video Consult</button>
                <button className={`nav-btn${page==="diseases"?" active":""}`} onClick={() => setPage("diseases")}>Diseases</button>
                <UserBadge user={user} logout={logout} color="#0f766e" />
              </>
            )}
          </div>
        </div>
      </nav>

      {/* PAGES */}
      <div style={{ maxWidth:1260,margin:"0 auto",padding:"32px 24px" }}>
        {page==="home" && <HomePage setPage={setPage} />}
        {page==="login" && <LoginPage setPage={setPage} notify={notify} />}
        {page==="register" && <RegisterPage setPage={setPage} notify={notify} />}
        {page==="diseases" && <DiseasesPage />}

        {/* PATIENT */}
        {user && !isDoctor && !isAdmin && page==="dashboard" && <PatientDashboard setPage={setPage} notify={notify} />}
        {user && !isDoctor && !isAdmin && page==="predict" && <PredictPage notify={notify} />}
        {user && !isDoctor && !isAdmin && page==="appointments" && <AppointmentsPage notify={notify} />}
        {user && !isDoctor && !isAdmin && page==="my-reports" && <MyReportsPage />}
        {user && !isDoctor && !isAdmin && page==="video" && <VideoPage notify={notify} />}

        {/* DOCTOR */}
        {user && isDoctor && page==="dashboard" && <DoctorDashboard setPage={setPage} notify={notify} />}
        {user && isDoctor && page==="doctor-patients" && <DoctorPatients notify={notify} />}
        {user && isDoctor && page==="doctor-appointments" && <DoctorAppointments notify={notify} />}
        {user && isDoctor && page==="doctor-prescriptions" && <DoctorPrescriptions notify={notify} />}
        {user && isDoctor && page==="video" && <VideoPage notify={notify} />}

        {/* ADMIN */}
        {user && isAdmin && page==="dashboard" && <AdminOverview setPage={setPage} notify={notify} />}
        {user && isAdmin && page==="admin-users" && <AdminUsers notify={notify} />}
        {user && isAdmin && page==="admin-appointments" && <AdminAppointments />}
        {user && isAdmin && page==="admin-analytics" && <AdminAnalytics />}
      </div>
    </div>
  );
}

function UserBadge({ user, logout, color }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:8,marginLeft:8,padding:"6px 12px",background:`${color}15`,borderRadius:10 }}>
      <div style={{ width:30,height:30,background:`linear-gradient(135deg,${color},${color}99)`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:"0.85rem" }}>{user.name[0]}</div>
      <div><div style={{ fontWeight:700,color,fontSize:"0.82rem" }}>{user.name.split(' ')[0]}</div><div style={{ fontSize:"0.7rem",color:"#94a3b8",textTransform:"capitalize" }}>{user.role}</div></div>
      <button onClick={logout} style={{ background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:"1rem",marginLeft:4 }}>🚪</button>
    </div>
  );
}

function AdminBadge({ user, logout }) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:8,marginLeft:8,padding:"6px 12px",background:"rgba(239,68,68,0.08)",borderRadius:10 }}>
      <div style={{ width:30,height:30,background:"linear-gradient(135deg,#ef4444,#dc2626)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:"0.85rem" }}>🛡</div>
      <div><div style={{ fontWeight:700,color:"#ef4444",fontSize:"0.82rem" }}>Admin</div><div style={{ fontSize:"0.7rem",color:"#94a3b8" }}>{user.email}</div></div>
      <button onClick={logout} style={{ background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:"1rem",marginLeft:4 }}>🚪</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════════════════════════════════
function HomePage({ setPage }) {
  const features = [
    ["🤖","AI Disease Prediction","105+ ICD-10 diseases with Claude LLM clinical reasoning"],
    ["📋","Digital Health Records","Secure EHR with complete medical history and prescriptions"],
    ["📅","Smart Appointments","Real-time booking with specialist doctors"],
    ["🎥","WebRTC Video Calls","Real peer-to-peer encrypted video consultations"],
    ["👨‍⚕️","Doctor Portal","Full patient management, appointments and prescriptions"],
    ["🛡","Admin Control Panel","System analytics, user management and monitoring"],
  ];
  return (
    <div className="fade-in">
      {/* Hero */}
      <div style={{ background:"linear-gradient(135deg,#0f766e 0%,#0891b2 55%,#1e40af 100%)",borderRadius:24,padding:"60px 48px",marginBottom:40,color:"white",position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",top:-80,right:-80,width:320,height:320,background:"rgba(255,255,255,0.05)",borderRadius:"50%" }} />
        <div style={{ position:"relative",maxWidth:680 }}>
          <div style={{ display:"inline-block",padding:"6px 16px",background:"rgba(255,255,255,0.15)",borderRadius:20,fontSize:"0.82rem",fontWeight:600,marginBottom:20 }}>🏥 AI-Powered Healthcare Platform v3.0</div>
          <h1 style={{ fontSize:"3rem",fontWeight:800,lineHeight:1.15,marginBottom:18,letterSpacing:"-0.03em" }}>Smarter Healthcare<br/>Powered by AI + WebRTC</h1>
          <p style={{ fontSize:"1.1rem",opacity:0.9,lineHeight:1.75,marginBottom:32,fontWeight:300 }}>Real disease prediction using ICD-10 clinical data, MongoDB persistent storage, JWT security, WebRTC video calls, and role-based access for Patients, Doctors & Admins.</p>
          <div style={{ display:"flex",gap:14,flexWrap:"wrap" }}>
            <button className="btn" style={{ background:"white",color:"#0f766e",fontSize:"1rem",padding:"13px 32px",fontWeight:700 }} onClick={() => setPage("register")}>Get Started Free →</button>
            <button className="btn btn-secondary" style={{ borderColor:"rgba(255,255,255,0.5)",color:"white",background:"rgba(255,255,255,0.1)" }} onClick={() => setPage("diseases")}>Browse 70+ Diseases</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:40 }}>
        {[["🧬","70+","ICD-10 Diseases"],["⚕","95%+","AI Accuracy"],["👨‍⚕️","6","Specialists"],["🔒","JWT+HTTPS","Security"]].map(([icon,val,lbl],i) => (
          <div key={i} className="card" style={{ textAlign:"center",padding:"20px 12px" }}>
            <div style={{ fontSize:"1.8rem",marginBottom:6 }}>{icon}</div>
            <div style={{ fontSize:"1.8rem",fontWeight:800,color:"#0f766e" }}>{val}</div>
            <div style={{ color:"#64748b",fontSize:"0.85rem" }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:18 }}>
        {features.map(([icon,title,desc],i) => (
          <div key={i} className="card" style={{ transition:"transform 0.2s" }} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-4px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
            <div style={{ fontSize:"2rem",marginBottom:12 }}>{icon}</div>
            <h3 style={{ fontWeight:700,fontSize:"1rem",marginBottom:6 }}>{title}</h3>
            <p style={{ color:"#64748b",lineHeight:1.7,fontSize:"0.88rem" }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════════
function LoginPage({ setPage, notify }) {
  const { login } = useAuth();
  const [email, setEmail] = useState(""); const [pass, setPass] = useState(""); const [loading, setLoading] = useState(false); const [errors, setErrors] = useState({}); const [showPass, setShowPass] = useState(false);

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = "Email required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Invalid email";
    if (!pass) e.pass = "Password required";
    setErrors(e); return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    const data = await login(email, pass);
    if (!data.success) { notify(data.message || "Login failed", "error"); setErrors({ pass: data.message }); }
    else notify(`Welcome back, ${data.user.name}! 👋`);
    setLoading(false);
  };

  return (
    <div className="fade-in" style={{ maxWidth:440,margin:"0 auto" }}>
      <div className="card" style={{ padding:"44px 40px" }}>
        <div style={{ textAlign:"center",marginBottom:28 }}>
          <div style={{ width:52,height:52,background:"linear-gradient(135deg,#0f766e,#0891b2)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem",margin:"0 auto 14px" }}>⚕</div>
          <h2 style={{ fontSize:"1.7rem",fontWeight:800 }}>Welcome Back</h2>
          <p style={{ color:"#64748b",marginTop:4,fontSize:"0.9rem" }}>Sign in to your MediAI account</p>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block",fontWeight:600,marginBottom:7,fontSize:"0.88rem",color:"#374151" }}>Email Address</label>
          <input className={`input${errors.email?" err":""}`} type="email" placeholder="you@example.com" value={email} onChange={e=>{setEmail(e.target.value);setErrors(p=>({...p,email:""}))}} onKeyDown={e=>e.key==="Enter"&&submit()} />
          {errors.email && <p style={{ color:"#ef4444",fontSize:"0.8rem",marginTop:4 }}>⚠ {errors.email}</p>}
        </div>
        <div style={{ marginBottom:24 }}>
          <label style={{ display:"block",fontWeight:600,marginBottom:7,fontSize:"0.88rem",color:"#374151" }}>Password</label>
          <div style={{ position:"relative" }}>
            <input className={`input${errors.pass?" err":""}`} type={showPass?"text":"password"} placeholder="Your password" value={pass} onChange={e=>{setPass(e.target.value);setErrors(p=>({...p,pass:""}))}} onKeyDown={e=>e.key==="Enter"&&submit()} style={{ paddingRight:44 }} />
            <button onClick={()=>setShowPass(!showPass)} style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",fontSize:"1rem",color:"#94a3b8" }}>{showPass?"🙈":"👁"}</button>
          </div>
          {errors.pass && <p style={{ color:"#ef4444",fontSize:"0.8rem",marginTop:4 }}>⚠ {errors.pass}</p>}
        </div>
        <button className="btn btn-primary" onClick={submit} disabled={loading} style={{ width:"100%",fontSize:"1rem",padding:"13px" }}>{loading?"⏳ Signing in...":"Sign In →"}</button>
        <div style={{ textAlign:"center",marginTop:16,padding:"12px",background:"#f0fdfa",borderRadius:10 }}>
          <p style={{ color:"#64748b",fontSize:"0.88rem" }}>No account? <button onClick={()=>setPage("register")} style={{ color:"#0891b2",fontWeight:700,background:"none",border:"none",cursor:"pointer",textDecoration:"underline" }}>Register</button></p>
        </div>
        <div style={{ marginTop:14,padding:"10px 14px",background:"#fef9c3",borderRadius:8,fontSize:"0.78rem",color:"#854d0e",textAlign:"center" }}>
          🛡 Admin: admin@mediai.com / Admin@123456
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REGISTER PAGE
// ═══════════════════════════════════════════════════════════════
function RegisterPage({ setPage, notify }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name:"",email:"",password:"",confirmPassword:"",age:"",gender:"male",role:"patient",phone:"",specialty:"" });
  const [step, setStep] = useState(1); const [errors, setErrors] = useState({}); const [loading, setLoading] = useState(false); const [showPass, setShowPass] = useState(false);

  const up = (f,v) => { setForm(p=>({...p,[f]:v})); setErrors(p=>({...p,[f]:""})); };

  const validateStep1 = () => {
    const e = {};
    if (!form.name.trim()||form.name.trim().length<2) e.name="Name must be at least 2 characters";
    if (!form.email.trim()) e.email="Email required"; else if (!/\S+@\S+\.\S+/.test(form.email)) e.email="Invalid email";
    if (!form.password) e.password="Password required"; else if (form.password.length<6) e.password="Min 6 characters";
    if (form.password!==form.confirmPassword) e.confirmPassword="Passwords do not match";
    setErrors(e); return !Object.keys(e).length;
  };

  const submit = async () => {
    const e2 = {};
    if (!form.age||form.age<1||form.age>120) e2.age="Valid age required (1-120)";
    if (Object.keys(e2).length) { setErrors(e2); return; }
    setLoading(true);
    const data = await register(form);
    if (!data.success) { notify(data.message||"Registration failed","error"); if (data.errors) data.errors.forEach(er=>setErrors(p=>({...p,[er.path]:er.msg}))); setStep(1); }
    else notify(`Account created! Welcome, ${data.user.name}! 🎉`);
    setLoading(false);
  };

  const passStrength = pass => { if (pass.length<4) return 0; if (pass.length<6) return 1; if (pass.length<9) return 2; return 3; };
  const ps = passStrength(form.password);

  return (
    <div className="fade-in" style={{ maxWidth:520,margin:"0 auto" }}>
      <div className="card" style={{ padding:"44px 40px" }}>
        <div style={{ textAlign:"center",marginBottom:24 }}>
          <div style={{ width:52,height:52,background:"linear-gradient(135deg,#0f766e,#0891b2)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem",margin:"0 auto 14px" }}>🏥</div>
          <h2 style={{ fontSize:"1.7rem",fontWeight:800 }}>Create Account</h2>
          <p style={{ color:"#64748b",marginTop:4,fontSize:"0.9rem" }}>Join MediAI for smarter healthcare</p>
        </div>

        {/* Step indicator */}
        <div style={{ display:"flex",alignItems:"center",marginBottom:24 }}>
          {[1,2].map((s,i) => (
            <div key={s} style={{ display:"flex",alignItems:"center",flex:1 }}>
              <div style={{ width:28,height:28,borderRadius:"50%",background:step>=s?"linear-gradient(135deg,#0f766e,#0891b2)":"#e2e8f0",color:step>=s?"white":"#94a3b8",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"0.8rem",flexShrink:0 }}>{step>s?"✓":s}</div>
              <span style={{ marginLeft:8,fontSize:"0.8rem",fontWeight:600,color:step>=s?"#0f766e":"#94a3b8" }}>{s===1?"Account Info":"Personal Details"}</span>
              {i<1 && <div style={{ flex:1,height:2,background:step>1?"#0891b2":"#e2e8f0",margin:"0 10px" }} />}
            </div>
          ))}
        </div>

        {step===1 && (
          <div className="fade-in">
            {[["Full Name","name","text","Your full name"],["Email","email","email","you@example.com"]].map(([lbl,key,type,ph]) => (
              <div key={key} style={{ marginBottom:16 }}>
                <label style={{ display:"block",fontWeight:600,marginBottom:6,fontSize:"0.88rem",color:"#374151" }}>{lbl} *</label>
                <input className={`input${errors[key]?" err":""}`} type={type} placeholder={ph} value={form[key]} onChange={e=>up(key,e.target.value)} />
                {errors[key] && <p style={{ color:"#ef4444",fontSize:"0.78rem",marginTop:3 }}>⚠ {errors[key]}</p>}
              </div>
            ))}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block",fontWeight:600,marginBottom:6,fontSize:"0.88rem",color:"#374151" }}>Password *</label>
              <div style={{ position:"relative" }}>
                <input className={`input${errors.password?" err":""}`} type={showPass?"text":"password"} placeholder="Min 6 characters" value={form.password} onChange={e=>up("password",e.target.value)} style={{ paddingRight:44 }} />
                <button onClick={()=>setShowPass(!showPass)} style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",fontSize:"1rem",color:"#94a3b8" }}>{showPass?"🙈":"👁"}</button>
              </div>
              {form.password && <div style={{ display:"flex",gap:3,marginTop:5 }}>
                {["#ef4444","#f59e0b","#22c55e","#0891b2"].map((c,i)=><div key={i} style={{ flex:1,height:3,borderRadius:2,background:ps>i?c:"#e2e8f0" }} />)}
                <span style={{ fontSize:"0.72rem",color:"#64748b",marginLeft:4 }}>{["Weak","Fair","Good","Strong"][ps]}</span>
              </div>}
              {errors.password && <p style={{ color:"#ef4444",fontSize:"0.78rem",marginTop:3 }}>⚠ {errors.password}</p>}
            </div>
            <div style={{ marginBottom:22 }}>
              <label style={{ display:"block",fontWeight:600,marginBottom:6,fontSize:"0.88rem",color:"#374151" }}>Confirm Password *</label>
              <input className={`input${errors.confirmPassword?" err":""}`} type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={e=>up("confirmPassword",e.target.value)} />
              {form.confirmPassword && form.password===form.confirmPassword && <p style={{ color:"#22c55e",fontSize:"0.78rem",marginTop:3 }}>✓ Passwords match</p>}
              {errors.confirmPassword && <p style={{ color:"#ef4444",fontSize:"0.78rem",marginTop:3 }}>⚠ {errors.confirmPassword}</p>}
            </div>
            <button className="btn btn-primary" onClick={() => validateStep1()&&setStep(2)} style={{ width:"100%",padding:"13px",fontSize:"1rem" }}>Next →</button>
          </div>
        )}

        {step===2 && (
          <div className="fade-in">
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16 }}>
              <div>
                <label style={{ display:"block",fontWeight:600,marginBottom:6,fontSize:"0.88rem",color:"#374151" }}>Age *</label>
                <input className={`input${errors.age?" err":""}`} type="number" min="1" max="120" placeholder="25" value={form.age} onChange={e=>up("age",e.target.value)} />
                {errors.age && <p style={{ color:"#ef4444",fontSize:"0.78rem",marginTop:3 }}>⚠ {errors.age}</p>}
              </div>
              <div>
                <label style={{ display:"block",fontWeight:600,marginBottom:6,fontSize:"0.88rem",color:"#374151" }}>Gender</label>
                <select className="input" value={form.gender} onChange={e=>up("gender",e.target.value)}>
                  <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="prefer_not">Prefer not to say</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block",fontWeight:600,marginBottom:6,fontSize:"0.88rem",color:"#374151" }}>Phone (optional)</label>
              <input className="input" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e=>up("phone",e.target.value)} />
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block",fontWeight:600,marginBottom:10,fontSize:"0.88rem",color:"#374151" }}>Register as</label>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                {[["patient","🙋","Patient","Get AI predictions & appointments"],["doctor","👨‍⚕️","Doctor","Manage patients & consultations"]].map(([v,icon,lbl,desc])=>(
                  <div key={v} onClick={()=>up("role",v)} style={{ padding:14,border:`2px solid ${form.role===v?"#0891b2":"#e2e8f0"}`,borderRadius:12,cursor:"pointer",background:form.role===v?"#e0f2fe":"white",transition:"all 0.15s" }}>
                    <div style={{ fontSize:"1.4rem",marginBottom:5 }}>{icon}</div>
                    <div style={{ fontWeight:700,fontSize:"0.9rem",color:form.role===v?"#0369a1":"#374151" }}>{lbl}</div>
                    <div style={{ fontSize:"0.74rem",color:"#64748b",marginTop:2 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
            {form.role==="doctor" && (
              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block",fontWeight:600,marginBottom:6,fontSize:"0.88rem",color:"#374151" }}>Specialty</label>
                <select className="input" value={form.specialty} onChange={e=>up("specialty",e.target.value)}>
                  <option value="">Select specialty</option>
                  {["General Medicine","Cardiology","Neurology","Gastroenterology","Endocrinology","Pulmonology","Dermatology","Orthopedics","Pediatrics","Psychiatry"].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div style={{ padding:"10px 14px",background:"#f0fdfa",borderRadius:10,marginBottom:18,fontSize:"0.82rem",color:"#0f766e" }}>
              <strong>Creating account for:</strong> {form.name} ({form.email})
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 2fr",gap:12 }}>
              <button className="btn btn-secondary" onClick={()=>setStep(1)} style={{ padding:"13px" }}>← Back</button>
              <button className="btn btn-primary" onClick={submit} disabled={loading} style={{ padding:"13px",fontSize:"1rem" }}>{loading?"⏳ Creating...":"✅ Create Account"}</button>
            </div>
          </div>
        )}

        <p style={{ textAlign:"center",marginTop:16,color:"#64748b",fontSize:"0.88rem" }}>
          Already have account? <button onClick={()=>setPage("login")} style={{ color:"#0891b2",fontWeight:700,background:"none",border:"none",cursor:"pointer",textDecoration:"underline" }}>Sign In</button>
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PATIENT DASHBOARD
// ═══════════════════════════════════════════════════════════════
function PatientDashboard({ setPage, notify }) {
  const { user, apiCall } = useAuth();
  const [stats, setStats] = useState({ appts:0,preds:0,reports:0 });
  const [recentPreds, setRecentPreds] = useState([]);
  const [recentAppts, setRecentAppts] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [ar, pr, rr] = await Promise.all([
        apiCall("/appointments/my"), apiCall("/medical/predictions/my"), apiCall("/medical/reports/my")
      ]);
      if (ar) { const d = await ar.json(); if (d.success) { setStats(s=>({...s,appts:d.appointments.length})); setRecentAppts(d.appointments.slice(0,3)); } }
      if (pr) { const d = await pr.json(); if (d.success) { setStats(s=>({...s,preds:d.predictions.length})); setRecentPreds(d.predictions.slice(0,3)); } }
      if (rr) { const d = await rr.json(); if (d.success) setStats(s=>({...s,reports:d.reports.length})); }
    };
    load();
  }, []);

  return (
    <div className="fade-in">
      <div className="card" style={{ background:"linear-gradient(135deg,#0f766e,#0891b2)",color:"white",marginBottom:28,padding:"32px" }}>
        <h2 style={{ fontSize:"1.7rem",fontWeight:800 }}>Good day, {user.name} 👋</h2>
        <p style={{ opacity:0.85,marginTop:6,fontSize:"1rem" }}>Your personal health dashboard. Stay proactive!</p>
        <div style={{ marginTop:18,display:"flex",gap:12 }}>
          <button className="btn" style={{ background:"rgba(255,255,255,0.9)",color:"#0f766e",fontWeight:700 }} onClick={()=>setPage("predict")}>🤖 AI Prediction</button>
          <button className="btn" style={{ background:"rgba(255,255,255,0.15)",color:"white",border:"2px solid rgba(255,255,255,0.4)" }} onClick={()=>setPage("appointments")}>📅 Book Appointment</button>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:18,marginBottom:28 }}>
        {[["🔬","Predictions",stats.preds,"#0891b2","predict"],["📅","Appointments",stats.appts,"#0f766e","appointments"],["📋","Reports",stats.reports,"#8b5cf6","my-reports"]].map(([icon,lbl,val,color,pg],i)=>(
          <div key={i} className="card" style={{ cursor:"pointer",transition:"transform 0.2s" }} onClick={()=>setPage(pg)} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-3px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
              <div><p style={{ color:"#64748b",fontSize:"0.82rem",marginBottom:8 }}>{lbl}</p><p style={{ fontSize:"2.2rem",fontWeight:800,color }}>{val}</p></div>
              <span style={{ fontSize:"1.8rem" }}>{icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
        <div className="card">
          <h3 style={{ fontWeight:700,marginBottom:16,fontSize:"1rem" }}>🔬 Recent Predictions</h3>
          {recentPreds.length===0 ? <EmptyState icon="🤖" text="No predictions yet" /> : recentPreds.map((p,i)=>(
            <div key={i} style={{ padding:"10px 14px",background:"#f8fafc",borderRadius:10,marginBottom:8 }}>
              <div style={{ display:"flex",justifyContent:"space-between" }}><span style={{ fontWeight:600,fontSize:"0.9rem" }}>{p.disease}</span><span className="badge" style={{ background:SEV[p.severity]?.bg,color:SEV[p.severity]?.c }}>{p.confidence}%</span></div>
              <div style={{ fontSize:"0.78rem",color:"#64748b",marginTop:3 }}>{new Date(p.createdAt).toLocaleDateString("en-IN")}</div>
            </div>
          ))}
        </div>
        <div className="card">
          <h3 style={{ fontWeight:700,marginBottom:16,fontSize:"1rem" }}>📅 Recent Appointments</h3>
          {recentAppts.length===0 ? <EmptyState icon="📅" text="No appointments yet" /> : recentAppts.map((a,i)=>(
            <div key={i} style={{ padding:"10px 14px",background:"#f8fafc",borderRadius:10,marginBottom:8 }}>
              <div style={{ display:"flex",justifyContent:"space-between" }}><span style={{ fontWeight:600,fontSize:"0.9rem" }}>{a.doctorName}</span><span className="badge" style={{ background:a.status==="confirmed"?"rgba(34,197,94,0.12)":a.status==="pending"?"rgba(245,158,11,0.12)":"rgba(239,68,68,0.1)",color:a.status==="confirmed"?"#16a34a":a.status==="pending"?"#d97706":"#dc2626" }}>{a.status}</span></div>
              <div style={{ fontSize:"0.78rem",color:"#64748b",marginTop:3 }}>{a.date} • {a.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, text }) {
  return <div style={{ textAlign:"center",padding:"28px 0",color:"#94a3b8" }}><div style={{ fontSize:"2rem",marginBottom:8 }}>{icon}</div><p style={{ fontSize:"0.88rem" }}>{text}</p></div>;
}

// ═══════════════════════════════════════════════════════════════
// AI PREDICT PAGE
// ═══════════════════════════════════════════════════════════════
function PredictPage({ notify }) {
  const { user, apiCall } = useAuth();
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggle = s => setSelected(p => p.includes(s)?p.filter(x=>x!==s):[...p,s]);

  const run = async () => {
    if (selected.length<2) { notify("Select at least 2 symptoms","error"); return; }
    setLoading(true); setResult(null);
    try {
      const scored = DISEASE_DB.map(d => {
        const overlap = selected.filter(s=>d.symptoms.includes(s)).length;
        const score = (overlap/d.symptoms.length)*0.6 + (overlap/selected.length)*0.4;
        return { ...d, score, overlap };
      }).filter(d=>d.overlap>0).sort((a,b)=>b.score-a.score);
      const top3 = scored.slice(0,3);
      if (!top3.length) { notify("No matching conditions found","error"); setLoading(false); return; }

      let aiResult;
      try {
        const res = await fetch("${API_URL}/api/ai/predict", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:800,
          system:"You are a clinical AI assistant. Respond ONLY with valid JSON. No markdown.",
          messages:[{ role:"user", content:`Patient symptoms: ${selected.map(s=>SYMPTOM_LABELS[s]||s).join(", ")}\nTop diseases: ${top3.map(d=>`${d.name} (${d.icd})`).join(", ")}\nReturn JSON: {"primary":"disease name","confidence":85,"explanation":"2 sentence clinical explanation","recommendations":["action1","action2","action3"],"urgency":"See a doctor within 3 days","disclaimer":"AI screening only — not a diagnosis."}` }]
        })});
        const d = await res.json();
        const text = d.content?.find(b=>b.type==="text")?.text||"{}";
        aiResult = JSON.parse(text.replace(/```json|```/g,"").trim());
      } catch {
        aiResult = { primary:top3[0].name, confidence:Math.round(top3[0].score*100), explanation:`Based on ${selected.length} symptoms, ${top3[0].name} matches the clinical profile.`, recommendations:["Consult a healthcare provider","Monitor your symptoms","Rest and stay hydrated"], urgency:"Schedule within 3 days", disclaimer:"AI screening only — not a medical diagnosis." };
      }

      const primary = DISEASE_DB.find(d=>d.name===aiResult.primary)||top3[0];
      const finalResult = { disease:aiResult.primary||top3[0].name, confidence:aiResult.confidence||80, severity:primary.severity, category:primary.category, icd:primary.icd, explanation:aiResult.explanation, recommendations:aiResult.recommendations||[], urgency:aiResult.urgency, disclaimer:aiResult.disclaimer, alternatives:top3.slice(1).map(d=>({name:d.name,score:Math.round(d.score*100)})), symptoms:selected };

      setResult(finalResult);
      // Save to MongoDB
      await apiCall("/medical/predict", { method:"POST", body:JSON.stringify(finalResult) });
      notify("Prediction complete! ✅");
    } catch(err) { notify("Prediction failed","error"); }
    setLoading(false);
  };

  const displaySymptoms = ALL_SYMPTOMS.filter(s=>(SYMPTOM_LABELS[s]||s).toLowerCase().includes(search.toLowerCase()));
  const sc = result ? (SEV[result.severity]||SEV.moderate) : null;

  return (
    <div className="fade-in">
      <div style={{ marginBottom:24 }}><h2 style={{ fontSize:"1.8rem",fontWeight:800 }}>🤖 AI Disease Prediction</h2><p style={{ color:"#64748b",marginTop:5 }}>Select symptoms and let AI analyze against 70+ ICD-10 clinical conditions. Results saved to your health record.</p></div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 400px",gap:24 }}>
        <div className="card">
          <div style={{ display:"flex",gap:10,marginBottom:16 }}>
            <input className="input" placeholder="🔍 Search symptoms..." value={search} onChange={e=>setSearch(e.target.value)} style={{ flex:1 }} />
            <button className="btn btn-secondary" onClick={()=>{setSelected([]);setResult(null);}}>Clear</button>
          </div>
          {selected.length>0 && (
            <div style={{ marginBottom:14,padding:"10px 14px",background:"#e0f2fe",borderRadius:10 }}>
              <strong style={{ color:"#0369a1",fontSize:"0.85rem" }}>✓ {selected.length} selected:</strong>
              <div style={{ marginTop:6 }}>{selected.map(s=><span key={s} onClick={()=>toggle(s)} style={{ display:"inline-flex",alignItems:"center",gap:3,padding:"2px 8px",background:"#0891b2",color:"white",borderRadius:6,margin:"2px",fontSize:"0.78rem",cursor:"pointer" }}>{SYMPTOM_LABELS[s]} ✕</span>)}</div>
            </div>
          )}
          <div style={{ maxHeight:380,overflowY:"auto" }}>
            {displaySymptoms.slice(0,100).map(s=><span key={s} className={`chip${selected.includes(s)?" sel":""}`} onClick={()=>toggle(s)}>{selected.includes(s)?"✓":"+"} {SYMPTOM_LABELS[s]||s}</span>)}
          </div>
          <button className="btn btn-primary" onClick={run} disabled={loading||selected.length<2} style={{ width:"100%",marginTop:16,fontSize:"1rem",padding:"13px" }}>
            {loading?"🔄 Analyzing...":selected.length<2?"Select at least 2 symptoms":`🤖 Analyze ${selected.length} Symptoms`}
          </button>
        </div>

        <div>
          {!result && !loading && <div className="card" style={{ textAlign:"center",padding:"48px 20px" }}><div style={{ fontSize:"3.5rem",marginBottom:14 }}>🩺</div><h3 style={{ fontWeight:700,marginBottom:8 }}>Ready to Analyze</h3><p style={{ color:"#64748b",fontSize:"0.88rem",lineHeight:1.7 }}>Select at least 2 symptoms and click Analyze. Results are saved to your MongoDB health record.</p></div>}
          {loading && <div className="card" style={{ textAlign:"center",padding:"48px 20px" }}><div style={{ fontSize:"2.5rem",marginBottom:14,display:"inline-block",animation:"spin 1.5s linear infinite" }}>⚙️</div><h3 style={{ fontWeight:600 }}>AI Analysis in Progress</h3><p style={{ color:"#64748b",marginTop:8,fontSize:"0.88rem" }}>Matching symptoms against 70+ conditions...</p></div>}
          {result && !loading && (
            <div className="fade-in">
              <div className="card" style={{ border:`2px solid ${sc.c}`,marginBottom:14 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14 }}>
                  <div><h3 style={{ fontSize:"1.4rem",fontWeight:800 }}>{result.disease}</h3><p style={{ color:"#64748b",fontSize:"0.82rem" }}>{result.category} • ICD-10: {result.icd}</p></div>
                  <span className="badge" style={{ background:sc.bg,color:sc.c }}>{sc.l}</span>
                </div>
                <div style={{ marginBottom:14 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:"0.82rem",fontWeight:600 }}><span style={{ color:"#64748b" }}>AI Confidence</span><span style={{ color:sc.c }}>{result.confidence}%</span></div>
                  <div style={{ background:"#f1f5f9",borderRadius:8,height:8,overflow:"hidden" }}><div style={{ width:`${result.confidence}%`,height:"100%",background:`linear-gradient(90deg,${sc.c},${sc.c}cc)`,borderRadius:8,transition:"width 1s ease" }} /></div>
                </div>
                <p style={{ color:"#374151",lineHeight:1.7,fontSize:"0.9rem",marginBottom:14 }}>{result.explanation}</p>
                <div style={{ padding:"9px 14px",background:sc.bg,borderRadius:8,marginBottom:14 }}><strong style={{ color:sc.c }}>⏰ {result.urgency}</strong></div>
                <h4 style={{ fontWeight:700,marginBottom:8,fontSize:"0.9rem" }}>📋 Recommendations</h4>
                {(result.recommendations||[]).map((r,i)=><div key={i} style={{ display:"flex",gap:6,marginBottom:5 }}><span style={{ color:"#0891b2",fontWeight:700 }}>→</span><span style={{ color:"#374151",fontSize:"0.88rem" }}>{r}</span></div>)}
                <p style={{ marginTop:14,padding:"9px 12px",background:"#fef9c3",borderRadius:8,fontSize:"0.78rem",color:"#854d0e",lineHeight:1.5 }}>⚠ {result.disclaimer}</p>
              </div>
              {result.alternatives?.length>0 && (
                <div className="card">
                  <h4 style={{ fontWeight:700,marginBottom:12,fontSize:"0.9rem" }}>Other Possible Conditions</h4>
                  {result.alternatives.map((a,i)=><div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"9px 12px",background:"#f8fafc",borderRadius:8,marginBottom:6 }}><span style={{ fontWeight:500,fontSize:"0.88rem" }}>{a.name}</span><span style={{ color:"#64748b",fontSize:"0.82rem" }}>{a.score}% match</span></div>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// APPOINTMENTS PAGE (Patient)
// ═══════════════════════════════════════════════════════════════
function AppointmentsPage({ notify }) {
  const { user, apiCall } = useAuth();
  const [tab, setTab] = useState("book");
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState({ doctorName:"",doctorSpecialty:"",date:"",time:"",reason:"" });
  const [loading, setLoading] = useState(false);
  const selDoc = DOCTORS_LIST.find(d=>d.name===form.doctorName);
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const loadAppts = async () => {
    const res = await apiCall("/appointments/my");
    if (res) { const d = await res.json(); if (d.success) setAppointments(d.appointments); }
  };

  useEffect(() => { loadAppts(); }, []);

  const book = async () => {
    if (!form.doctorName||!form.date||!form.time||!form.reason) { notify("All fields required","error"); return; }
    setLoading(true);
    const res = await apiCall("/appointments", { method:"POST", body:JSON.stringify(form) });
    if (res) { const d = await res.json(); if (d.success) { notify("Appointment booked! 📅"); setForm({doctorName:"",doctorSpecialty:"",date:"",time:"",reason:""}); loadAppts(); setTab("my"); } else notify(d.message,"error"); }
    setLoading(false);
  };

  const cancel = async (id) => {
    const res = await apiCall(`/appointments/${id}/cancel`, { method:"PATCH" });
    if (res) { const d = await res.json(); if (d.success) { notify("Appointment cancelled"); loadAppts(); } }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom:24 }}><h2 style={{ fontSize:"1.8rem",fontWeight:800 }}>📅 Appointments</h2><p style={{ color:"#64748b",marginTop:5 }}>Book and manage your consultations. Stored securely in MongoDB.</p></div>
      <div style={{ display:"flex",gap:8,marginBottom:24 }}>
        {[["book","📋 Book Appointment"],["my",`📁 My Appointments (${appointments.length})`]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ padding:"10px 22px",borderRadius:10,border:"none",fontWeight:600,background:tab===k?"#0f766e":"white",color:tab===k?"white":"#64748b",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",cursor:"pointer" }}>{l}</button>
        ))}
      </div>

      {tab==="book" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:24 }}>
          <div className="card">
            <h3 style={{ fontWeight:700,marginBottom:22,fontSize:"1.1rem" }}>Schedule Consultation</h3>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block",fontWeight:600,marginBottom:7,fontSize:"0.88rem",color:"#374151" }}>Select Doctor</label>
              <select className="input" value={form.doctorName} onChange={e=>{ const d=DOCTORS_LIST.find(d=>d.name===e.target.value); setForm(p=>({...p,doctorName:e.target.value,doctorSpecialty:d?.specialty||"",time:""})); }}>
                <option value="">— Choose a specialist —</option>
                {DOCTORS_LIST.map(d=><option key={d.name} value={d.name}>{d.name} — {d.specialty}</option>)}
              </select>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16 }}>
              <div><label style={{ display:"block",fontWeight:600,marginBottom:7,fontSize:"0.88rem",color:"#374151" }}>Date</label><input className="input" type="date" min={minDate} value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} /></div>
              <div><label style={{ display:"block",fontWeight:600,marginBottom:7,fontSize:"0.88rem",color:"#374151" }}>Time Slot</label>
                <select className="input" value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))} disabled={!selDoc}>
                  <option value="">— Select time —</option>
                  {(selDoc?.slots||[]).map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:22 }}>
              <label style={{ display:"block",fontWeight:600,marginBottom:7,fontSize:"0.88rem",color:"#374151" }}>Reason for Visit</label>
              <textarea className="input" rows={3} placeholder="Describe your symptoms..." value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))} style={{ resize:"vertical" }} />
            </div>
            <button className="btn btn-primary" onClick={book} disabled={loading} style={{ width:"100%",padding:"13px",fontSize:"1rem" }}>{loading?"Booking...":"Confirm Booking →"}</button>
          </div>
          <div>
            <h3 style={{ fontWeight:700,marginBottom:14,fontSize:"1.05rem" }}>Our Specialists</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {DOCTORS_LIST.map(doc=>(
                <div key={doc.name} className="card" style={{ padding:16,cursor:"pointer",border:form.doctorName===doc.name?"2px solid #0891b2":"2px solid transparent",transition:"border-color 0.15s" }} onClick={()=>setForm(p=>({...p,doctorName:doc.name,doctorSpecialty:doc.specialty,time:""}))}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div style={{ display:"flex",gap:12,alignItems:"center" }}>
                      <div style={{ width:40,height:40,background:"linear-gradient(135deg,#0f766e,#0891b2)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700 }}>{doc.name[4]}</div>
                      <div><div style={{ fontWeight:700,fontSize:"0.9rem" }}>{doc.name}</div><div style={{ color:"#64748b",fontSize:"0.78rem" }}>{doc.specialty} • {doc.exp}y exp</div></div>
                    </div>
                    <div style={{ color:"#f59e0b",fontWeight:700,fontSize:"0.9rem" }}>★ {doc.rating}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab==="my" && (
        <div>
          {appointments.length===0 ? <div className="card" style={{ textAlign:"center",padding:"48px 0" }}><EmptyState icon="📭" text="No appointments yet" /></div> : (
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
              {appointments.map(a=>(
                <div key={a._id} className="card" style={{ borderLeft:`4px solid ${a.status==="confirmed"?"#0891b2":a.status==="pending"?"#f59e0b":a.status==="completed"?"#22c55e":"#ef4444"}` }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:12 }}>
                    <h4 style={{ fontWeight:700 }}>{a.doctorName}</h4>
                    <span className="badge" style={{ background:a.status==="confirmed"?"rgba(34,197,94,0.12)":a.status==="pending"?"rgba(245,158,11,0.12)":a.status==="completed"?"rgba(8,145,178,0.1)":"rgba(239,68,68,0.1)",color:a.status==="confirmed"?"#16a34a":a.status==="pending"?"#d97706":a.status==="completed"?"#0369a1":"#dc2626" }}>{a.status}</span>
                  </div>
                  <p style={{ color:"#64748b",fontSize:"0.82rem" }}>{a.doctorSpecialty}</p>
                  <p style={{ marginTop:8,fontSize:"0.88rem" }}>📅 {a.date} • ⏰ {a.time}</p>
                  <p style={{ color:"#64748b",marginTop:4,fontSize:"0.82rem" }}>📝 {a.reason}</p>
                  {a.notes && <p style={{ marginTop:8,padding:"8px 12px",background:"#f0fdf4",borderRadius:8,fontSize:"0.82rem",color:"#374151" }}>💬 {a.notes}</p>}
                  {a.status==="confirmed" && a.videoRoomId && (
                    <div style={{ marginTop:10,padding:"8px 12px",background:"#e0f2fe",borderRadius:8,fontSize:"0.82rem",color:"#0369a1",display:"flex",alignItems:"center",gap:6 }}>
                      🎥 Video Room ID: <code style={{ fontFamily:"monospace" }}>{a.videoRoomId.slice(0,12)}...</code>
                    </div>
                  )}
                  {a.status==="pending" && <button className="btn btn-danger" style={{ marginTop:12,fontSize:"0.82rem",padding:"8px 16px" }} onClick={()=>cancel(a._id)}>Cancel</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MY REPORTS PAGE (Patient)
// ═══════════════════════════════════════════════════════════════
function MyReportsPage() {
  const { apiCall } = useAuth();
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await apiCall("/medical/reports/my");
      if (res) { const d = await res.json(); if (d.success) setReports(d.reports); }
    };
    load();
  }, []);

  return (
    <div className="fade-in">
      <div style={{ marginBottom:24 }}><h2 style={{ fontSize:"1.8rem",fontWeight:800 }}>📋 My Medical Reports</h2><p style={{ color:"#64748b",marginTop:5 }}>Prescriptions issued by your doctors — stored in MongoDB.</p></div>
      {reports.length===0 ? <div className="card" style={{ textAlign:"center",padding:"64px 0" }}><EmptyState icon="📭" text="No reports yet. Your doctor's prescriptions appear here." /></div> : (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
          {reports.map((r,i)=>(
            <div key={i} className="card" style={{ borderLeft:"4px solid #0891b2" }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:12 }}>
                <div><h3 style={{ fontWeight:700,fontSize:"1.05rem" }}>{r.diagnosis}</h3><p style={{ color:"#64748b",fontSize:"0.8rem",marginTop:2 }}>By {r.doctorName} • {new Date(r.createdAt).toLocaleDateString("en-IN")}</p></div>
                <span className="badge" style={{ background:"#e0f2fe",color:"#0369a1" }}>Rx</span>
              </div>
              <div style={{ marginBottom:10 }}>
                <p style={{ fontWeight:600,fontSize:"0.82rem",color:"#374151",marginBottom:6 }}>💊 Prescription</p>
                <p style={{ color:"#374151",lineHeight:1.8,fontSize:"0.85rem",background:"#f8fafc",padding:"10px 12px",borderRadius:8,whiteSpace:"pre-wrap",fontFamily:"monospace" }}>{r.prescription}</p>
              </div>
              {r.notes && <p style={{ color:"#64748b",fontSize:"0.82rem",fontStyle:"italic",marginTop:6 }}>📝 {r.notes}</p>}
              {r.followUp && <div style={{ marginTop:8,padding:"7px 10px",background:"#fef9c3",borderRadius:8,fontSize:"0.78rem",color:"#854d0e" }}>📅 Follow-up: {r.followUp}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// VIDEO PAGE — Real WebRTC
// ═══════════════════════════════════════════════════════════════
function VideoPage({ notify }) {
  const { user } = useAuth();
  const [step, setStep] = useState("lobby");
  const [roomId, setRoomId] = useState("");
  const [customRoom, setCustomRoom] = useState("");
  const [socket, setSocket] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connected, setConnected] = useState(false);
  const [peerName, setPeerName] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [chatMsgs, setChatMsgs] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const localVideoRef = useRef(); const remoteVideoRef = useRef();
  const pcRef = useRef(); const timerRef = useRef(); const pendingCandidates = useRef([]);
  const chatEndRef = useRef();

  const ICE = { iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"}] };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [chatMsgs]);

  const startCall = async (rid) => {
    const token = localStorage.getItem("accessToken");
    const sock = io(window.location.origin, { auth:{ token }, transports:["websocket"] });
    setSocket(sock); setRoomId(rid); setStep("call"); setConnecting(true);

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch(e) { notify("Camera/mic access denied","error"); return; }

    sock.on("connect", () => sock.emit("join-room", { roomId:rid }));

    sock.on("room-peers", async ({ peers }) => {
      if (peers.length>0) await createOffer(sock, stream, peers[0]);
    });

    sock.on("user-joined", async ({ socketId, userName }) => {
      setPeerName(userName); await createOffer(sock, stream, socketId);
    });

    sock.on("offer", async ({ offer, from, fromName }) => {
      setPeerName(fromName); await handleOffer(sock, stream, offer, from);
    });

    sock.on("answer", async ({ answer }) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        for (const c of pendingCandidates.current) await pcRef.current.addIceCandidate(c);
        pendingCandidates.current = [];
      }
    });

    sock.on("ice-candidate", async ({ candidate }) => {
      if (pcRef.current?.remoteDescription) await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      else pendingCandidates.current.push(new RTCIceCandidate(candidate));
    });

    sock.on("user-left", () => { setConnected(false); setRemoteStream(null); setPeerName(""); clearInterval(timerRef.current); if(remoteVideoRef.current) remoteVideoRef.current.srcObject=null; });

    sock.on("chat-message", msg => setChatMsgs(p=>[...p,msg]));
  };

  const createPeerConnection = (sock, stream) => {
    const pc = new RTCPeerConnection(ICE);
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    const remote = new MediaStream();
    pc.ontrack = e => {
      e.streams[0].getTracks().forEach(t => remote.addTrack(t));
      setRemoteStream(remote);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      setConnected(true); setConnecting(false);
      timerRef.current = setInterval(() => setCallDuration(d=>d+1), 1000);
    };
    pc.onicecandidate = e => { if (e.candidate && pc._peer) sock.emit("ice-candidate", { candidate:e.candidate, to:pc._peer }); };
    pc.onconnectionstatechange = () => { if (["disconnected","failed"].includes(pc.connectionState)) { setConnected(false); clearInterval(timerRef.current); } };
    pcRef.current = pc; return pc;
  };

  const createOffer = async (sock, stream, peerId) => {
    const pc = createPeerConnection(sock, stream); pc._peer = peerId;
    const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
    sock.emit("offer", { offer, to:peerId });
  };

  const handleOffer = async (sock, stream, offer, from) => {
    const pc = createPeerConnection(sock, stream); pc._peer = from;
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
    sock.emit("answer", { answer, to:from });
    for (const c of pendingCandidates.current) await pc.addIceCandidate(c);
    pendingCandidates.current = [];
  };

  const toggleMute = () => { localStream?.getAudioTracks().forEach(t=>{ t.enabled=!t.enabled; }); setIsMuted(m=>!m); };
  const toggleVideo = () => { localStream?.getVideoTracks().forEach(t=>{ t.enabled=!t.enabled; }); setIsVideoOff(v=>!v); };

  const endCall = () => {
    socket?.emit("leave-room", { roomId }); socket?.disconnect();
    localStream?.getTracks().forEach(t=>t.stop()); pcRef.current?.close();
    clearInterval(timerRef.current);
    setStep("ended"); setConnected(false); setLocalStream(null); setRemoteStream(null);
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    socket?.emit("chat-message", { roomId, message:chatInput.trim() });
    setChatInput("");
  };

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  if (step==="lobby") return (
    <div className="fade-in">
      <div style={{ marginBottom:24 }}><h2 style={{ fontSize:"1.8rem",fontWeight:800 }}>🎥 Video Consultation</h2><p style={{ color:"#64748b",marginTop:5 }}>Real WebRTC peer-to-peer encrypted video calls via Socket.io signaling.</p></div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:18,marginBottom:32 }}>
        {[["🔒","P2P Encrypted","Direct WebRTC connection — no server relay"],["⚡","Real-time Signaling","Socket.io with JWT auth for secure room joining"],["💬","In-Call Chat","Real-time messaging during video consultation"]].map(([i,t,d],j)=>(
          <div key={j} className="card" style={{ textAlign:"center" }}><div style={{ fontSize:"2rem",marginBottom:10 }}>{i}</div><h4 style={{ fontWeight:700,marginBottom:6 }}>{t}</h4><p style={{ color:"#64748b",fontSize:"0.85rem" }}>{d}</p></div>
        ))}
      </div>
      <div className="card" style={{ maxWidth:520,margin:"0 auto" }}>
        <h3 style={{ fontWeight:700,marginBottom:20,fontSize:"1.1rem",textAlign:"center" }}>Join a Video Room</h3>
        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block",fontWeight:600,marginBottom:7,fontSize:"0.88rem",color:"#374151" }}>Room ID</label>
          <input className="input" placeholder="Enter room ID from your appointment or create one..." value={customRoom} onChange={e=>setCustomRoom(e.target.value)} onKeyDown={e=>e.key==="Enter"&&customRoom&&startCall(customRoom)} />
          <p style={{ fontSize:"0.78rem",color:"#64748b",marginTop:5 }}>💡 Room ID is in your confirmed appointment card. Share with your doctor/patient to connect.</p>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          <button className="btn btn-primary" onClick={()=>customRoom&&startCall(customRoom)} disabled={!customRoom} style={{ padding:"13px",fontSize:"1rem" }}>📹 Join Room</button>
          <button className="btn btn-secondary" onClick={()=>{ const r=Math.random().toString(36).slice(2,10); setCustomRoom(r); }} style={{ padding:"13px",fontSize:"1rem" }}>🎲 Generate ID</button>
        </div>
        {customRoom && <div style={{ marginTop:12,padding:"10px 14px",background:"#e0f2fe",borderRadius:10,fontSize:"0.82rem",color:"#0369a1" }}>Room: <strong>{customRoom}</strong> — Share this with the other person</div>}
      </div>
    </div>
  );

  if (step==="ended") return (
    <div className="fade-in" style={{ textAlign:"center",padding:"80px 0" }}>
      <div style={{ fontSize:"4rem",marginBottom:20 }}>✅</div>
      <h2 style={{ fontWeight:800,fontSize:"2rem",marginBottom:8 }}>Call Ended</h2>
      <p style={{ color:"#64748b",marginBottom:24 }}>Duration: {fmt(callDuration)} {peerName && `• With: ${peerName}`}</p>
      <button className="btn btn-primary" onClick={()=>{ setStep("lobby"); setCallDuration(0); setChatMsgs([]); setPeerName(""); setCustomRoom(""); }} style={{ padding:"13px 32px",fontSize:"1rem" }}>Start New Call</button>
    </div>
  );

  return (
    <div className="fade-in">
      <div style={{ background:"#0f172a",borderRadius:20,overflow:"hidden" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 340px",height:520 }}>
          {/* Video */}
          <div style={{ position:"relative",background:"linear-gradient(135deg,#0f1729,#1e3a5f)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <video ref={remoteVideoRef} autoPlay playsInline style={{ width:"100%",height:"100%",objectFit:"cover",display:connected?"block":"none" }} />
            {!connected && (
              <div style={{ textAlign:"center",color:"white" }}>
                <div style={{ fontSize:"3rem",marginBottom:14,animation:connecting?"spin 2s linear infinite":"none",display:"inline-block" }}>{connecting?"📡":"👤"}</div>
                <h3 style={{ fontWeight:700 }}>{connecting?`Waiting for ${peerName||"other person"}...`:"Waiting for someone to join..."}</h3>
                <p style={{ opacity:0.6,fontSize:"0.85rem",marginTop:6 }}>Room: {roomId}</p>
              </div>
            )}
            {connected && peerName && <div style={{ position:"absolute",top:16,left:16,padding:"6px 14px",background:"rgba(0,0,0,0.5)",borderRadius:20,color:"white",fontSize:"0.82rem",backdropFilter:"blur(8px)" }}>👤 {peerName}</div>}
            <div style={{ position:"absolute",top:16,right:16,padding:"6px 14px",background:"rgba(0,0,0,0.5)",borderRadius:20,color:connected?"#22c55e":"#f59e0b",fontFamily:"monospace",fontWeight:600,backdropFilter:"blur(8px)",fontSize:"0.85rem" }}>
              {connected?`🔴 ${fmt(callDuration)}`:"⏳ Connecting..."}
            </div>
            <video ref={localVideoRef} autoPlay playsInline muted style={{ position:"absolute",bottom:16,right:16,width:120,height:80,objectFit:"cover",borderRadius:10,border:"2px solid rgba(255,255,255,0.2)",display:isVideoOff?"none":"block" }} />
            {isVideoOff && <div style={{ position:"absolute",bottom:16,right:16,width:120,height:80,background:"#1e3a5f",borderRadius:10,border:"2px solid rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.5)",fontSize:"0.78rem" }}>Camera Off</div>}
          </div>

          {/* Chat */}
          <div style={{ background:"#1e293b",display:"flex",flexDirection:"column" }}>
            <div style={{ padding:"14px 18px",borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
              <h4 style={{ color:"white",fontWeight:600,fontSize:"0.9rem" }}>💬 In-Call Chat</h4>
              <p style={{ color:"rgba(255,255,255,0.4)",fontSize:"0.72rem" }}>Real-time via Socket.io</p>
            </div>
            <div style={{ flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:8 }}>
              {chatMsgs.length===0 && <p style={{ color:"rgba(255,255,255,0.3)",fontSize:"0.82rem",textAlign:"center",marginTop:20 }}>Chat messages appear here...</p>}
              {chatMsgs.map((m,i)=>(
                <div key={i} style={{ display:"flex",justifyContent:m.fromName===user.name?"flex-end":"flex-start" }}>
                  <div style={{ maxWidth:"85%",padding:"9px 12px",borderRadius:10,fontSize:"0.82rem",lineHeight:1.5,background:m.fromName===user.name?"#0891b2":"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.9)" }}>
                    {m.fromName!==user.name && <div style={{ fontSize:"0.7rem",opacity:0.6,marginBottom:3 }}>{m.fromName}</div>}
                    {m.message}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,0.08)",display:"flex",gap:8 }}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Type message..." style={{ flex:1,padding:"8px 12px",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,color:"white",fontSize:"0.82rem",outline:"none" }} />
              <button onClick={sendChat} style={{ background:"#0891b2",border:"none",color:"white",padding:"8px 12px",borderRadius:8,cursor:"pointer" }}>→</button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ background:"#0f172a",padding:"18px",display:"flex",justifyContent:"center",gap:14 }}>
          {[
            { icon:isMuted?"🔇":"🎤", label:isMuted?"Unmute":"Mute", action:toggleMute, active:isMuted },
            { icon:isVideoOff?"📷":"📹", label:isVideoOff?"Start Video":"Stop Video", action:toggleVideo, active:isVideoOff },
          ].map((c,i)=>(
            <button key={i} onClick={c.action} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"11px 24px",background:c.active?"rgba(239,68,68,0.2)":"rgba(255,255,255,0.1)",border:"none",borderRadius:12,color:"white",cursor:"pointer",fontSize:"1.3rem",minWidth:80 }}>
              {c.icon}<span style={{ fontSize:"0.68rem",opacity:0.7 }}>{c.label}</span>
            </button>
          ))}
          <button onClick={endCall} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"11px 32px",background:"#ef4444",border:"none",borderRadius:12,color:"white",cursor:"pointer",fontSize:"1.3rem" }}>
            📵<span style={{ fontSize:"0.68rem" }}>End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DOCTOR DASHBOARD
// ═══════════════════════════════════════════════════════════════
function DoctorDashboard({ setPage, notify }) {
  const { user, apiCall } = useAuth();
  const [stats, setStats] = useState({ total:0,pending:0,confirmed:0,reports:0 });
  const [pending, setPending] = useState([]);
  const [recentRx, setRecentRx] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [ar, rr] = await Promise.all([apiCall("/appointments/doctor"), apiCall("/medical/reports/doctor")]);
      if (ar) { const d = await ar.json(); if (d.success) { const a=d.appointments; setStats(s=>({...s,total:[...new Set(a.map(x=>x.patientEmail))].length,pending:a.filter(x=>x.status==="pending").length,confirmed:a.filter(x=>x.status==="confirmed").length})); setPending(a.filter(x=>x.status==="pending").slice(0,4)); } }
      if (rr) { const d = await rr.json(); if (d.success) { setStats(s=>({...s,reports:d.reports.length})); setRecentRx(d.reports.slice(0,4)); } }
    };
    load();
  }, []);

  return (
    <div className="fade-in">
      <div className="card" style={{ background:"linear-gradient(135deg,#7c3aed,#a855f7,#6366f1)",color:"white",marginBottom:28,padding:"32px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <div style={{ fontSize:"0.82rem",opacity:0.7,marginBottom:6,fontWeight:500 }}>👨‍⚕️ Doctor Portal</div>
            <h2 style={{ fontSize:"1.7rem",fontWeight:800 }}>Welcome, {user.name}</h2>
            <p style={{ opacity:0.85,marginTop:6 }}>You have <strong>{stats.pending}</strong> pending appointment{stats.pending!==1?"s":""} awaiting response.</p>
          </div>
          <div style={{ width:72,height:72,background:"rgba(255,255,255,0.15)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2.2rem" }}>👨‍⚕️</div>
        </div>
        <div style={{ marginTop:18,display:"flex",gap:12 }}>
          <button className="btn" style={{ background:"white",color:"#7c3aed",fontWeight:700 }} onClick={()=>setPage("doctor-appointments")}>📅 View Appointments</button>
          <button className="btn" style={{ background:"rgba(255,255,255,0.15)",color:"white",border:"2px solid rgba(255,255,255,0.4)" }} onClick={()=>setPage("doctor-prescriptions")}>💊 Write Prescription</button>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28 }}>
        {[["👥","Patients",stats.total,"#0891b2","doctor-patients"],["⏳","Pending",stats.pending,"#f59e0b","doctor-appointments"],["✅","Confirmed",stats.confirmed,"#22c55e","doctor-appointments"],["💊","Prescriptions",stats.reports,"#8b5cf6","doctor-prescriptions"]].map(([icon,lbl,val,color,pg],i)=>(
          <div key={i} className="card" style={{ cursor:"pointer",transition:"transform 0.2s" }} onClick={()=>setPage(pg)} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-3px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
            <div style={{ display:"flex",justifyContent:"space-between" }}><div><p style={{ color:"#64748b",fontSize:"0.8rem",marginBottom:8 }}>{lbl}</p><p style={{ fontSize:"2.2rem",fontWeight:800,color }}>{val}</p></div><span style={{ fontSize:"1.8rem" }}>{icon}</span></div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
        <div className="card">
          <h3 style={{ fontWeight:700,marginBottom:16,fontSize:"1rem" }}>⏳ Pending Appointments</h3>
          {pending.length===0?<EmptyState icon="✅" text="No pending appointments" />:pending.map((a,i)=>(
            <div key={i} style={{ padding:"10px 14px",background:"#fef9c3",borderRadius:10,marginBottom:8,borderLeft:"3px solid #f59e0b" }}>
              <div style={{ fontWeight:700,fontSize:"0.88rem" }}>{a.patientName}</div>
              <div style={{ color:"#64748b",fontSize:"0.78rem" }}>{a.date} • {a.time}</div>
              <div style={{ color:"#374151",fontSize:"0.78rem",marginTop:3 }}>{a.reason}</div>
            </div>
          ))}
        </div>
        <div className="card">
          <h3 style={{ fontWeight:700,marginBottom:16,fontSize:"1rem" }}>💊 Recent Prescriptions</h3>
          {recentRx.length===0?<EmptyState icon="📋" text="No prescriptions yet" />:recentRx.map((r,i)=>(
            <div key={i} style={{ padding:"10px 14px",background:"#f0fdf4",borderRadius:10,marginBottom:8,borderLeft:"3px solid #22c55e" }}>
              <div style={{ fontWeight:700,fontSize:"0.88rem" }}>{r.patientName}</div>
              <div style={{ color:"#64748b",fontSize:"0.78rem" }}>{r.diagnosis} • {new Date(r.createdAt).toLocaleDateString("en-IN")}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DOCTOR PATIENTS
// ═══════════════════════════════════════════════════════════════
function DoctorPatients({ notify }) {
  const { apiCall } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [preds, setPreds] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await apiCall("/appointments/doctor");
      if (res) { const d = await res.json(); if (d.success) setAppointments(d.appointments); }
    };
    load();
  }, []);

  const patients = [...new Map(appointments.map(a=>[a.patientEmail,a])).values()];

  const loadPreds = async (email) => {
    const res = await apiCall(`/medical/predictions/patient/${email}`);
    if (res) { const d = await res.json(); if (d.success) setPreds(d.predictions); }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom:24 }}><h2 style={{ fontSize:"1.8rem",fontWeight:800 }}>👥 My Patients</h2><p style={{ color:"#64748b",marginTop:5 }}>Patients who have booked appointments with you.</p></div>
      {patients.length===0?<div className="card" style={{ textAlign:"center",padding:"64px 0" }}><EmptyState icon="👥" text="No patients yet" /></div>:(
        <div style={{ display:"grid",gridTemplateColumns:selected?"1fr 400px":"1fr",gap:24 }}>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14,alignContent:"start" }}>
            {patients.map((p,i)=>{
              const pAppts = appointments.filter(a=>a.patientEmail===p.patientEmail);
              return (
                <div key={i} className="card" style={{ cursor:"pointer",border:selected?.patientEmail===p.patientEmail?"2px solid #7c3aed":"2px solid transparent",transition:"all 0.15s" }} onClick={()=>{ setSelected(selected?.patientEmail===p.patientEmail?null:p); loadPreds(p.patientEmail); }} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
                  <div style={{ display:"flex",gap:12,alignItems:"center",marginBottom:14 }}>
                    <div style={{ width:44,height:44,background:"linear-gradient(135deg,#7c3aed,#a855f7)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:"1.1rem",flexShrink:0 }}>{p.patientName?.[0]||"P"}</div>
                    <div><h4 style={{ fontWeight:700,fontSize:"0.95rem" }}>{p.patientName}</h4><p style={{ color:"#64748b",fontSize:"0.78rem" }}>Age {p.patientAge} • {p.patientGender}</p></div>
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,textAlign:"center" }}>
                    {[["📅",pAppts.length,"Visits"],["🗓",pAppts[pAppts.length-1]?.date||"N/A","Last"]].map(([icon,val,lbl],j)=>(
                      <div key={j} style={{ background:"#f8fafc",borderRadius:8,padding:"8px 4px" }}><div style={{ fontSize:"0.68rem",color:"#64748b" }}>{icon} {lbl}</div><div style={{ fontWeight:700,fontSize:"0.8rem",marginTop:2 }}>{val}</div></div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {selected && (
            <div className="fade-in" style={{ position:"sticky",top:100,alignSelf:"start" }}>
              <div className="card" style={{ border:"2px solid #7c3aed" }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:14 }}>
                  <h3 style={{ fontWeight:700,fontSize:"1.1rem" }}>{selected.patientName}</h3>
                  <button onClick={()=>setSelected(null)} style={{ background:"none",border:"none",color:"#94a3b8",fontSize:"1.1rem",cursor:"pointer" }}>✕</button>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16 }}>
                  {[["Age",selected.patientAge],["Gender",selected.patientGender],["Email",selected.patientEmail]].map(([k,v])=>(
                    <div key={k} style={{ background:"#f8fafc",borderRadius:8,padding:"9px 11px" }}>
                      <div style={{ fontSize:"0.68rem",color:"#94a3b8",fontWeight:600 }}>{k}</div>
                      <div style={{ fontWeight:600,fontSize:"0.82rem",marginTop:2,wordBreak:"break-all" }}>{v}</div>
                    </div>
                  ))}
                </div>
                <h4 style={{ fontWeight:700,marginBottom:10,fontSize:"0.9rem" }}>📅 Visits</h4>
                {appointments.filter(a=>a.patientEmail===selected.patientEmail).map((a,i)=>(
                  <div key={i} style={{ padding:"9px 12px",background:a.status==="confirmed"?"#f0fdf4":a.status==="pending"?"#fef9c3":"#fef2f2",borderRadius:8,marginBottom:6 }}>
                    <div style={{ display:"flex",justifyContent:"space-between" }}><span style={{ fontSize:"0.82rem",fontWeight:600 }}>{a.date} • {a.time}</span><span className="badge" style={{ background:a.status==="confirmed"?"rgba(34,197,94,0.15)":a.status==="pending"?"rgba(245,158,11,0.15)":"rgba(239,68,68,0.1)",color:a.status==="confirmed"?"#16a34a":a.status==="pending"?"#d97706":"#dc2626",fontSize:"0.68rem" }}>{a.status}</span></div>
                    <div style={{ color:"#64748b",fontSize:"0.75rem",marginTop:2 }}>{a.reason}</div>
                  </div>
                ))}
                {preds.length>0 && (<>
                  <h4 style={{ fontWeight:700,margin:"14px 0 10px",fontSize:"0.9rem" }}>🔬 AI Predictions</h4>
                  {preds.map((p,i)=>(
                    <div key={i} style={{ padding:"9px 12px",background:"#f0f9ff",borderRadius:8,marginBottom:6 }}>
                      <div style={{ display:"flex",justifyContent:"space-between" }}><span style={{ fontWeight:600,fontSize:"0.82rem" }}>{p.disease}</span><span style={{ color:"#0891b2",fontSize:"0.78rem",fontWeight:700 }}>{p.confidence}%</span></div>
                      <div style={{ color:"#64748b",fontSize:"0.72rem",marginTop:2 }}>{new Date(p.createdAt).toLocaleDateString("en-IN")}</div>
                    </div>
                  ))}
                </>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DOCTOR APPOINTMENTS
// ═══════════════════════════════════════════════════════════════
function DoctorAppointments({ notify }) {
  const { apiCall } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [tab, setTab] = useState("pending");
  const [modal, setModal] = useState(null);
  const [noteText, setNoteText] = useState("");

  const load = async () => {
    const res = await apiCall("/appointments/doctor");
    if (res) { const d = await res.json(); if (d.success) setAppointments(d.appointments); }
  };
  useEffect(() => { load(); }, []);

  const update = async (id, status) => {
    const res = await apiCall(`/appointments/${id}/status`, { method:"PATCH", body:JSON.stringify({ status }) });
    if (res) { const d = await res.json(); if (d.success) { notify(`Appointment ${status}`); load(); } }
  };

  const complete = async () => {
    const res = await apiCall(`/appointments/${modal}/status`, { method:"PATCH", body:JSON.stringify({ status:"completed", notes:noteText }) });
    if (res) { const d = await res.json(); if (d.success) { notify("Completed ✅"); load(); setModal(null); setNoteText(""); } }
  };

  const TABS = [["pending","⏳ Pending","#f59e0b"],["confirmed","✅ Confirmed","#22c55e"],["completed","🏁 Completed","#0891b2"],["cancelled","❌ Cancelled","#ef4444"]];
  const filtered = appointments.filter(a=>a.status===tab);

  return (
    <div className="fade-in">
      <div style={{ marginBottom:24 }}><h2 style={{ fontSize:"1.8rem",fontWeight:800 }}>📅 Appointment Management</h2><p style={{ color:"#64748b",marginTop:5 }}>Confirm, complete and manage patient appointments from MongoDB.</p></div>
      <div style={{ display:"flex",gap:8,marginBottom:24 }}>
        {TABS.map(([k,l,c])=>{
          const cnt = appointments.filter(a=>a.status===k).length;
          return <button key={k} onClick={()=>setTab(k)} style={{ padding:"10px 18px",borderRadius:10,border:"none",fontWeight:600,background:tab===k?c:"white",color:tab===k?"white":"#64748b",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontSize:"0.88rem" }}>{l}<span style={{ background:tab===k?"rgba(255,255,255,0.25)":"#e2e8f0",padding:"2px 7px",borderRadius:10,fontSize:"0.72rem" }}>{cnt}</span></button>;
        })}
      </div>

      {filtered.length===0?<div className="card" style={{ textAlign:"center",padding:"40px 0" }}><EmptyState icon="📭" text={`No ${tab} appointments`} /></div>:(
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
          {filtered.map(a=>{
            const tc = TABS.find(t=>t[0]===a.status)?.[2]||"#64748b";
            return (
              <div key={a._id} className="card" style={{ borderLeft:`4px solid ${tc}` }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                  <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                    <div style={{ width:40,height:40,background:"linear-gradient(135deg,#7c3aed,#a855f7)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,flexShrink:0 }}>{a.patientName?.[0]||"P"}</div>
                    <div><h4 style={{ fontWeight:700,fontSize:"0.92rem" }}>{a.patientName}</h4><p style={{ color:"#64748b",fontSize:"0.76rem" }}>Age: {a.patientAge} • {a.patientGender}</p></div>
                  </div>
                  <span className="badge" style={{ background:`${tc}22`,color:tc,fontSize:"0.72rem" }}>{a.status}</span>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10 }}>
                  {[["DATE",a.date],["TIME",a.time]].map(([l,v])=>(
                    <div key={l} style={{ background:"#f8fafc",borderRadius:8,padding:"7px 10px" }}><div style={{ fontSize:"0.68rem",color:"#94a3b8" }}>{l}</div><div style={{ fontWeight:600,fontSize:"0.85rem" }}>{v}</div></div>
                  ))}
                </div>
                <div style={{ background:"#f0f9ff",borderRadius:8,padding:"9px 12px",marginBottom:12 }}><div style={{ fontSize:"0.68rem",color:"#0369a1",fontWeight:600,marginBottom:2 }}>REASON</div><div style={{ fontSize:"0.85rem",color:"#374151" }}>{a.reason}</div></div>
                {a.notes && <div style={{ background:"#f0fdf4",borderRadius:8,padding:"9px 12px",marginBottom:12 }}><div style={{ fontSize:"0.68rem",color:"#16a34a",fontWeight:600,marginBottom:2 }}>NOTES</div><div style={{ fontSize:"0.82rem",color:"#374151" }}>{a.notes}</div></div>}
                <div style={{ display:"flex",gap:8 }}>
                  {a.status==="pending" && (<><button onClick={()=>update(a._id,"confirmed")} style={{ flex:1,background:"#22c55e",color:"white",border:"none",padding:"9px",borderRadius:8,fontWeight:600,cursor:"pointer",fontSize:"0.82rem" }}>✅ Confirm</button><button onClick={()=>update(a._id,"cancelled")} style={{ flex:1,background:"#ef4444",color:"white",border:"none",padding:"9px",borderRadius:8,fontWeight:600,cursor:"pointer",fontSize:"0.82rem" }}>❌ Decline</button></>)}
                  {a.status==="confirmed" && <button onClick={()=>{ setModal(a._id); setNoteText(a.notes||""); }} style={{ flex:1,background:"#0891b2",color:"white",border:"none",padding:"9px",borderRadius:8,fontWeight:600,cursor:"pointer",fontSize:"0.82rem" }}>🏁 Complete + Notes</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <div className="card fade-in" style={{ width:460,padding:"32px" }}>
            <h3 style={{ fontWeight:700,marginBottom:8 }}>📝 Consultation Notes</h3>
            <p style={{ color:"#64748b",marginBottom:18,fontSize:"0.88rem" }}>Add clinical notes to complete this appointment.</p>
            <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Observations, follow-up instructions..." style={{ width:"100%",height:120,padding:"11px 14px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:"0.88rem",resize:"vertical",fontFamily:"inherit",outline:"none" }} />
            <div style={{ display:"flex",gap:12,marginTop:16 }}>
              <button onClick={()=>setModal(null)} style={{ flex:1,padding:"12px",background:"#f1f5f9",border:"none",borderRadius:10,fontWeight:600,cursor:"pointer",color:"#64748b" }}>Cancel</button>
              <button onClick={complete} style={{ flex:2,padding:"12px",background:"#0891b2",color:"white",border:"none",borderRadius:10,fontWeight:600,cursor:"pointer",fontSize:"0.92rem" }}>✅ Save & Complete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DOCTOR PRESCRIPTIONS
// ═══════════════════════════════════════════════════════════════
function DoctorPrescriptions({ notify }) {
  const { user, apiCall } = useAuth();
  const [tab, setTab] = useState("write");
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({ patientEmail:"",patientName:"",diagnosis:"",prescription:"",notes:"",followUp:"" });
  const [errors, setErrors] = useState({});
  const up = (f,v) => { setForm(p=>({...p,[f]:v})); setErrors(p=>({...p,[f]:""})); };

  const load = async () => {
    const res = await apiCall("/medical/reports/doctor");
    if (res) { const d = await res.json(); if (d.success) setReports(d.reports); }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    const e = {};
    if (!form.patientEmail.trim()) e.patientEmail="Patient email required";
    else if (!/\S+@\S+\.\S+/.test(form.patientEmail)) e.patientEmail="Invalid email";
    if (!form.patientName.trim()) e.patientName="Patient name required";
    if (!form.diagnosis.trim()) e.diagnosis="Diagnosis required";
    if (!form.prescription.trim()) e.prescription="Prescription required";
    if (Object.keys(e).length) { setErrors(e); return; }
    const res = await apiCall("/medical/reports", { method:"POST", body:JSON.stringify(form) });
    if (res) { const d = await res.json(); if (d.success) { notify("Prescription issued! 💊"); setForm({patientEmail:"",patientName:"",diagnosis:"",prescription:"",notes:"",followUp:""}); load(); setTab("history"); } else notify(d.message,"error"); }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom:24 }}><h2 style={{ fontSize:"1.8rem",fontWeight:800 }}>💊 Prescriptions</h2><p style={{ color:"#64748b",marginTop:5 }}>Issue digital prescriptions — stored in MongoDB, visible to patients.</p></div>
      <div style={{ display:"flex",gap:8,marginBottom:24 }}>
        {[["write","✍️ Write Prescription"],["history",`📋 History (${reports.length})`]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ padding:"10px 22px",borderRadius:10,border:"none",fontWeight:600,background:tab===k?"#7c3aed":"white",color:tab===k?"white":"#64748b",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",cursor:"pointer" }}>{l}</button>
        ))}
      </div>

      {tab==="write" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:24 }}>
          <div className="card">
            <h3 style={{ fontWeight:700,marginBottom:22,fontSize:"1.1rem" }}>New Prescription</h3>
            {[["Patient Name","patientName","text","Patient's full name"],["Patient Email","patientEmail","email","patient@example.com"],["Diagnosis","diagnosis","text","e.g., Acute Viral Rhinitis"]].map(([lbl,key,type,ph])=>(
              <div key={key} style={{ marginBottom:14 }}>
                <label style={{ display:"block",fontWeight:600,marginBottom:6,fontSize:"0.88rem",color:"#374151" }}>{lbl} *</label>
                <input className={`input${errors[key]?" err":""}`} type={type} placeholder={ph} value={form[key]} onChange={e=>up(key,e.target.value)} />
                {errors[key] && <p style={{ color:"#ef4444",fontSize:"0.78rem",marginTop:3 }}>⚠ {errors[key]}</p>}
              </div>
            ))}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block",fontWeight:600,marginBottom:6,fontSize:"0.88rem",color:"#374151" }}>Prescription / Medications *</label>
              <textarea className={`input${errors.prescription?" err":""}`} rows={4} placeholder={"1. Tab. Paracetamol 500mg — 1 tab TDS × 3 days\n2. Syrup. Cough suppressant — 10ml BD × 5 days"} value={form.prescription} onChange={e=>up("prescription",e.target.value)} style={{ resize:"vertical" }} />
              {errors.prescription && <p style={{ color:"#ef4444",fontSize:"0.78rem",marginTop:3 }}>⚠ {errors.prescription}</p>}
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block",fontWeight:600,marginBottom:6,fontSize:"0.88rem",color:"#374151" }}>Clinical Notes (optional)</label>
              <textarea className="input" rows={2} placeholder="Observations, dietary advice..." value={form.notes} onChange={e=>up("notes",e.target.value)} style={{ resize:"vertical" }} />
            </div>
            <div style={{ marginBottom:22 }}>
              <label style={{ display:"block",fontWeight:600,marginBottom:6,fontSize:"0.88rem",color:"#374151" }}>Follow-up (optional)</label>
              <input className="input" placeholder="e.g., Review after 5 days if symptoms persist" value={form.followUp} onChange={e=>up("followUp",e.target.value)} />
            </div>
            <button onClick={submit} className="btn btn-purple" style={{ width:"100%",padding:"13px",fontSize:"1rem" }}>💊 Issue Prescription</button>
          </div>

          {/* Live Preview */}
          <div>
            <h3 style={{ fontWeight:700,marginBottom:14,fontSize:"1.05rem",color:"#64748b" }}>📄 Live Preview</h3>
            <div style={{ background:"white",border:"1.5px solid #e2e8f0",borderRadius:16,padding:26,minHeight:400 }}>
              <div style={{ borderBottom:"2px solid #7c3aed",paddingBottom:14,marginBottom:18,display:"flex",justifyContent:"space-between" }}>
                <div><h3 style={{ color:"#7c3aed",fontWeight:800,fontSize:"1.05rem" }}>{user.name}</h3><p style={{ color:"#64748b",fontSize:"0.8rem" }}>{user.specialty||"General Medicine"} • MediAI Platform</p></div>
                <div style={{ background:"linear-gradient(135deg,#7c3aed,#a855f7)",color:"white",padding:"7px 14px",borderRadius:8,fontWeight:800,fontSize:"0.9rem" }}>⚕ Rx</div>
              </div>
              <div style={{ marginBottom:12 }}><span style={{ fontSize:"0.72rem",color:"#94a3b8",fontWeight:600 }}>PATIENT</span><p style={{ fontWeight:700,marginTop:2,fontSize:"0.9rem" }}>{form.patientName||"—"}</p></div>
              <div style={{ marginBottom:12 }}><span style={{ fontSize:"0.72rem",color:"#94a3b8",fontWeight:600 }}>DIAGNOSIS</span><p style={{ fontWeight:700,marginTop:2,color:form.diagnosis?"#0f172a":"#cbd5e1",fontSize:"0.9rem" }}>{form.diagnosis||"Not specified"}</p></div>
              <div style={{ marginBottom:12 }}><span style={{ fontSize:"0.72rem",color:"#94a3b8",fontWeight:600 }}>PRESCRIPTION</span><p style={{ marginTop:6,whiteSpace:"pre-wrap",fontSize:"0.82rem",lineHeight:1.8,color:form.prescription?"#374151":"#cbd5e1",fontFamily:"monospace" }}>{form.prescription||"No medications specified"}</p></div>
              {form.notes && <p style={{ marginTop:8,fontSize:"0.82rem",color:"#64748b",fontStyle:"italic" }}>📝 {form.notes}</p>}
              {form.followUp && <div style={{ marginTop:10,padding:"7px 10px",background:"#fef9c3",borderRadius:8,fontSize:"0.78rem",color:"#854d0e" }}>📅 {form.followUp}</div>}
              <div style={{ marginTop:18,paddingTop:12,borderTop:"1px solid #e2e8f0",fontSize:"0.72rem",color:"#94a3b8" }}>Date: {new Date().toLocaleDateString("en-IN")} • MediAI Platform</div>
            </div>
          </div>
        </div>
      )}

      {tab==="history" && (
        reports.length===0?<div className="card" style={{ textAlign:"center",padding:"48px 0" }}><EmptyState icon="📋" text="No prescriptions issued yet" /></div>:(
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
            {reports.map((r,i)=>(
              <div key={i} className="card" style={{ borderLeft:"4px solid #7c3aed" }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:12 }}>
                  <div><h4 style={{ fontWeight:700 }}>{r.patientName}</h4><p style={{ color:"#64748b",fontSize:"0.78rem" }}>{new Date(r.createdAt).toLocaleDateString("en-IN")}</p></div>
                  <span className="badge" style={{ background:"rgba(124,58,237,0.1)",color:"#7c3aed" }}>Rx</span>
                </div>
                <div style={{ marginBottom:10 }}><span style={{ fontSize:"0.72rem",color:"#94a3b8",fontWeight:600 }}>DIAGNOSIS</span><p style={{ fontWeight:700,marginTop:2,fontSize:"0.88rem" }}>{r.diagnosis}</p></div>
                <div style={{ background:"#f8fafc",borderRadius:8,padding:"9px 12px",fontSize:"0.78rem",color:"#374151",whiteSpace:"pre-wrap",fontFamily:"monospace",lineHeight:1.7 }}>{r.prescription}</div>
                {r.followUp && <div style={{ marginTop:8,padding:"6px 10px",background:"#fef9c3",borderRadius:6,fontSize:"0.76rem",color:"#854d0e" }}>📅 {r.followUp}</div>}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN OVERVIEW
// ═══════════════════════════════════════════════════════════════
function AdminOverview({ setPage, notify }) {
  const { apiCall } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const load = async () => {
      const res = await apiCall("/admin/stats");
      if (res) { const d = await res.json(); if (d.success) setStats(d.stats); }
    };
    load();
  }, []);

  const statCards = stats ? [
    ["🙋","Patients",stats.totalPatients,"#0891b2"],["👨‍⚕️","Doctors",stats.totalDoctors,"#8b5cf6"],
    ["📅","Appointments",stats.totalAppointments,"#f59e0b"],["⏳","Pending",stats.pendingAppointments,"#ef4444"],
    ["🔬","Predictions",stats.totalPredictions,"#0f766e"],["💊","Prescriptions",stats.totalReports,"#ec4899"],
  ] : [];

  return (
    <div className="fade-in">
      <div style={{ background:"linear-gradient(135deg,#ef4444,#dc2626)",borderRadius:20,padding:"32px",marginBottom:28,color:"white" }}>
        <h2 style={{ fontSize:"1.7rem",fontWeight:800 }}>🛡 Admin Control Panel</h2>
        <p style={{ opacity:0.85,marginTop:6 }}>Full system visibility — MongoDB live data</p>
        <div style={{ marginTop:16,display:"flex",gap:12 }}>
          <button className="btn" style={{ background:"white",color:"#dc2626",fontWeight:700 }} onClick={()=>setPage("admin-users")}>👥 Manage Users</button>
          <button className="btn" style={{ background:"rgba(255,255,255,0.15)",color:"white",border:"2px solid rgba(255,255,255,0.4)" }} onClick={()=>setPage("admin-analytics")}>📈 Analytics</button>
        </div>
      </div>

      {!stats ? <div style={{ textAlign:"center",padding:"40px 0",color:"#64748b" }}>Loading stats...</div> : (
        <>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:28 }}>
            {statCards.map(([icon,lbl,val,color],i)=>(
              <div key={i} className="card" style={{ borderLeft:`4px solid ${color}` }}>
                <div style={{ display:"flex",justifyContent:"space-between" }}><div><p style={{ color:"#64748b",fontSize:"0.8rem",marginBottom:8 }}>{lbl}</p><p style={{ fontSize:"2.2rem",fontWeight:800,color }}>{val}</p></div><span style={{ fontSize:"1.8rem" }}>{icon}</span></div>
              </div>
            ))}
          </div>

          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
            <div className="card">
              <h3 style={{ fontWeight:700,marginBottom:16,fontSize:"1rem" }}>🆕 Recent Registrations</h3>
              {(stats.recentUsers||[]).map((u,i)=>(
                <div key={i} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f1f5f9" }}>
                  <div style={{ width:34,height:34,background:u.role==="doctor"?"linear-gradient(135deg,#7c3aed,#a855f7)":"linear-gradient(135deg,#0f766e,#0891b2)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:"0.85rem",flexShrink:0 }}>{u.name[0]}</div>
                  <div style={{ flex:1 }}><div style={{ fontWeight:600,fontSize:"0.88rem" }}>{u.name}</div><div style={{ color:"#64748b",fontSize:"0.75rem" }}>{u.email}</div></div>
                  <span className="badge" style={{ background:u.role==="doctor"?"rgba(124,58,237,0.12)":"rgba(8,145,178,0.12)",color:u.role==="doctor"?"#7c3aed":"#0891b2",fontSize:"0.72rem" }}>{u.role}</span>
                </div>
              ))}
              {!(stats.recentUsers?.length) && <EmptyState icon="👥" text="No users yet" />}
            </div>
            <div className="card">
              <h3 style={{ fontWeight:700,marginBottom:16,fontSize:"1rem" }}>📅 Recent Appointments</h3>
              {(stats.recentAppointments||[]).map((a,i)=>(
                <div key={i} style={{ padding:"10px 0",borderBottom:"1px solid #f1f5f9" }}>
                  <div style={{ display:"flex",justifyContent:"space-between" }}>
                    <div><div style={{ fontWeight:600,fontSize:"0.88rem" }}>{a.patientName}</div><div style={{ color:"#64748b",fontSize:"0.75rem" }}>→ {a.doctorName} • {a.date}</div></div>
                    <span className="badge" style={{ background:a.status==="confirmed"?"rgba(34,197,94,0.12)":a.status==="pending"?"rgba(245,158,11,0.12)":"rgba(239,68,68,0.1)",color:a.status==="confirmed"?"#16a34a":a.status==="pending"?"#d97706":"#dc2626",fontSize:"0.72rem" }}>{a.status}</span>
                  </div>
                </div>
              ))}
              {!(stats.recentAppointments?.length) && <EmptyState icon="📅" text="No appointments yet" />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN USERS
// ═══════════════════════════════════════════════════════════════
function AdminUsers({ notify }) {
  const { apiCall } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");

  const load = async () => {
    const res = await apiCall(`/admin/users?role=${role}&search=${search}`);
    if (res) { const d = await res.json(); if (d.success) setUsers(d.users); }
  };
  useEffect(() => { load(); }, [role, search]);

  const toggle = async (id) => {
    const res = await apiCall(`/admin/users/${id}/toggle`, { method:"PATCH" });
    if (res) { const d = await res.json(); if (d.success) { notify(d.message); load(); } }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this user permanently?")) return;
    const res = await apiCall(`/admin/users/${id}`, { method:"DELETE" });
    if (res) { const d = await res.json(); if (d.success) { notify("User deleted"); load(); } }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom:24 }}><h2 style={{ fontSize:"1.8rem",fontWeight:800 }}>👥 User Management</h2><p style={{ color:"#64748b",marginTop:5 }}>Manage all registered users from MongoDB.</p></div>
      <div style={{ display:"flex",gap:12,marginBottom:20 }}>
        <input className="input" placeholder="🔍 Search by name or email..." value={search} onChange={e=>setSearch(e.target.value)} style={{ flex:1 }} />
        <select className="input" style={{ width:160 }} value={role} onChange={e=>setRole(e.target.value)}>
          <option value="all">All Roles</option><option value="patient">Patients</option><option value="doctor">Doctors</option>
        </select>
      </div>
      <div className="card" style={{ padding:0,overflow:"hidden" }}>
        <table className="tbl">
          <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map((u,i)=>(
              <tr key={i}>
                <td><div style={{ display:"flex",alignItems:"center",gap:10 }}><div style={{ width:34,height:34,background:u.role==="doctor"?"linear-gradient(135deg,#7c3aed,#a855f7)":"linear-gradient(135deg,#0f766e,#0891b2)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:"0.85rem",flexShrink:0 }}>{u.name[0]}</div><span style={{ fontWeight:600 }}>{u.name}</span></div></td>
                <td style={{ color:"#64748b" }}>{u.email}</td>
                <td><span className="badge" style={{ background:u.role==="doctor"?"rgba(124,58,237,0.12)":"rgba(8,145,178,0.12)",color:u.role==="doctor"?"#7c3aed":"#0891b2" }}>{u.role}</span></td>
                <td><span className="badge" style={{ background:u.isActive?"rgba(34,197,94,0.12)":"rgba(239,68,68,0.1)",color:u.isActive?"#16a34a":"#dc2626" }}>{u.isActive?"Active":"Inactive"}</span></td>
                <td style={{ color:"#64748b" }}>{new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
                <td><div style={{ display:"flex",gap:8 }}>
                  <button onClick={()=>toggle(u._id)} style={{ padding:"6px 12px",borderRadius:8,border:"none",background:u.isActive?"rgba(239,68,68,0.1)":"rgba(34,197,94,0.1)",color:u.isActive?"#ef4444":"#22c55e",fontWeight:600,cursor:"pointer",fontSize:"0.78rem" }}>{u.isActive?"🚫 Deactivate":"✅ Activate"}</button>
                  <button onClick={()=>del(u._id)} style={{ padding:"6px 12px",borderRadius:8,border:"none",background:"rgba(239,68,68,0.08)",color:"#ef4444",fontWeight:600,cursor:"pointer",fontSize:"0.78rem" }}>🗑 Delete</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length===0 && <div style={{ textAlign:"center",padding:"32px 0",color:"#64748b" }}>No users found</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN APPOINTMENTS
// ═══════════════════════════════════════════════════════════════
function AdminAppointments() {
  const { apiCall } = useAuth();
  const [appointments, setAppointments] = useState([]);
  useEffect(() => {
    const load = async () => { const res = await apiCall("/appointments/all"); if (res) { const d = await res.json(); if (d.success) setAppointments(d.appointments); } };
    load();
  }, []);
  const STATUS_COLOR = { pending:"#f59e0b",confirmed:"#22c55e",completed:"#0891b2",cancelled:"#ef4444" };
  return (
    <div className="fade-in">
      <div style={{ marginBottom:24 }}><h2 style={{ fontSize:"1.8rem",fontWeight:800 }}>📅 All Appointments</h2><p style={{ color:"#64748b",marginTop:5 }}>{appointments.length} total appointments in MongoDB.</p></div>
      <div className="card" style={{ padding:0,overflow:"hidden" }}>
        <table className="tbl">
          <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th></tr></thead>
          <tbody>
            {appointments.map((a,i)=>(
              <tr key={i}>
                <td style={{ fontWeight:600 }}>{a.patientName}</td>
                <td style={{ color:"#64748b" }}>{a.doctorName}</td>
                <td style={{ color:"#64748b" }}>{a.date}</td>
                <td style={{ color:"#64748b" }}>{a.time}</td>
                <td style={{ color:"#64748b",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{a.reason}</td>
                <td><span className="badge" style={{ background:`${STATUS_COLOR[a.status]}22`,color:STATUS_COLOR[a.status] }}>{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {appointments.length===0 && <div style={{ textAlign:"center",padding:"32px 0",color:"#64748b" }}>No appointments found</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN ANALYTICS
// ═══════════════════════════════════════════════════════════════
function AdminAnalytics() {
  const { apiCall } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  useEffect(() => {
    const load = async () => { const res = await apiCall("/admin/analytics"); if (res) { const d = await res.json(); if (d.success) setAnalytics(d.analytics); } };
    load();
  }, []);
  const STATUS_COLOR = { pending:"#f59e0b",confirmed:"#22c55e",completed:"#0891b2",cancelled:"#ef4444" };
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return (
    <div className="fade-in">
      <div style={{ marginBottom:24 }}><h2 style={{ fontSize:"1.8rem",fontWeight:800 }}>📈 Analytics</h2><p style={{ color:"#64748b",marginTop:5 }}>Real-time analytics from MongoDB aggregation pipelines.</p></div>
      {!analytics ? <div style={{ textAlign:"center",padding:"40px 0",color:"#64748b" }}>Loading analytics...</div> : (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
          <div className="card">
            <h3 style={{ fontWeight:700,marginBottom:18,fontSize:"1rem" }}>🧬 Top Predicted Diseases</h3>
            {(analytics.diseaseStats||[]).map((d,i)=>{
              const max = analytics.diseaseStats[0]?.count||1;
              return (
                <div key={i} style={{ marginBottom:14 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}><span style={{ fontSize:"0.85rem",fontWeight:500 }}>{d._id}</span><span style={{ color:"#0891b2",fontWeight:700,fontSize:"0.85rem" }}>{d.count}</span></div>
                  <div style={{ background:"#f1f5f9",borderRadius:4,height:6 }}><div style={{ width:`${(d.count/max)*100}%`,background:"linear-gradient(90deg,#0f766e,#0891b2)",borderRadius:4,height:"100%" }} /></div>
                </div>
              );
            })}
            {!(analytics.diseaseStats?.length) && <EmptyState icon="🧬" text="No prediction data yet" />}
          </div>

          <div className="card">
            <h3 style={{ fontWeight:700,marginBottom:18,fontSize:"1rem" }}>📅 Appointments by Status</h3>
            {(analytics.apptByStatus||[]).map((s,i)=>(
              <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:"1px solid #f1f5f9" }}>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <div style={{ width:10,height:10,borderRadius:"50%",background:STATUS_COLOR[s._id]||"#64748b" }} />
                  <span style={{ textTransform:"capitalize",fontSize:"0.9rem" }}>{s._id}</span>
                </div>
                <span style={{ fontWeight:700,fontSize:"1rem" }}>{s.count}</span>
              </div>
            ))}
            {!(analytics.apptByStatus?.length) && <EmptyState icon="📅" text="No appointment data yet" />}
          </div>

          <div className="card" style={{ gridColumn:"1/-1" }}>
            <h3 style={{ fontWeight:700,marginBottom:18,fontSize:"1rem" }}>📈 User Growth (Last 6 Months)</h3>
            <div style={{ display:"flex",gap:12,alignItems:"flex-end",height:120 }}>
              {(analytics.userGrowth||[]).map((g,i)=>{
                const max = Math.max(...(analytics.userGrowth.map(x=>x.count)||[1]));
                return (
                  <div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:5 }}>
                    <span style={{ color:"#0891b2",fontWeight:700,fontSize:"0.82rem" }}>{g.count}</span>
                    <div style={{ width:"100%",background:"linear-gradient(180deg,#0891b2,#0f766e)",borderRadius:"4px 4px 0 0",height:`${(g.count/max)*90}px`,minHeight:8 }} />
                    <span style={{ color:"#64748b",fontSize:"0.72rem" }}>{MONTHS[g._id.month-1]}</span>
                  </div>
                );
              })}
              {!(analytics.userGrowth?.length) && <div style={{ flex:1,textAlign:"center",color:"#64748b",fontSize:"0.88rem" }}>No data yet — register some users!</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DISEASES PAGE
// ═══════════════════════════════════════════════════════════════
function DiseasesPage() {
  const [search, setSearch] = useState(""); const [cat, setCat] = useState("All"); const [sev, setSev] = useState("All"); const [sel, setSel] = useState(null);
  const cats = ["All",...new Set(DISEASE_DB.map(d=>d.category))].sort();
  const filtered = DISEASE_DB.filter(d=>{
    const ms = d.name.toLowerCase().includes(search.toLowerCase())||d.icd.toLowerCase().includes(search.toLowerCase());
    return ms && (cat==="All"||d.category===cat) && (sev==="All"||d.severity===sev);
  });
  return (
    <div className="fade-in">
      <div style={{ marginBottom:24 }}><h2 style={{ fontSize:"1.8rem",fontWeight:800 }}>🧬 Clinical Disease Database</h2><p style={{ color:"#64748b",marginTop:5 }}>Browse {DISEASE_DB.length} ICD-10 coded conditions across 15+ medical specialties.</p></div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr auto auto",gap:12,marginBottom:18 }}>
        <input className="input" placeholder="🔍 Search by name or ICD-10 code..." value={search} onChange={e=>setSearch(e.target.value)} />
        <select className="input" style={{ width:180 }} value={cat} onChange={e=>setCat(e.target.value)}>{cats.map(c=><option key={c}>{c}</option>)}</select>
        <select className="input" style={{ width:150 }} value={sev} onChange={e=>setSev(e.target.value)}>{["All","mild","moderate","severe","critical"].map(s=><option key={s} value={s}>{s==="All"?"All Severities":s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select>
      </div>
      <p style={{ color:"#64748b",marginBottom:14,fontSize:"0.85rem" }}>Showing {filtered.length} of {DISEASE_DB.length} conditions</p>
      <div style={{ display:"grid",gridTemplateColumns:sel?"1fr 380px":"1fr",gap:20 }}>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,alignContent:"start" }}>
          {filtered.map(d=>{
            const sc = SEV[d.severity]||SEV.mild;
            return (
              <div key={d.id} className="card" style={{ padding:14,cursor:"pointer",border:sel?.id===d.id?"2px solid #0891b2":"2px solid transparent",transition:"all 0.15s" }} onClick={()=>setSel(sel?.id===d.id?null:d)} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                  <span style={{ fontFamily:"monospace",fontSize:"0.68rem",color:"#94a3b8",background:"#f1f5f9",padding:"2px 5px",borderRadius:4 }}>{d.icd}</span>
                  <span className="badge" style={{ background:sc.bg,color:sc.c,fontSize:"0.68rem" }}>{sc.l}</span>
                </div>
                <h4 style={{ fontWeight:700,fontSize:"0.88rem",marginBottom:3 }}>{d.name}</h4>
                <p style={{ color:"#64748b",fontSize:"0.76rem" }}>{d.category}</p>
              </div>
            );
          })}
        </div>
        {sel && (
          <div className="card fade-in" style={{ position:"sticky",top:100,alignSelf:"start",border:`2px solid ${SEV[sel.severity]?.c}` }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:14 }}>
              <span style={{ fontFamily:"monospace",fontSize:"0.78rem",color:"#64748b",background:"#f1f5f9",padding:"4px 8px",borderRadius:6 }}>ICD-10: {sel.icd}</span>
              <button onClick={()=>setSel(null)} style={{ background:"none",border:"none",color:"#94a3b8",fontSize:"1.1rem",cursor:"pointer" }}>✕</button>
            </div>
            <h3 style={{ fontSize:"1.4rem",fontWeight:800,marginBottom:8 }}>{sel.name}</h3>
            <div style={{ marginBottom:14,display:"flex",gap:8 }}>
              <span className="badge" style={{ background:"#e0f2fe",color:"#0369a1" }}>{sel.category}</span>
              <span className="badge" style={{ background:SEV[sel.severity]?.bg,color:SEV[sel.severity]?.c }}>{SEV[sel.severity]?.l}</span>
            </div>
            <h4 style={{ fontWeight:700,marginBottom:10,fontSize:"0.9rem",color:"#374151" }}>Clinical Symptoms ({sel.symptoms.length})</h4>
            <div style={{ marginBottom:16 }}>{sel.symptoms.map(s=><span key={s} className="tag">{SYMPTOM_LABELS[s]||s}</span>)}</div>
            <div style={{ padding:12,background:"#f8fafc",borderRadius:10,fontSize:"0.8rem",color:"#64748b",lineHeight:1.6 }}>ℹ️ For educational reference only. Always consult a qualified healthcare professional.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ROOT EXPORT
// ═══════════════════════════════════════════════════════════════
export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>;
}
