import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabase client — reads from Vite env vars
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const ROW_COLORS = ["#3B82F6","#8B5CF6","#EC4899","#F59E0B","#10B981","#06B6D4","#EF4444","#84CC16","#F97316","#6366F1","#14B8A6","#E879F9","#FB923C","#22D3EE","#A3E635"];
function getColor(idx) { return ROW_COLORS[idx % ROW_COLORS.length]; }
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const TASK_NAMES = {1:"Center Racking",2:"Center Racking Arms",3:"Ave D Racking",4:"Ave D Arms",5:"Ave A Racking",6:"Ave A Arms",7:"Upper Containment",8:"Tunnels",9:"Assembling Baffles",10:"Install Baffles",11:"Install Doors",12:"F-Track",13:"Lower Containment Panels"};
const TASK_CATS = {1:"Racking",2:"Racking",3:"Racking",4:"Racking",5:"Racking",6:"Racking",7:"Containment",8:"Containment",9:"Baffles",10:"Baffles",11:"Finishes",12:"Finishes",13:"Containment"};
const DEP_RULES = {1:[],2:[1],3:[1],4:[3],5:[1],6:[5],7:[2],8:[7],9:[],10:[9],11:[1],12:[10],13:[10,12]};

const PHASE_DATA = {
  2:[[8,2,3,5,"83%"],[9,1,2,4,null],[10,2,2,4,null],[11,2,2,4,"80%"],[12,2,1,2,null],[13,2,2,4,"94%"]],
  3:[[9,1,1,3,"70%"],[10,1,1,3,"72%"],[11,1,1,3,"40%"],[12,2,1,3,"70%"],[13,2,1,3,"72%"]],
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
  for (const [ps, rows] of Object.entries(PHASE_DATA)) {
    const ph = parseInt(ps);
    for (const [tPos, crew, intD, extD, status] of rows) {
      const id = nextId++; idMap[`${ph}-${tPos}`] = id;
      const deps = (DEP_RULES[tPos]||[]).map(d => idMap[`${ph}-${d}`]).filter(Boolean);
      // Cross-phase: Assembling Baffles (pos 9) can't start until previous phase Install Baffles (pos 10) is done
      if (tPos === 9) {
        const prevInstallId = idMap[`${ph-1}-10`];
        if (prevInstallId) deps.push(prevInstallId);
      }
      let remExt = extD;
      if (status) { remExt = Math.max(1, Math.ceil(extD * (1 - (parseInt(status)||0) / 100))); }
      tasks.push({ id, name: `Ph${ph} ${TASK_NAMES[tPos]}`, startDate: "2026-03-30", intDuration: intD, extDuration: remExt, baseCrew: crew, baseDur: remExt, category: TASK_CATS[tPos], crew, deps, status: status||null, fullDuration: extD, crewMembers: [] });
    }
  }
  return tasks;
}
const initialTasks = generateTasks();

function toDateStr(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function parseDate(s) { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function isWeekday(d) { const day = d.getDay(); return day !== 0 && day !== 6; }
// Add n business days (weekdays only) to a date
function addBizDays(d, n) { const r = new Date(d); let remaining = n; while (remaining > 0) { r.setDate(r.getDate() + 1); if (isWeekday(r)) remaining--; } return r; }
// Get the calendar day index for the end of n business days from a start day index, given anchor
function bizEndIdx(startIdx, bizDays, anchor) { let idx = startIdx, counted = 0; while (counted < bizDays) { const day = addDays(anchor, idx); if (isWeekday(day)) counted++; if (counted < bizDays) idx++; } return idx + 1; /* exclusive end */ }
// Check if a calendar day index is a weekday
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

  // Sort tasks: by phase first, then by original list position within phase
  // This ensures lower phases get scheduled before higher ones
  const phased = items.map((t,origIdx) => ({...t, _ph: getPhase(t.name), _oi: origIdx}));
  phased.sort((a,b) => a._ph - b._ph || a._oi - b._oi);

  // Schedule in rounds: only allow tasks within the phase window
  const scheduled = new Set();
  const allPhases = [...new Set(phased.map(t => t._ph))].sort((a,b) => a-b);
  
  for (const minPh of allPhases) {
    const maxPh = minPh + (phaseWindow || 999) - 1;
    // Schedule all unscheduled tasks in [minPh, maxPh]
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
        if (fits) {
          for (const idx of wi) au(idx, t.crew);
          res[t.id] = { ...t, startDate: toDateStr(addDays(anchor, sd)) };
          endOf[t.id] = wi[wi.length - 1] + 1;
          placed = true; scheduled.add(t.id); break;
        }
      }
      if (!placed) {
        let md = earliest; for (const k of Object.keys(cap)) { const ki = parseInt(k); if (ki >= md) md = ki + 1; }
        while (!idxIsWeekday(md, anchor) && md < 1460) md++;
        const wi = getWorkIndices(md, t.extDuration);
        for (const idx of wi) au(idx, t.crew);
        res[t.id] = { ...t, startDate: toDateStr(addDays(anchor, md)) };
        endOf[t.id] = wi.length ? wi[wi.length - 1] + 1 : md + 1;
        scheduled.add(t.id);
      }
    }
  }
  return res;
}
function getViolations(tasks, tm) {
  const v = {};
  for (const t of tasks) { if (!t.deps?.length) continue; const tS=parseDate(t.startDate); for (const did of t.deps) { const dep=tm[did]; if(dep&&tS<addBizDays(parseDate(dep.startDate),dep.extDuration)){if(!v[t.id])v[t.id]=[];v[t.id].push({n:dep.name});} } }
  return v;
}
function statusColor(s) { if(!s) return null; const n=parseInt(s); return n>=80?"#10B981":n>=40?"#F59E0B":"#3B82F6"; }
function getPhase(name) { const m=name.match(/^Ph(\d+)/); return m?parseInt(m[1]):0; }

