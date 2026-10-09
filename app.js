import { compressNoteImage } from './note-images.js';
import { parseCalendar, calendarTaskId } from './calendar-import.js';
import { initializeAccount, saveCloud } from './account.js?v=5';
import { daysLeft, validTask, dateKey, normalizeDue, millisecondsLeft, countdown, urgency, matchesFilters } from './core.js?v=12';
const $ = s => document.querySelector(s);
const urgencyLabels={overdue:'Overdue',today:'Due today',three:'Due within 3 days',week:'Due within 7 days',later:'Later',completed:'Completed'};
const KEY = 'shen-calendar-v1';
let accountUser = null, accountReady = true;
let deadlineFilter = null;
let noteImages=[], imageBusy=false, editorGeneration=0;
let taskFilters={due:"all",overdue:"all",priority:"all"};
let tasks = [], filter = 'active', view = 'list', editing = null;
let timelineOffset = -7, timelineSpan = 30;
let reminderDays = 7;
try { const n = Number(localStorage.getItem('shen-calendar-reminder-days')); if (Number.isInteger(n) && n >= 1 && n <= 365) reminderDays = n; } catch {}
let month = new Date(); month.setDate(1);
function toast(message) { $('#toast').textContent = message; $('#toast').style.display = 'block'; clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').style.display = 'none', 3500); }
try { const stored = JSON.parse(localStorage.getItem(KEY) || '[]'); if (!Array.isArray(stored) || !stored.every(validTask)) throw Error(); tasks = stored.map(t => ({...t, due: normalizeDue(t.due)})); } catch { toast('Could not read saved tasks. Restore a backup and check browser storage.'); }
async function save(next) { if(!accountReady){toast('Cloud tasks are still loading. Please wait or reload.');return false;} if(accountUser){if(await saveCloud(next,toast)){tasks=next;render();return true;}return false;} try { localStorage.setItem(KEY, JSON.stringify(next)); tasks = next; render(); return true; } catch { toast('Could not save: browser storage is unavailable or full. Export a backup.'); return false; } }
function el(tag, text, className) { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (className) e.className = className; return e; }
function button(text, fn, cls) { const b = el('button', text, cls); b.type = 'button'; b.onclick = fn; return b; }
function openEditor(task = null) { if(!accountReady)return toast('Wait for cloud tasks to load before editing.'); editorGeneration++;noteImages=(task?.images||[]).map(x=>({...x}));renderNoteImages();editing = task?.id || null; $('#form').reset(); $('#dialog-title').textContent = task ? 'Edit task' : 'Add task'; $('#form').elements.title.value = task?.title || ''; $('#form').elements.due.value = task ? normalizeDue(task.due) : `${dateKey(new Date())}T23:59`; $('#form').elements.priority.value = task?.priority || 'normal'; $('#form').elements.notes.value = task?.notes || ''; $('#timezone-note').textContent = `Local time zone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}. Existing date-only deadlines use 23:59.`; $('#editor').showModal(); }
$('#add').onclick = () => openEditor(); $('#view-add').onclick = () => openEditor(); $('#close').onclick = () => $('#editor').close();
$('#form').onsubmit = async e => { e.preventDefault(); if(imageBusy)return toast("Wait for the image to finish processing."); const f = e.target.elements; const title = f.title.value.trim(); if (!title) { f.title.setCustomValidity('Enter a task name.'); f.title.reportValidity(); return; } const old = tasks.find(t => t.id === editing); const task = { id: old?.id || crypto.randomUUID(), title, due: f.due.value, priority: f.priority.value, notes: f.notes.value.trim(), images:noteImages.map(x=>({...x})), completed: old?.completed || false, createdAt: old?.createdAt || new Date().toISOString() }; if (!validTask(task)) return toast('Enter a valid task and due date.'); if (await save(old ? tasks.map(t => t.id === old.id ? task : t) : [...tasks, task])) { $('#editor').close(); toast(old ? 'Task updated' : 'Task added'); } };
$('#form').elements.title.oninput = e => e.target.setCustomValidity('');
async function toggle(t) { await save(tasks.map(x => x.id === t.id ? {...x, completed: !x.completed} : x)); }
async function remove(t) { if (confirm(`Delete “${t.title}”? This cannot be undone.`)) await save(tasks.filter(x => x.id !== t.id)); }
function matchesDeadline(t, now=new Date()){const left=millisecondsLeft(t.due,now);if(!deadlineFilter)return true;if(t.completed)return false;if(deadlineFilter==='overdue')return left<0;if(left<0)return false;return deadlineFilter==='today'?t.due.slice(0,10)===dateKey(now):left<=(deadlineFilter==='three'?3:reminderDays)*86400000;}
function selectDeadline(value){deadlineFilter=deadlineFilter===value?null:value;filter='active';taskFilters={due:'all',overdue:'all',priority:'all'};syncFilterControls();$('#search').value='';render();}
function selectedTasks() { const q = $('#search').value.trim().toLowerCase(); return tasks.filter(t => matchesFilters(t,{...taskFilters,customDays:reminderDays}) && (view !== 'list' || matchesDeadline(t)) && (filter === 'all' || (filter === 'completed' ? t.completed : !t.completed)) && `${t.title} ${t.notes}`.toLowerCase().includes(q)).sort((a,b) => Number(a.completed)-Number(b.completed) || a.due.localeCompare(b.due)); }
function render() {
 const board = view === 'list'; $('#board-intro').hidden = !board; $('#stats').hidden = !board; $('#board-briefing').hidden = !board; $('#view-heading').hidden = board; $('#page-title').textContent = view === 'timeline' ? 'Timeline' : 'Calendar'; $('#page-description').textContent = view === 'timeline' ? 'See the time between now and your next deadline.' : 'Your deadlines, one month at a time.';
 const today = new Date(); $('#today').textContent = today.toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric',weekday:'long'});
 const active = tasks.filter(t => !t.completed), upcoming = active.filter(t => millisecondsLeft(t.due,today) >= 0);
 const dueToday = upcoming.filter(t => t.due.slice(0,10) === dateKey(today));
 const within3 = upcoming.filter(t => millisecondsLeft(t.due,today) <= 3*86400000);
 const soon = upcoming.filter(t => millisecondsLeft(t.due,today) <= reminderDays*86400000);
 const overdue = active.filter(t => millisecondsLeft(t.due,today) < 0), done = tasks.filter(t => t.completed);
 const cards = [['Due today',dueToday.length,'Remaining deadlines today'],['Due within 3 days',within3.length,'In the next 72 hours'],[`Due within ${reminderDays} days`,soon.length,'Choose your reminder window'],['Active tasks',active.length,'Make space for every goal'],['Overdue',overdue.length,'A good time to take action'],['Completed',done.length,'Every step counts']].map(([label,note,hint],i) => {
   const e = el('div',undefined,i < 3 ? 'stat due-stat' : 'stat summary-stat');
   if(i === 2) {
     const control = el('label',undefined,'window-label'); control.append(el('span','Due within'));
     const input = el('input'); input.type='number';input.min='1';input.max='365';input.step='1';input.value=reminderDays;input.id='reminder-days';input.setAttribute('aria-label','Reminder window in days');
     input.onchange=()=>{const n=Number(input.value);if(!Number.isInteger(n)||n<1||n>365){input.value=reminderDays;toast('Choose a whole number from 1 to 365 days.');return;}reminderDays=n;try{localStorage.setItem('shen-calendar-reminder-days',String(n));}catch{toast('Your preference could not be saved in this browser.');}render();};
     control.append(input,el('span','days'),button('Apply',()=>input.onchange(),'apply-window'));e.append(control);
   } else e.append(el('label',label));
   const value=['today','three','custom',null,'overdue',null][i];
   const metric=button(String(note).padStart(2,'0'),()=>{if(value)selectDeadline(value);else{deadlineFilter=null;filter=i===5?'completed':'active';render();}},'stat-filter-button');
   metric.setAttribute('aria-label',`Filter tasks: ${label}`);metric.setAttribute('aria-pressed',String(value ? deadlineFilter===value : !deadlineFilter && filter===(i===5?'completed':'active')));
   e.classList.toggle('stat-selected',Boolean(value&&deadlineFilter===value));
   e.append(metric,el('small',hint));
   if(value){e.onclick=event=>{if(event.target.closest('button,input,label.window-label'))return;selectDeadline(value);};}
   return e;
 });
 $('#stats').replaceChildren(...cards);
 document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('selected',b.dataset.filter===filter));
 $('#deadline-filter-status').hidden = !deadlineFilter || !board;
 $('#deadline-filter-label').textContent = {today:'Due today',three:'Due within 3 days',custom:`Due within ${reminderDays} days`,overdue:'Overdue'}[deadlineFilter] || '';
 $('#active-count').textContent = active.length; $('#completed-count').textContent = done.length;
 const next = [...active].sort((a,b) => a.due.localeCompare(b.due))[0];
 $('#daily-text').textContent = !next ? 'No active tasks. Make room for your next goal.' : `Active tasks: ${active.length}; due today: ${dueToday.length}; within 3 days: ${within3.length}; within ${reminderDays} days: ${soon.length}${overdue.length ? `; ${overdue.length} are overdue` : ''}. Earliest deadline: ${next.title}.`;
 const reminders = $('#overdue-reminders'); reminders.hidden = overdue.length === 0; reminders.replaceChildren();
 if(overdue.length){
   const heading=el('div',undefined,'overdue-heading');heading.append(el('strong',`Past due · ${overdue.length} unfinished ${overdue.length===1?'task':'tasks'}`),el('p','These deadlines have passed. They stay here until you mark them complete.'));reminders.append(heading);
   for(const t of [...overdue].sort((a,b)=>a.due.localeCompare(b.due))){const row=el('div',undefined,'overdue-reminder');const body=el('div');body.append(button(t.title,()=>openEditor(t),'overdue-task-link'),el('small',`Due ${t.due.replace('T',' ')} · ${countdown(t.due).value} overdue`));row.append(body,button('Mark complete',()=>toggle(t),'overdue-complete'));reminders.append(row);}
 }
 $('#list').hidden = view !== 'list'; $('#calendar').hidden = view !== 'calendar'; $('#timeline').hidden = view !== 'timeline';
 const visible = selectedTasks(); $('#list').replaceChildren();
 if (!visible.length) { const empty = el('div',undefined,'empty'); empty.append(el('strong', tasks.length ? 'No matching tasks' : 'Give your next goal a date'),el('p',tasks.length ? 'Try another filter or add a new task.' : 'Add your first deadline.\nCome back each day to see how much time remains.')); $('#list').append(empty); }
 for (const t of visible) { const left = millisecondsLeft(t.due)/86400000, remaining = countdown(t.due), row = el('article',undefined,`task urgency-${urgency(t)} ${t.completed?'done':''}`); const check = button(t.completed?'✓':'',() => toggle(t),'check'); check.setAttribute('aria-label',`${t.completed?'Reopen':'Complete'}: ${t.title}`); const body = el('div',undefined,'task-body'); const meta = el('div',undefined,'meta'); meta.append(el('span',`Due ${t.due.replace('T',' ')}`),el('span', {high:'● High',normal:'● Normal',low:'● Low'}[t.priority],'tag')); meta.append(el('span',urgencyLabels[urgency(t)],'urgency-badge'));body.append(el('h3',t.title),meta); if (t.notes) body.append(el('p',t.notes,'notes'));if(t.images?.length){const gallery=el('div',undefined,'task-images');for(const image of t.images){const b=button('',()=>showNoteImage(image));const img=el('img');img.src=image.data;img.alt=image.name;img.loading='lazy';b.append(img);gallery.append(b);}body.append(gallery);} const count = el('div',undefined,`countdown ${!t.completed && left<0?'overdue':!t.completed && left<=reminderDays?'urgent':''}`); count.append(el('strong',t.completed?'✓':remaining.value),el('small',t.completed?'Completed':remaining.label)); const actions = el('div',undefined,'actions'); actions.append(button('Edit',() => openEditor(t)),button('Delete',() => remove(t))); row.append(check,body,count,actions); $('#list').append(row); }
 if (view === 'calendar') renderCalendar(visible);
 if (view === 'timeline') renderTimeline(visible);
 document.querySelectorAll('.nav').forEach(b=>b.setAttribute('aria-current',b.classList.contains('active')?'page':'false'));
}
function renderCalendar(visible) { const root = $('#calendar'); root.replaceChildren(); const bar = el('div',undefined,'month-bar'); bar.append(button('←',()=>{month.setMonth(month.getMonth()-1);render();}),el('strong',month.toLocaleDateString('en-US',{year:'numeric',month:'long'})),button('→',()=>{month.setMonth(month.getMonth()+1);render();})); root.append(bar); const grid=el('div',undefined,'grid'); for(const name of ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']) grid.append(el('div',name,'weekday')); const offset=(month.getDay()+6)%7; for(let i=0;i<offset;i++) grid.append(el('div',undefined,'day blank')); const total=new Date(month.getFullYear(),month.getMonth()+1,0).getDate(); for(let day=1;day<=total;day++){const key=dateKey(new Date(month.getFullYear(),month.getMonth(),day)); const cell=el('div',String(day),`day ${key===dateKey(new Date())?'today':''}`); for(const t of visible.filter(t=>t.due.slice(0,10)===key)){ const b=button(`${t.due.slice(11)} ${t.title}`,()=>openEditor(t),`calendar-task urgency-${urgency(t)} ${t.completed?'done':''}`); b.title=`${t.title} — ${t.due.replace('T',' ')}`; cell.append(b); }grid.append(cell);}root.append(grid); }
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{deadlineFilter=null;filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('selected',x===b));render();});
$('#search').oninput=render;
function setView(v){view=v;$('#overview').classList.toggle('active',v==='list');$('#show-calendar').classList.toggle('active',v==='calendar');$('#show-timeline').classList.toggle('active',v==='timeline');$('#view-name').textContent={list:'Deadline board',calendar:'Calendar',timeline:'Timeline'}[v];location.hash=v;render();}
$('#show-timeline').onclick=()=>setView('timeline'); $('#overview').onclick=()=>setView('list'); $('#show-calendar').onclick=()=>setView('calendar');
$('#export').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),tasks},null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=el('a');a.href=url;a.download=`shen-calendar-${dateKey(new Date())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Backup exported');};
$('#import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>20_000_000)throw Error();const data=JSON.parse(await file.text());if(data.version!==1 || !Array.isArray(data.tasks) || !data.tasks.every(validTask) || new Set(data.tasks.map(t=>t.id)).size!==data.tasks.length)throw Error();if(confirm(`Replace all current tasks with ${data.tasks.length} tasks from this backup? Export your current data first. Continue?`)){if(await save(data.tasks.map(t=>({...t,due:normalizeDue(t.due)}))))toast('Backup restored');}}catch{toast('Import failed. Choose a valid Shen Calendar backup.');}finally{e.target.value='';}};
if (['list','calendar','timeline'].includes(location.hash.slice(1))) setView(location.hash.slice(1)); else render(); window.addEventListener('hashchange',()=>{const v=location.hash.slice(1);if(['list','calendar','timeline'].includes(v)&&v!==view)setView(v);}); setInterval(render,60_000); document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});

function renderTimeline(visible) {
 const root = $('#timeline'); root.replaceChildren();
 const start = new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate()+timelineOffset);
 const dates = Array.from({length:timelineSpan},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return d;});
 const fmt = d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
 const controls = el('div',undefined,'timeline-controls');
 const range = el('strong',`${fmt(start)} — ${fmt(dates.at(-1))}`);
 const navigation = el('div',undefined,'timeline-navigation');
 const previous=button('←',()=>{timelineOffset-=timelineSpan;render();});previous.setAttribute('aria-label','Previous date range');
 const next=button('→',()=>{timelineOffset+=timelineSpan;render();});next.setAttribute('aria-label','Next date range');
 const zoom=el('select');zoom.setAttribute('aria-label','Timeline date range');
 for(const n of [30,60,90]){const o=el('option',`${n} days`);o.value=n;o.selected=n===timelineSpan;zoom.append(o);}zoom.onchange=()=>{timelineSpan=Number(zoom.value);render();};
 navigation.append(previous,button('Today',()=>{timelineOffset=-7;render();}),next,zoom);controls.append(range,navigation);root.append(controls);
 root.append(el('p','Time remaining until each deadline. Select a task to edit it.','timeline-hint'));
 if(!visible.length){root.append(el('div','No matching tasks. Add a task or change your filters.','empty'));return;}
 const scroll=el('div',undefined,'timeline-scroll'); const table=el('table',undefined,'timeline-table');
 const head=el('thead'),hr=el('tr');const title=el('th','TASK / DEADLINE','timeline-label');title.scope='col';hr.append(title);
 const todayKey=dateKey(new Date());
 for(const d of dates){const th=el('th',undefined,`timeline-date ${dateKey(d)===todayKey?'is-today':''}`);th.scope='col';th.append(el('small',d.toLocaleDateString('en-US',{month:'short'})),el('strong',d.getDate()),el('small',dateKey(d)===todayKey?'TODAY':d.toLocaleDateString('en-US',{weekday:'short'})));hr.append(th);}head.append(hr);table.append(head);
 const tbody=el('tbody');
 for(const t of visible){const row=el('tr',undefined,`urgency-${urgency(t)} ${t.completed?'timeline-done':''}`);const label=el('th',undefined,'timeline-label');label.scope='row';const left=millisecondsLeft(t.due);const remaining=countdown(t.due);const status=t.completed?'Completed':`${remaining.value} ${remaining.label}`;label.append(button(t.title,()=>openEditor(t),'timeline-task-name'),el('small',`${t.due.replace('T',' ')} · ${status}`));row.append(label);
 const dueIndex=daysLeft(t.due,start),todayIndex=daysLeft(todayKey,start);
 for(let i=0;i<dates.length;i++){const key=dateKey(dates[i]);const cell=el('td',undefined,`timeline-cell ${key===todayKey?'is-today':''}`);const low=Math.min(todayIndex,dueIndex),high=Math.max(todayIndex,dueIndex);if(i>=low&&i<=high){const bar=button(i===dueIndex?'◆':i===0&&dueIndex<0?'←':i===dates.length-1&&dueIndex>=dates.length?'→':'',()=>openEditor(t),`timeline-bar ${left<0?'late':''} ${t.completed?'finished':''} ${i===low?'bar-start':''} ${i===high?'bar-end':''}`);bar.title=`${t.title} — Due ${t.due.replace('T',' ')} — ${status}`;bar.setAttribute('aria-label',bar.title);cell.append(bar);}row.append(cell);}tbody.append(row);}
 table.append(tbody);scroll.append(table);root.append(scroll);
 const mobile = el('div',undefined,'mobile-timeline');
 for(const t of visible){
   const left=millisecondsLeft(t.due),remaining=countdown(t.due),status=t.completed?'Completed':`${remaining.value} ${remaining.label}`;
   const card=el('article',undefined,`mobile-timeline-card urgency-${urgency(t)} ${left<0?'late':''} ${t.completed?'finished':''}`);
   const heading=el('div',undefined,'mobile-timeline-heading');heading.append(button(t.title,()=>openEditor(t),'timeline-task-name'),el('span',status,'mobile-status'));
   card.append(heading,el('p',`Due ${t.due.replace('T',' ')}`,'mobile-due'));
   const track=el('div',undefined,'mobile-track');
   const dueIndex=daysLeft(t.due,start), todayIndex=daysLeft(todayKey,start);
   const clamp=n=>Math.max(0,Math.min(100,n/timelineSpan*100));
   const bar=el('div',undefined,'mobile-bar');bar.style.left=`${clamp(Math.min(todayIndex,dueIndex))}%`;bar.style.width=`${Math.max(1,clamp(Math.max(todayIndex,dueIndex))-clamp(Math.min(todayIndex,dueIndex)))}%`;
   track.append(bar);if(todayIndex>=0&&todayIndex<timelineSpan){const marker=el('span',undefined,'mobile-today-marker');marker.style.left=`${clamp(todayIndex)}%`;track.append(marker);}
   if(dueIndex>=0&&dueIndex<timelineSpan){const marker=el('span','◆','mobile-deadline-marker');marker.style.left=`${clamp(dueIndex)}%`;track.append(marker);}else{card.append(el('small',dueIndex<0?'Deadline before this range':'Deadline after this range','mobile-range-note'));}
   card.append(track);const axis=el('div',undefined,'mobile-axis');axis.append(el('span',fmt(start)),el('span',fmt(dates.at(-1))));card.append(axis);mobile.append(card);
 }
 root.append(mobile);
 root.append(el('div','◆ Deadline   ·   Red: today · Orange: 3 days · Blue: 7 days · Green: later   ·   Purple: overdue   ·   Gray: completed   ·   Arrows: deadline outside this range','timeline-legend'));
}

initializeAccount({notify:toast,getLocalTasks:()=>{try{const local=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(local)?local.filter(validTask).map(t=>({...t,due:normalizeDue(t.due)})):[];}catch{return[];}},onState:state=>{accountUser=state.user;accountReady=state.ready;$('#editor').close();if(accountUser)tasks=state.tasks;else{try{tasks=JSON.parse(localStorage.getItem(KEY)||'[]').filter(validTask).map(t=>({...t,due:normalizeDue(t.due)}));}catch{tasks=[];}}$('#add').disabled=!accountReady;$('#view-add').disabled=!accountReady;render();}});

$('#clear-deadline-filter').onclick=()=>{deadlineFilter=null;taskFilters={due:'all',overdue:'all',priority:'all'};syncFilterControls();render();};


function syncFilterControls(){for(const key of ['due','overdue','priority'])$(`#filter-${key}`).value=taskFilters[key];}
for(const key of ['due','overdue','priority'])$(`#filter-${key}`).onchange=e=>{deadlineFilter=null;taskFilters[key]=e.target.value;render();};
$('#reset-task-filters').onclick=()=>{deadlineFilter=null;taskFilters={due:'all',overdue:'all',priority:'all'};syncFilterControls();$('#search').value='';render();};

