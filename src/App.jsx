import { useState, useRef, useCallback, useEffect, useMemo } from "react";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const ROW_COLORS = ["#00AAEE","#FF8C00","#00CC88","#E05090","#AABB22","#22CCDD","#FF6644","#88BB55","#DD66FF","#44BBFF","#FFAA33","#55DDAA","#FF5577","#77CCFF","#CCDD44"];
function getColor(idx) { return ROW_COLORS[idx % ROW_COLORS.length]; }
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const TASK_NAMES = {1:"Center Racking",2:"Center Racking Arms",3:"Ave D Racking",4:"Ave D Arms",5:"Ave A Racking",6:"Ave A Arms",7:"Upper Containment",8:"Tunnels",9:"Assembling Baffles",10:"Install Baffles",11:"Install Doors",12:"F-Track",13:"Lower Containment Panels"};
const TASK_CATS = {1:"Racking",2:"Racking",3:"Racking",4:"Racking",5:"Racking",6:"Racking",7:"Containment",8:"Containment",9:"Baffles",10:"Baffles",11:"Finishes",12:"Finishes",13:"Containment"};
const DEP_RULES = {1:[],2:[1],3:[1],4:[3],5:[1],6:[5],7:[2],8:[7],9:[],10:[9],11:[1],12:[10],13:[10,12]};

const PHASE_DATA = {
  2:[[8,2,3,5,"83%"],[9,1,2,4,null],[10,2,2,4,null],[11,2,2,4,"80%"],[12,2,1,2,null],[13,2,2,4,"94%"]],
  3:[[9,1,1,3,"70%"],[10,1,1,3,"72%"],[11,2,1,3,"40%"],[12,2,1,3,"70%"],[13,2,1,3,"72%"]],
  4:[[1,4,3,5,"90%"],[2,2,3,5,null],[3,3,3,5,"90%"],[4,2,2,4,null],[5,3,3,5,"90%"],[6,2,1,3,"80%"],[7,5,4,6,"40%"],[8,2,2,5,"40%"],[9,3,3,4,null],[10,1,2,3,null],[11,2,2,5,null],[12,2,2,3,null],[13,2,1,2,null]],
  5:[[1,4,2,4,null],[2,2,2,4,null],[3,4,2,4,null],[4,2,2,4,null],[5,2,2,4,null],[6,2,1,3,null],[7,5,4,6,null],[8,2,3,5,null],[9,1,2,4,null],[10,2,1,3,null],[11,2,1,4,null],[12,2,1,2,null],[13,2,1,2,null]],
  6:[[1,4,3,5,"85%"],[2,2,3,4,"60%"],[3,4,3,5,null],[4,2,2,4,null],[5,4,2,4,null],[6,2,1,3,null],[7,5,4,6,null],[8,2,3,5,"18%"],[9,1,2,4,null],[10,2,1,3,null],[11,2,1,3,null],[12,2,1,3,null],[13,2,1,2,null]],
  7:[[1,4,3,5,null],[2,2,2,4,null],[3,4,3,5,null],[4,2,2,4,null],[5,4,2,4,null],[6,2,1,3,null],[7,5,4,6,null],[8,2,3,5,null],[9,1,2,4,null],[10,2,1,3,null],[11,2,1,4,null],[12,2,1,2,null],[13,2,1,2,null]],
  8:[[1,4,3,5,null],[2,2,3,5,null],[3,4,3,5,null],[4,2,2,4,null],[5,4,2,4,null],[6,2,1,3,null],[7,5,4,6,null],[8,2,3,5,null],[9,1,2,4,null],[10,2,1,3,null],[11,2,1,4,null],[12,2,1,2,null],[13,2,1,2,null]],
  9:[[1,4,2,4,null],[2,2,2,4,null],[3,4,2,4,null],[4,2,2,4,null],[5,4,2,4,null],[6,2,1,3,null],[7,5,4,6,null],[8,2,3,5,null],[9,1,2,4,null],[10,2,1,3,null],[11,2,1,4,null],[12,2,1,2,null],[13,2,1,2,null]],
  10:[[1,4,3,5,null],[2,2,3,5,null],[3,4,2,4,null],[4,2,2,4,null],[5,4,2,4,null],[6,2,1,3,null],[7,5,4,6,null],[8,2,3,5,null],[9,1,2,4,null],[10,2,1,3,null],[11,2,1,4,null],[12,2,1,2,null],[13,2,1,2,null]],
  11:[[1,4,3,5,null],[2,4,3,5,null],[3,4,2,4,null],[4,2,2,4,null],[5,4,2,4,null],[6,3,1,3,null],[7,5,4,6,null],[8,2,3,5,null],[9,2,1,3,null],[10,2,1,3,null],[11,2,1,2,null],[12,2,1,2,null],[13,2,1,2,null]],
  12:[[1,4,3,5,null],[2,2,2,4,null],[3,4,2,4,null],[4,2,2,4,null],[5,4,2,4,null],[6,2,1,3,null],[7,5,4,6,null],[8,2,3,5,null],[9,3,2,4,null],[10,2,1,3,null],[11,2,1,3,null],[12,2,1,2,null],[13,2,1,2,null]],
};

function generateTasks() {
  const tasks = []; let nextId = 1; const idMap = {};
  const todayStr = toDateStr(new Date());
  for (const [ps, rows] of Object.entries(PHASE_DATA)) {
    const ph = parseInt(ps);
    for (const [tPos, crew, intD, extD, status] of rows) {
      const id = nextId++; idMap[`${ph}-${tPos}`] = id;
      const deps = (DEP_RULES[tPos]||[]).map(d => idMap[`${ph}-${d}`]).filter(Boolean);
      if (tPos === 9) { const prev = idMap[`${ph-1}-10`]; if (prev) deps.push(prev); }
      let remExt = extD;
      let remInt = intD;
      if (status) { const ratio = 1 - (parseInt(status)||0) / 100; remExt = Math.max(1, Math.ceil(extD * ratio)); remInt = Math.max(0, Math.ceil(intD * ratio)); }
      tasks.push({ id, name: `Ph${ph} ${TASK_NAMES[tPos]}`, startDate: todayStr, intDuration: remInt, extDuration: remExt, baseCrew: crew, baseDur: remExt, category: TASK_CATS[tPos], crew, deps, status: status||null, fullDuration: extD, fullIntDuration: intD, crewMembers: [], pinned: false, blocked: false, blockedReason: "", lastUpdateDate: todayStr, missedCount: 0 });
    }
  }
  return tasks;
}
const initialTasks = generateTasks();