function DeleteConfirm({onConfirm,onCancel}) {
  useEffect(()=>{const t=setTimeout(onCancel,3000);return()=>clearTimeout(t);},[onCancel]);
  return (<div style={{display:"flex",alignItems:"center",gap:3}} onClick={e=>e.stopPropagation()}>
    <button onClick={onConfirm} style={{width:22,height:22,borderRadius:4,border:"1px solid #EF444460",background:"#EF444425",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></button>
    <button onClick={onCancel} style={{width:22,height:22,borderRadius:4,border:"1px solid #27272A",background:"#13151C",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
  </div>);
}

export default function BuildingScheduler() {
  const [taskMap,setTaskMap]=useState(()=>{const m={};initialTasks.forEach(t=>{m[t.id]=t});return m});
  const [taskOrder,setTaskOrder]=useState(()=>initialTasks.map(t=>t.id));
  const [nextId,setNextId]=useState(initialTasks.length+1);
  const [maxCrew,setMaxCrew]=useState(17);
  const [phaseWindow,setPhaseWindow]=useState(4); // how many phases can run concurrently
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
  const [crewDayIdx,setCrewDayIdx]=useState(null); // which day index to show crew popup for
  const [expandedCrewTask,setExpandedCrewTask]=useState(null); // which task id is expanded in crew popup
  const [crewNameInput,setCrewNameInput]=useState(""); // input for adding crew member name
  const [showReport,setShowReport]=useState(false);
  const [viewStart,setViewStart]=useState(()=>{const n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate())});
  const sidebarRef=useRef(null), sidebarScrollRef=useRef(null), chartScrollRef=useRef(null), chartHeaderRef=useRef(null), chartRef=useRef(null), exportRef=useRef(null);
  const dragStartX=useRef(0), dragOrigStart=useRef(null), dragOrigExt=useRef(null), dragEdge=useRef(null), dragLastDelta=useRef(0), dragMoved=useRef(false), isSyncing=useRef(false), isSyncingH=useRef(false);
  const TOTAL_DAYS=180, ROW_H=34, DAY_W=30, CREW_H=72;
  const today=new Date();
  const dbReady=useRef(false); // prevents saving during initial load
  const saveTimer=useRef(null);

  // --- DATABASE SYNC ---
  // Load tasks from Supabase on mount
  useEffect(()=>{
    if(!supabase)return;
    async function loadDB(){
      try{
        const{data:rows}=await supabase.from("tasks").select("*").order("sort_order");
        if(rows&&rows.length>0){
          const m={};const order=[];let maxId=0;
          rows.forEach(r=>{
            const t={id:r.id,name:r.name,startDate:r.start_date,intDuration:r.int_duration,extDuration:r.ext_duration,baseCrew:r.base_crew,baseDur:r.base_dur,category:r.category,crew:r.crew,deps:r.deps||[],status:r.status,fullDuration:r.full_duration,crewMembers:r.crew_members||[]};
            m[t.id]=t;order.push(t.id);if(t.id>maxId)maxId=t.id;
          });
          setTaskMap(m);setTaskOrder(order);setNextId(maxId+1);
        } else {
          // No data in DB yet — seed it with initial tasks
          await seedDB();
        }
        // Load settings
        const{data:settings}=await supabase.from("settings").select("*");
        if(settings){
          settings.forEach(s=>{
            if(s.key==="max_crew")setMaxCrew(parseInt(s.value)||17);
            if(s.key==="phase_window")setPhaseWindow(parseInt(s.value)||4);
            if(s.key==="auto_mode")setAutoMode(s.value==="true"||s.value===true);
          });
        }
      }catch(err){console.error("DB load error:",err);}
      dbReady.current=true;
    }
    async function seedDB(){
      const rows=taskOrder.map((id,i)=>{const t=taskMap[id];if(!t)return null;return{
        id:t.id,name:t.name,start_date:t.startDate,int_duration:t.intDuration,ext_duration:t.extDuration,base_crew:t.baseCrew,base_dur:t.baseDur,category:t.category,crew:t.crew,deps:t.deps||[],status:t.status,full_duration:t.fullDuration||t.extDuration,crew_members:t.crewMembers||[],sort_order:i
      };}).filter(Boolean);
      if(rows.length)await supabase.from("tasks").upsert(rows);
    }
    loadDB();
  },[]);

  // Save tasks to Supabase when they change (debounced)
  useEffect(()=>{
    if(!supabase||!dbReady.current)return;
    if(saveTimer.current)clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(async()=>{
      try{
        // Delete all then insert (simple approach for reordering)
        await supabase.from("tasks").delete().gte("id",0);
        const rows=taskOrder.map((id,i)=>{const t=taskMap[id];if(!t)return null;return{
          id:t.id,name:t.name,start_date:t.startDate,int_duration:t.intDuration,ext_duration:t.extDuration,base_crew:t.baseCrew,base_dur:t.baseDur,category:t.category,crew:t.crew,deps:t.deps||[],status:t.status,full_duration:t.fullDuration||t.extDuration,crew_members:t.crewMembers||[],sort_order:i
        };}).filter(Boolean);
        if(rows.length)await supabase.from("tasks").insert(rows);
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

  // Effective task map (auto-scheduled or manual)
  const eMap=useMemo(()=>autoMode?runAutoSchedule(taskOrder,taskMap,maxCrew,today>=viewStart?today:viewStart,phaseWindow):taskMap,[autoMode,taskMap,taskOrder,maxCrew,viewStart,phaseWindow]);
  const allTasks=useMemo(()=>taskOrder.map(id=>eMap[id]).filter(Boolean),[taskOrder,eMap]);
  const availPhases=useMemo(()=>[...new Set(allTasks.map(t=>getPhase(t.name)).filter(Boolean))].sort((a,b)=>a-b),[allTasks]);
  const tasks=useMemo(()=>phaseFilter===null?allTasks:allTasks.filter(t=>getPhase(t.name)===phaseFilter),[allTasks,phaseFilter]);
  const violations=useMemo(()=>getViolations(allTasks,eMap),[allTasks,eMap]);
  const vCount=Object.keys(violations).length;

  function endDate(t){return toDateStr(addBizDays(parseDate(t.startDate),t.extDuration))}
  const days=useMemo(()=>{const a=[];for(let i=0;i<TOTAL_DAYS;i++)a.push(addDays(viewStart,i));return a},[viewStart]);
  const mGroups=useMemo(()=>{const g=[];let c=null;days.forEach(d=>{const k=`${d.getFullYear()}-${d.getMonth()}`;if(!c||c.key!==k){c={key:k,month:d.getMonth(),year:d.getFullYear(),count:0};g.push(c)}c.count++});return g},[days]);
  const crewDay=useMemo(()=>days.map(day=>{if(!isWeekday(day))return 0;let t=0;allTasks.forEach(tk=>{const s=parseDate(tk.startDate),e=addBizDays(s,tk.extDuration);if(day>=s&&day<e&&isWeekday(day))t+=tk.crew});return t}),[days,allTasks]);
  const maxCU=Math.max(...crewDay,1), hasOver=crewDay.some(c=>c>maxCrew);
  const dragTask=dragging!==null?allTasks.find(t=>t.id===dragging):null;
  const visTasks=useMemo(()=>{if(!reorderDragId||reorderOverIdx===null)return tasks;const a=[...tasks];const fi=a.findIndex(t=>t.id===reorderDragId);if(fi===-1||fi===reorderOverIdx)return a;const[item]=a.splice(fi,1);a.splice(reorderOverIdx,0,item);return a},[tasks,reorderDragId,reorderOverIdx]);

  function barPos(t){const s=parseDate(t.startDate),e=addBizDays(s,t.extDuration),clS=Math.max(0,diffDays(viewStart,s)),clE=Math.min(TOTAL_DAYS,diffDays(viewStart,e));return clE<=clS?null:{startCol:clS,span:clE-clS}}
  function cPos(e){if(e.touches?.length)return{x:e.touches[0].clientX,y:e.touches[0].clientY};if(e.changedTouches?.length)return{x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};return{x:e.clientX,y:e.clientY}}

  // Synced scroll - vertical between sidebar and chart, horizontal between chart header and body
  function onSideScroll(e){if(isSyncing.current)return;isSyncing.current=true;if(chartScrollRef.current)chartScrollRef.current.scrollTop=e.target.scrollTop;isSyncing.current=false}
  function onChartScroll(e){if(isSyncing.current)return;isSyncing.current=true;if(sidebarScrollRef.current)sidebarScrollRef.current.scrollTop=e.target.scrollTop;isSyncing.current=false;
    if(!isSyncingH.current){isSyncingH.current=true;if(chartHeaderRef.current)chartHeaderRef.current.scrollLeft=e.target.scrollLeft;isSyncingH.current=false}}
  function onHeaderScroll(e){if(isSyncingH.current)return;isSyncingH.current=true;if(chartScrollRef.current)chartScrollRef.current.scrollLeft=e.target.scrollLeft;isSyncingH.current=false}

  // Bar interaction: click opens edit, drag moves bar
  const handleBarDown=useCallback((e,task,edge)=>{
    if(reorderDragId)return;e.preventDefault();e.stopPropagation();
    dragMoved.current=false;
    const p=cPos(e);
    if(autoMode){
      const onM=()=>{dragMoved.current=true};
      const onU=()=>{window.removeEventListener("mousemove",onM);window.removeEventListener("mouseup",onU);window.removeEventListener("touchmove",onM);window.removeEventListener("touchend",onU);if(!dragMoved.current){const t=eMap[task.id];if(t)openEditForm(t)}};
      window.addEventListener("mousemove",onM);window.addEventListener("mouseup",onU);window.addEventListener("touchmove",onM);window.addEventListener("touchend",onU);return;
    }
    setDragging(task.id);setConfirmDeleteId(null);setDragInfo({edge,daysDelta:0,mouseX:p.x,mouseY:p.y});
    dragStartX.current=p.x;dragOrigStart.current=task.startDate;dragOrigExt.current=task.extDuration;dragEdge.current=edge;dragLastDelta.current=0;
  },[autoMode,reorderDragId,eMap]);

  useEffect(()=>{
    if(dragging===null)return;const ch=chartRef.current;if(!ch)return;const dayW=ch.getBoundingClientRect().width/TOTAL_DAYS;
    function onM(e){dragMoved.current=true;const p=cPos(e);const dd=Math.round((p.x-dragStartX.current)/dayW);setDragInfo(pr=>pr?{...pr,daysDelta:dd,mouseX:p.x,mouseY:p.y}:pr);if(dd===dragLastDelta.current)return;dragLastDelta.current=dd;
      setTaskMap(prev=>{const t=prev[dragging];if(!t)return prev;const oS=parseDate(dragOrigStart.current),oE=dragOrigExt.current;let u;if(dragEdge.current==="move")u={...t,startDate:toDateStr(addDays(oS,dd))};else if(dragEdge.current==="left"){const n=oE-dd;if(n<1)return prev;u={...t,startDate:toDateStr(addDays(oS,dd)),extDuration:n}}else{const n=oE+dd;if(n<1)return prev;u={...t,extDuration:n}}return{...prev,[dragging]:u}})}
    function onU(){const moved=dragMoved.current,tid=dragging;setDragging(null);setDragInfo(null);dragLastDelta.current=0;if(!moved&&tid){const t=taskMap[tid];if(t)openEditForm(t)}}
    window.addEventListener("mousemove",onM);window.addEventListener("mouseup",onU);window.addEventListener("touchmove",onM,{passive:false});window.addEventListener("touchend",onU);
    return()=>{window.removeEventListener("mousemove",onM);window.removeEventListener("mouseup",onU);window.removeEventListener("touchmove",onM);window.removeEventListener("touchend",onU)};
  },[dragging,taskMap]);

  // Reorder
  function reorderStart(e,task){if(dragging)return;e.preventDefault();e.stopPropagation();setReorderDragId(task.id);setReorderOverIdx(tasks.findIndex(t=>t.id===task.id))}
  useEffect(()=>{if(!reorderDragId)return;const sb=sidebarRef.current;
    function onM(e){const p=cPos(e);if(!sb)return;let idx=Math.floor((p.y-sb.getBoundingClientRect().top)/ROW_H);idx=Math.max(0,Math.min(tasks.length-1,idx));setReorderOverIdx(idx)}
    function onU(){if(reorderOverIdx!==null&&reorderDragId)setTaskOrder(prev=>{const a=[...prev];const fi=a.indexOf(reorderDragId);if(fi===-1||fi===reorderOverIdx)return a;const[item]=a.splice(fi,1);a.splice(reorderOverIdx,0,item);return a});setReorderDragId(null);setReorderOverIdx(null)}
    window.addEventListener("mousemove",onM);window.addEventListener("mouseup",onU);window.addEventListener("touchmove",onM,{passive:false});window.addEventListener("touchend",onU);
    return()=>{window.removeEventListener("mousemove",onM);window.removeEventListener("mouseup",onU);window.removeEventListener("touchmove",onM);window.removeEventListener("touchend",onU)};
  },[reorderDragId,reorderOverIdx,tasks]);

  useEffect(()=>{if(duplicatedId!==null){const t=setTimeout(()=>setDuplicatedId(null),1500);return()=>clearTimeout(t)}},[duplicatedId]);

  function hCrewCh(v){const nc=Math.max(1,parseInt(v)||1);if(formData.linked){const wu=formData.baseCrew*formData.baseDur;setFormData(f=>({...f,crew:nc,extDuration:Math.max(1,Math.round(wu/nc))}))}else setFormData(f=>({...f,crew:nc}))}
  function hDurCh(v){const nd=Math.max(1,parseInt(v)||1);if(formData.linked){const wu=formData.baseCrew*formData.baseDur;setFormData(f=>({...f,extDuration:nd,crew:Math.max(1,Math.round(wu/nd))}))}else setFormData(f=>({...f,extDuration:nd}))}

  function openAddForm(){setEditingTask(null);setFormData({name:"",intDuration:2,extDuration:3,category:"",crew:3,deps:[],baseCrew:3,baseDur:3,linked:true,pctComplete:0,fullDuration:3});setShowForm(true)}
  function openEditForm(task){if(confirmDeleteId||reorderDragId)return;setEditingTask(task.id);const pct=task.status?parseInt(task.status)||0:0;const fullD=task.fullDuration||task.extDuration;setFormData({name:task.name,intDuration:task.intDuration,extDuration:task.extDuration,category:task.category||"",crew:task.crew||1,deps:task.deps||[],baseCrew:task.baseCrew||task.crew,baseDur:task.baseDur||task.extDuration,linked:true,pctComplete:pct,fullDuration:fullD});setShowForm(true)}
  function saveTask(){if(!formData.name)return;const iV=Math.max(0,parseInt(formData.intDuration)||0),cV=Math.max(1,parseInt(formData.crew)||1);
    const pct=Math.min(99,Math.max(0,parseInt(formData.pctComplete)||0));
    const fullD=formData.fullDuration||parseInt(formData.extDuration)||1;
    const remExt=pct>0?Math.max(1,Math.ceil(fullD*(1-pct/100))):fullD;
    const newStatus=pct>0?pct+"%":null;
    if(editingTask){setTaskMap(p=>({...p,[editingTask]:{...p[editingTask],name:formData.name,intDuration:iV,extDuration:remExt,category:formData.category,crew:cV,deps:formData.deps,baseCrew:formData.baseCrew,baseDur:remExt,status:newStatus,fullDuration:fullD}}))}
    else{const dd=today>=viewStart?toDateStr(today):toDateStr(viewStart);setTaskMap(p=>({...p,[nextId]:{id:nextId,name:formData.name,startDate:dd,intDuration:iV,extDuration:fullD,category:formData.category,crew:cV,deps:formData.deps,baseCrew:cV,baseDur:fullD,status:null,fullDuration:fullD,crewMembers:[]}}));setTaskOrder(p=>[...p,nextId]);setNextId(n=>n+1)}
    setShowForm(false)}
  function removeTask(id){setTaskMap(p=>{const n={...p};delete n[id];Object.keys(n).forEach(k=>{if(n[k].deps)n[k]={...n[k],deps:n[k].deps.filter(d=>d!==id)}});return n});setTaskOrder(p=>p.filter(x=>x!==id))}
  function deleteTask(id){removeTask(id);setShowForm(false);setConfirmDeleteId(null)}
  function completeTask(id){removeTask(id);setShowForm(false)}
  function duplicateTask(task){const t=typeof task==="object"?task:taskMap[task];if(!t)return;const nId=nextId;setTaskMap(p=>({...p,[nId]:{...t,id:nId,name:t.name+" (Copy)",startDate:toDateStr(addDays(parseDate(t.startDate),t.extDuration)),deps:[...(t.deps||[])]}}));setTaskOrder(p=>{const i=p.indexOf(t.id);const a=[...p];a.splice(i+1,0,nId);return a});setNextId(n=>n+1);setDuplicatedId(nId);setShowForm(false)}
  function duplicateMultiple(tid,count){const t=taskMap[tid];if(!t)return;const nw={},ids=[];let cur=addDays(parseDate(t.startDate),t.extDuration),id=nextId;for(let i=0;i<count;i++){nw[id]={...t,id,name:t.name+` (${i+2})`,startDate:toDateStr(cur),deps:[...(t.deps||[])]};ids.push(id);cur=addDays(cur,t.extDuration);id++}setTaskMap(p=>({...p,...nw}));setTaskOrder(p=>{const i=p.indexOf(tid);const a=[...p];a.splice(i+1,0,...ids);return a});setNextId(id);setDuplicatedId(ids[0]);setShowForm(false)}
  function shiftView(dir){setViewStart(p=>addDays(p,dir*30))}
  function goToday(){setViewStart(new Date(today.getFullYear(),today.getMonth(),today.getDate()))}
  function toggleAuto(){if(autoMode)setTaskMap(eMap);setAutoMode(p=>!p)}
  function toggleDep(id){setFormData(f=>({...f,deps:f.deps.includes(id)?f.deps.filter(d=>d!==id):[...f.deps,id]}))}
  function addCrewMember(taskId,name){if(!name.trim())return;setTaskMap(p=>({...p,[taskId]:{...p[taskId],crewMembers:[...(p[taskId].crewMembers||[]),name.trim()]}}));setCrewNameInput("")}
  function removeCrewMember(taskId,idx){setTaskMap(p=>({...p,[taskId]:{...p[taskId],crewMembers:(p[taskId].crewMembers||[]).filter((_,i)=>i!==idx)}}))}
  const utilPct=useMemo(()=>{const a=crewDay.filter(c=>c>0);if(!a.length)return 0;return Math.round((a.reduce((s,c)=>s+c,0)/a.length/maxCrew)*100)},[crewDay,maxCrew]);
  const span=useMemo(()=>{if(!allTasks.length)return 0;let mn=Infinity,mx=-Infinity;allTasks.forEach(t=>{const s=parseDate(t.startDate).getTime(),e=addBizDays(parseDate(t.startDate),t.extDuration).getTime();if(s<mn)mn=s;if(e>mx)mx=e});return Math.round((mx-mn)/86400000)},[allTasks]);
  async function exportPDF(){setExporting(true);try{await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");const el=exportRef.current;if(!el)return;const canvas=await window.html2canvas(el,{scale:2,backgroundColor:"#0B0D12",useCORS:true,logging:false,windowWidth:Math.max(el.scrollWidth,1400)});const{jsPDF}=window.jspdf;const pdf=new jsPDF({orientation:"landscape",unit:"pt",format:"letter"});const pW=pdf.internal.pageSize.getWidth(),pH=pdf.internal.pageSize.getHeight(),m=30,r=Math.min((pW-m*2)/canvas.width,(pH-m*2)/canvas.height);pdf.addImage(canvas.toDataURL("image/png"),"PNG",m+((pW-m*2)-canvas.width*r)/2,m,canvas.width*r,canvas.height*r);pdf.save(`schedule-${toDateStr(viewStart)}.pdf`)}catch(err){console.error(err)}finally{setExporting(false)}}

  const cats=[...new Set(Object.values(taskMap).map(t=>t.category).filter(Boolean))];
  const chartCeil=Math.max(maxCrew,maxCU);
  const dragHL=useMemo(()=>{if(!dragTask)return new Set();const s=parseDate(dragTask.startDate),e=addBizDays(s,dragTask.extDuration);const startOff=diffDays(viewStart,s),endOff=diffDays(viewStart,e);const c=new Set();for(let i=Math.max(0,startOff);i<Math.min(TOTAL_DAYS,endOff);i++)c.add(i);return c},[dragTask,viewStart]);
  const[dupCount,setDupCount]=useState(1);
  const wu=formData.baseCrew*formData.baseDur;
  const lbl={fontSize:8,fontWeight:600,color:"#3F3F46",textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:3};
  const inp={width:"100%",padding:"6px 8px",background:"#0B0D12",border:"1px solid #27272A",borderRadius:4,color:"#E4E4E7",fontSize:11,outline:"none",fontFamily:"inherit"};

  // Render a sidebar row
  function SideRow({task,idx}){
    const color=getColor(idx),isCD=confirmDeleteId===task.id,isDup=duplicatedId===task.id;
    const isRO=reorderDragId===task.id,isDrop=reorderDragId&&reorderDragId!==task.id&&reorderOverIdx===idx;
    const viol=violations[task.id],sc=statusColor(task.status);
    return (<div className={`sidebar-row ${isDup?"dup-flash":""}`}
      onMouseEnter={()=>!dragging&&!reorderDragId&&setHoveredTask(task.id)} onMouseLeave={()=>{if(!dragging&&!reorderDragId)setHoveredTask(null)}}
      style={{height:ROW_H,display:"flex",alignItems:"center",padding:"0 4px 0 2px",gap:3,borderBottom:"1px solid #13151C",
        cursor:dragging||isCD||reorderDragId?"default":"pointer",
        background:isRO?"#3B82F615":isCD?"#EF444410":hoveredTask===task.id?"#13151C":"transparent",
        borderLeft:isCD?"2px solid #EF4444":viol?"2px solid #F59E0B50":"2px solid transparent",
        borderTop:isDrop?"2px solid #3B82F6":"2px solid transparent",opacity:isRO?.6:1}}>
      <div className="reorder-grip" onMouseDown={e=>reorderStart(e,task)} onTouchStart={e=>reorderStart(e,task)} style={{width:12,height:24,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1.5,flexShrink:0}}>
        <div style={{width:6,height:1,background:"#52525B"}}/><div style={{width:6,height:1,background:"#52525B"}}/><div style={{width:6,height:1,background:"#52525B"}}/>
      </div>
      <div style={{width:6,height:6,borderRadius:"50%",background:color,flexShrink:0}}/>
      <div style={{overflow:"hidden",flex:1}} onClick={()=>!dragging&&!isCD&&!reorderDragId&&openEditForm(task)}>
        <div style={{fontSize:9,fontWeight:500,color:"#E4E4E7",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"flex",alignItems:"center",gap:3}}>
          {task.name}{task.status&&<span style={{fontSize:7,fontWeight:700,color:sc,background:`${sc}20`,borderRadius:2,padding:"0 3px",flexShrink:0}}>{task.status}</span>}
        </div>
        <div style={{fontSize:7,color:viol?"#F59E0B":task.status?"#71717A":"#3F3F46"}}>{viol?`⚠ ${viol[0].n}`:task.status&&task.fullDuration?`${task.extDuration}d remaining of ${task.fullDuration}d`:`${fmtD(task.startDate)} – ${fmtD(endDate(task))}`}</div>
      </div>
      {isCD?<DeleteConfirm onConfirm={()=>deleteTask(task.id)} onCancel={()=>setConfirmDeleteId(null)}/>:(
        <div className="sidebar-actions" style={{display:"flex",gap:2,flexShrink:0}}>
          <button onClick={e=>{e.stopPropagation();duplicateTask(task)}} style={{width:18,height:18,borderRadius:3,border:"1px solid #27272A",background:"#13151C",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
          <button onClick={e=>{e.stopPropagation();setConfirmDeleteId(task.id)}} style={{width:18,height:18,borderRadius:3,border:"1px solid #27272A",background:"#13151C",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div>)}
      <div style={{display:"flex",gap:3,flexShrink:0}}>
        <div style={{background:"#1C1F27",borderRadius:2,padding:"1px 3px",fontSize:8,fontWeight:600,color:"#A1A1AA",minWidth:16,textAlign:"center"}}>{task.extDuration}</div>
        <div style={{background:"#1C1F27",borderRadius:2,padding:"1px 3px",fontSize:8,fontWeight:600,color:"#A1A1AA",minWidth:16,textAlign:"center"}}>{task.crew}</div>
      </div>
    </div>);
  }

  return (
    <div style={{fontFamily:"'JetBrains Mono','SF Mono',monospace",background:"#0B0D12",color:"#D4D4D8",minHeight:"100vh",touchAction:"pan-y",userSelect:(dragging!==null||reorderDragId!==null)?"none":"auto"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{height:5px;width:5px}::-webkit-scrollbar-track{background:#1A1D24}::-webkit-scrollbar-thumb{background:#3F3F46;border-radius:3px}
        .hide-scroll::-webkit-scrollbar{display:none}.hide-scroll{-ms-overflow-style:none;scrollbar-width:none}
        .gantt-bar{transition:box-shadow .15s,transform .1s}.gantt-bar:hover{z-index:10!important}.gantt-bar.is-dragging{z-index:50!important;transform:scaleY(1.12);filter:brightness(1.2)}
        .resize-handle{opacity:0;transition:opacity .12s}.gantt-bar:hover .resize-handle,.gantt-bar.is-dragging .resize-handle{opacity:1}
        .sidebar-actions{opacity:0;transition:opacity .12s}.sidebar-row:hover .sidebar-actions{opacity:1}.sidebar-row:hover .reorder-grip{opacity:.8}.reorder-grip{opacity:.15;transition:opacity .12s;cursor:grab}
        .fade-in{animation:fadeIn .2s ease-out}@keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}@keyframes dupFlash{0%{background:#3B82F630}100%{background:transparent}}.dup-flash{animation:dupFlash 1.5s ease-out}
        input,select{font-family:inherit}
      `}</style>

      {/* HEADER */}
      <div style={{padding:"12px 20px 8px",borderBottom:"1px solid #1C1F27",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:6,height:6,background:"#3B82F6",borderRadius:2}}/><h1 style={{fontFamily:"'Space Grotesk'",fontSize:17,fontWeight:700,color:"#F4F4F5"}}>Building Schedule</h1></div>
          <p style={{fontSize:9,color:"#52525B",marginTop:2,paddingLeft:14}}>{allTasks.length} tasks · {span}d span · {utilPct}% util{vCount>0&&!autoMode&&<span style={{color:"#F59E0B",marginLeft:6}}>⚠ {vCount} violations</span>}</p>
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
          <button onClick={()=>setShowSettings(true)} style={{padding:"3px 8px",fontSize:9,borderRadius:4,cursor:"pointer",fontFamily:"inherit",background:hasOver?"#EF444418":"#13151C",border:`1px solid ${hasOver?"#EF444450":"#1C1F27"}`,color:hasOver?"#EF4444":"#A1A1AA"}}>Crew:{maxCrew} · Win:{phaseWindow}</button>
          <button onClick={toggleAuto} style={{padding:"3px 8px",fontSize:9,fontWeight:600,borderRadius:4,cursor:"pointer",fontFamily:"inherit",background:autoMode?"#8B5CF620":"#13151C",border:`1px solid ${autoMode?"#8B5CF6":"#1C1F27"}`,color:autoMode?"#C4B5FD":"#A78BFA"}}>Auto {autoMode?"ON":"OFF"}</button>
          <button onClick={exportPDF} disabled={exporting} style={{padding:"3px 8px",fontSize:9,borderRadius:4,cursor:"pointer",fontFamily:"inherit",background:"#13151C",border:"1px solid #1C1F27",color:"#A1A1AA"}}>PDF</button>
          <button onClick={()=>setShowReport(true)} style={{padding:"3px 8px",fontSize:9,fontWeight:600,borderRadius:4,cursor:"pointer",fontFamily:"inherit",background:"#13151C",border:"1px solid #10B98140",color:"#10B981"}}>Report</button>
          <button onClick={openAddForm} style={{padding:"3px 8px",fontSize:9,fontWeight:600,borderRadius:4,border:"none",cursor:"pointer",fontFamily:"inherit",background:"#3B82F6",color:"#fff"}}>+ Add</button>
        </div>
      </div>

      {/* PHASE TABS */}
      <div style={{display:"flex",gap:3,padding:"5px 20px",borderBottom:"1px solid #1C1F27",overflowX:"auto",background:"#0B0D12"}}>
        <button onClick={()=>setPhaseFilter(null)} style={{padding:"2px 8px",fontSize:8,fontWeight:phaseFilter===null?700:500,borderRadius:3,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${phaseFilter===null?"#3B82F660":"#1C1F27"}`,background:phaseFilter===null?"#3B82F620":"transparent",color:phaseFilter===null?"#60A5FA":"#52525B",whiteSpace:"nowrap"}}>All ({allTasks.length})</button>
        {availPhases.map(p=><button key={p} onClick={()=>setPhaseFilter(p)} style={{padding:"2px 7px",fontSize:8,fontWeight:phaseFilter===p?700:500,borderRadius:3,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${phaseFilter===p?"#3B82F660":"#1C1F27"}`,background:phaseFilter===p?"#3B82F620":"transparent",color:phaseFilter===p?"#60A5FA":"#52525B",whiteSpace:"nowrap"}}>Ph{p}</button>)}
      </div>

      {autoMode&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 20px",background:"#8B5CF608",borderBottom:"1px solid #8B5CF620"}}><div style={{width:4,height:4,borderRadius:"50%",background:"#8B5CF6"}}/><span style={{fontSize:8,color:"#A78BFA",flex:1}}>Auto-scheduling — {phaseWindow}-phase window · dependencies & crew enforced</span>{!hasOver&&!vCount&&<span style={{fontSize:8,color:"#059669"}}>✓ OK</span>}</div>}

      {/* NAV */}
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 20px",borderBottom:"1px solid #1C1F27",background:"#0B0D12"}}>
        <button onClick={()=>shiftView(-1)} style={{background:"#13151C",border:"1px solid #27272A",color:"#A1A1AA",borderRadius:3,padding:"2px 7px",cursor:"pointer",fontSize:10,fontFamily:"inherit"}}>◀</button>
        <span style={{fontSize:9,color:"#A1A1AA",fontWeight:500,minWidth:220,textAlign:"center"}}>{MONTHS_FULL[viewStart.getMonth()]} {viewStart.getDate()}, {viewStart.getFullYear()} — {MONTHS_FULL[addDays(viewStart,TOTAL_DAYS-1).getMonth()]} {addDays(viewStart,TOTAL_DAYS-1).getDate()}, {addDays(viewStart,TOTAL_DAYS-1).getFullYear()}</span>
        <button onClick={()=>shiftView(1)} style={{background:"#13151C",border:"1px solid #27272A",color:"#A1A1AA",borderRadius:3,padding:"2px 7px",cursor:"pointer",fontSize:10,fontFamily:"inherit"}}>▶</button>
        <button onClick={goToday} style={{background:"transparent",border:"1px solid #27272A",color:"#52525B",borderRadius:3,padding:"2px 7px",cursor:"pointer",fontSize:8,fontFamily:"inherit"}}>Today</button>
      </div>

      <div ref={exportRef}>
        {/* GANTT: headers row */}
        <div style={{display:"flex"}}>
          {/* Sidebar header */}
          <div style={{minWidth:250,maxWidth:250,borderRight:"1px solid #1C1F27",background:"#0B0D12",flexShrink:0}}>
            <div style={{height:22,borderBottom:"1px solid #1C1F27"}}/>
            <div style={{height:30,display:"flex",alignItems:"flex-end",padding:"0 6px 4px 22px",borderBottom:"1px solid #1C1F27",justifyContent:"space-between"}}>
              <span style={{fontSize:8,fontWeight:600,color:"#3F3F46",textTransform:"uppercase"}}>Task</span>
              <div style={{display:"flex",gap:6}}><span style={{fontSize:8,fontWeight:600,color:"#3F3F46"}}>Days</span><span style={{fontSize:8,fontWeight:600,color:"#3F3F46"}}>Crew</span></div>
            </div>
          </div>
          {/* Chart header */}
          <div ref={chartHeaderRef} className="hide-scroll" style={{flex:1,overflowX:"auto"}} onScroll={onHeaderScroll}>
            <div ref={chartRef} style={{minWidth:TOTAL_DAYS*DAY_W}}>
              <div style={{display:"flex",height:22,borderBottom:"1px solid #1C1F27"}}>{mGroups.map((mg,i)=><div key={mg.key} style={{width:`${(mg.count/TOTAL_DAYS)*100}%`,display:"flex",alignItems:"center",justifyContent:"center",borderRight:i<mGroups.length-1?"1px solid #27272A":"none",background:"#0F1117"}}><span style={{fontSize:10,fontWeight:700,color:"#A1A1AA",fontFamily:"'Space Grotesk'"}}>{MONTHS_FULL[mg.month]} {mg.year}</span></div>)}</div>
              <div style={{display:"flex",height:30,borderBottom:"1px solid #1C1F27"}}>
                {days.map((d,i)=>{const isT=sameDay(d,today),isW=d.getDay()===0||d.getDay()===6,isF=d.getDate()===1;
                  return <div key={i} style={{width:`${100/TOTAL_DAYS}%`,flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRight:isF?"1px solid #27272A":"1px solid #14161D",background:isT?"#3B82F610":isW?"#0D0F15":"transparent",borderLeft:isF?"2px solid #27272A":"none"}}>
                    <span style={{fontSize:6,color:isT?"#3B82F6":isW?"#27272A":"#3F3F46",textTransform:"uppercase",lineHeight:1}}>{DAYS_SHORT[d.getDay()]}</span>
                    <span style={{fontSize:8,fontWeight:isT?700:isF?600:500,color:isT?"#fff":isF?"#A1A1AA":isW?"#27272A":"#71717A",background:isT?"#3B82F6":"transparent",borderRadius:5,width:isT?14:"auto",height:isT?12:"auto",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,marginTop:1}}>{d.getDate()}</span>
                  </div>})}
              </div>
            </div>
          </div>
        </div>

        {/* GANTT: body row */}
        <div style={{display:"flex",height:"calc(100vh - 260px)"}}>
          {/* Sidebar body */}
          <div ref={sidebarRef} style={{minWidth:250,maxWidth:250,borderRight:"1px solid #1C1F27",background:"#0B0D12",flexShrink:0}}>
            <div ref={sidebarScrollRef} className="hide-scroll" onScroll={onSideScroll} style={{height:"100%",overflowY:"auto"}}>
              {visTasks.map((t,i)=><SideRow key={t.id} task={t} idx={i}/>)}
              <div style={{height:CREW_H,borderTop:"1px solid #1C1F27",display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 10px"}}>
                <div style={{fontSize:7,fontWeight:600,color:"#3F3F46",textTransform:"uppercase"}}>Daily Crew (all)</div>
                <div style={{fontSize:15,fontWeight:700,color:hasOver?"#EF4444":"#A1A1AA",fontFamily:"'Space Grotesk'",marginTop:2}}>{Math.max(...crewDay)}<span style={{fontSize:9,fontWeight:400,color:"#3F3F46"}}>/{maxCrew}</span></div>
                <div style={{fontSize:7,color:hasOver?"#EF444490":"#059669",marginTop:1}}>{hasOver?"⚠ Over":"✓ "+utilPct+"% util"}</div>
              </div>
            </div>
          </div>
          {/* Chart body */}
          <div ref={chartScrollRef} onScroll={onChartScroll} style={{flex:1,overflowY:"auto",overflowX:"auto"}}>
            <div style={{minWidth:TOTAL_DAYS*DAY_W,position:"relative"}}>
              {visTasks.map((task,idx)=>{const bp=barPos(task);const color=getColor(idx);const isH=hoveredTask===task.id,isD=dragging===task.id,isDup=duplicatedId===task.id,viol=violations[task.id],sc=statusColor(task.status);
                return <div key={task.id} onMouseEnter={()=>!dragging&&!reorderDragId&&setHoveredTask(task.id)} onMouseLeave={()=>!dragging&&!reorderDragId&&setHoveredTask(null)}
                  className={isDup?"dup-flash":""} style={{height:ROW_H,position:"relative",borderBottom:"1px solid #13151C",background:isH&&!isD?"#10121A":"transparent"}}>
                  {days.map((d,i)=>{const isW=d.getDay()===0||d.getDay()===6,isT=sameDay(d,today),isF=d.getDate()===1,isDC=isD&&dragHL.has(i);
                    return <div key={i} style={{position:"absolute",left:`${(i/TOTAL_DAYS)*100}%`,width:`${100/TOTAL_DAYS}%`,top:0,bottom:0,borderRight:isF?"1px solid #27272A":"1px solid #14161D",background:isDC?"#3B82F60A":isT?"#3B82F606":isW?"#08090D":"transparent"}}/>})}
                  {bp&&<div className={`gantt-bar ${isD?"is-dragging":""}`} style={{position:"absolute",top:4,height:ROW_H-8,left:`${(bp.startCol/TOTAL_DAYS)*100}%`,width:`${(bp.span/TOTAL_DAYS)*100}%`,
                    background:`linear-gradient(135deg, ${color}${isD?"50":"35"}, ${color}${isD?"25":"15"})`,border:`1px solid ${viol?"#F59E0B90":`${color}${isD?"90":"55"}`}`,
                    borderRadius:3,cursor:isD?"grabbing":"pointer",zIndex:isD?50:3,display:"flex",alignItems:"center",padding:"0 3px",overflow:"hidden",
                    boxShadow:isD?`0 4px 16px ${color}35`:isH?`0 1px 6px ${color}15`:"none"}}
                    onMouseDown={e=>handleBarDown(e,task,"move")} onTouchStart={e=>handleBarDown(e,task,"move")}>
                    {task.status&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:`${parseInt(task.status)}%`,background:`${sc}15`,borderRadius:"3px 0 0 3px",pointerEvents:"none"}}/>}
                    {!autoMode&&<div className="resize-handle" onMouseDown={e=>handleBarDown(e,task,"left")} style={{position:"absolute",left:0,top:0,bottom:0,width:5,cursor:"ew-resize",borderRadius:"3px 0 0 3px",zIndex:5,background:`${color}50`}}/>}
                    {viol&&<div style={{position:"absolute",left:-5,top:"50%",transform:"translateY(-50%)",width:9,height:9,borderRadius:"50%",background:"#F59E0B",display:"flex",alignItems:"center",justifyContent:"center",zIndex:6,fontSize:6,fontWeight:800,color:"#000"}}>!</div>}
                    {bp.span>=2&&<span style={{fontSize:7,fontWeight:600,color,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",pointerEvents:"none",paddingLeft:2,position:"relative",zIndex:1}}>{task.name}{bp.span>=4&&<span style={{fontWeight:400,opacity:.5}}> {task.crew}☻</span>}</span>}
                    {!autoMode&&<div className="resize-handle" onMouseDown={e=>handleBarDown(e,task,"right")} style={{position:"absolute",right:0,top:0,bottom:0,width:5,cursor:"ew-resize",borderRadius:"0 3px 3px 0",zIndex:5,background:`${color}50`}}/>}
                  </div>}
                </div>})}
              {/* Crew chart */}
              <div style={{height:CREW_H,borderTop:"1px solid #1C1F27",position:"relative",display:"flex",alignItems:"flex-end"}}>
                <div style={{position:"absolute",left:0,right:0,bottom:`${(maxCrew/chartCeil)*(CREW_H-14)}px`,height:1,borderTop:"1.5px dashed #EF444450",zIndex:5,pointerEvents:"none"}}><span style={{position:"absolute",right:3,top:-9,fontSize:6,color:"#EF444470",fontWeight:600}}>MAX {maxCrew}</span></div>
                {days.map((d,i)=>{const cr=crewDay[i],isO=cr>maxCrew,isT=sameDay(d,today),bH=cr>0?Math.max(1,(cr/chartCeil)*(CREW_H-14)):0,isW=!isWeekday(d);
                  return <div key={i} onClick={()=>setCrewDayIdx(i)} style={{width:`${100/TOTAL_DAYS}%`,height:"100%",display:"flex",flexDirection:"column",justifyContent:"flex-end",alignItems:"center",borderRight:"1px solid #14161D",padding:"0 0 2px",cursor:"pointer",background:isW?"#08090D04":"transparent"}}>
                    {cr>0&&<div style={{width:"100%",height:bH,background:isO?"#EF4444":isT?"#3B82F6":"#3B82F640",transition:"height .15s"}}/>}
                  </div>})}
              </div>
              {days.some(d=>sameDay(d,today))&&<div style={{position:"absolute",left:`${((diffDays(viewStart,today)+.5)/TOTAL_DAYS)*100}%`,top:0,bottom:0,width:1.5,background:"#3B82F670",zIndex:15,pointerEvents:"none"}}/>}
            </div>
          </div>
        </div>
      </div>

      {/* DRAG TOOLTIP */}
      {dragging!==null&&dragInfo&&dragTask&&<div style={{position:"fixed",left:dragInfo.mouseX+12,top:dragInfo.mouseY-30,background:"#1C1F27",border:"1px solid #27272A",borderRadius:5,padding:"4px 7px",zIndex:200,boxShadow:"0 4px 16px rgba(0,0,0,.5)"}}>
        <div style={{fontSize:8,fontWeight:600,color:"#E4E4E7"}}>{dragTask.name}</div>
        <div style={{fontSize:7,color:"#A1A1AA"}}>{fmtD(dragTask.startDate)} → {fmtD(endDate(dragTask))}</div>
      </div>}

      {/* TASK FORM MODAL */}
      {showForm&&<div style={{position:"fixed",inset:0,background:"#00000080",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)"}} onClick={()=>setShowForm(false)}>
        <div className="fade-in" onClick={e=>e.stopPropagation()} style={{background:"#13151C",border:"1px solid #27272A",borderRadius:10,padding:18,width:480,maxWidth:"92vw",maxHeight:"86vh",overflowY:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
            <h2 style={{fontFamily:"'Space Grotesk'",fontSize:14,fontWeight:700,color:"#F4F4F5"}}>{editingTask?"Edit Task":"New Task"}</h2>
            {editingTask&&<div style={{display:"flex",gap:4}}>
              <button onClick={()=>completeTask(editingTask)} style={{padding:"3px 10px",fontSize:9,fontWeight:600,borderRadius:3,border:"1px solid #10B98140",cursor:"pointer",fontFamily:"inherit",background:"#10B98115",color:"#10B981",display:"flex",alignItems:"center",gap:4}}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Complete
              </button>
              <button onClick={()=>deleteTask(editingTask)} style={{padding:"3px 8px",fontSize:9,fontWeight:600,borderRadius:3,border:"1px solid #EF444440",cursor:"pointer",fontFamily:"inherit",background:"#EF444415",color:"#EF4444"}}>Delete</button>
            </div>}
          </div>
          {editingTask&&taskMap[editingTask]&&<div style={{display:"flex",gap:8,marginBottom:8,padding:"5px 8px",background:"#0B0D12",borderRadius:4,border:"1px solid #1C1F27",flexWrap:"wrap"}}>
            <span style={{fontSize:8,color:"#71717A"}}>{fmtD(taskMap[editingTask].startDate)} → {fmtD(endDate(taskMap[editingTask]))}</span>
            <span style={{fontSize:8,color:"#3F3F46"}}>·</span>
            <span style={{fontSize:8,color:"#71717A"}}>{taskMap[editingTask].extDuration}d · {taskMap[editingTask].crew} crew</span>
            {taskMap[editingTask].status&&<><span style={{fontSize:8,color:"#3F3F46"}}>·</span><span style={{fontSize:8,color:statusColor(taskMap[editingTask].status),fontWeight:600}}>{taskMap[editingTask].status} done</span></>}
          </div>}
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            <div style={{display:"flex",gap:7}}>
              <div style={{flex:1}}><label style={lbl}>Name</label><input value={formData.name} onChange={e=>setFormData(f=>({...f,name:e.target.value}))} style={inp}/></div>
              <div style={{width:100}}><label style={lbl}>Category</label><input value={formData.category} onChange={e=>setFormData(f=>({...f,category:e.target.value}))} list="cat-list" style={inp}/><datalist id="cat-list">{cats.map(c=><option key={c} value={c}/>)}</datalist></div>
            </div>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
                <label style={{...lbl,marginBottom:0}}>Crew &amp; Duration</label>
                <button onClick={()=>setFormData(f=>({...f,linked:!f.linked}))} style={{padding:"1px 6px",fontSize:7,fontWeight:600,borderRadius:3,cursor:"pointer",fontFamily:"inherit",background:formData.linked?"#3B82F620":"transparent",border:`1px solid ${formData.linked?"#3B82F660":"#27272A"}`,color:formData.linked?"#60A5FA":"#52525B"}}>{formData.linked?"🔗 Linked":"Unlinked"}</button>
                {formData.linked&&<span style={{fontSize:7,color:"#3F3F46"}}>Work: {wu}u</span>}
              </div>
              <div style={{display:"flex",gap:7}}>
                <div style={{flex:1}}><label style={{...lbl,fontSize:7}}>Internal</label><input type="number" min="0" value={formData.intDuration} onChange={e=>setFormData(f=>({...f,intDuration:parseInt(e.target.value)||0}))} style={{...inp,textAlign:"center"}}/></div>
                <div style={{flex:1}}><label style={{...lbl,fontSize:7}}>External</label><input type="number" min="1" value={formData.extDuration} onChange={e=>hDurCh(e.target.value)} style={{...inp,textAlign:"center",borderColor:formData.linked?"#3B82F640":"#27272A"}}/></div>
                <div style={{width:70}}><label style={{...lbl,fontSize:7}}>Crew</label><input type="number" min="1" value={formData.crew} onChange={e=>hCrewCh(e.target.value)} style={{...inp,textAlign:"center",borderColor:formData.linked?"#3B82F640":"#27272A"}}/></div>
              </div>
              {formData.linked&&formData.crew!==formData.baseCrew&&<div style={{fontSize:7,color:"#60A5FA",marginTop:2,padding:"2px 5px",background:"#3B82F610",borderRadius:2}}>Scaled: {formData.baseCrew}×{formData.baseDur}d → {formData.crew}×{formData.extDuration}d</div>}
            </div>
            {/* Percent Complete */}
            {editingTask&&<div style={{padding:"8px 10px",background:"#0B0D12",borderRadius:5,border:"1px solid #1C1F27"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                <label style={{...lbl,marginBottom:0}}>Progress</label>
                <span style={{fontSize:12,fontWeight:700,color:formData.pctComplete>=80?"#10B981":formData.pctComplete>=40?"#F59E0B":formData.pctComplete>0?"#3B82F6":"#52525B",fontFamily:"'Space Grotesk'"}}>{formData.pctComplete}%</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="range" min="0" max="99" value={formData.pctComplete} onChange={e=>{const p=parseInt(e.target.value)||0;const rem=Math.max(1,Math.ceil(formData.fullDuration*(1-p/100)));setFormData(f=>({...f,pctComplete:p,extDuration:rem,baseDur:rem}))}}
                  style={{flex:1,accentColor:formData.pctComplete>=80?"#10B981":formData.pctComplete>=40?"#F59E0B":"#3B82F6",height:6}}/>
                <div style={{display:"flex",alignItems:"center",gap:2}}>
                  <input type="number" min="0" max="99" value={formData.pctComplete} onChange={e=>{const p=Math.min(99,Math.max(0,parseInt(e.target.value)||0));const rem=Math.max(1,Math.ceil(formData.fullDuration*(1-p/100)));setFormData(f=>({...f,pctComplete:p,extDuration:rem,baseDur:rem}))}}
                    style={{width:40,padding:"3px 4px",background:"#13151C",border:"1px solid #27272A",borderRadius:3,color:"#E4E4E7",fontSize:11,textAlign:"center",outline:"none",fontFamily:"inherit"}}/>
                  <span style={{fontSize:9,color:"#52525B"}}>%</span>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
                <span style={{fontSize:7,color:"#52525B"}}>Full duration: {formData.fullDuration}d</span>
                <span style={{fontSize:7,color:formData.pctComplete>0?"#F59E0B":"#52525B"}}>{formData.pctComplete>0?`${Math.max(1,Math.ceil(formData.fullDuration*(1-formData.pctComplete/100)))}d remaining`:"Not started"}</span>
              </div>
              {/* Quick preset buttons */}
              <div style={{display:"flex",gap:3,marginTop:5}}>
                {[0,25,50,75,90].map(p=><button key={p} onClick={()=>{const rem=Math.max(1,Math.ceil(formData.fullDuration*(1-p/100)));setFormData(f=>({...f,pctComplete:p,extDuration:rem,baseDur:rem}))}}
                  style={{padding:"2px 6px",fontSize:7,fontWeight:formData.pctComplete===p?700:500,borderRadius:2,cursor:"pointer",fontFamily:"inherit",
                    border:`1px solid ${formData.pctComplete===p?"#3B82F660":"#27272A"}`,background:formData.pctComplete===p?"#3B82F620":"transparent",
                    color:formData.pctComplete===p?"#60A5FA":"#52525B"}}>{p}%</button>)}
              </div>
            </div>}
            <div>
              <label style={lbl}>Must Complete First</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:2,padding:5,background:"#0B0D12",borderRadius:4,border:"1px solid #1C1F27",maxHeight:80,overflowY:"auto"}}>
                {taskOrder.map(id=>{if(id===editingTask)return null;const t=taskMap[id];if(!t)return null;const sel=formData.deps.includes(id);
                  return <button key={id} onClick={()=>toggleDep(id)} style={{padding:"1px 5px",fontSize:8,borderRadius:2,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${sel?"#3B82F680":"#27272A"}`,background:sel?"#3B82F620":"transparent",color:sel?"#60A5FA":"#52525B",fontWeight:sel?600:400}}>{sel?"✓ ":""}{t.name}</button>})}
              </div>
            </div>
            {editingTask&&<div style={{padding:8,background:"#0B0D12",borderRadius:5,border:"1px solid #1C1F27"}}>
              <div style={{fontSize:7,fontWeight:600,color:"#3F3F46",textTransform:"uppercase",marginBottom:5}}>Duplicate</div>
              <div style={{display:"flex",gap:5,alignItems:"center"}}>
                <button onClick={()=>duplicateTask(editingTask)} style={{padding:"3px 8px",fontSize:9,fontWeight:600,borderRadius:3,border:"1px solid #3B82F650",cursor:"pointer",fontFamily:"inherit",background:"#3B82F618",color:"#60A5FA"}}>Copy</button>
                <input type="number" min="1" max="50" value={dupCount} onChange={e=>setDupCount(Math.max(1,parseInt(e.target.value)||1))} style={{width:38,padding:"2px 3px",background:"#13151C",border:"1px solid #27272A",borderRadius:2,color:"#E4E4E7",fontSize:10,textAlign:"center",outline:"none",fontFamily:"inherit"}}/>
                <button onClick={()=>duplicateMultiple(editingTask,dupCount)} style={{padding:"3px 8px",fontSize:9,fontWeight:600,borderRadius:3,border:"1px solid #8B5CF650",cursor:"pointer",fontFamily:"inherit",background:"#8B5CF618",color:"#A78BFA"}}>×copies</button>
              </div>
            </div>}
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:14,gap:5}}>
            <button onClick={()=>setShowForm(false)} style={{padding:"5px 10px",fontSize:9,borderRadius:3,border:"1px solid #27272A",cursor:"pointer",fontFamily:"inherit",background:"transparent",color:"#A1A1AA"}}>Cancel</button>
            <button onClick={saveTask} style={{padding:"5px 14px",fontSize:9,fontWeight:600,borderRadius:3,border:"none",cursor:"pointer",fontFamily:"inherit",background:"#3B82F6",color:"#fff",opacity:formData.name?1:.4}}>{editingTask?"Update":"Add"}</button>
          </div>
        </div>
      </div>}

      {/* SETTINGS MODAL */}
      {showSettings&&<div style={{position:"fixed",inset:0,background:"#00000080",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)"}} onClick={()=>setShowSettings(false)}>
        <div className="fade-in" onClick={e=>e.stopPropagation()} style={{background:"#13151C",border:"1px solid #27272A",borderRadius:10,padding:18,width:300}}>
          <h2 style={{fontFamily:"'Space Grotesk'",fontSize:14,fontWeight:700,color:"#F4F4F5",marginBottom:12}}>Settings</h2>
          <label style={lbl}>Max Crew Per Day</label>
          <input type="number" min="1" max="999" value={maxCrew} onChange={e=>setMaxCrew(Math.max(1,parseInt(e.target.value)||1))} style={{...inp,textAlign:"center",fontSize:16,fontWeight:700,padding:8}}/>
          <div style={{marginTop:10}}>
            <label style={lbl}>Phase Window</label>
            <p style={{fontSize:8,color:"#52525B",marginBottom:4}}>How many phases can be worked on at the same time. Keeps crew focused on finishing nearby phases before starting distant ones.</p>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <input type="number" min="1" max="12" value={phaseWindow} onChange={e=>setPhaseWindow(Math.max(1,Math.min(12,parseInt(e.target.value)||4)))} style={{...inp,width:60,textAlign:"center",fontSize:16,fontWeight:700,padding:8}}/>
              <span style={{fontSize:9,color:"#71717A"}}>phases at a time</span>
            </div>
            <div style={{display:"flex",gap:3,marginTop:5}}>
              {[2,3,4,6,12].map(w=><button key={w} onClick={()=>setPhaseWindow(w)} style={{padding:"2px 8px",fontSize:8,fontWeight:phaseWindow===w?700:500,borderRadius:3,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${phaseWindow===w?"#8B5CF660":"#27272A"}`,background:phaseWindow===w?"#8B5CF620":"transparent",color:phaseWindow===w?"#A78BFA":"#52525B"}}>{w}</button>)}
            </div>
          </div>
          <div style={{marginTop:8,padding:7,background:"#0B0D12",borderRadius:4,border:"1px solid #1C1F27"}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9}}><span style={{color:"#52525B"}}>Peak</span><span style={{color:Math.max(...crewDay)>maxCrew?"#EF4444":"#A1A1AA",fontWeight:600}}>{Math.max(...crewDay)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,marginTop:2}}><span style={{color:"#52525B"}}>Over days</span><span style={{color:crewDay.filter(c=>c>maxCrew).length?"#EF4444":"#059669",fontWeight:600}}>{crewDay.filter(c=>c>maxCrew).length}</span></div>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}><button onClick={()=>setShowSettings(false)} style={{padding:"5px 14px",fontSize:9,fontWeight:600,borderRadius:3,border:"none",cursor:"pointer",fontFamily:"inherit",background:"#3B82F6",color:"#fff"}}>Done</button></div>
        </div>
      </div>}

      {/* CREW DAY DETAIL POPUP */}
      {crewDayIdx!==null&&days[crewDayIdx]&&(()=>{
        const day=days[crewDayIdx];
        const dayStr=`${DAYS_SHORT[day.getDay()]}, ${MONTHS_FULL[day.getMonth()]} ${day.getDate()}, ${day.getFullYear()}`;
        const activeTasks=isWeekday(day)?allTasks.filter(t=>{const s=parseDate(t.startDate),e=addBizDays(s,t.extDuration);return day>=s&&day<e&&isWeekday(day)}):[];
        const totalCrew=activeTasks.reduce((s,t)=>s+t.crew,0);
        const isOver=totalCrew>maxCrew;
        const isWknd=!isWeekday(day);
        return <div style={{position:"fixed",inset:0,background:"#00000080",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)"}} onClick={()=>{setCrewDayIdx(null);setExpandedCrewTask(null);setCrewNameInput("")}}>
          <div className="fade-in" onClick={e=>e.stopPropagation()} style={{background:"#13151C",border:"1px solid #27272A",borderRadius:10,padding:18,width:420,maxWidth:"92vw",maxHeight:"80vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div>
                <h2 style={{fontFamily:"'Space Grotesk'",fontSize:14,fontWeight:700,color:"#F4F4F5"}}>{dayStr}</h2>
                <p style={{fontSize:9,color:isWknd?"#52525B":isOver?"#EF4444":"#52525B",marginTop:2}}>{isWknd?"Weekend — no crew scheduled":totalCrew+" crew assigned"+(isOver?` · ⚠ Over capacity (max ${maxCrew})`:` of ${maxCrew} capacity`)}</p>
              </div>
              <button onClick={()=>{setCrewDayIdx(null);setExpandedCrewTask(null);setCrewNameInput("")}} style={{width:24,height:24,borderRadius:5,border:"1px solid #27272A",background:"#13151C",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            {/* Capacity bar */}
            <div style={{marginBottom:12,background:"#0B0D12",borderRadius:4,padding:6,border:"1px solid #1C1F27"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:"#52525B",marginBottom:3}}>
                <span>Crew Utilization</span>
                <span style={{color:isOver?"#EF4444":"#A1A1AA",fontWeight:600}}>{totalCrew}/{maxCrew}</span>
              </div>
              <div style={{height:8,background:"#1C1F27",borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min(100,totalCrew/maxCrew*100)}%`,background:isOver?"#EF4444":"#3B82F6",borderRadius:4,transition:"width .2s"}}/>
              </div>
            </div>
            {/* Task list */}
            {activeTasks.length===0?<div style={{padding:16,textAlign:"center",color:"#3F3F46",fontSize:10}}>No tasks scheduled</div>:
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                {activeTasks.map((t,i)=>{
                  const color=getColor(allTasks.indexOf(t));
                  const sc=statusColor(t.status);
                  const dayNum=(()=>{let cnt=0;const s=parseDate(t.startDate);for(let d=new Date(s);d<=day;d.setDate(d.getDate()+1)){if(isWeekday(d))cnt++}return cnt})();
                  const isExpanded=expandedCrewTask===t.id;
                  const members=t.crewMembers||[];
                  return <div key={t.id} style={{background:"#0B0D12",borderRadius:5,border:`1px solid ${isExpanded?"#3B82F640":"#1C1F27"}`,overflow:"hidden",transition:"border-color .15s"}}>
                    {/* Task header row - clickable */}
                    <div onClick={()=>{setExpandedCrewTask(isExpanded?null:t.id);setCrewNameInput("")}} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",cursor:"pointer",background:isExpanded?"#3B82F608":"transparent",transition:"background .1s"}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:color,flexShrink:0}}/>
                      <div style={{flex:1,overflow:"hidden"}}>
                        <div style={{fontSize:10,fontWeight:500,color:"#E4E4E7",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.name}</div>
                        <div style={{fontSize:8,color:"#52525B",marginTop:1}}>
                          Day {dayNum} of {t.extDuration} · {t.category}
                          {t.status&&<span style={{color:sc,fontWeight:600,marginLeft:4}}>{t.status}</span>}
                          {members.length>0&&<span style={{color:"#60A5FA",marginLeft:4}}> · {members.length}/{t.crew} assigned</span>}
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                        <span style={{fontSize:14,fontWeight:700,color:"#E4E4E7",fontFamily:"'Space Grotesk'",minWidth:20,textAlign:"right"}}>{t.crew}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={isExpanded?"#60A5FA":"#3F3F46"} strokeWidth="2" style={{transform:isExpanded?"rotate(180deg)":"none",transition:"transform .15s"}}><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                    </div>
                    {/* Expanded crew member panel */}
                    {isExpanded&&<div style={{padding:"6px 10px 10px",borderTop:"1px solid #1C1F27"}}>
                      {/* Current crew members */}
                      {members.length>0?<div style={{display:"flex",flexDirection:"column",gap:2,marginBottom:8}}>
                        {members.map((name,mi)=><div key={mi} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:"#13151C",borderRadius:3,border:"1px solid #1C1F27"}}>
                          <div style={{width:20,height:20,borderRadius:"50%",background:`${color}25`,border:`1px solid ${color}40`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            <span style={{fontSize:8,fontWeight:700,color,textTransform:"uppercase"}}>{name.charAt(0)}</span>
                          </div>
                          <span style={{fontSize:10,color:"#E4E4E7",flex:1}}>{name}</span>
                          <button onClick={e=>{e.stopPropagation();removeCrewMember(t.id,mi)}} style={{width:16,height:16,borderRadius:3,border:"1px solid #27272A",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>)}
                      </div>:<div style={{fontSize:8,color:"#3F3F46",marginBottom:6,padding:"4px 0"}}>No crew members assigned yet</div>}
                      {/* Add crew member input */}
                      {members.length<t.crew&&<div style={{display:"flex",gap:4}}>
                        <input value={crewNameInput} onChange={e=>setCrewNameInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){addCrewMember(t.id,crewNameInput)}}}
                          placeholder="Add crew member name..." style={{flex:1,padding:"5px 8px",background:"#13151C",border:"1px solid #27272A",borderRadius:3,color:"#E4E4E7",fontSize:10,outline:"none",fontFamily:"inherit"}}/>
                        <button onClick={()=>addCrewMember(t.id,crewNameInput)} style={{padding:"4px 10px",fontSize:9,fontWeight:600,borderRadius:3,border:"none",cursor:"pointer",fontFamily:"inherit",background:"#3B82F6",color:"#fff",opacity:crewNameInput.trim()?"1":"0.4"}}>Add</button>
                      </div>}
                      {members.length>=t.crew&&<div style={{fontSize:8,color:"#10B981",padding:"2px 0"}}>✓ All {t.crew} crew positions filled</div>}
                      {members.length>0&&members.length<t.crew&&<div style={{fontSize:7,color:"#F59E0B",marginTop:4}}>{t.crew-members.length} more crew member{t.crew-members.length>1?"s":""} needed</div>}
                    </div>}
                  </div>})}
              </div>}
            {/* Summary */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,padding:"8px 10px",background:isOver?"#EF444410":"#3B82F610",borderRadius:5,border:`1px solid ${isOver?"#EF444430":"#3B82F630"}`}}>
              <span style={{fontSize:9,fontWeight:600,color:isOver?"#EF4444":"#60A5FA"}}>{activeTasks.length} task{activeTasks.length!==1?"s":""} active</span>
              <span style={{fontSize:13,fontWeight:700,color:isOver?"#EF4444":"#60A5FA",fontFamily:"'Space Grotesk'"}}>{totalCrew} crew</span>
            </div>
          </div>
        </div>
      })()}

      {/* DAILY STATUS REPORT */}
      {showReport&&(()=>{
        const reportDate=`${DAYS_SHORT[today.getDay()]}, ${MONTHS_FULL[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
        // Build phase data: ph1 is all complete, ph2-12 from current tasks
        const phaseReport = [];
        // Phase 1 - all finished
        phaseReport.push({ph:1,tasks:Object.values(TASK_NAMES).map(n=>({name:n,status:"100%"}))});
        // Phases 2-12
        for (let p=2;p<=12;p++){
          const phaseTasks=[];
          const tmplPositions=PHASE_DATA[p]||[];
          const presentPositions=new Set(tmplPositions.map(r=>r[0]));
          // Tasks that were in the original template
          for (let pos=1;pos<=13;pos++){
            const name=TASK_NAMES[pos];
            if (!presentPositions.has(pos)){
              // Not in current data = finished
              phaseTasks.push({name,status:"100%"});
            } else {
              // Find in current task list
              const found=allTasks.find(t=>t.name===`Ph${p} ${name}`);
              if(found){
                phaseTasks.push({name,status:found.status||"Not Started",crew:found.crew,extDuration:found.extDuration,fullDuration:found.fullDuration});
              } else {
                phaseTasks.push({name,status:"Not Started"});
              }
            }
          }
          phaseReport.push({ph:p,tasks:phaseTasks});
        }
        // Compute phase completion
        function phaseCompletion(tasks){
          const total=tasks.length;
          let sum=0;
          tasks.forEach(t=>{
            if(t.status==="100%")sum+=100;
            else if(t.status&&t.status!=="Not Started")sum+=parseInt(t.status)||0;
          });
          return Math.round(sum/total);
        }
        // Overall building completion
        const overallPct=Math.round(phaseReport.reduce((s,p)=>s+phaseCompletion(p.tasks),0)/phaseReport.length);

        return <div style={{position:"fixed",inset:0,background:"#00000080",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)"}} onClick={()=>setShowReport(false)}>
          <div className="fade-in" onClick={e=>e.stopPropagation()} style={{background:"#13151C",border:"1px solid #27272A",borderRadius:10,padding:20,width:560,maxWidth:"94vw",maxHeight:"88vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div>
                <h2 style={{fontFamily:"'Space Grotesk'",fontSize:16,fontWeight:700,color:"#F4F4F5"}}>Daily Status Report</h2>
                <p style={{fontSize:10,color:"#71717A",marginTop:2}}>{reportDate}</p>
              </div>
              <button onClick={()=>setShowReport(false)} style={{width:24,height:24,borderRadius:5,border:"1px solid #27272A",background:"#13151C",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,flexShrink:0}}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Overall building progress */}
            <div style={{padding:"10px 12px",background:"#0B0D12",borderRadius:6,border:"1px solid #1C1F27",marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontSize:10,fontWeight:600,color:"#E4E4E7"}}>Overall Building Progress</span>
                <span style={{fontSize:16,fontWeight:700,color:overallPct>=80?"#10B981":overallPct>=40?"#F59E0B":"#3B82F6",fontFamily:"'Space Grotesk'"}}>{overallPct}%</span>
              </div>
              <div style={{height:10,background:"#1C1F27",borderRadius:5,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${overallPct}%`,background:overallPct>=80?"#10B981":overallPct>=40?"#F59E0B":"#3B82F6",borderRadius:5,transition:"width .3s"}}/>
              </div>
            </div>

            {/* Phase by phase */}
            {phaseReport.map(({ph,tasks:pTasks})=>{
              const pPct=phaseCompletion(pTasks);
              const allDone=pPct===100;
              const sc=pPct>=100?"#10B981":pPct>=80?"#10B981":pPct>=40?"#F59E0B":pPct>0?"#3B82F6":"#52525B";
              return <div key={ph} style={{marginBottom:8,background:"#0B0D12",borderRadius:6,border:`1px solid ${allDone?"#10B98130":"#1C1F27"}`,overflow:"hidden"}}>
                {/* Phase header */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:allDone?"#10B98108":"transparent"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,fontWeight:700,color:allDone?"#10B981":"#E4E4E7",fontFamily:"'Space Grotesk'"}}>Phase {ph}</span>
                    {allDone&&<span style={{fontSize:8,fontWeight:600,color:"#10B981",background:"#10B98120",padding:"1px 6px",borderRadius:3}}>COMPLETE</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:60,height:6,background:"#1C1F27",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pPct}%`,background:sc,borderRadius:3}}/>
                    </div>
                    <span style={{fontSize:10,fontWeight:700,color:sc,fontFamily:"'Space Grotesk'",minWidth:28,textAlign:"right"}}>{pPct}%</span>
                  </div>
                </div>
                {/* Task rows */}
                <div style={{padding:"0 6px 6px"}}>
                  {pTasks.map((t,ti)=>{
                    const isDone=t.status==="100%";
                    const isStarted=t.status&&t.status!=="Not Started"&&t.status!=="100%";
                    const pct=isDone?100:isStarted?(parseInt(t.status)||0):0;
                    const tsc=isDone?"#10B981":pct>=80?"#10B981":pct>=40?"#F59E0B":pct>0?"#3B82F6":"#52525B";
                    return <div key={ti} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",borderRadius:3,background:isDone?"#10B98105":"transparent"}}>
                      {/* Status indicator */}
                      {isDone?<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" style={{flexShrink:0}}><polyline points="20 6 9 17 4 12"/></svg>
                        :isStarted?<div style={{width:12,height:12,borderRadius:"50%",border:`2px solid ${tsc}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:5,height:5,borderRadius:"50%",background:tsc}}/></div>
                        :<div style={{width:12,height:12,borderRadius:"50%",border:"2px solid #27272A",flexShrink:0}}/>}
                      {/* Task name */}
                      <span style={{fontSize:9,color:isDone?"#52525B":"#D4D4D8",flex:1,textDecoration:isDone?"line-through":"none"}}>{t.name}</span>
                      {/* Status */}
                      <span style={{fontSize:9,fontWeight:isDone||isStarted?600:400,color:tsc,minWidth:65,textAlign:"right"}}>
                        {isDone?"Finished":isStarted?t.status+" complete":"Not Started"}
                      </span>
                    </div>
                  })}
                </div>
              </div>
            })}

            {/* Footer */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,padding:"8px 12px",background:"#0B0D12",borderRadius:5,border:"1px solid #1C1F27"}}>
              <span style={{fontSize:9,color:"#52525B"}}>12 phases · 13 tasks per phase · 156 total</span>
              <span style={{fontSize:9,color:"#71717A"}}>{allTasks.length} tasks remaining</span>
            </div>
          </div>
        </div>
      })()}
    </div>
  );
}