let pendingCalendar=[];let importOwner=null;
$('#calendar-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(!accountReady)throw Error('Wait for account tasks to load.');if(file.size>5_000_000)throw Error('Calendar file must be smaller than 5 MB.');const parsed=parseCalendar(await file.text());pendingCalendar=await Promise.all(parsed.entries.map(async t=>({...t,id:await calendarTaskId(t.identity),createdAt:new Date().toISOString()})));pendingCalendar=pendingCalendar.filter((t,i,all)=>!tasks.some(x=>x.id===t.id)&&all.findIndex(x=>x.id===t.id)===i);importOwner=accountUser?.id||null;$('#calendar-preview').replaceChildren();for(const t of pendingCalendar){const label=el('label',undefined,'calendar-import-item');const check=el('input');check.type='checkbox';check.checked=true;check.value=t.id;label.append(check,el('span',`${t.title} — ${t.due.replace('T',' ')}`));$('#calendar-preview').append(label);}$('#calendar-import-summary').textContent=`${pendingCalendar.length} new items available. ${parsed.entries.length-pendingCalendar.length} duplicates skipped. ${parsed.skipped.length} unsupported/cancelled items skipped.`;$('#calendar-import-warning').textContent=parsed.skipped.slice(0,20).join('\n');$('#calendar-import-submit').disabled=!pendingCalendar.length;$('#calendar-import-dialog').showModal();}catch(error){toast(error.message);}finally{e.target.value='';}};
$('#calendar-import-close').onclick=()=>$('#calendar-import-dialog').close();
$('#calendar-import-submit').onclick=async()=>{if(importOwner!==(accountUser?.id||null))return toast('Account changed. Please select the calendar file again.');const selected=new Set([...document.querySelectorAll('#calendar-preview input:checked')].map(e=>e.value));const additions=pendingCalendar.filter(t=>selected.has(t.id)&&!tasks.some(x=>x.id===t.id));if(!additions.length)return toast('Select at least one new item.');$('#calendar-import-submit').disabled=true;try{if(await save([...tasks,...additions])){$('#calendar-import-dialog').close();toast(`Imported ${additions.length} calendar items.`);}}finally{$('#calendar-import-submit').disabled=false;}};

function showNoteImage(image){$('#note-image-full').src=image.data;$('#note-image-full').alt=image.name;$('#image-viewer').showModal();}
$('#image-viewer-close').onclick=()=>$('#image-viewer').close();
function renderNoteImages(){$('#note-image-preview').replaceChildren();for(const [index,image] of noteImages.entries()){const card=el('div',undefined,'note-image-card');const img=el('img');img.src=image.data;img.alt=image.name;card.append(img,button('Remove',()=>{noteImages.splice(index,1);renderNoteImages();}));$('#note-image-preview').append(card);}}
async function addNoteImages(files){if(imageBusy)return toast('An image is still processing. Please try again shortly.');const ticket=editorGeneration;imageBusy=true;try{for(const file of files){if(noteImages.length>=3){toast('Attach up to 3 images per task.');break;}const image=await compressNoteImage(file);if(ticket!==editorGeneration||!$('#editor').open)return;noteImages.push(image);renderNoteImages();}}catch(error){toast(error.message);}finally{imageBusy=false;}}
$('#note-image-file').onchange=async e=>{await addNoteImages([...e.target.files]);e.target.value='';};
$('#form').elements.notes.addEventListener('paste',e=>{const images=[...e.clipboardData.items].filter(item=>item.kind==='file'&&item.type.startsWith('image/')).map(item=>item.getAsFile()).filter(Boolean);if(images.length){e.preventDefault();addNoteImages(images);}});