function toDateStr(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function parseDate(s) { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function isWeekday(d) { const dow = d.getDay(); if (_workWeekends.has(toDateStr(d))) return true; return dow !== 0 && dow !== 6; }
const _workWeekends = new Set(); // module-level set synced from component state
function isNaturalWeekend(d) { const dow = d.getDay(); return dow === 0 || dow === 6; }
function addBizDays(d, n) { const r = new Date(d); let rem = n; while (rem > 0) { r.setDate(r.getDate() + 1); if (isWeekday(r)) rem--; } return r; }
function idxIsWeekday(idx, anchor) { return isWeekday(addDays(anchor, idx)); }
function diffDays(a, b) { return Math.round((b - a) / 86400000); }
function sameDay(a, b) { return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }
function fmtD(s) { const d = parseDate(s); return `${MONTHS_FULL[d.getMonth()].slice(0,3)} ${d.getDate()}`; }
function loadScript(src) { return new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }

function runAutoSchedule(order, map, maxCrew, anchor, phaseWindow) {
  const items = order.map(id => map[id]).filter(Boolean);
  const cap = {}, res = {}, endOf = {};
  const gu = di => cap[di]||0, au = (di,c) => { cap[di]=(cap[di]||0)+c; };
  function getWorkIndices(sd, bizDays) {
    const indices = []; let idx = sd, counted = 0;
    while (counted < bizDays && idx < 1460) { if (idxIsWeekday(idx, anchor)) { indices.push(idx); counted++; } if (counted < bizDays) idx++; }
    return indices;
  }

  // STEP 1: Place pinned tasks first at their fixed positions (skip blocked)
  for (const t of items) {
    if (!t.pinned || t.blocked) continue;
    const sd = diffDays(anchor, parseDate(t.startDate));
    const wi = getWorkIndices(Math.max(0, sd), t.extDuration);
    for (const idx of wi) au(idx, t.crew);
    res[t.id] = { ...t };
    endOf[t.id] = wi.length ? wi[wi.length-1]+1 : sd + 1;
  }

  // STEP 2: Schedule unpinned tasks around pinned ones (skip blocked)
  const phased = items.filter(t => !t.pinned && !t.blocked).map((t,oi) => ({...t, _ph: getPhase(t.name), _oi: oi}));
  phased.sort((a,b) => a._ph - b._ph || a._oi - b._oi);
  const scheduled = new Set();
  const allPhases = [...new Set(phased.map(t => t._ph))].sort((a,b) => a-b);
  for (const minPh of allPhases) {
    const maxPh = minPh + (phaseWindow || 999) - 1;
    for (const t of phased) {
      if (scheduled.has(t.id)) continue;
      if (t._ph < minPh || t._ph > maxPh) continue;
      let earliest = 0;
      if (t.deps?.length) for (const d of t.deps) if (endOf[d] !== undefined && endOf[d] > earliest) earliest = endOf[d];
      while (!idxIsWeekday(earliest, anchor) && earliest < 1460) earliest++;
      let placed = false;
      for (let sd = earliest; sd < 1460; sd++) {
        if (!idxIsWeekday(sd, anchor)) continue;
        const wi = getWorkIndices(sd, t.extDuration);
        if (wi.length < t.extDuration) continue;
        let fits = true;
        for (const idx of wi) if (gu(idx) + t.crew > maxCrew) { fits = false; break; }
        if (fits) { for (const idx of wi) au(idx, t.crew); res[t.id] = { ...t, startDate: toDateStr(addDays(anchor, sd)) }; endOf[t.id] = wi[wi.length-1]+1; placed = true; scheduled.add(t.id); break; }
      }
      if (!placed) { let md = earliest; for (const k of Object.keys(cap)){const ki=parseInt(k);if(ki>=md)md=ki+1;} while(!idxIsWeekday(md,anchor)&&md<1460)md++; const wi=getWorkIndices(md,t.extDuration); for(const idx of wi)au(idx,t.crew); res[t.id]={...t,startDate:toDateStr(addDays(anchor,md))}; endOf[t.id]=wi.length?wi[wi.length-1]+1:md+1; scheduled.add(t.id); }
    }
  }
  // STEP 3: Include blocked tasks at their current position (no capacity impact)
  for (const t of items) { if (t.blocked && !res[t.id]) res[t.id] = { ...t }; }
  return res;
}
function getViolations(tasks, tm) {
  const v = {};
  for (const t of tasks) { if (!t.deps?.length) continue; const tS=parseDate(t.startDate); for (const did of t.deps) { const dep=tm[did]; if(dep&&tS<addBizDays(parseDate(dep.startDate),dep.extDuration)){if(!v[t.id])v[t.id]=[];v[t.id].push({n:dep.name});} } }
  return v;
}
function statusColor(s) { if(!s) return null; const n=parseInt(s); return n>=80?"#7AB648":n>=40?"#F5A623":"#0099D6"; }
function getPhase(name) { const m=name.match(/^Ph(\d+)/); return m?parseInt(m[1]):0; }

function DeleteConfirm({onConfirm,onCancel}) {
  useEffect(()=>{const t=setTimeout(onCancel,3000);return()=>clearTimeout(t);},[onCancel]);
  return (<div style={{display:"flex",alignItems:"center",gap:3}} onClick={e=>e.stopPropagation()}>
    <button onClick={onConfirm} style={{width:22,height:22,borderRadius:4,border:"1px solid #EF444460",background:"#EF444425",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></button>
    <button onClick={onCancel} style={{width:22,height:22,borderRadius:4,border:"1px solid #1E3A5F",background:"#132339",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#5888A8" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
  </div>);
}

export default function BuildingScheduler() {
  const [taskMap,setTaskMap]=useState(()=>{const m={};initialTasks.forEach(t=>{m[t.id]=t});return m});
  const [taskOrder,setTaskOrder]=useState(()=>initialTasks.map(t=>t.id));
  const [nextId,setNextId]=useState(initialTasks.length+1);
  const [maxCrew,setMaxCrew]=useState(17);
  const [phaseWindow,setPhaseWindow]=useState(4);
  const [autoMode,setAutoMode]=useState(false);
  const [showForm,setShowForm]=useState(false);
  const [showSettings,setShowSettings]=useState(false);
  const [editingTask,setEditingTask]=useState(null);
  const [formData,setFormData]=useState({name:"",intDuration:1,extDuration:1,category:"",crew:3,deps:[],baseCrew:3,baseDur:1,linked:true,pctComplete:0,fullDuration:1});
  const [dragging,setDragging]=useState(null);
  const [dragInfo,setDragInfo]=useState(null);
  const [hoveredTask,setHoveredTask]=useState(null);
  const [exporting,setExporting]=useState(false);
  const [duplicatedId,setDuplicatedId]=useState(null);
  const [confirmDeleteId,setConfirmDeleteId]=useState(null);
  const [reorderDragId,setReorderDragId]=useState(null);
  const [reorderOverIdx,setReorderOverIdx]=useState(null);
  const [phaseFilter,setPhaseFilter]=useState(null);
  const [crewDayIdx,setCrewDayIdx]=useState(null);
  const [expandedCrewTask,setExpandedCrewTask]=useState(null);
  const [crewNameInput,setCrewNameInput]=useState("");
  const [showReport,setShowReport]=useState(false);
  const [reportLog,setReportLog]=useState([]);
  const [showReportLog,setShowReportLog]=useState(false);
  const [viewingReport,setViewingReport]=useState(null);
  const [dailyTasks,setDailyTasks]=useState([{id:"daily-1",name:"Clean & Organize Tools/Materials",crew:2,crewMembers:[]}]);
  const [showDailyForm,setShowDailyForm]=useState(false);
  const [dailyFormData,setDailyFormData]=useState({name:"",crew:2});
  const [viewStart,setViewStart]=useState(()=>{const n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate())});
  const [workWeekends,setWorkWeekends]=useState([]);
  const sidebarRef=useRef(null), sidebarScrollRef=useRef(null), chartScrollRef=useRef(null), chartHeaderRef=useRef(null), chartRef=useRef(null), exportRef=useRef(null);
  const dragStartX=useRef(0), dragOrigStart=useRef(null), dragOrigExt=useRef(null), dragEdge=useRef(null), dragLastDelta=useRef(0), dragMoved=useRef(false), isSyncing=useRef(false), isSyncingH=useRef(false);
  const dbReady=useRef(false);
  const saveTimer=useRef(null);
  const TOTAL_DAYS=180, ROW_H=34, DAY_W=30, CREW_H=72;
  const today=new Date();

  // Sync workWeekends state to module-level Set so isWeekday() picks it up during render
  useMemo(()=>{_workWeekends.clear();workWeekends.forEach(d=>_workWeekends.add(d));},[workWeekends]);
  function toggleWorkWeekend(dateStr){setWorkWeekends(prev=>prev.includes(dateStr)?prev.filter(d=>d!==dateStr):[...prev,dateStr])}

  // --- DATABASE SYNC ---
  // Load from Supabase on mount
  useEffect(()=>{
    if(!supabase)return;
    async function loadDB(){
      try{
        const{data:rows,error}=await supabase.from("tasks").select("*").order("sort_order");
        if(error){console.error("DB load error:",error);return;} // DON'T set dbReady on failure
        if(rows&&rows.length>0){
          const m={};const order=[];let maxId=0;
          rows.forEach(r=>{
            const t={id:r.id,name:r.name,startDate:r.start_date,intDuration:r.int_duration,extDuration:r.ext_duration,baseCrew:r.base_crew,baseDur:r.base_dur,category:r.category,crew:r.crew,deps:r.deps||[],status:r.status,fullDuration:r.full_duration,fullIntDuration:r.full_int_duration||r.int_duration,crewMembers:r.crew_members||[],pinned:r.pinned||false,blocked:r.blocked||false,blockedReason:r.blocked_reason||"",lastUpdateDate:r.last_update_date||"",missedCount:r.missed_count||0};
            m[t.id]=t;order.push(t.id);if(t.id>maxId)maxId=t.id;
          });
          setTaskMap(m);setTaskOrder(order);setNextId(maxId+1);
        } else { await seedDB(); }
        // Load settings
        const{data:settings}=await supabase.from("settings").select("*");
        if(settings){settings.forEach(s=>{
          if(s.key==="max_crew")setMaxCrew(parseInt(s.value)||17);
          if(s.key==="phase_window")setPhaseWindow(parseInt(s.value)||4);
          if(s.key==="auto_mode")setAutoMode(s.value==="true"||s.value===true);
        });}
        // Load daily tasks
        const{data:dtRows}=await supabase.from("daily_tasks").select("*");
        if(dtRows&&dtRows.length>0){
          setDailyTasks(dtRows.map(r=>({id:r.id,name:r.name,crew:r.crew,crewMembers:r.crew_members||[]})));
        }
        dbReady.current=true; // ONLY set ready after successful load
      }catch(err){console.error("DB load error:",err);} // dbReady stays false on failure
    }
    async function seedDB(){
      const rows=taskOrder.map((id,i)=>{const t=taskMap[id];if(!t)return null;return{
        id:t.id,name:t.name,start_date:t.startDate,int_duration:t.intDuration,ext_duration:t.extDuration,base_crew:t.baseCrew,base_dur:t.baseDur,category:t.category,crew:t.crew,deps:t.deps||[],status:t.status,full_duration:t.fullDuration||t.extDuration,full_int_duration:t.fullIntDuration||t.intDuration,crew_members:t.crewMembers||[],pinned:t.pinned||false,blocked:t.blocked||false,blocked_reason:t.blockedReason||"",last_update_date:t.lastUpdateDate||"",missed_count:t.missedCount||0,sort_order:i
      };}).filter(Boolean);
      if(rows.length)await supabase.from("tasks").upsert(rows);
    }
    loadDB();
  },[]);

  // Save tasks to Supabase when they change (debounced) — uses upsert, never deletes first
  useEffect(()=>{
    if(!supabase||!dbReady.current)return;
    if(saveTimer.current)clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(async()=>{
      try{
        // Build current rows
        const rows=taskOrder.map((id,i)=>{const t=taskMap[id];if(!t)return null;return{
          id:t.id,name:t.name,start_date:t.startDate,int_duration:t.intDuration,ext_duration:t.extDuration,base_crew:t.baseCrew,base_dur:t.baseDur,category:t.category,crew:t.crew,deps:t.deps||[],status:t.status,full_duration:t.fullDuration||t.extDuration,full_int_duration:t.fullIntDuration||t.intDuration,crew_members:t.crewMembers||[],pinned:t.pinned||false,blocked:t.blocked||false,blocked_reason:t.blockedReason||"",last_update_date:t.lastUpdateDate||"",missed_count:t.missedCount||0,sort_order:i
        };}).filter(Boolean);
        // Upsert current tasks (safe — won't lose data if insert fails)
        if(rows.length)await supabase.from("tasks").upsert(rows);
        // Remove tasks that no longer exist
        const currentIds=rows.map(r=>r.id);
        const{data:dbRows}=await supabase.from("tasks").select("id");
        if(dbRows){const staleIds=dbRows.filter(r=>!currentIds.includes(r.id)).map(r=>r.id);if(staleIds.length)await supabase.from("tasks").delete().in("id",staleIds);}
      }catch(err){console.error("DB save error:",err);}
    },800);
    return()=>{if(saveTimer.current)clearTimeout(saveTimer.current);};
  },[taskMap,taskOrder]);

  // Save settings when they change
  useEffect(()=>{
    if(!supabase||!dbReady.current)return;
    supabase.from("settings").upsert([
      {key:"max_crew",value:JSON.stringify(maxCrew)},
      {key:"phase_window",value:JSON.stringify(phaseWindow)},
      {key:"auto_mode",value:JSON.stringify(autoMode)},
    ]).then(()=>{});
  },[maxCrew,phaseWindow,autoMode]);

  // Save daily tasks when they change
  useEffect(()=>{
    if(!supabase||!dbReady.current)return;
    (async()=>{
      try{
        const rows=dailyTasks.map(dt=>({id:dt.id,name:dt.name,crew:dt.crew,crew_members:dt.crewMembers||[]}));
        if(rows.length)await supabase.from("daily_tasks").upsert(rows);
        // Remove deleted daily tasks
        const currentIds=rows.map(r=>r.id);
        const{data:dbRows}=await supabase.from("daily_tasks").select("id");
        if(dbRows){const staleIds=dbRows.filter(r=>!currentIds.includes(r.id)).map(r=>r.id);if(staleIds.length)await supabase.from("daily_tasks").delete().in("id",staleIds);}
      }catch(err){console.error("DB daily save error:",err);}
    })();
  },[dailyTasks]);

  // Count business days between two dates (exclusive of end)
  function countBizDaysBetween(startDate, endDate) {
    let count = 0; const d = new Date(startDate);
    d.setDate(d.getDate() + 1); // start from next day
    while (d < endDate) { if (isWeekday(d)) count++; d.setDate(d.getDate() + 1); }
    return count;
  }

  // Snapshot of each task's % at start of day — used to show progress made today
  const todayStartPct = useRef({});

  // On mount: check for missed workdays and extend in-progress tasks, capture start-of-day snapshot
  useEffect(() => {
    const todayStr = toDateStr(today);
    setTaskMap(prev => {
      let changed = false; const next = { ...prev };
      // Capture start-of-day percentages before any changes
      for (const id of Object.keys(next)) {
        todayStartPct.current[id] = parseInt(next[id].status) || 0;
      }
      for (const id of Object.keys(next)) {
        const t = next[id];
        if (!t.status || t.blocked) continue;
        const lastUp = t.lastUpdateDate || todayStr;
        const missedDays = countBizDaysBetween(parseDate(lastUp), today);
        if (missedDays > 0) {
          next[id] = { ...t, extDuration: t.extDuration + missedDays, baseDur: (t.baseDur || t.extDuration) + missedDays, missedCount: (t.missedCount||0) + missedDays, lastUpdateDate: todayStr };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const dailyCrewTotal=useMemo(()=>dailyTasks.reduce((s,t)=>s+t.crew,0),[dailyTasks]);
  const eMap=useMemo(()=>autoMode?runAutoSchedule(taskOrder,taskMap,maxCrew-dailyCrewTotal,today>=viewStart?today:viewStart,phaseWindow):taskMap,[autoMode,taskMap,taskOrder,maxCrew,viewStart,phaseWindow,dailyCrewTotal,workWeekends]);
  const allTasks=useMemo(()=>taskOrder.map(id=>eMap[id]).filter(Boolean),[taskOrder,eMap]);
  const availPhases=useMemo(()=>[...new Set(allTasks.map(t=>getPhase(t.name)).filter(Boolean))].sort((a,b)=>a-b),[allTasks]);
  const tasks=useMemo(()=>phaseFilter===null?allTasks:allTasks.filter(t=>getPhase(t.name)===phaseFilter),[allTasks,phaseFilter]);
  const violations=useMemo(()=>getViolations(allTasks,eMap),[allTasks,eMap]);
  const vCount=Object.keys(violations).length;
  const pinnedCount=useMemo(()=>Object.values(taskMap).filter(t=>t.pinned).length,[taskMap]);
  const blockedCount=useMemo(()=>Object.values(taskMap).filter(t=>t.blocked).length,[taskMap]);

  // Get the last actual working day of a task (inclusive of start)
  function lastWorkDay(startDate, bizDays) {
    const r = new Date(startDate); if (bizDays <= 0) return r;
    let rem = bizDays;
    if (isWeekday(r)) rem--; // count start day
    while (rem > 0) { r.setDate(r.getDate() + 1); if (isWeekday(r)) rem--; }
    return r;
  }
  function endDate(t){return toDateStr(lastWorkDay(parseDate(t.startDate),t.extDuration))}
  const days=useMemo(()=>{const a=[];for(let i=0;i<TOTAL_DAYS;i++)a.push(addDays(viewStart,i));return a},[viewStart]);
  const mGroups=useMemo(()=>{const g=[];let c=null;days.forEach(d=>{const k=`${d.getFullYear()}-${d.getMonth()}`;if(!c||c.key!==k){c={key:k,month:d.getMonth(),year:d.getFullYear(),count:0};g.push(c)}c.count++});return g},[days]);
  const crewDay=useMemo(()=>days.map(day=>{if(!isWeekday(day))return 0;let t=dailyCrewTotal;allTasks.forEach(tk=>{if(tk.blocked)return;const s=parseDate(tk.startDate),e=addBizDays(s,tk.extDuration);if(day>=s&&day<e&&isWeekday(day))t+=tk.crew});return t}),[days,allTasks,dailyCrewTotal]);
  const maxCU=Math.max(...crewDay,1), hasOver=crewDay.some(c=>c>maxCrew);
  const dragTask=dragging!==null?allTasks.find(t=>t.id===dragging):null;
  const visTasks=useMemo(()=>{if(!reorderDragId||reorderOverIdx===null)return tasks;const a=[...tasks];const fi=a.findIndex(t=>t.id===reorderDragId);if(fi===-1||fi===reorderOverIdx)return a;const[item]=a.splice(fi,1);a.splice(reorderOverIdx,0,item);return a},[tasks,reorderDragId,reorderOverIdx]);

  function barPos(t){const s=parseDate(t.startDate),last=lastWorkDay(s,t.extDuration),visualEnd=addDays(last,1),clS=Math.max(0,diffDays(viewStart,s)),clE=Math.min(TOTAL_DAYS,diffDays(viewStart,visualEnd));return clE<=clS?null:{startCol:clS,span:clE-clS}}
  function cPos(e){if(e.touches?.length)return{x:e.touches[0].clientX,y:e.touches[0].clientY};if(e.changedTouches?.length)return{x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};return{x:e.clientX,y:e.clientY}}

  function onSideScroll(e){if(isSyncing.current)return;isSyncing.current=true;if(chartScrollRef.current)chartScrollRef.current.scrollTop=e.target.scrollTop;isSyncing.current=false}
  function onChartScroll(e){if(isSyncing.current)return;isSyncing.current=true;if(sidebarScrollRef.current)sidebarScrollRef.current.scrollTop=e.target.scrollTop;isSyncing.current=false;if(!isSyncingH.current){isSyncingH.current=true;if(chartHeaderRef.current)chartHeaderRef.current.scrollLeft=e.target.scrollLeft;isSyncingH.current=false}}
  function onHeaderScroll(e){if(isSyncingH.current)return;isSyncingH.current=true;if(chartScrollRef.current)chartScrollRef.current.scrollLeft=e.target.scrollLeft;isSyncingH.current=false}

  // Bar drag — works in both auto and manual mode. In auto mode, dragging pins the task.
  const handleBarDown=useCallback((e,task,edge)=>{
    if(reorderDragId)return;e.preventDefault();e.stopPropagation();dragMoved.current=false;
    const p=cPos(e);const srcTask=autoMode?eMap[task.id]:task;if(!srcTask)return;
    setDragging(task.id);setConfirmDeleteId(null);setDragInfo({edge,daysDelta:0,mouseX:p.x,mouseY:p.y});
    dragStartX.current=p.x;dragOrigStart.current=srcTask.startDate;dragOrigExt.current=srcTask.extDuration;dragEdge.current=edge;dragLastDelta.current=0;
  },[autoMode,reorderDragId,eMap]);

  useEffect(()=>{
    if(dragging===null)return;const ch=chartRef.current;if(!ch)return;const dayW=ch.getBoundingClientRect().width/TOTAL_DAYS;
    function onM(e){dragMoved.current=true;const p=cPos(e);const dd=Math.round((p.x-dragStartX.current)/dayW);setDragInfo(pr=>pr?{...pr,daysDelta:dd,mouseX:p.x,mouseY:p.y}:pr);if(dd===dragLastDelta.current)return;dragLastDelta.current=dd;
      setTaskMap(prev=>{const t=prev[dragging];if(!t)return prev;const oS=parseDate(dragOrigStart.current),oE=dragOrigExt.current;let u;
        if(dragEdge.current==="move")u={...t,startDate:toDateStr(addDays(oS,dd)),pinned:autoMode?true:t.pinned};
        else if(dragEdge.current==="left"){const n=oE-dd;if(n<1)return prev;u={...t,startDate:toDateStr(addDays(oS,dd)),extDuration:n}}
        else{const n=oE+dd;if(n<1)return prev;u={...t,extDuration:n}}
        return{...prev,[dragging]:u}})}
    function onU(){const moved=dragMoved.current,tid=dragging;setDragging(null);setDragInfo(null);dragLastDelta.current=0;
      if(!moved&&tid){const t=autoMode?eMap[tid]:taskMap[tid];if(t)openEditForm(t)}}
    window.addEventListener("mousemove",onM);window.addEventListener("mouseup",onU);window.addEventListener("touchmove",onM,{passive:false});window.addEventListener("touchend",onU);
    return()=>{window.removeEventListener("mousemove",onM);window.removeEventListener("mouseup",onU);window.removeEventListener("touchmove",onM);window.removeEventListener("touchend",onU)};
  },[dragging,taskMap,autoMode,eMap]);

  function reorderStart(e,task){if(dragging)return;e.preventDefault();e.stopPropagation();setReorderDragId(task.id);setReorderOverIdx(tasks.findIndex(t=>t.id===task.id))}
  useEffect(()=>{if(!reorderDragId)return;const sb=sidebarRef.current;
    function onM(e){const p=cPos(e);if(!sb)return;let idx=Math.floor((p.y-sb.getBoundingClientRect().top)/ROW_H);idx=Math.max(0,Math.min(tasks.length-1,idx));setReorderOverIdx(idx)}
    function onU(){if(reorderOverIdx!==null&&reorderDragId)setTaskOrder(prev=>{const a=[...prev];const fi=a.indexOf(reorderDragId);if(fi===-1||fi===reorderOverIdx)return a;const[item]=a.splice(fi,1);a.splice(reorderOverIdx,0,item);return a});setReorderDragId(null);setReorderOverIdx(null)}
    window.addEventListener("mousemove",onM);window.addEventListener("mouseup",onU);window.addEventListener("touchmove",onM,{passive:false});window.addEventListener("touchend",onU);
    return()=>{window.removeEventListener("mousemove",onM);window.removeEventListener("mouseup",onU);window.removeEventListener("touchmove",onM);window.removeEventListener("touchend",onU)};
  },[reorderDragId,reorderOverIdx,tasks]);

  useEffect(()=>{if(duplicatedId!==null){const t=setTimeout(()=>setDuplicatedId(null),1500);return()=>clearTimeout(t)}},[duplicatedId]);

  function hCrewCh(v){const nc=Math.max(1,parseInt(v)||1);if(formData.linked){const wu=formData.baseCrew*formData.baseDur;const newExt=Math.max(1,Math.round(wu/nc));const ratio=newExt/Math.max(1,formData.extDuration);setFormData(f=>({...f,crew:nc,extDuration:newExt,intDuration:Math.min(newExt,Math.max(0,Math.round(f.intDuration*ratio)))}))}else setFormData(f=>({...f,crew:nc}))}
  function hDurCh(v){const nd=Math.max(1,parseInt(v)||1);if(formData.linked){const wu=formData.baseCrew*formData.baseDur;const ratio=nd/Math.max(1,formData.extDuration);setFormData(f=>({...f,extDuration:nd,crew:Math.max(1,Math.round(wu/nd)),intDuration:Math.min(nd,Math.max(0,Math.round(f.intDuration*ratio)))}))}else setFormData(f=>({...f,extDuration:nd}))}

  function openAddForm(){setEditingTask(null);setFormData({name:"",intDuration:2,extDuration:3,category:"",crew:3,deps:[],baseCrew:3,baseDur:3,linked:true,pctComplete:0,fullDuration:3,fullIntDuration:2});setShowForm(true)}
  function openEditForm(task){if(confirmDeleteId||reorderDragId)return;setEditingTask(task.id);const pct=task.status?parseInt(task.status)||0:0;const fullD=task.fullDuration||task.extDuration;const fullInt=task.fullIntDuration||task.intDuration;setFormData({name:task.name,intDuration:task.intDuration,extDuration:task.extDuration,category:task.category||"",crew:task.crew||1,deps:task.deps||[],baseCrew:task.baseCrew||task.crew,baseDur:task.baseDur||task.extDuration,linked:true,pctComplete:pct,fullDuration:fullD,fullIntDuration:fullInt});setShowForm(true)}
  function saveTask(){if(!formData.name)return;const cV=Math.max(1,parseInt(formData.crew)||1);
    const pct=Math.min(99,Math.max(0,parseInt(formData.pctComplete)||0));const fullD=formData.fullDuration||parseInt(formData.extDuration)||1;
    const fullInt=formData.fullIntDuration||parseInt(formData.intDuration)||0;
    const remExt=pct>0?Math.max(1,Math.ceil(fullD*(1-pct/100))):fullD;const newStatus=pct>0?pct+"%":null;
    const iV=Math.min(remExt,Math.max(0,parseInt(formData.intDuration)||0));
    if(editingTask){setTaskMap(p=>({...p,[editingTask]:{...p[editingTask],name:formData.name,intDuration:iV,extDuration:remExt,category:formData.category,crew:cV,deps:formData.deps,baseCrew:formData.baseCrew,baseDur:remExt,status:newStatus,fullDuration:fullD,fullIntDuration:fullInt,lastUpdateDate:toDateStr(today)}}))}
    else{const dd=today>=viewStart?toDateStr(today):toDateStr(viewStart);setTaskMap(p=>({...p,[nextId]:{id:nextId,name:formData.name,startDate:dd,intDuration:iV,extDuration:fullD,category:formData.category,crew:cV,deps:formData.deps,baseCrew:cV,baseDur:fullD,status:null,fullDuration:fullD,fullIntDuration:fullInt,crewMembers:[],pinned:false,blocked:false,blockedReason:"",lastUpdateDate:toDateStr(today),missedCount:0}}));setTaskOrder(p=>[...p,nextId]);setNextId(n=>n+1)}
    setShowForm(false)}
  function removeTask(id){setTaskMap(p=>{const n={...p};delete n[id];Object.keys(n).forEach(k=>{if(n[k].deps)n[k]={...n[k],deps:n[k].deps.filter(d=>d!==id)}});return n});setTaskOrder(p=>p.filter(x=>x!==id))}
  function deleteTask(id){removeTask(id);setShowForm(false);setConfirmDeleteId(null)}
  function completeTask(id){removeTask(id);setShowForm(false)}
  function unpinTask(id){setTaskMap(p=>({...p,[id]:{...p[id],pinned:false}}))}
  function pinTask(id){setTaskMap(p=>({...p,[id]:{...p[id],pinned:true}}))}
  function unpinAll(){setTaskMap(p=>{const n={...p};Object.keys(n).forEach(k=>{n[k]={...n[k],pinned:false}});return n})}
  function duplicateTask(task){const t=typeof task==="object"?task:taskMap[task];if(!t)return;const nId=nextId;setTaskMap(p=>({...p,[nId]:{...t,id:nId,name:t.name+" (Copy)",startDate:toDateStr(addDays(parseDate(t.startDate),t.extDuration)),deps:[...(t.deps||[])],pinned:false,blocked:false,blockedReason:"",lastUpdateDate:toDateStr(today),missedCount:0}}));setTaskOrder(p=>{const i=p.indexOf(t.id);const a=[...p];a.splice(i+1,0,nId);return a});setNextId(n=>n+1);setDuplicatedId(nId);setShowForm(false)}
  function duplicateMultiple(tid,count){const t=taskMap[tid];if(!t)return;const nw={},ids=[];let cur=addDays(parseDate(t.startDate),t.extDuration),id=nextId;for(let i=0;i<count;i++){nw[id]={...t,id,name:t.name+` (${i+2})`,startDate:toDateStr(cur),deps:[...(t.deps||[])],pinned:false};ids.push(id);cur=addDays(cur,t.extDuration);id++}setTaskMap(p=>({...p,...nw}));setTaskOrder(p=>{const i=p.indexOf(tid);const a=[...p];a.splice(i+1,0,...ids);return a});setNextId(id);setDuplicatedId(ids[0]);setShowForm(false)}
  function shiftView(dir){setViewStart(p=>addDays(p,dir*30))}
  function goToday(){setViewStart(new Date(today.getFullYear(),today.getMonth(),today.getDate()))}
  function toggleAuto(){if(autoMode)setTaskMap(eMap);setAutoMode(p=>!p)}
  function toggleDep(id){setFormData(f=>({...f,deps:f.deps.includes(id)?f.deps.filter(d=>d!==id):[...f.deps,id]}))}
  function addCrewMember(taskId,name){if(!name.trim())return;setTaskMap(p=>({...p,[taskId]:{...p[taskId],crewMembers:[...(p[taskId].crewMembers||[]),name.trim()]}}));setCrewNameInput("")}
  function removeCrewMember(taskId,idx){setTaskMap(p=>({...p,[taskId]:{...p[taskId],crewMembers:(p[taskId].crewMembers||[]).filter((_,i)=>i!==idx)}}))}

  function submitDayLog(dayIndex){
    const day=days[dayIndex];if(!day||!isWeekday(day))return;
    const dayLabel=`${DAYS_SHORT[day.getDay()]}, ${MONTHS_FULL[day.getMonth()]} ${day.getDate()}, ${day.getFullYear()}`;
    const dayStr=toDateStr(day);
    const activeTasks=allTasks.filter(t=>{if(t.blocked)return false;const s=parseDate(t.startDate),e=addBizDays(s,t.extDuration);return day>=s&&day<e});
    // Check if a log already exists for this date
    const existing=reportLog.find(r=>r.date===dayStr);
    const snap={
      id:existing?existing.id:`log-${Date.now()}`,
      date:dayStr,
      dateLabel:dayLabel,
      timeLabel:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),
      firstSubmitted:existing?existing.firstSubmitted||existing.timeLabel:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),
      updates:(existing?.updates||0)+1,
      tasks:activeTasks.map(t=>{const currPct=parseInt(t.status)||0;
        // Use the original start-of-day pct from the first submission, not the current snapshot
        const prevEntry=existing?.tasks?.find(et=>et.name===t.name);
        const startPct=prevEntry?prevEntry.startPct:(todayStartPct.current[t.id]||0);
        return{name:t.name,status:t.status||"Not Started",crew:t.crew,crewMembers:[...(t.crewMembers||[])],startPct,currPct,change:currPct-startPct}}),
      dailyTasks:dailyTasks.map(dt=>({name:dt.name,crew:dt.crew,crewMembers:[...(dt.crewMembers||[])]})),
      totalCrew:activeTasks.reduce((s,t)=>s+t.crew,0)+dailyCrewTotal
    };
    if(existing){
      setReportLog(prev=>prev.map(r=>r.date===dayStr?snap:r));
    }else{
      setReportLog(prev=>[snap,...prev]);
    }
    setCrewDayIdx(null);setExpandedCrewTask(null);setCrewNameInput("");
  }

  const utilPct=useMemo(()=>{const a=crewDay.filter(c=>c>0);if(!a.length)return 0;return Math.round((a.reduce((s,c)=>s+c,0)/a.length/maxCrew)*100)},[crewDay,maxCrew]);
  const span=useMemo(()=>{if(!allTasks.length)return 0;let mn=Infinity,mx=-Infinity;allTasks.forEach(t=>{const s=parseDate(t.startDate).getTime(),e=lastWorkDay(parseDate(t.startDate),t.extDuration).getTime();if(s<mn)mn=s;if(e>mx)mx=e});return Math.round((mx-mn)/86400000)},[allTasks]);
  async function exportPDF(){setExporting(true);try{await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");const el=exportRef.current;if(!el)return;const canvas=await window.html2canvas(el,{scale:2,backgroundColor:"#0D1B2A",useCORS:true,logging:false,windowWidth:Math.max(el.scrollWidth,1400)});const{jsPDF}=window.jspdf;const pdf=new jsPDF({orientation:"landscape",unit:"pt",format:"letter"});const pW=pdf.internal.pageSize.getWidth(),pH=pdf.internal.pageSize.getHeight(),m=30,r=Math.min((pW-m*2)/canvas.width,(pH-m*2)/canvas.height);pdf.addImage(canvas.toDataURL("image/png"),"PNG",m+((pW-m*2)-canvas.width*r)/2,m,canvas.width*r,canvas.height*r);pdf.save(`schedule-${toDateStr(viewStart)}.pdf`)}catch(err){console.error(err)}finally{setExporting(false)}}

  const cats=[...new Set(Object.values(taskMap).map(t=>t.category).filter(Boolean))];
  const chartCeil=Math.max(maxCrew,maxCU);
  const dragHL=useMemo(()=>{if(!dragTask)return new Set();const s=parseDate(dragTask.startDate),last=lastWorkDay(s,dragTask.extDuration),visualEnd=addDays(last,1);const c=new Set();for(let i=Math.max(0,diffDays(viewStart,s));i<Math.min(TOTAL_DAYS,diffDays(viewStart,visualEnd));i++)c.add(i);return c},[dragTask,viewStart]);
  const[dupCount,setDupCount]=useState(1);
  const wu=formData.baseCrew*formData.baseDur;
  const lbl={fontSize:8,fontWeight:600,color:"#4A7090",textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:3};
  const inp={width:"100%",padding:"6px 8px",background:"#0D1B2A",border:"1px solid #1E3A5F",borderRadius:4,color:"#E0ECF6",fontSize:11,outline:"none",fontFamily:"inherit"};

  function SideRow({task,idx}){
    const color=getColor(idx),isCD=confirmDeleteId===task.id,isDup=duplicatedId===task.id,isRO=reorderDragId===task.id,isDrop=reorderDragId&&reorderDragId!==task.id&&reorderOverIdx===idx;
    const viol=violations[task.id],sc=statusColor(task.status),isPinned=taskMap[task.id]?.pinned,isBlocked=taskMap[task.id]?.blocked;
    return (<div className={`sidebar-row ${isDup?"dup-flash":""}`} onMouseEnter={()=>!dragging&&!reorderDragId&&setHoveredTask(task.id)} onMouseLeave={()=>{if(!dragging&&!reorderDragId)setHoveredTask(null)}}
      style={{height:ROW_H,display:"flex",alignItems:"center",padding:"0 4px 0 2px",gap:3,borderBottom:"1px solid #132339",cursor:dragging||isCD||reorderDragId?"default":"pointer",background:isRO?"#0099D615":isBlocked?"#EF444408":isCD?"#EF444410":hoveredTask===task.id?"#132339":"transparent",borderLeft:isCD?"2px solid #EF4444":isBlocked?"2px solid #EF444460":isPinned&&autoMode?"2px solid #E8870E":viol?"2px solid #F5A62350":"2px solid transparent",borderTop:isDrop?"2px solid #0099D6":"2px solid transparent",opacity:isRO?.6:isBlocked?.5:1}}>
      <div className="reorder-grip" onMouseDown={e=>reorderStart(e,task)} onTouchStart={e=>reorderStart(e,task)} style={{width:12,height:24,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1.5,flexShrink:0}}>
        <div style={{width:6,height:1,background:"#5888A8"}}/><div style={{width:6,height:1,background:"#5888A8"}}/><div style={{width:6,height:1,background:"#5888A8"}}/>
      </div>
      <div style={{width:6,height:6,borderRadius:"50%",background:isBlocked?"#EF4444":color,flexShrink:0}}/>
      <div style={{overflow:"hidden",flex:1}} onClick={()=>!dragging&&!isCD&&!reorderDragId&&openEditForm(task)}>
        <div style={{fontSize:9,fontWeight:500,color:isBlocked?"#EF444490":"#E0ECF6",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"flex",alignItems:"center",gap:3}}>
          {isPinned&&autoMode&&<span style={{fontSize:7,color:"#E8870E"}}>📌</span>}
          {isBlocked&&<span style={{fontSize:7,color:"#EF4444"}}>🚫</span>}
          {task.name}{task.status&&!isBlocked&&<span style={{fontSize:7,fontWeight:700,color:sc,background:`${sc}20`,borderRadius:2,padding:"0 3px",flexShrink:0}}>{task.status}</span>}
        </div>
        <div style={{fontSize:7,color:isBlocked?"#EF444470":viol?"#F5A623":task.status?"#7BA0C0":"#4A7090"}}>{isBlocked?`Blocked: ${taskMap[task.id]?.blockedReason||"No reason given"}`:viol?`⚠ ${viol[0].n}`:task.status&&task.fullDuration?`${task.extDuration}d remaining of ${task.fullDuration}d${(taskMap[task.id]?.missedCount||0)>0?` · ⚠${taskMap[task.id].missedCount}d delayed`:""}`:`${fmtD(task.startDate)} – ${fmtD(endDate(task))}`}</div>
      </div>
      {isCD?<DeleteConfirm onConfirm={()=>deleteTask(task.id)} onCancel={()=>setConfirmDeleteId(null)}/>:(
        <div className="sidebar-actions" style={{display:"flex",gap:2,flexShrink:0}}>
          <button onClick={e=>{e.stopPropagation();duplicateTask(task)}} style={{width:18,height:18,borderRadius:3,border:"1px solid #1E3A5F",background:"#132339",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#7BA0C0" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
          <button onClick={e=>{e.stopPropagation();setConfirmDeleteId(task.id)}} style={{width:18,height:18,borderRadius:3,border:"1px solid #1E3A5F",background:"#132339",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#7BA0C0" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div>)}
      <div style={{display:"flex",gap:3,flexShrink:0}}>
        <div style={{background:"#1A3550",borderRadius:2,padding:"1px 3px",fontSize:8,fontWeight:600,color:"#A8C4DE",minWidth:16,textAlign:"center"}}>{task.extDuration}</div>
        <div style={{background:"#1A3550",borderRadius:2,padding:"1px 3px",fontSize:8,fontWeight:600,color:"#A8C4DE",minWidth:16,textAlign:"center"}}>{task.crew}</div>
      </div>
    </div>);
  }

  return (
    <div style={{fontFamily:"'JetBrains Mono','SF Mono',monospace",background:"#0D1B2A",color:"#C0D4E8",minHeight:"100vh",touchAction:"pan-y",userSelect:(dragging!==null||reorderDragId!==null)?"none":"auto"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{height:5px;width:5px}::-webkit-scrollbar-track{background:#0A1628}::-webkit-scrollbar-thumb{background:#4A7090;border-radius:3px}
        .hide-scroll::-webkit-scrollbar{display:none}.hide-scroll{-ms-overflow-style:none;scrollbar-width:none}
        .gantt-bar{transition:box-shadow .15s,transform .1s}.gantt-bar:hover{z-index:10!important}.gantt-bar.is-dragging{z-index:50!important;transform:scaleY(1.12);filter:brightness(1.2)}
        .resize-handle{opacity:0;transition:opacity .12s}.gantt-bar:hover .resize-handle,.gantt-bar.is-dragging .resize-handle{opacity:1}
        .sidebar-actions{opacity:0;transition:opacity .12s}.sidebar-row:hover .sidebar-actions{opacity:1}.sidebar-row:hover .reorder-grip{opacity:.8}.reorder-grip{opacity:.15;transition:opacity .12s;cursor:grab}
        .fade-in{animation:fadeIn .2s ease-out}@keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes dupFlash{0%{background:#0099D640}100%{background:transparent}}.dup-flash{animation:dupFlash 1.5s ease-out}
        input,select{font-family:inherit}
      `}</style>

      {/* HEADER */}
      <div style={{padding:"12px 20px 8px",borderBottom:"1px solid #1A3550",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:6,height:6,background:"#0099D6",borderRadius:2}}/><h1 style={{fontFamily:"'Space Grotesk'",fontSize:17,fontWeight:700,color:"#FFFFFF"}}>Building Schedule</h1></div>
          <p style={{fontSize:9,color:"#5888A8",marginTop:2,paddingLeft:14}}>{allTasks.length} tasks · {span}d span · {utilPct}% util{pinnedCount>0&&autoMode&&<span style={{color:"#E8870E"}}> · {pinnedCount} pinned</span>}{blockedCount>0&&<span style={{color:"#EF4444"}}> · {blockedCount} blocked</span>}{dailyCrewTotal>0&&<span style={{color:"#F5A623"}}> · {dailyCrewTotal} daily crew</span>}{vCount>0&&!autoMode&&<span style={{color:"#F5A623",marginLeft:6}}>⚠ {vCount} violations</span>}</p>
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
          <button onClick={()=>setShowSettings(true)} style={{padding:"3px 8px",fontSize:9,borderRadius:4,cursor:"pointer",fontFamily:"inherit",background:hasOver?"#EF444418":"#132339",border:`1px solid ${hasOver?"#EF444450":"#1A3550"}`,color:hasOver?"#EF4444":"#A8C4DE"}}>Crew:{maxCrew} · Win:{phaseWindow}</button>
          <button onClick={toggleAuto} style={{padding:"3px 8px",fontSize:9,fontWeight:600,borderRadius:4,cursor:"pointer",fontFamily:"inherit",background:autoMode?"#0080B820":"#132339",border:`1px solid ${autoMode?"#0080B8":"#1A3550"}`,color:autoMode?"#66CCE6":"#33AAD6"}}>Auto {autoMode?"ON":"OFF"}</button>
          {autoMode&&pinnedCount>0&&<button onClick={unpinAll} style={{padding:"3px 8px",fontSize:9,borderRadius:4,cursor:"pointer",fontFamily:"inherit",background:"#E8870E18",border:"1px solid #E8870E40",color:"#E8870E"}}>Unpin All</button>}
          <button onClick={exportPDF} disabled={exporting} style={{padding:"3px 8px",fontSize:9,borderRadius:4,cursor:"pointer",fontFamily:"inherit",background:"#132339",border:"1px solid #1A3550",color:"#A8C4DE"}}>PDF</button>
          <button onClick={()=>setShowReport(true)} style={{padding:"3px 8px",fontSize:9,fontWeight:600,borderRadius:4,cursor:"pointer",fontFamily:"inherit",background:"#132339",border:"1px solid #7AB64840",color:"#7AB648"}}>Report</button>
          <button onClick={()=>setShowReportLog(true)} style={{padding:"3px 8px",fontSize:9,fontWeight:600,borderRadius:4,cursor:"pointer",fontFamily:"inherit",background:"#132339",border:"1px solid #0099D640",color:"#0099D6"}}>Log{reportLog.length>0?` (${reportLog.length})`:""}</button>
          <button onClick={openAddForm} style={{padding:"3px 8px",fontSize:9,fontWeight:600,borderRadius:4,border:"none",cursor:"pointer",fontFamily:"inherit",background:"#0099D6",color:"#fff"}}>+ Add</button>
        </div>
      </div>

      {/* PHASE TABS */}
      <div style={{display:"flex",gap:3,padding:"5px 20px",borderBottom:"1px solid #1A3550",overflowX:"auto",background:"#0D1B2A"}}>
        <button onClick={()=>setPhaseFilter(null)} style={{padding:"2px 8px",fontSize:8,fontWeight:phaseFilter===null?700:500,borderRadius:3,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${phaseFilter===null?"#0099D660":"#1A3550"}`,background:phaseFilter===null?"#0099D620":"transparent",color:phaseFilter===null?"#33BBE6":"#5888A8",whiteSpace:"nowrap"}}>All ({allTasks.length})</button>
        {availPhases.map(p=><button key={p} onClick={()=>setPhaseFilter(p)} style={{padding:"2px 7px",fontSize:8,fontWeight:phaseFilter===p?700:500,borderRadius:3,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${phaseFilter===p?"#0099D660":"#1A3550"}`,background:phaseFilter===p?"#0099D620":"transparent",color:phaseFilter===p?"#33BBE6":"#5888A8",whiteSpace:"nowrap"}}>Ph{p}</button>)}
      </div>

      {autoMode&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 20px",background:"#0080B808",borderBottom:"1px solid #0080B820"}}><div style={{width:4,height:4,borderRadius:"50%",background:"#0080B8"}}/><span style={{fontSize:8,color:"#33AAD6",flex:1}}>Auto-scheduling — drag bars to pin · {phaseWindow}-phase window · lowest priority bumped on conflict</span>{!hasOver&&!vCount&&<span style={{fontSize:8,color:"#5C9030"}}>✓ OK</span>}</div>}

      <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 20px",borderBottom:"1px solid #1A3550",background:"#0D1B2A"}}>
        <button onClick={()=>shiftView(-1)} style={{background:"#132339",border:"1px solid #1E3A5F",color:"#A8C4DE",borderRadius:3,padding:"2px 7px",cursor:"pointer",fontSize:10,fontFamily:"inherit"}}>◀</button>
        <span style={{fontSize:9,color:"#A8C4DE",fontWeight:500,minWidth:220,textAlign:"center"}}>{MONTHS_FULL[viewStart.getMonth()]} {viewStart.getDate()}, {viewStart.getFullYear()} — {MONTHS_FULL[addDays(viewStart,TOTAL_DAYS-1).getMonth()]} {addDays(viewStart,TOTAL_DAYS-1).getDate()}, {addDays(viewStart,TOTAL_DAYS-1).getFullYear()}</span>
        <button onClick={()=>shiftView(1)} style={{background:"#132339",border:"1px solid #1E3A5F",color:"#A8C4DE",borderRadius:3,padding:"2px 7px",cursor:"pointer",fontSize:10,fontFamily:"inherit"}}>▶</button>
        <button onClick={goToday} style={{background:"transparent",border:"1px solid #1E3A5F",color:"#5888A8",borderRadius:3,padding:"2px 7px",cursor:"pointer",fontSize:8,fontFamily:"inherit"}}>Today</button>
      </div>

      <div ref={exportRef}>
        <div style={{display:"flex"}}>
          <div style={{minWidth:250,maxWidth:250,borderRight:"1px solid #1A3550",background:"#0D1B2A",flexShrink:0}}>
            <div style={{height:22,borderBottom:"1px solid #1A3550"}}/>
            <div style={{height:30,display:"flex",alignItems:"flex-end",padding:"0 6px 4px 22px",borderBottom:"1px solid #1A3550",justifyContent:"space-between"}}>
              <span style={{fontSize:8,fontWeight:600,color:"#4A7090",textTransform:"uppercase"}}>Task</span>
              <div style={{display:"flex",gap:6}}><span style={{fontSize:8,fontWeight:600,color:"#4A7090"}}>Days</span><span style={{fontSize:8,fontWeight:600,color:"#4A7090"}}>Crew</span></div>
            </div>
          </div>
          <div ref={chartHeaderRef} className="hide-scroll" style={{flex:1,overflowX:"auto"}} onScroll={onHeaderScroll}>
            <div ref={chartRef} style={{minWidth:TOTAL_DAYS*DAY_W}}>
              <div style={{display:"flex",height:22,borderBottom:"1px solid #1A3550"}}>{mGroups.map((mg,i)=><div key={mg.key} style={{width:`${(mg.count/TOTAL_DAYS)*100}%`,display:"flex",alignItems:"center",justifyContent:"center",borderRight:i<mGroups.length-1?"1px solid #1E3A5F":"none",background:"#0A1628"}}><span style={{fontSize:10,fontWeight:700,color:"#A8C4DE",fontFamily:"'Space Grotesk'"}}>{MONTHS_FULL[mg.month]} {mg.year}</span></div>)}</div>
              <div style={{display:"flex",height:30,borderBottom:"1px solid #1A3550"}}>{days.map((d,i)=>{const isT=sameDay(d,today),isW=!isWeekday(d),isWW=isNaturalWeekend(d)&&!isW,isF=d.getDate()===1;return <div key={i} style={{width:`${100/TOTAL_DAYS}%`,flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRight:isF?"1px solid #1E3A5F":"1px solid #152A42",background:isT?"#0099D610":isWW?"#F5A62308":isW?"#091828":"transparent"}}><span style={{fontSize:6,color:isT?"#0099D6":isWW?"#F5A623":isW?"#1E3A5F":"#4A7090",textTransform:"uppercase",lineHeight:1}}>{DAYS_SHORT[d.getDay()]}</span><span style={{fontSize:8,fontWeight:isT?700:isF?600:500,color:isT?"#fff":isWW?"#F5A623":isF?"#A8C4DE":isW?"#1E3A5F":"#7BA0C0",background:isT?"#0099D6":"transparent",borderRadius:5,width:isT?14:"auto",height:isT?12:"auto",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,marginTop:1}}>{d.getDate()}</span></div>})}</div>
            </div>
          </div>
        </div>

        <div style={{display:"flex",height:"calc(100vh - 260px)"}}>
          <div ref={sidebarRef} style={{minWidth:250,maxWidth:250,borderRight:"1px solid #1A3550",background:"#0D1B2A",flexShrink:0}}>
            <div ref={sidebarScrollRef} className="hide-scroll" onScroll={onSideScroll} style={{height:"100%",overflowY:"auto"}}>
              {dailyTasks.map((dt)=><div key={dt.id} style={{height:ROW_H,display:"flex",alignItems:"center",padding:"0 4px 0 6px",gap:3,borderBottom:"1px solid #132339",background:"#F5A62306"}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:"#F5A623",flexShrink:0}}/>
                <div style={{overflow:"hidden",flex:1}}><div style={{fontSize:9,fontWeight:500,color:"#F5A623",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{dt.name}</div><div style={{fontSize:7,color:"#7090A8"}}>Daily · Every weekday</div></div>
                <button onClick={()=>setDailyTasks(p=>p.filter(t=>t.id!==dt.id))} style={{width:16,height:16,borderRadius:3,border:"1px solid #1E3A5F",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,flexShrink:0}}><svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#5888A8" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                <div style={{background:"#3D2800",borderRadius:2,padding:"1px 3px",fontSize:8,fontWeight:600,color:"#F5A623",minWidth:16,textAlign:"center"}}>{dt.crew}</div>
              </div>)}
              <div style={{height:24,display:"flex",alignItems:"center",justifyContent:"center",borderBottom:"1px solid #1A3550"}}><button onClick={()=>setShowDailyForm(true)} style={{fontSize:7,color:"#5888A8",background:"transparent",border:"none",cursor:"pointer",fontFamily:"inherit"}}>+ Add daily task</button></div>
              {visTasks.map((t,i)=><SideRow key={t.id} task={t} idx={i}/>)}
              <div style={{height:CREW_H,borderTop:"1px solid #1A3550",display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 10px"}}>
                <div style={{fontSize:7,fontWeight:600,color:"#4A7090",textTransform:"uppercase"}}>Daily Crew (all)</div>
                <div style={{fontSize:15,fontWeight:700,color:hasOver?"#EF4444":"#A8C4DE",fontFamily:"'Space Grotesk'",marginTop:2}}>{Math.max(...crewDay)}<span style={{fontSize:9,fontWeight:400,color:"#4A7090"}}>/{maxCrew}</span></div>
                <div style={{fontSize:7,color:hasOver?"#EF444490":"#5C9030",marginTop:1}}>{hasOver?"⚠ Over":"✓ "+utilPct+"% util"}</div>
              </div>
            </div>
          </div>
          <div ref={chartScrollRef} onScroll={onChartScroll} style={{flex:1,overflowY:"auto",overflowX:"auto"}}>
            <div style={{minWidth:TOTAL_DAYS*DAY_W,position:"relative"}}>
              {dailyTasks.map((dt)=><div key={dt.id} style={{height:ROW_H,position:"relative",borderBottom:"1px solid #132339",background:"#F5A62304"}}>
                {days.map((d,di)=>{const isW=!isWeekday(d);return <div key={di} style={{position:"absolute",left:`${(di/TOTAL_DAYS)*100}%`,width:`${100/TOTAL_DAYS}%`,top:0,bottom:0,borderRight:"1px solid #152A42",background:isW?"#091422":"transparent"}}>{isWeekday(d)&&<div style={{position:"absolute",inset:0,background:"#F5A62318",borderTop:"1px solid #F5A62330",borderBottom:"1px solid #F5A62330"}}/>}</div>})}
                <span style={{fontSize:7,fontWeight:600,color:"#F5A62380",whiteSpace:"nowrap",paddingLeft:4,position:"absolute",top:8,left:4,zIndex:1}}>{dt.name} · {dt.crew}☻</span>
              </div>)}
              <div style={{height:24,borderBottom:"1px solid #1A3550"}}/>
              {visTasks.map((task,idx)=>{const bp=barPos(task);const color=getColor(idx);const isH=hoveredTask===task.id,isD=dragging===task.id,isDup=duplicatedId===task.id,viol=violations[task.id],sc=statusColor(task.status),isPinned=taskMap[task.id]?.pinned,isBlocked=taskMap[task.id]?.blocked;
                return <div key={task.id} onMouseEnter={()=>!dragging&&!reorderDragId&&setHoveredTask(task.id)} onMouseLeave={()=>!dragging&&!reorderDragId&&setHoveredTask(null)}
                  className={isDup?"dup-flash":""} style={{height:ROW_H,position:"relative",borderBottom:"1px solid #132339",background:isH&&!isD?"#142840":"transparent"}}>
                  {days.map((d,i)=>{const isW=!isWeekday(d),isT=sameDay(d,today),isF=d.getDate()===1,isDC=isD&&dragHL.has(i);return <div key={i} style={{position:"absolute",left:`${(i/TOTAL_DAYS)*100}%`,width:`${100/TOTAL_DAYS}%`,top:0,bottom:0,borderRight:isF?"1px solid #1E3A5F":"1px solid #152A42",background:isDC?"#0099D60A":isT?"#0099D606":isW?"#091422":"transparent"}}/>})}
                  {bp&&<div className={`gantt-bar ${isD?"is-dragging":""}`} style={{position:"absolute",top:3,height:ROW_H-6,left:`${(bp.startCol/TOTAL_DAYS)*100}%`,width:`${(bp.span/TOTAL_DAYS)*100}%`,background:isBlocked?`repeating-linear-gradient(135deg,#EF444415,#EF444415 4px,#EF444408 4px,#EF444408 8px)`:`linear-gradient(135deg, ${color}${isD?"C0":"90"}, ${color}${isD?"80":"50"})`,border:`1px solid ${isBlocked?"#EF444460":isPinned&&autoMode?"#E8870E":viol?"#F5A62390":`${color}${isD?"FF":"BB"}`}`,borderRadius:3,cursor:isBlocked?"pointer":isD?"grabbing":"pointer",zIndex:isD?50:3,display:"flex",alignItems:"center",padding:"0 3px",overflow:"hidden",opacity:isBlocked?.5:1,boxShadow:isD?`0 4px 16px ${color}60`:isH?`0 2px 10px ${color}40`:"none"}}
                    onMouseDown={e=>handleBarDown(e,task,"move")} onTouchStart={e=>handleBarDown(e,task,"move")}>
                    {task.status&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:`${parseInt(task.status)}%`,background:`${sc}15`,borderRadius:"3px 0 0 3px",pointerEvents:"none"}}/>}
                    {!autoMode&&<div className="resize-handle" onMouseDown={e=>handleBarDown(e,task,"left")} style={{position:"absolute",left:0,top:0,bottom:0,width:5,cursor:"ew-resize",borderRadius:"3px 0 0 3px",zIndex:5,background:`${color}50`}}/>}
                    {isPinned&&autoMode&&<div style={{position:"absolute",left:2,top:1,fontSize:6,zIndex:6,lineHeight:1}}>📌</div>}
                    {viol&&<div style={{position:"absolute",left:-5,top:"50%",transform:"translateY(-50%)",width:9,height:9,borderRadius:"50%",background:"#F5A623",display:"flex",alignItems:"center",justifyContent:"center",zIndex:6,fontSize:6,fontWeight:800,color:"#000"}}>!</div>}
                    {bp.span>=2&&<span style={{fontSize:7,fontWeight:600,color:"#FFF",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",pointerEvents:"none",paddingLeft:isPinned&&autoMode?10:2,position:"relative",zIndex:1,textShadow:"0 1px 2px rgba(0,0,0,.4)"}}>{task.name}{bp.span>=4&&<span style={{fontWeight:400,opacity:.7}}> {task.crew}☻</span>}</span>}
                    {!autoMode&&<div className="resize-handle" onMouseDown={e=>handleBarDown(e,task,"right")} style={{position:"absolute",right:0,top:0,bottom:0,width:5,cursor:"ew-resize",borderRadius:"0 3px 3px 0",zIndex:5,background:`${color}50`}}/>}
                  </div>}
                </div>})}
              <div style={{height:CREW_H,borderTop:"1px solid #1A3550",position:"relative",display:"flex",alignItems:"flex-end"}}>
                <div style={{position:"absolute",left:0,right:0,bottom:`${(maxCrew/chartCeil)*(CREW_H-14)}px`,height:1,borderTop:"1.5px dashed #EF444450",zIndex:5,pointerEvents:"none"}}><span style={{position:"absolute",right:3,top:-9,fontSize:6,color:"#EF444470",fontWeight:600}}>MAX {maxCrew}</span></div>
                {days.map((d,i)=>{const cr=crewDay[i],isO=cr>maxCrew,isT=sameDay(d,today),bH=cr>0?Math.max(1,(cr/chartCeil)*(CREW_H-14)):0;return <div key={i} onClick={()=>setCrewDayIdx(i)} style={{width:`${100/TOTAL_DAYS}%`,height:"100%",display:"flex",flexDirection:"column",justifyContent:"flex-end",alignItems:"center",borderRight:"1px solid #152A42",padding:"0 0 2px",cursor:"pointer"}}>{cr>0&&<div style={{width:"100%",height:bH,background:isO?"#EF4444":isT?"#0099D6":"#0099D640",transition:"height .15s"}}/>}</div>})}
              </div>
              {(()=>{const tIdx=days.findIndex(d=>sameDay(d,today));return tIdx>=0?<div style={{position:"absolute",left:`${((tIdx+.5)/TOTAL_DAYS)*100}%`,top:0,bottom:0,width:1.5,background:"#0099D670",zIndex:15,pointerEvents:"none"}}/>:null})()}
            </div>
          </div>
        </div>
      </div>

      {dragging!==null&&dragInfo&&dragTask&&<div style={{position:"fixed",left:dragInfo.mouseX+12,top:dragInfo.mouseY-30,background:"#1A3550",border:"1px solid #1E3A5F",borderRadius:5,padding:"4px 7px",zIndex:200,boxShadow:"0 4px 16px rgba(0,0,0,.5)"}}>
        <div style={{fontSize:8,fontWeight:600,color:"#E0ECF6"}}>{dragTask.name}{autoMode&&<span style={{color:"#E8870E",marginLeft:4}}>📌 pinning</span>}</div>
        <div style={{fontSize:7,color:"#A8C4DE"}}>{fmtD(dragTask.startDate)} → {fmtD(endDate(dragTask))}</div>
      </div>}

      {/* TASK FORM */}
      {showForm&&<div style={{position:"fixed",inset:0,background:"#00000080",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)"}} onClick={()=>setShowForm(false)}>
        <div className="fade-in" onClick={e=>e.stopPropagation()} style={{background:"#132339",border:"1px solid #1E3A5F",borderRadius:10,padding:18,width:480,maxWidth:"92vw",maxHeight:"86vh",overflowY:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
            <h2 style={{fontFamily:"'Space Grotesk'",fontSize:14,fontWeight:700,color:"#FFFFFF"}}>{editingTask?"Edit Task":"New Task"}</h2>
            {editingTask&&<div style={{display:"flex",gap:4}}>
              {autoMode&&taskMap[editingTask]?.pinned&&<button onClick={()=>{unpinTask(editingTask);setShowForm(false)}} style={{padding:"3px 8px",fontSize:9,fontWeight:600,borderRadius:3,border:"1px solid #E8870E40",cursor:"pointer",fontFamily:"inherit",background:"#E8870E15",color:"#E8870E"}}>📌 Unpin</button>}
              {autoMode&&!taskMap[editingTask]?.pinned&&<button onClick={()=>{pinTask(editingTask);setShowForm(false)}} style={{padding:"3px 8px",fontSize:9,fontWeight:600,borderRadius:3,border:"1px solid #E8870E40",cursor:"pointer",fontFamily:"inherit",background:"transparent",color:"#E8870E80"}}>Pin</button>}
              <button onClick={()=>completeTask(editingTask)} style={{padding:"3px 10px",fontSize:9,fontWeight:600,borderRadius:3,border:"1px solid #7AB64840",cursor:"pointer",fontFamily:"inherit",background:"#7AB64815",color:"#7AB648",display:"flex",alignItems:"center",gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Complete</button>
              <button onClick={()=>deleteTask(editingTask)} style={{padding:"3px 8px",fontSize:9,fontWeight:600,borderRadius:3,border:"1px solid #EF444440",cursor:"pointer",fontFamily:"inherit",background:"#EF444415",color:"#EF4444"}}>Delete</button>
            </div>}
          </div>
          {editingTask&&taskMap[editingTask]&&<div style={{display:"flex",gap:8,marginBottom:8,padding:"5px 8px",background:"#0D1B2A",borderRadius:4,border:"1px solid #1A3550",flexWrap:"wrap"}}>
            <span style={{fontSize:8,color:"#7BA0C0"}}>{fmtD(taskMap[editingTask].startDate)} → {fmtD(endDate(taskMap[editingTask]))}</span>
            <span style={{fontSize:8,color:"#4A7090"}}>·</span>
            <span style={{fontSize:8,color:"#7BA0C0"}}>{taskMap[editingTask].extDuration}d · {taskMap[editingTask].crew} crew</span>
            {taskMap[editingTask].pinned&&autoMode&&<><span style={{fontSize:8,color:"#4A7090"}}>·</span><span style={{fontSize:8,color:"#E8870E",fontWeight:600}}>📌 Pinned</span></>}
            {taskMap[editingTask].blocked&&<><span style={{fontSize:8,color:"#4A7090"}}>·</span><span style={{fontSize:8,color:"#EF4444",fontWeight:600}}>🚫 Blocked</span></>}
            {taskMap[editingTask].status&&<><span style={{fontSize:8,color:"#4A7090"}}>·</span><span style={{fontSize:8,color:statusColor(taskMap[editingTask].status),fontWeight:600}}>{taskMap[editingTask].status} done</span></>}
            {taskMap[editingTask].lastUpdateDate&&<><span style={{fontSize:8,color:"#4A7090"}}>·</span><span style={{fontSize:8,color:"#5888A8"}}>Updated {fmtD(taskMap[editingTask].lastUpdateDate)}</span></>}
            {(taskMap[editingTask].missedCount||0)>0&&<><span style={{fontSize:8,color:"#4A7090"}}>·</span><span style={{fontSize:8,color:"#EF4444",fontWeight:600}}>{taskMap[editingTask].missedCount}d delayed</span></>}
          </div>}
          {editingTask&&taskMap[editingTask]&&(taskMap[editingTask].missedCount||0)>0&&<div style={{padding:"6px 8px",background:"#EF444410",borderRadius:4,border:"1px solid #EF444425",marginBottom:4}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:9,fontWeight:700,color:"#EF4444",fontFamily:"'Space Grotesk'"}}>{taskMap[editingTask].missedCount}</span>
                <span style={{fontSize:8,color:"#EF4444",fontWeight:600}}>day{taskMap[editingTask].missedCount>1?"s":""} delayed — no status update received</span>
              </div>
              <button onClick={()=>setTaskMap(p=>({...p,[editingTask]:{...p[editingTask],missedCount:0}}))} style={{padding:"2px 6px",fontSize:7,borderRadius:2,cursor:"pointer",fontFamily:"inherit",border:"1px solid #EF444440",background:"transparent",color:"#EF444490"}}>Reset</button>
            </div>
          </div>}
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            <div style={{display:"flex",gap:7}}>
              <div style={{flex:1}}><label style={lbl}>Name</label><input value={formData.name} onChange={e=>setFormData(f=>({...f,name:e.target.value}))} style={inp}/></div>
              <div style={{width:100}}><label style={lbl}>Category</label><input value={formData.category} onChange={e=>setFormData(f=>({...f,category:e.target.value}))} list="cat-list" style={inp}/><datalist id="cat-list">{cats.map(c=><option key={c} value={c}/>)}</datalist></div>
            </div>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
                <label style={{...lbl,marginBottom:0}}>Crew &amp; Duration</label>
                <button onClick={()=>setFormData(f=>({...f,linked:!f.linked}))} style={{padding:"1px 6px",fontSize:7,fontWeight:600,borderRadius:3,cursor:"pointer",fontFamily:"inherit",background:formData.linked?"#0099D620":"transparent",border:`1px solid ${formData.linked?"#0099D660":"#1E3A5F"}`,color:formData.linked?"#33BBE6":"#5888A8"}}>{formData.linked?"🔗 Linked":"Unlinked"}</button>
                {formData.linked&&<span style={{fontSize:7,color:"#4A7090"}}>Work: {wu}u</span>}
              </div>
              <div style={{display:"flex",gap:7}}>
                <div style={{flex:1}}><label style={{...lbl,fontSize:7}}>Internal</label><input type="number" min="0" max={formData.extDuration} value={formData.intDuration} onChange={e=>{const v=Math.min(formData.extDuration,Math.max(0,parseInt(e.target.value)||0));setFormData(f=>({...f,intDuration:v}))}} style={{...inp,textAlign:"center"}}/></div>
                <div style={{flex:1}}><label style={{...lbl,fontSize:7}}>External</label><input type="number" min="1" value={formData.extDuration} onChange={e=>hDurCh(e.target.value)} style={{...inp,textAlign:"center",borderColor:formData.linked?"#0099D640":"#1E3A5F"}}/></div>
                <div style={{width:70}}><label style={{...lbl,fontSize:7}}>Crew</label><input type="number" min="1" value={formData.crew} onChange={e=>hCrewCh(e.target.value)} style={{...inp,textAlign:"center",borderColor:formData.linked?"#0099D640":"#1E3A5F"}}/></div>
              </div>
              {formData.linked&&formData.crew!==formData.baseCrew&&<div style={{fontSize:7,color:"#33BBE6",marginTop:2,padding:"2px 5px",background:"#0099D610",borderRadius:2}}>Scaled: {formData.baseCrew}×{formData.baseDur}d → {formData.crew}×{formData.extDuration}d</div>}
            </div>
            {editingTask&&<div style={{padding:"8px 10px",background:"#0D1B2A",borderRadius:5,border:"1px solid #1A3550"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}><label style={{...lbl,marginBottom:0}}>Progress</label><span style={{fontSize:12,fontWeight:700,color:formData.pctComplete>=80?"#7AB648":formData.pctComplete>=40?"#F5A623":formData.pctComplete>0?"#0099D6":"#5888A8",fontFamily:"'Space Grotesk'"}}>{formData.pctComplete}%</span></div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="range" min="0" max="99" value={formData.pctComplete} onChange={e=>{const p=parseInt(e.target.value)||0;const rem=Math.max(1,Math.ceil(formData.fullDuration*(1-p/100)));const remInt=p>0?Math.min(rem,Math.max(0,Math.ceil((formData.fullIntDuration||formData.intDuration)*(1-p/100)))):formData.fullIntDuration||formData.intDuration;setFormData(f=>({...f,pctComplete:p,extDuration:rem,baseDur:rem,intDuration:remInt}))}} style={{flex:1,accentColor:formData.pctComplete>=80?"#7AB648":formData.pctComplete>=40?"#F5A623":"#0099D6",height:6}}/>
                <input type="number" min="0" max="99" value={formData.pctComplete} onChange={e=>{const p=Math.min(99,Math.max(0,parseInt(e.target.value)||0));const rem=Math.max(1,Math.ceil(formData.fullDuration*(1-p/100)));const remInt=p>0?Math.min(rem,Math.max(0,Math.ceil((formData.fullIntDuration||formData.intDuration)*(1-p/100)))):formData.fullIntDuration||formData.intDuration;setFormData(f=>({...f,pctComplete:p,extDuration:rem,baseDur:rem,intDuration:remInt}))}} style={{width:40,padding:"3px 4px",background:"#132339",border:"1px solid #1E3A5F",borderRadius:3,color:"#E0ECF6",fontSize:11,textAlign:"center",outline:"none",fontFamily:"inherit"}}/>
                <span style={{fontSize:9,color:"#5888A8"}}>%</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}><span style={{fontSize:7,color:"#5888A8"}}>Full: {formData.fullDuration}d</span><span style={{fontSize:7,color:formData.pctComplete>0?"#F5A623":"#5888A8"}}>{formData.pctComplete>0?`${Math.max(1,Math.ceil(formData.fullDuration*(1-formData.pctComplete/100)))}d remaining`:"Not started"}</span></div>
              <div style={{display:"flex",gap:3,marginTop:5}}>{[0,25,50,75,90].map(p=><button key={p} onClick={()=>{const rem=Math.max(1,Math.ceil(formData.fullDuration*(1-p/100)));const remInt=p>0?Math.min(rem,Math.max(0,Math.ceil((formData.fullIntDuration||formData.intDuration)*(1-p/100)))):formData.fullIntDuration||formData.intDuration;setFormData(f=>({...f,pctComplete:p,extDuration:rem,baseDur:rem,intDuration:remInt}))}} style={{padding:"2px 6px",fontSize:7,fontWeight:formData.pctComplete===p?700:500,borderRadius:2,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${formData.pctComplete===p?"#0099D660":"#1E3A5F"}`,background:formData.pctComplete===p?"#0099D620":"transparent",color:formData.pctComplete===p?"#33BBE6":"#5888A8"}}>{p}%</button>)}</div>
            </div>}
            {/* Blocked by other trade */}
            {editingTask&&<div style={{padding:"8px 10px",background:taskMap[editingTask]?.blocked?"#EF444410":"#0D1B2A",borderRadius:5,border:`1px solid ${taskMap[editingTask]?.blocked?"#EF444430":"#1A3550"}`}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:taskMap[editingTask]?.blocked?8:0}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontSize:8,fontWeight:600,color:taskMap[editingTask]?.blocked?"#EF4444":"#4A7090",textTransform:"uppercase",letterSpacing:"0.1em"}}>Blocked by Other Trade</span>
                </div>
                <button onClick={()=>{const cur=taskMap[editingTask];if(!cur)return;setTaskMap(p=>({...p,[editingTask]:{...cur,blocked:!cur.blocked,blockedReason:cur.blocked?"":cur.blockedReason}}))}}
                  style={{padding:"2px 8px",fontSize:8,fontWeight:600,borderRadius:3,cursor:"pointer",fontFamily:"inherit",
                    background:taskMap[editingTask]?.blocked?"#EF444420":"transparent",
                    border:`1px solid ${taskMap[editingTask]?.blocked?"#EF444460":"#1E3A5F"}`,
                    color:taskMap[editingTask]?.blocked?"#EF4444":"#5888A8"}}>
                  {taskMap[editingTask]?.blocked?"🚫 Blocked":"Mark Blocked"}
                </button>
              </div>
              {taskMap[editingTask]?.blocked&&<div>
                <label style={{fontSize:7,fontWeight:600,color:"#EF444490",display:"block",marginBottom:3}}>REASON</label>
                <input value={taskMap[editingTask]?.blockedReason||""} onChange={e=>setTaskMap(p=>({...p,[editingTask]:{...p[editingTask],blockedReason:e.target.value}}))}
                  placeholder="e.g. Electrician hasn't finished conduit run..." style={{...inp,borderColor:"#EF444430",fontSize:10}}/>
                <p style={{fontSize:7,color:"#EF444460",marginTop:4}}>Blocked tasks are removed from the schedule and don't count toward crew capacity. Other tasks will fill the gap.</p>
              </div>}
            </div>}
            <div><label style={lbl}>Must Complete First</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:2,padding:5,background:"#0D1B2A",borderRadius:4,border:"1px solid #1A3550",maxHeight:80,overflowY:"auto"}}>
                {taskOrder.map(id=>{if(id===editingTask)return null;const t=taskMap[id];if(!t)return null;const sel=formData.deps.includes(id);return <button key={id} onClick={()=>toggleDep(id)} style={{padding:"1px 5px",fontSize:8,borderRadius:2,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${sel?"#0099D680":"#1E3A5F"}`,background:sel?"#0099D620":"transparent",color:sel?"#33BBE6":"#5888A8",fontWeight:sel?600:400}}>{sel?"✓ ":""}{t.name}</button>})}
              </div>
            </div>
            {editingTask&&<div style={{padding:8,background:"#0D1B2A",borderRadius:5,border:"1px solid #1A3550"}}>
              <div style={{fontSize:7,fontWeight:600,color:"#4A7090",textTransform:"uppercase",marginBottom:5}}>Duplicate</div>
              <div style={{display:"flex",gap:5,alignItems:"center"}}>
                <button onClick={()=>duplicateTask(editingTask)} style={{padding:"3px 8px",fontSize:9,fontWeight:600,borderRadius:3,border:"1px solid #0099D650",cursor:"pointer",fontFamily:"inherit",background:"#0099D618",color:"#33BBE6"}}>Copy</button>
                <input type="number" min="1" max="50" value={dupCount} onChange={e=>setDupCount(Math.max(1,parseInt(e.target.value)||1))} style={{width:38,padding:"2px 3px",background:"#132339",border:"1px solid #1E3A5F",borderRadius:2,color:"#E0ECF6",fontSize:10,textAlign:"center",outline:"none",fontFamily:"inherit"}}/>
                <button onClick={()=>duplicateMultiple(editingTask,dupCount)} style={{padding:"3px 8px",fontSize:9,fontWeight:600,borderRadius:3,border:"1px solid #0080B850",cursor:"pointer",fontFamily:"inherit",background:"#0080B818",color:"#33AAD6"}}>×copies</button>
              </div>
            </div>}
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:14,gap:5}}>
            <button onClick={()=>setShowForm(false)} style={{padding:"5px 10px",fontSize:9,borderRadius:3,border:"1px solid #1E3A5F",cursor:"pointer",fontFamily:"inherit",background:"transparent",color:"#A8C4DE"}}>Cancel</button>
            <button onClick={saveTask} style={{padding:"5px 14px",fontSize:9,fontWeight:600,borderRadius:3,border:"none",cursor:"pointer",fontFamily:"inherit",background:"#0099D6",color:"#fff",opacity:formData.name?1:.4}}>{editingTask?"Update":"Add"}</button>
          </div>
        </div>
      </div>}

      {/* SETTINGS */}
      {showSettings&&<div style={{position:"fixed",inset:0,background:"#00000080",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)"}} onClick={()=>setShowSettings(false)}>
        <div className="fade-in" onClick={e=>e.stopPropagation()} style={{background:"#132339",border:"1px solid #1E3A5F",borderRadius:10,padding:18,width:300}}>
          <h2 style={{fontFamily:"'Space Grotesk'",fontSize:14,fontWeight:700,color:"#FFFFFF",marginBottom:12}}>Settings</h2>
          <label style={lbl}>Max Crew Per Day</label>
          <input type="number" min="1" max="999" value={maxCrew} onChange={e=>setMaxCrew(Math.max(1,parseInt(e.target.value)||1))} style={{...inp,textAlign:"center",fontSize:16,fontWeight:700,padding:8}}/>
          <div style={{marginTop:10}}><label style={lbl}>Phase Window</label>
            <div style={{display:"flex",alignItems:"center",gap:6}}><input type="number" min="1" max="12" value={phaseWindow} onChange={e=>setPhaseWindow(Math.max(1,Math.min(12,parseInt(e.target.value)||4)))} style={{...inp,width:60,textAlign:"center",fontSize:16,fontWeight:700,padding:8}}/><span style={{fontSize:9,color:"#7BA0C0"}}>phases at a time</span></div>
            <div style={{display:"flex",gap:3,marginTop:5}}>{[2,3,4,6,12].map(w=><button key={w} onClick={()=>setPhaseWindow(w)} style={{padding:"2px 8px",fontSize:8,fontWeight:phaseWindow===w?700:500,borderRadius:3,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${phaseWindow===w?"#0080B860":"#1E3A5F"}`,background:phaseWindow===w?"#0080B820":"transparent",color:phaseWindow===w?"#33AAD6":"#5888A8"}}>{w}</button>)}</div>
          </div>
          <div style={{marginTop:8,padding:7,background:"#0D1B2A",borderRadius:4,border:"1px solid #1A3550"}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9}}><span style={{color:"#5888A8"}}>Peak</span><span style={{color:Math.max(...crewDay)>maxCrew?"#EF4444":"#A8C4DE",fontWeight:600}}>{Math.max(...crewDay)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,marginTop:2}}><span style={{color:"#5888A8"}}>Over days</span><span style={{color:crewDay.filter(c=>c>maxCrew).length?"#EF4444":"#5C9030",fontWeight:600}}>{crewDay.filter(c=>c>maxCrew).length}</span></div>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}><button onClick={()=>setShowSettings(false)} style={{padding:"5px 14px",fontSize:9,fontWeight:600,borderRadius:3,border:"none",cursor:"pointer",fontFamily:"inherit",background:"#0099D6",color:"#fff"}}>Done</button></div>
        </div>
      </div>}

      {/* CREW DAY POPUP */}
      {crewDayIdx!==null&&days[crewDayIdx]&&(()=>{
        const day=days[crewDayIdx],dayStr=`${DAYS_SHORT[day.getDay()]}, ${MONTHS_FULL[day.getMonth()]} ${day.getDate()}, ${day.getFullYear()}`;
        const isNatWknd=isNaturalWeekend(day);const isWork=isWeekday(day);const dayDateStr=toDateStr(day);
        const activeTasks=isWork?allTasks.filter(t=>{if(t.blocked)return false;const s=parseDate(t.startDate),e=addBizDays(s,t.extDuration);return day>=s&&day<e}):[];
        const totalCrew=activeTasks.reduce((s,t)=>s+t.crew,0)+(isWork?dailyCrewTotal:0);const isOver=totalCrew>maxCrew;
        return <div style={{position:"fixed",inset:0,background:"#00000080",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)"}} onClick={()=>{setCrewDayIdx(null);setExpandedCrewTask(null);setCrewNameInput("")}}>
          <div className="fade-in" onClick={e=>e.stopPropagation()} style={{background:"#132339",border:"1px solid #1E3A5F",borderRadius:10,padding:18,width:420,maxWidth:"92vw",maxHeight:"80vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div>
                <h2 style={{fontFamily:"'Space Grotesk'",fontSize:14,fontWeight:700,color:"#FFFFFF"}}>{dayStr}{isNatWknd&&isWork&&<span style={{fontSize:9,color:"#F5A623",marginLeft:6,fontWeight:600}}>WORK DAY</span>}</h2>
                <p style={{fontSize:9,color:!isWork?"#5888A8":isOver?"#EF4444":"#5888A8",marginTop:2}}>{!isWork?"Weekend — no crew scheduled":totalCrew+" crew"+(isOver?` · ⚠ Over (max ${maxCrew})`:` of ${maxCrew}`)}</p>
              </div>
              <button onClick={()=>{setCrewDayIdx(null);setExpandedCrewTask(null);setCrewNameInput("")}} style={{width:24,height:24,borderRadius:5,border:"1px solid #1E3A5F",background:"#132339",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#5888A8" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            {/* Weekend toggle */}
            {isNatWknd&&<div style={{marginBottom:12,padding:"8px 12px",background:isWork?"#F5A62310":"#0D1B2A",borderRadius:6,border:`1px solid ${isWork?"#F5A62330":"#1A3550"}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div><span style={{fontSize:11,fontWeight:600,color:isWork?"#F5A623":"#5888A8"}}>{isWork?"This weekend day is a work day":"This is a weekend — no work scheduled"}</span>
                <p style={{fontSize:9,color:"#4A7090",marginTop:2}}>{isWork?"Auto-scheduler will assign tasks to this day":"Toggle to schedule crew on this day"}</p>
              </div>
              <button onClick={()=>toggleWorkWeekend(dayDateStr)} style={{padding:"5px 12px",fontSize:10,fontWeight:700,borderRadius:4,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${isWork?"#EF444440":"#7AB64840"}`,background:isWork?"#EF444415":"#7AB64815",color:isWork?"#EF4444":"#7AB648"}}>{isWork?"Revert to Weekend":"Make Work Day"}</button>
            </div>}
            {isWork&&<div style={{marginBottom:12,background:"#0D1B2A",borderRadius:4,padding:6,border:"1px solid #1A3550"}}><div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:"#5888A8",marginBottom:3}}><span>Crew</span><span style={{color:isOver?"#EF4444":"#A8C4DE",fontWeight:600}}>{totalCrew}/{maxCrew}</span></div><div style={{height:8,background:"#1A3550",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,totalCrew/maxCrew*100)}%`,background:isOver?"#EF4444":"#0099D6",borderRadius:4}}/></div></div>}
            {/* Daily tasks in popup */}
            {isWork&&dailyTasks.length>0&&<div style={{marginBottom:6}}>
              <div style={{fontSize:7,fontWeight:600,color:"#7090A8",textTransform:"uppercase",padding:"0 4px 4px",letterSpacing:"0.05em"}}>Daily Recurring</div>
              {dailyTasks.map(dt=>{
                const isExp=expandedCrewTask===dt.id;const members=dt.crewMembers||[];
                return <div key={dt.id} style={{background:"#0D1B2A",borderRadius:5,border:`1px solid ${isExp?"#F5A62340":"#1A3550"}`,overflow:"hidden",marginBottom:2}}>
                  <div onClick={()=>{setExpandedCrewTask(isExp?null:dt.id);setCrewNameInput("")}} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",cursor:"pointer",background:isExp?"#F5A62308":"transparent"}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:"#F5A623",flexShrink:0}}/>
                    <div style={{flex:1}}><div style={{fontSize:10,fontWeight:500,color:"#F5A623"}}>{dt.name}</div><div style={{fontSize:8,color:"#7090A8"}}>Every weekday{members.length>0?` · ${members.length}/${dt.crew} assigned`:""}</div></div>
                    <span style={{fontSize:14,fontWeight:700,color:"#F5A623",fontFamily:"'Space Grotesk'"}}>{dt.crew}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={isExp?"#F5A623":"#4A7090"} strokeWidth="2" style={{transform:isExp?"rotate(180deg)":"none"}}><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  {isExp&&<div style={{padding:"6px 10px 10px",borderTop:"1px solid #1A3550"}}>
                    {members.length>0?members.map((name,mi)=><div key={mi} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:"#132339",borderRadius:3,border:"1px solid #1A3550",marginBottom:2}}>
                      <div style={{width:20,height:20,borderRadius:"50%",background:"#F5A62325",border:"1px solid #F5A62340",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:8,fontWeight:700,color:"#F5A623"}}>{name.charAt(0)}</span></div>
                      <span style={{fontSize:10,color:"#E0ECF6",flex:1}}>{name}</span>
                      <button onClick={e=>{e.stopPropagation();setDailyTasks(p=>p.map(t=>t.id===dt.id?{...t,crewMembers:t.crewMembers.filter((_,j)=>j!==mi)}:t))}} style={{width:16,height:16,borderRadius:3,border:"1px solid #1E3A5F",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#5888A8" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                    </div>):<div style={{fontSize:8,color:"#4A7090",marginBottom:6}}>No crew assigned yet</div>}
                    {members.length<dt.crew&&<div style={{display:"flex",gap:4}}>
                      <input value={crewNameInput} onChange={e=>setCrewNameInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&crewNameInput.trim()){setDailyTasks(p=>p.map(t=>t.id===dt.id?{...t,crewMembers:[...t.crewMembers,crewNameInput.trim()]}:t));setCrewNameInput("")}}} placeholder="Add crew member..." style={{flex:1,padding:"5px 8px",background:"#132339",border:"1px solid #1E3A5F",borderRadius:3,color:"#E0ECF6",fontSize:10,outline:"none",fontFamily:"inherit"}}/>
                      <button onClick={()=>{if(crewNameInput.trim()){setDailyTasks(p=>p.map(t=>t.id===dt.id?{...t,crewMembers:[...t.crewMembers,crewNameInput.trim()]}:t));setCrewNameInput("")}}} style={{padding:"4px 10px",fontSize:9,fontWeight:600,borderRadius:3,border:"none",cursor:"pointer",fontFamily:"inherit",background:"#F5A623",color:"#000"}}>Add</button>
                    </div>}
                    {members.length>=dt.crew&&<div style={{fontSize:8,color:"#7AB648"}}>✓ All {dt.crew} positions filled</div>}
                  </div>}
                </div>})}
            </div>}
            {/* Phase tasks */}
            {activeTasks.length>0&&dailyTasks.length>0&&isWork&&<div style={{fontSize:7,fontWeight:600,color:"#4A7090",textTransform:"uppercase",padding:"0 4px 4px",letterSpacing:"0.05em"}}>Phase Tasks</div>}
            {activeTasks.length>0&&<div style={{display:"flex",flexDirection:"column",gap:2}}>
              {activeTasks.map((t)=>{const color=getColor(allTasks.indexOf(t));const sc=statusColor(t.status);const dayNum=(()=>{let cnt=0;const s=parseDate(t.startDate);for(let d=new Date(s);d<=day;d.setDate(d.getDate()+1)){if(isWeekday(d))cnt++}return cnt})();const isExp=expandedCrewTask===t.id;const members=t.crewMembers||[];
                return <div key={t.id} style={{background:"#0D1B2A",borderRadius:5,border:`1px solid ${isExp?"#0099D640":"#1A3550"}`,overflow:"hidden"}}>
                  <div onClick={()=>{setExpandedCrewTask(isExp?null:t.id);setCrewNameInput("")}} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",cursor:"pointer"}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:color,flexShrink:0}}/>
                    <div style={{flex:1}}><div style={{fontSize:10,fontWeight:500,color:"#E0ECF6"}}>{t.name}</div><div style={{fontSize:8,color:"#5888A8"}}>Day {dayNum}/{t.extDuration}{t.status&&<span style={{color:sc,fontWeight:600,marginLeft:4}}>{t.status}</span>}{(taskMap[t.id]?.missedCount||0)>0&&<span style={{color:"#EF4444",fontWeight:600,marginLeft:4}}>⚠{taskMap[t.id].missedCount}d delayed</span>}{members.length>0&&<span style={{color:"#33BBE6",marginLeft:4}}>{members.length}/{t.crew}</span>}</div></div>
                    <span style={{fontSize:14,fontWeight:700,color:"#E0ECF6",fontFamily:"'Space Grotesk'"}}>{t.crew}</span>
                  </div>
                  {isExp&&<div style={{padding:"6px 10px 10px",borderTop:"1px solid #1A3550"}}>
                    {/* Status controls */}
                    <div style={{marginBottom:8,padding:"6px 8px",background:"#132339",borderRadius:4,border:"1px solid #1A3550"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                        <span style={{fontSize:7,fontWeight:600,color:"#4A7090",textTransform:"uppercase",letterSpacing:"0.05em"}}>Status</span>
                        <span style={{fontSize:10,fontWeight:700,color:sc||"#5888A8",fontFamily:"'Space Grotesk'"}}>{t.status||"Not Started"}</span>
                      </div>
                      <div style={{display:"flex",gap:3,marginBottom:6}}>
                        <button onClick={e=>{e.stopPropagation();setTaskMap(p=>({...p,[t.id]:{...p[t.id],status:null,extDuration:p[t.id].fullDuration||p[t.id].extDuration,baseDur:p[t.id].fullDuration||p[t.id].extDuration,intDuration:p[t.id].fullIntDuration||p[t.id].intDuration,lastUpdateDate:toDateStr(today)}}))}}
                          style={{padding:"3px 8px",fontSize:8,fontWeight:!t.status?700:500,borderRadius:3,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${!t.status?"#0099D660":"#1E3A5F"}`,background:!t.status?"#0099D620":"transparent",color:!t.status?"#33BBE6":"#5888A8"}}>Not Started</button>
                        <button onClick={e=>{e.stopPropagation();removeTask(t.id)}}
                          style={{padding:"3px 8px",fontSize:8,fontWeight:600,borderRadius:3,cursor:"pointer",fontFamily:"inherit",border:"1px solid #7AB64840",background:"#7AB64815",color:"#7AB648",marginLeft:"auto",display:"flex",alignItems:"center",gap:3}}>
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Complete</button>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <input type="range" min="1" max="99" value={t.status?parseInt(t.status)||1:1}
                          onChange={e=>{e.stopPropagation();const p=parseInt(e.target.value)||1;const fullD=taskMap[t.id]?.fullDuration||t.extDuration;const fullInt=taskMap[t.id]?.fullIntDuration||t.intDuration;const rem=Math.max(1,Math.ceil(fullD*(1-p/100)));const remInt=Math.min(rem,Math.max(0,Math.ceil(fullInt*(1-p/100))));setTaskMap(prev=>({...prev,[t.id]:{...prev[t.id],status:p+"%",extDuration:rem,baseDur:rem,intDuration:remInt,lastUpdateDate:toDateStr(today)}}))}}
                          style={{flex:1,accentColor:(parseInt(t.status)||0)>=80?"#7AB648":(parseInt(t.status)||0)>=40?"#F5A623":"#0099D6",height:6}}/>
                        <span style={{fontSize:9,fontWeight:600,color:sc||"#5888A8",minWidth:28,textAlign:"right"}}>{t.status?parseInt(t.status)+"%":"0%"}</span>
                      </div>
                    </div>
                    {/* Crew members */}
                    {members.map((name,mi)=><div key={mi} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:"#132339",borderRadius:3,border:"1px solid #1A3550",marginBottom:2}}><div style={{width:20,height:20,borderRadius:"50%",background:`${color}25`,border:`1px solid ${color}40`,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:8,fontWeight:700,color}}>{name.charAt(0)}</span></div><span style={{fontSize:10,color:"#E0ECF6",flex:1}}>{name}</span><button onClick={e=>{e.stopPropagation();removeCrewMember(t.id,mi)}} style={{width:16,height:16,borderRadius:3,border:"1px solid #1E3A5F",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#5888A8" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>)}
                    {members.length===0&&<div style={{fontSize:8,color:"#4A7090",marginBottom:6}}>No crew assigned</div>}
                    {members.length<t.crew&&<div style={{display:"flex",gap:4}}><input value={crewNameInput} onChange={e=>setCrewNameInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addCrewMember(t.id,crewNameInput)}} placeholder="Add crew..." style={{flex:1,padding:"5px 8px",background:"#132339",border:"1px solid #1E3A5F",borderRadius:3,color:"#E0ECF6",fontSize:10,outline:"none",fontFamily:"inherit"}}/><button onClick={()=>addCrewMember(t.id,crewNameInput)} style={{padding:"4px 10px",fontSize:9,fontWeight:600,borderRadius:3,border:"none",cursor:"pointer",fontFamily:"inherit",background:"#0099D6",color:"#fff"}}>Add</button></div>}
                    {members.length>=t.crew&&<div style={{fontSize:8,color:"#7AB648"}}>✓ All filled</div>}
                  </div>}
                </div>})}
            </div>}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,padding:"8px 10px",background:isOver?"#EF444410":"#0099D610",borderRadius:5}}><span style={{fontSize:9,fontWeight:600,color:isOver?"#EF4444":"#33BBE6"}}>{activeTasks.length+(isWork?dailyTasks.length:0)} tasks</span><span style={{fontSize:13,fontWeight:700,color:isOver?"#EF4444":"#33BBE6",fontFamily:"'Space Grotesk'"}}>{totalCrew}</span></div>
            {isWork&&<div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}><button onClick={()=>submitDayLog(crewDayIdx)} style={{padding:"6px 16px",fontSize:11,fontWeight:700,borderRadius:5,border:"none",cursor:"pointer",fontFamily:"inherit",background:"#7AB648",color:"#fff"}}>✓ Submit Day Log</button></div>}
          </div>
        </div>
      })()}

      {/* REPORT */}
      {showReport&&(()=>{
        const reportDate=`${DAYS_SHORT[today.getDay()]}, ${MONTHS_FULL[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
        const phaseReport=[{ph:1,tasks:Object.values(TASK_NAMES).map(n=>({name:n,status:"100%"}))}];
        for(let p=2;p<=12;p++){const pT=[];const tmpl=PHASE_DATA[p]||[];const present=new Set(tmpl.map(r=>r[0]));for(let pos=1;pos<=13;pos++){const name=TASK_NAMES[pos];if(!present.has(pos))pT.push({name,status:"100%"});else{const found=allTasks.find(t=>t.name===`Ph${p} ${name}`);pT.push(found?{name,status:found.status||"Not Started",blocked:found.blocked||false,blockedReason:found.blockedReason||"",missedCount:found.missedCount||taskMap[found.id]?.missedCount||0}:{name,status:"100%"});}}phaseReport.push({ph:p,tasks:pT});}
        function pc(tasks){let s=0;tasks.forEach(t=>{if(t.status==="100%")s+=100;else if(t.status&&t.status!=="Not Started")s+=parseInt(t.status)||0;});return Math.round(s/tasks.length);}
        const overall=Math.round(phaseReport.reduce((s,p)=>s+pc(p.tasks),0)/phaseReport.length);
        return <div style={{position:"fixed",inset:0,background:"#00000080",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)"}} onClick={()=>setShowReport(false)}>
          <div className="fade-in" onClick={e=>e.stopPropagation()} style={{background:"#132339",border:"1px solid #1E3A5F",borderRadius:12,padding:24,width:680,maxWidth:"96vw",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
              <div>
                <h2 style={{fontFamily:"'Space Grotesk'",fontSize:22,fontWeight:700,color:"#FFFFFF"}}>Daily Status Report</h2>
                <p style={{fontSize:14,color:"#7BA0C0",marginTop:4}}>{reportDate}</p>
              </div>
              <button onClick={()=>setShowReport(false)} style={{width:28,height:28,borderRadius:6,border:"1px solid #1E3A5F",background:"#132339",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5888A8" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div style={{padding:"14px 16px",background:"#0D1B2A",borderRadius:8,border:"1px solid #1A3550",marginBottom:18}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:14,fontWeight:600,color:"#E0ECF6"}}>Overall Building Progress</span>
                <span style={{fontSize:22,fontWeight:700,color:overall>=80?"#7AB648":overall>=40?"#F5A623":"#0099D6",fontFamily:"'Space Grotesk'"}}>{overall}%</span>
              </div>
              <div style={{height:14,background:"#1A3550",borderRadius:7,overflow:"hidden"}}><div style={{height:"100%",width:`${overall}%`,background:overall>=80?"#7AB648":overall>=40?"#F5A623":"#0099D6",borderRadius:7}}/></div>
            </div>
            {phaseReport.map(({ph,tasks:pT})=>{const pPct=pc(pT);const done=pPct===100;const sc=pPct>=80?"#7AB648":pPct>=40?"#F5A623":pPct>0?"#0099D6":"#5888A8";
              return <div key={ph} style={{marginBottom:10,background:"#0D1B2A",borderRadius:8,border:`1px solid ${done?"#7AB64830":"#1A3550"}`,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px"}}>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <span style={{fontSize:15,fontWeight:700,color:done?"#7AB648":"#E0ECF6",fontFamily:"'Space Grotesk'"}}>Phase {ph}</span>
                    {done&&<span style={{fontSize:11,fontWeight:600,color:"#7AB648",background:"#7AB64820",padding:"2px 8px",borderRadius:4}}>COMPLETE</span>}
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <div style={{width:80,height:8,background:"#1A3550",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${pPct}%`,background:sc,borderRadius:4}}/></div>
                    <span style={{fontSize:14,fontWeight:700,color:sc,fontFamily:"'Space Grotesk'",minWidth:36,textAlign:"right"}}>{pPct}%</span>
                  </div>
                </div>
                <div style={{padding:"0 10px 10px"}}>{pT.map((t,ti)=>{const isDone=t.status==="100%";const isS=t.status&&t.status!=="Not Started"&&t.status!=="100%";const isB=t.blocked;const pct=isDone?100:isS?(parseInt(t.status)||0):0;const tsc=isB?"#EF4444":isDone?"#7AB648":pct>=80?"#7AB648":pct>=40?"#F5A623":pct>0?"#0099D6":"#5888A8";
                  return <div key={ti} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"6px 10px",borderRadius:4,background:isB?"#EF444408":"transparent",marginBottom:1}}>
                    {isB?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" style={{flexShrink:0,marginTop:2}}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>:isDone?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7AB648" strokeWidth="2.5" style={{flexShrink:0,marginTop:2}}><polyline points="20 6 9 17 4 12"/></svg>:isS?<div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${tsc}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",marginTop:2}}><div style={{width:7,height:7,borderRadius:"50%",background:tsc}}/></div>:<div style={{width:16,height:16,borderRadius:"50%",border:"2px solid #1E3A5F",flexShrink:0,marginTop:2}}/>}
                    <div style={{flex:1,minWidth:0}}>
                      <span style={{fontSize:13,color:isB?"#EF444490":isDone?"#5888A8":"#C0D4E8",textDecoration:isDone?"line-through":"none"}}>{t.name}</span>
                      {isB&&t.blockedReason&&<div style={{fontSize:11,color:"#EF444460",marginTop:2}}>↳ {t.blockedReason}</div>}
                      {(t.missedCount||0)>0&&!isB&&!isDone&&<div style={{fontSize:11,color:"#EF444470",marginTop:2}}>↳ {t.missedCount} day{t.missedCount>1?"s":""} delayed from missed updates</div>}
                    </div>
                    <span style={{fontSize:13,fontWeight:isB||isDone||isS?600:400,color:tsc,minWidth:90,textAlign:"right",flexShrink:0}}>{isB?(pct>0?`Blocked · ${pct}% complete`:"Blocked"):isDone?"Finished":isS?t.status+" complete":"Not Started"}{(t.missedCount||0)>0&&!isB&&!isDone?` (+${t.missedCount})`:""}</span>
                  </div>})}</div>
              </div>})}

            {/* TODAY'S WORK */}
            {(()=>{
              const todayTasks=isWeekday(today)?allTasks.filter(t=>{if(t.blocked)return false;const s=parseDate(t.startDate),e=addBizDays(s,t.extDuration);return today>=s&&today<e}):[];
              const todayCrew=todayTasks.reduce((s,t)=>s+t.crew,0)+(isWeekday(today)?dailyCrewTotal:0);
              return <div style={{marginTop:16,background:"#0D1B2A",borderRadius:8,border:"1px solid #0099D640",overflow:"hidden"}}>
                <div style={{padding:"12px 16px",background:"#0099D608",borderBottom:"1px solid #0099D620"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:17,fontWeight:700,color:"#33BBE6",fontFamily:"'Space Grotesk'"}}>Today's Work</span>
                    <span style={{fontSize:14,fontWeight:600,color:"#A8C4DE"}}>{todayCrew} crew on site</span>
                  </div>
                  <p style={{fontSize:12,color:"#5888A8",marginTop:3}}>{isWeekday(today)?`${todayTasks.length} phase tasks + ${dailyTasks.length} daily tasks`:"Weekend — no work scheduled"}</p>
                </div>
                {isWeekday(today)&&<div style={{padding:"10px 10px 14px"}}>
                  {/* Daily recurring tasks */}
                  {dailyTasks.length>0&&<div style={{marginBottom:10}}>
                    <div style={{fontSize:11,fontWeight:600,color:"#F5A623",textTransform:"uppercase",letterSpacing:"0.05em",padding:"0 6px 6px"}}>Daily Recurring</div>
                    {dailyTasks.map(dt=>{
                      const members=dt.crewMembers||[];
                      return <div key={dt.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 12px",background:"#132339",borderRadius:6,border:"1px solid #1A3550",marginBottom:4}}>
                        <div style={{width:16,height:16,borderRadius:"50%",background:"#F5A62330",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
                          <div style={{width:7,height:7,borderRadius:"50%",background:"#F5A623"}}/>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,color:"#F5A623"}}>{dt.name}</div>
                          <div style={{fontSize:12,color:"#7090A8",marginTop:2}}>{dt.crew} crew assigned</div>
                          {members.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:5}}>
                            {members.map((name,mi)=><span key={mi} style={{fontSize:11,color:"#E0ECF6",background:"#F5A62318",border:"1px solid #F5A62330",borderRadius:4,padding:"2px 8px"}}>{name}</span>)}
                          </div>}
                          {members.length===0&&<div style={{fontSize:11,color:"#4A7090",marginTop:3}}>No crew members assigned</div>}
                        </div>
                      </div>
                    })}
                  </div>}
                  {/* Phase tasks active today */}
                  {todayTasks.length>0&&<div>
                    <div style={{fontSize:11,fontWeight:600,color:"#33BBE6",textTransform:"uppercase",letterSpacing:"0.05em",padding:"0 6px 6px"}}>Phase Tasks</div>
                    {todayTasks.map(t=>{
                      const color=getColor(allTasks.indexOf(t));const sc=statusColor(t.status);const members=t.crewMembers||[];
                      const pct=t.status?parseInt(t.status)||0:0;
                      const startPct=todayStartPct.current[t.id]||0;
                      const gained=pct-startPct;
                      return <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 12px",background:"#132339",borderRadius:6,border:"1px solid #1A3550",marginBottom:4}}>
                        <div style={{width:16,height:16,borderRadius:"50%",background:`${color}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
                          <div style={{width:7,height:7,borderRadius:"50%",background:color}}/>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                            <span style={{fontSize:13,fontWeight:600,color:"#E0ECF6"}}>{t.name}</span>
                            <span style={{fontSize:13,fontWeight:700,color:sc||"#5888A8",flexShrink:0}}>{t.status||"Not Started"}</span>
                          </div>
                          {/* Progress bar with today's gain highlighted */}
                          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
                            <div style={{flex:1,height:8,background:"#1A3550",borderRadius:4,overflow:"hidden",position:"relative"}}>
                              {startPct>0&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:`${startPct}%`,background:sc||"#1A3550",borderRadius:"4px 0 0 4px",opacity:.4}}/>}
                              {gained>0&&<div style={{position:"absolute",left:`${startPct}%`,top:0,bottom:0,width:`${gained}%`,background:sc||"#0099D6",borderRadius:startPct===0?"4px 0 0 4px":"0",borderRight:pct<100?"none":"none"}}/>}
                              {pct>0&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:`${pct}%`,background:sc||"#1A3550",borderRadius:4,opacity:.35}}/>}
                            </div>
                            <span style={{fontSize:11,color:"#5888A8",flexShrink:0}}>{t.crew} crew · {t.extDuration}d left</span>
                          </div>
                          {/* Today's progress summary */}
                          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
                            {gained>0?<span style={{fontSize:12,fontWeight:700,color:"#7AB648"}}>+{gained}% today</span>
                              :gained===0&&pct>0?<span style={{fontSize:12,color:"#F5A623"}}>No progress today</span>
                              :pct===0?<span style={{fontSize:12,color:"#5888A8"}}>Not started</span>
                              :null}
                            {startPct>0&&<span style={{fontSize:11,color:"#4A7090"}}>Started day at {startPct}%</span>}
                          </div>
                          {members.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:5}}>
                            {members.map((name,mi)=><span key={mi} style={{fontSize:11,color:"#E0ECF6",background:`${color}18`,border:`1px solid ${color}30`,borderRadius:4,padding:"2px 8px"}}>{name}</span>)}
                          </div>}
                          {members.length===0&&<div style={{fontSize:11,color:"#4A7090",marginTop:3}}>No crew members assigned</div>}
                        </div>
                      </div>
                    })}
                  </div>}
                  {todayTasks.length===0&&dailyTasks.length===0&&<div style={{padding:16,textAlign:"center",color:"#4A7090",fontSize:13}}>No tasks scheduled for today</div>}
                </div>}
              </div>
            })()}

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,padding:"10px 16px",background:"#0D1B2A",borderRadius:6,border:"1px solid #1A3550"}}>
              <span style={{fontSize:12,color:"#5888A8"}}>12 phases · 13 tasks per phase · 156 total</span>
              <span style={{fontSize:12,color:"#7BA0C0"}}>{allTasks.length} tasks remaining</span>
            </div>
          </div>
        </div>
      })()}

      {/* REPORT LOG */}
      {showReportLog&&<div style={{position:"fixed",inset:0,background:"#00000080",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)"}} onClick={()=>{setShowReportLog(false);setViewingReport(null)}}>
        <div className="fade-in" onClick={e=>e.stopPropagation()} style={{background:"#132339",border:"1px solid #1E3A5F",borderRadius:12,padding:24,width:580,maxWidth:"94vw",maxHeight:"88vh",overflowY:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div>
              <h2 style={{fontFamily:"'Space Grotesk'",fontSize:20,fontWeight:700,color:"#FFFFFF"}}>Day Logs</h2>
              <p style={{fontSize:12,color:"#5888A8",marginTop:3}}>{reportLog.length} log{reportLog.length!==1?"s":""} submitted</p>
            </div>
            <button onClick={()=>{setShowReportLog(false);setViewingReport(null)}} style={{width:28,height:28,borderRadius:6,border:"1px solid #1E3A5F",background:"#132339",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5888A8" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          {viewingReport?(()=>{
            const rpt=viewingReport;
            return <div>
              <button onClick={()=>setViewingReport(null)} style={{padding:"4px 10px",fontSize:11,borderRadius:4,border:"1px solid #1E3A5F",cursor:"pointer",fontFamily:"inherit",background:"transparent",color:"#33BBE6",marginBottom:12}}>← Back to log</button>
              <div style={{padding:"12px 14px",background:"#0D1B2A",borderRadius:6,border:"1px solid #1A3550",marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:15,fontWeight:700,color:"#FFFFFF",fontFamily:"'Space Grotesk'"}}>{rpt.dateLabel}</span>
                  <span style={{fontSize:12,color:"#5888A8"}}>Last update {rpt.timeLabel}{rpt.updates>1?` · ${rpt.updates} updates since ${rpt.firstSubmitted}`:""} · {rpt.totalCrew} crew</span>
                </div>
              </div>
              {/* Daily recurring tasks */}
              {rpt.dailyTasks?.length>0&&<div style={{marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:600,color:"#F5A623",textTransform:"uppercase",letterSpacing:"0.05em",padding:"0 4px 6px"}}>Daily Tasks</div>
                {rpt.dailyTasks.map((dt,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#0D1B2A",borderRadius:5,border:"1px solid #1A3550",marginBottom:3}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:"#F5A623",flexShrink:0}}/>
                  <span style={{fontSize:13,color:"#F5A623",flex:1,fontWeight:600}}>{dt.name}</span>
                  <span style={{fontSize:12,color:"#5888A8"}}>{dt.crew} crew</span>
                  {dt.crewMembers?.length>0&&<div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{dt.crewMembers.map((n,j)=><span key={j} style={{fontSize:10,color:"#E0ECF6",background:"#F5A62318",border:"1px solid #F5A62330",borderRadius:3,padding:"1px 6px"}}>{n}</span>)}</div>}
                </div>)}
              </div>}
              {/* Phase tasks */}
              {rpt.tasks?.length>0&&<div>
                <div style={{fontSize:11,fontWeight:600,color:"#33BBE6",textTransform:"uppercase",letterSpacing:"0.05em",padding:"0 4px 6px"}}>Phase Tasks</div>
                {rpt.tasks.map((t,i)=>{const pct=t.currPct||parseInt(t.status)||0;const sc=pct>=80?"#7AB648":pct>=40?"#F5A623":pct>0?"#0099D6":"#5888A8";const change=t.change||0;const startPct=t.startPct||0;
                  return <div key={i} style={{padding:"10px 12px",background:"#0D1B2A",borderRadius:5,border:`1px solid ${change>0?"#7AB64830":change===0&&pct>0?"#F5A62320":"#1A3550"}`,marginBottom:4}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:13,color:"#E0ECF6",flex:1,fontWeight:600}}>{t.name}</span>
                      <span style={{fontSize:13,fontWeight:700,color:sc}}>{t.status||"Not Started"}</span>
                    </div>
                    {/* Progress bar with start-of-day vs end-of-day */}
                    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:5}}>
                      <div style={{flex:1,height:8,background:"#1A3550",borderRadius:4,overflow:"hidden",position:"relative"}}>
                        {startPct>0&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:`${startPct}%`,background:sc,borderRadius:4,opacity:.35}}/>}
                        {change>0&&<div style={{position:"absolute",left:`${startPct}%`,top:0,bottom:0,width:`${change}%`,background:sc,borderRadius:startPct===0?"4px 0 0 4px":"0"}}/>}
                        {pct>0&&change===0&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:`${pct}%`,background:sc,borderRadius:4,opacity:.35}}/>}
                      </div>
                      <span style={{fontSize:10,color:"#5888A8",flexShrink:0}}>{t.crew} crew</span>
                    </div>
                    {/* Change indicator */}
                    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:5}}>
                      {change>0?<span style={{fontSize:12,fontWeight:700,color:"#7AB648"}}>+{change}% today</span>
                        :pct>0?<span style={{fontSize:12,fontWeight:600,color:"#F5A623"}}>No change</span>
                        :<span style={{fontSize:12,color:"#5888A8"}}>Not started</span>}
                      {startPct>0&&<span style={{fontSize:10,color:"#4A7090"}}>Started day at {startPct}%</span>}
                    </div>
                    {/* Crew members */}
                    {t.crewMembers?.length>0&&<div style={{display:"flex",gap:3,flexWrap:"wrap",marginTop:5}}>{t.crewMembers.map((n,j)=><span key={j} style={{fontSize:10,color:"#E0ECF6",background:"#0099D618",border:"1px solid #0099D630",borderRadius:3,padding:"1px 6px"}}>{n}</span>)}</div>}
                    {(!t.crewMembers||t.crewMembers.length===0)&&<div style={{fontSize:10,color:"#4A7090",marginTop:4}}>No crew assigned</div>}
                  </div>})}
              </div>}
              {rpt.tasks?.length===0&&rpt.dailyTasks?.length===0&&<div style={{padding:20,textAlign:"center",color:"#4A7090",fontSize:13}}>No tasks logged</div>}
            </div>
          })():(
            reportLog.length===0?<div style={{padding:40,textAlign:"center"}}><div style={{fontSize:14,color:"#4A7090",marginBottom:8}}>No day logs submitted yet</div><p style={{fontSize:12,color:"#5888A8"}}>Open a day's crew popup and click "Submit Day Log" to record it here.</p></div>
            :<div style={{display:"flex",flexDirection:"column",gap:4}}>
              {reportLog.map((rpt)=>{
                const changed=(rpt.tasks||[]).filter(t=>(t.change||0)>0).length;
                const noChange=(rpt.tasks||[]).filter(t=>(t.change||0)===0&&(t.currPct||parseInt(t.status)||0)>0).length;
                return <div key={rpt.id} onClick={()=>setViewingReport(rpt)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#0D1B2A",borderRadius:6,border:"1px solid #1A3550",cursor:"pointer",transition:"border-color .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="#0099D650"} onMouseLeave={e=>e.currentTarget.style.borderColor="#1A3550"}>
                  <div style={{width:40,height:40,borderRadius:8,background:"#0099D615",border:"1px solid #0099D630",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:14,fontWeight:700,color:"#33BBE6",fontFamily:"'Space Grotesk'"}}>{rpt.totalCrew}</span>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#E0ECF6"}}>{rpt.dateLabel}</div>
                    <div style={{fontSize:11,color:"#5888A8"}}>Last update {rpt.timeLabel}{rpt.updates>1?` · First at ${rpt.firstSubmitted} · ${rpt.updates} updates`:""} · {rpt.totalCrew} crew</div>
                    <div style={{fontSize:10,marginTop:2}}>{changed>0&&<span style={{color:"#7AB648",fontWeight:600}}>{changed} progressed</span>}{changed>0&&noChange>0&&<span style={{color:"#4A7090"}}> · </span>}{noChange>0&&<span style={{color:"#F5A623"}}>{noChange} no change</span>}</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A7090" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              })}
            </div>
          )}
        </div>
      </div>}

      {/* ADD DAILY TASK */}
      {showDailyForm&&<div style={{position:"fixed",inset:0,background:"#00000080",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)"}} onClick={()=>setShowDailyForm(false)}>
        <div className="fade-in" onClick={e=>e.stopPropagation()} style={{background:"#132339",border:"1px solid #1E3A5F",borderRadius:10,padding:18,width:340,maxWidth:"92vw"}}>
          <h2 style={{fontFamily:"'Space Grotesk'",fontSize:14,fontWeight:700,color:"#FFFFFF",marginBottom:10}}>New Daily Task</h2>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div><label style={lbl}>Task Name</label><input value={dailyFormData.name} onChange={e=>setDailyFormData(f=>({...f,name:e.target.value}))} placeholder="e.g. Safety Meeting" style={inp}/></div>
            <div><label style={lbl}>Crew Size</label><input type="number" min="1" max="17" value={dailyFormData.crew} onChange={e=>setDailyFormData(f=>({...f,crew:Math.max(1,parseInt(e.target.value)||1)}))} style={{...inp,width:80,textAlign:"center"}}/></div>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:14,gap:5}}>
            <button onClick={()=>setShowDailyForm(false)} style={{padding:"5px 10px",fontSize:9,borderRadius:3,border:"1px solid #1E3A5F",cursor:"pointer",fontFamily:"inherit",background:"transparent",color:"#A8C4DE"}}>Cancel</button>
            <button onClick={()=>{if(!dailyFormData.name.trim())return;setDailyTasks(p=>[...p,{id:`daily-${Date.now()}`,name:dailyFormData.name.trim(),crew:dailyFormData.crew,crewMembers:[]}]);setDailyFormData({name:"",crew:2});setShowDailyForm(false)}} style={{padding:"5px 14px",fontSize:9,fontWeight:600,borderRadius:3,border:"none",cursor:"pointer",fontFamily:"inherit",background:"#F5A623",color:"#000",opacity:dailyFormData.name.trim()?1:.4}}>Add</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
