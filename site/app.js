(() => {
  const $ = id => document.getElementById(id);
  const STORE = 'e-tasmik-v1';
  const today = new Date().toISOString().slice(0, 10);
  const readStore = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } };
  let state = { students: (window.ROSTER || []).map(s => ({ id: s.id, name: s.name, className: s.className, active: true })), records: [], teachers: (window.TEACHERS || []).map(t => ({ ...t })), settings: { 'Nama Sekolah':'Sekolah Kebangsaan Bandar Tawau','Kod Sekolah':'XBA3051','Nama Guru':'','Tahun Akademik':new Date().getFullYear(),'Sasaran Harian':'1' }, apiUrl: '' };
  const persist = () => localStorage.setItem(STORE, JSON.stringify(state));
  const initials = name => (name || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  const shortDate = str => { if (!str) return '—'; const d = new Date(`${str}T00:00:00`); return d.toLocaleDateString('ms-MY',{day:'numeric',month:'short',year:'numeric'}); };
  const todayMs = date => new Date(`${date}T00:00:00`).getTime();
  const getLocalDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const notify = msg => { const el=$('toast'); el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2800); };
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statusClass = s => s==='Lancar'?'status-lancar':s==='Perlu ulang'?'status-ulang':'status-belum';
  const badge = s => `<span class="status-badge ${statusClass(s)}">${esc(s || '—')}</span>`;
  const readingTitle = r => r.readingType==='Iqra'?`Iqra · Jilid ${esc(r.iqraLevel)}`:'Al-Quran';
  const readingDetail = r => r.readingType==='Iqra'?`Muka surat ${esc(r.page)}`:r.pageStart?`Muka surat ${esc(r.pageStart)}${r.pageEnd&&r.pageEnd!==r.pageStart?`–${esc(r.pageEnd)}`:''}`:(r.surah?`${esc(r.surah)} · Ayat ${esc(r.startAyah)}–${esc(r.endAyah)}`:'—');
  const teacherKey=t=>String(t.name||t['Nama Guru']||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('ms');
  const mergeTeachers=(defaults=[],provided=[])=>{const merged=new Map();defaults.forEach(t=>{const key=teacherKey(t);if(key)merged.set(key,{...t,active:t.active!==false});});provided.forEach(t=>{const key=teacherKey(t);if(!key)return;const old=merged.get(key);merged.set(key,{...old,...t,id:t.id||t['ID Guru']||old?.id,name:t.name||t['Nama Guru']||old?.name,active:t.active!==undefined?t.active!==false&&t['Aktif']!=='Tidak':t['Aktif']!=='Tidak'});});return [...merged.values()];};
  const getData = () => { const saved=readStore(); const savedStudents=Array.isArray(saved.students)?saved.students:[]; const savedTeachers=Array.isArray(saved.teachers)?saved.teachers:[]; state={...state,...saved}; const savedById=new Map(savedStudents.map(s=>[String(s.id||s['ID Murid']),s])); if((window.ROSTER||[]).length)state.students=window.ROSTER.map(s=>{const old=savedById.get(String(s.id));return {...s,active:old?(old.active!==false&&old['Aktif']!=='Tidak'):true};}); else if (!Array.isArray(state.students)||!state.students.length) state.students=[]; state.teachers=mergeTeachers(window.TEACHERS||[],savedTeachers); };
  async function api(action, payload) {
    if (!state.apiUrl) throw new Error('URL Apps Script belum disimpan.');
    const url = new URL(state.apiUrl); url.searchParams.set('action',action);
    if (!payload) { const res=await fetch(url); if(!res.ok) throw new Error('Sambungan gagal.'); return res.json(); }
    const res=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});
    if(!res.ok) throw new Error('Sambungan gagal.'); return res.json();
  }
  const isLive = () => Boolean(state.apiUrl);
  function renderHeader() {
    const school=state.settings['Nama Sekolah']||'Sekolah'; const code=state.settings['Kod Sekolah']||''; const teacher=state.settings['Nama Guru']||'Guru Tasmik';
    $('school-name').textContent=school; $('school-code').textContent=`${code}${code?' · ':''}Sesi pagi`; $('teacher-name').textContent=teacher; $('greeting-name').textContent=teacher.split(' ')[0]||'Guru';
    $('today-label').textContent=new Date().toLocaleDateString('ms-MY',{weekday:'short',day:'numeric',month:'short'});
    $('setting-school').value=school; $('setting-code').value=code; $('setting-teacher').value=state.settings['Nama Guru']||'';
    $('api-url').value=state.apiUrl||''; const live=$('connection-status'); live.classList.toggle('connected',isLive()); live.innerHTML=`<i></i> ${isLive()?'URL disimpan':'Mod setempat'}`;
  }
  function renderStudents() {
    const students=state.students.filter(s=>s.active!==false&&s['Aktif']!=='Tidak');
    const classes=[...new Set(students.map(s=>s.className||s.Kelas).filter(Boolean))].sort(); renderSessionClasses(students);renderBulkClasses(students);
    const filter=$('class-filter'); const old=filter.value; filter.innerHTML='<option value="">Semua kelas</option>'+classes.map(c=>`<option>${esc(c)}</option>`).join(''); filter.value=classes.includes(old)?old:'';
    $('settings-student-count').textContent=students.length.toLocaleString('ms-MY'); $('stat-students').textContent=students.length.toLocaleString('ms-MY'); $('stat-classes-note').textContent=`Merentas ${classes.length} kelas`;
    const classYear=c=>Number(String(c).match(/^\s*(\d+)/)?.[1]||0);
    const morningClasses=classes.filter(c=>classYear(c)>=4&&classYear(c)<=6);
    const afternoonClasses=classes.filter(c=>classYear(c)>=1&&classYear(c)<=3);
    const sessionCard=(title,years,items,theme)=>`<section class="session-class-card ${theme}"><div class="session-class-heading"><div><h3>${title}</h3><p>Tahun ${years}</p></div><span>${items.length} kelas</span></div><div class="session-class-list">${items.length?items.map(c=>`<span class="class-chip">${esc(c)}</span>`).join(''):'<span class="session-empty">Tiada kelas</span>'}</div></section>`;
    $('settings-class-chips').innerHTML=sessionCard('Sesi Pagi','4–6',morningClasses,'morning-session')+sessionCard('Sesi Petang','1–3',afternoonClasses,'afternoon-session');
    const syncButton=$('sync-students-button');if(syncButton)syncButton.disabled=!isLive();const syncNote=$('sync-students-note');if(syncNote)syncNote.textContent=isLive()?'Kemas kini helaian Google Sheets dengan senarai Tahun 1–6 terkini.':'Sambungkan Google Sheets dahulu untuk mengemas kini helaian murid.';
  }
  const yearOfClass=c=>Number(String(c||'').match(/^\s*(\d+)/)?.[1]||0);
  function renderSessionClasses(source=state.students.filter(s=>s.active!==false&&s['Aktif']!=='Tidak')) {
    const session=$('record-session').value, classSelect=$('student-class'), selectedClass=classSelect.value;
    const classes=[...new Set(source.map(s=>s.className||s.Kelas).filter(Boolean))].sort();
    const sessionClasses=classes.filter(c=>session==='pagi'?yearOfClass(c)>=4&&yearOfClass(c)<=6:session==='petang'?yearOfClass(c)>=1&&yearOfClass(c)<=3:false);
    classSelect.disabled=!session;
    classSelect.innerHTML=`<option value="">${session?`Pilih kelas daripada ${sessionClasses.length} kelas`:'Pilih sesi dahulu'}</option>`+sessionClasses.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    classSelect.value=sessionClasses.includes(selectedClass)?selectedClass:'';
    renderStudentChoices(source);
  }
  function renderBulkClasses(source=state.students.filter(s=>s.active!==false&&s['Aktif']!=='Tidak')) {
    const session=$('bulk-session').value, select=$('bulk-class'), selected=select.value;
    const classes=[...new Set(source.map(s=>s.className||s.Kelas).filter(Boolean))].sort();
    const options=classes.filter(c=>session==='pagi'?yearOfClass(c)>=4&&yearOfClass(c)<=6:session==='petang'?yearOfClass(c)>=1&&yearOfClass(c)<=3:false);
    select.disabled=!session;select.innerHTML=`<option value="">${session?`Pilih kelas daripada ${options.length} kelas`:'Pilih sesi dahulu'}</option>`+options.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    select.value=options.includes(selected)?selected:'';renderBulkStudents(source);
  }
  function renderBulkStudents(source=state.students.filter(s=>s.active!==false&&s['Aktif']!=='Tidak')) {
    const cls=$('bulk-class').value,list=$('bulk-student-list');
    const students=cls?source.filter(s=>(s.className||s.Kelas)===cls):[];
    $('bulk-roster-count').textContent=students.length?`${students.length} murid · tandakan yang hadir dan akan direkodkan.`:'Pilih sesi dan kelas dahulu.';
    list.innerHTML=students.length?students.map(s=>{const name=s.name||s['Nama Murid'];return `<div class="bulk-student-row"><div class="bulk-student-topline"><label class="bulk-student-check"><input class="bulk-include" type="checkbox" value="${esc(s.id||s['ID Murid'])}"><span class="student-avatar">${esc(initials(name))}</span><span class="bulk-student-name">${esc(name)}</span></label><select class="bulk-student-status" aria-label="Status bacaan ${esc(name)}" disabled><option>Lancar</option><option>Perlu ulang</option><option>Belum selesai</option></select></div><div class="bulk-reading-controls"><select class="bulk-reading-type bulk-reading-input" aria-label="Jenis bacaan untuk ${esc(name)}" disabled><option value="Al-Quran">Al-Quran</option><option value="Iqra">Buku Iqra</option></select><div class="bulk-quran-pages"><input class="bulk-page-start bulk-reading-input" type="number" min="1" max="604" placeholder="Muka surat mula" aria-label="Muka surat mula Al-Quran untuk ${esc(name)}" disabled><input class="bulk-page-end bulk-reading-input" type="number" min="1" max="604" placeholder="Muka surat akhir" aria-label="Muka surat akhir Al-Quran untuk ${esc(name)}" disabled></div><div class="bulk-iqra-pages hidden"><select class="bulk-iqra-level bulk-reading-input" aria-label="Jilid Iqra untuk ${esc(name)}" disabled><option value="">Pilih jilid</option><option value="1">Jilid 1</option><option value="2">Jilid 2</option><option value="3">Jilid 3</option><option value="4">Jilid 4</option><option value="5">Jilid 5</option><option value="6">Jilid 6</option></select><input class="bulk-iqra-page bulk-reading-input" type="number" min="1" placeholder="Muka surat" aria-label="Muka surat Iqra untuk ${esc(name)}" disabled></div></div></div>`;}).join(''):'<div class="bulk-empty">Pilih sesi dan kelas untuk paparkan nama murid.</div>';
    $('bulk-select-all').disabled=!students.length;$('bulk-clear-all').disabled=!students.length;updateBulkSaveButton();
  }
  function setBulkRowEnabled(row,enabled){row.querySelectorAll('.bulk-student-status,.bulk-reading-input').forEach(control=>control.disabled=!enabled);}
  function toggleBulkRowReading(row){const iqra=row.querySelector('.bulk-reading-type').value==='Iqra';row.querySelector('.bulk-quran-pages').classList.toggle('hidden',iqra);row.querySelector('.bulk-iqra-pages').classList.toggle('hidden',!iqra);}
  function updateBulkSaveButton(){const selected=document.querySelectorAll('#bulk-student-list .bulk-include:checked').length;const button=$('save-bulk-records');button.disabled=!selected;button.textContent=selected?`Simpan ${selected} rekod terpilih`:'Simpan rekod terpilih';}
  const recordYear = className => {const match=String(className||'').match(/^\s*(?:tahun\s*)?([1-6])(?:\D|$)/i);return match?match[1]:'';};
  const juzStartPages=[1,22,42,62,82,102,121,142,162,182,201,222,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582];
  const sharedJuzPages={62:[3,4],121:[6,7],201:[10,11],502:[25,26]};
  function juzsForPage(page){let juz=1;for(let i=1;i<juzStartPages.length;i++){if(page<juzStartPages[i])break;juz=i+1;}return sharedJuzPages[page]||[juz];}
  let summaryPreviewRows=[],summaryPreviewReady=false;
  const summarySessions=[{key:'pagi',title:'Sesi Pagi',subtitle:'Tahun 4–6',years:['4','5','6']},{key:'petang',title:'Sesi Petang',subtitle:'Tahun 1–3',years:['1','2','3']}];
  function renderSummaryClassOptions(){const select=$('summary-class'),old=select.value,session=$('summary-session').value;const classes=[...new Set(state.students.filter(s=>s.active!==false&&s['Aktif']!=='Tidak').map(s=>s.className||s.Kelas).filter(Boolean))].filter(name=>!session||summarySessions.find(s=>s.key===session).years.includes(recordYear(name))).sort((a,b)=>a.localeCompare(b,'ms',{numeric:true,sensitivity:'base'}));select.innerHTML='<option value="">Semua kelas</option>'+classes.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('');select.value=classes.includes(old)?old:'';}
  function summaryFilterRecords(){const session=$('summary-session').value,cls=$('summary-class').value,reading=$('summary-reading').value,from=$('summary-date-from').value,to=$('summary-date-to').value;return state.records.filter(record=>(!session||summarySessions.find(s=>s.key===session)?.years.includes(recordYear(record.className)))&&(!cls||record.className===cls)&&(!reading||record.readingType===reading)&&(!from||record.date>=from)&&(!to||record.date<=to));}
  function renderClassSummary(){
    const from=$('summary-date-from').value,to=$('summary-date-to').value;
    if(from&&to&&from>to){$('summary-preview-meta').textContent='Ralat: tarikh mula mesti sebelum atau sama dengan tarikh akhir.';$('download-summary-xlsx').disabled=true;$('download-summary-csv').disabled=true;summaryPreviewReady=false;return;}
    renderSummaryClassOptions();const records=summaryFilterRecords(),sessionFilter=$('summary-session').value,classFilter=$('summary-class').value,readingFilter=$('summary-reading').value;
    const allClasses=[...new Set(state.students.filter(s=>s.active!==false&&s['Aktif']!=='Tidak').map(s=>s.className||s.Kelas).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ms',{numeric:true,sensitivity:'base'}));
    const classNames=allClasses.filter(name=>(!sessionFilter||summarySessions.find(s=>s.key===sessionFilter)?.years.includes(recordYear(name)))&&(!classFilter||name===classFilter));
    const summary=new Map(classNames.map(name=>[name,{total:0,quran:new Map(),iqra:new Map(),withoutPages:0}]));
    records.forEach(record=>{const item=summary.get(record.className);if(!item)return;item.total++;if(record.readingType==='Iqra'){const level=Number(record.iqraLevel);if(Number.isInteger(level)&&level>=1&&level<=6)item.iqra.set(level,(item.iqra.get(level)||0)+1);return;}if(record.readingType==='Al-Quran'){const start=Number(record.pageStart),end=Number(record.pageEnd);if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>604){item.withoutPages++;return;}const touched=new Set();for(let page=start;page<=end;page++)juzsForPage(page).forEach(juz=>touched.add(juz));touched.forEach(juz=>item.quran.set(juz,(item.quran.get(juz)||0)+1));}});
    const sessions=sessionFilter?summarySessions.filter(s=>s.key===sessionFilter):summarySessions;
    $('class-summary').innerHTML=sessions.map(session=>{const names=classNames.filter(name=>session.years.includes(recordYear(name)));const rows=names.map(name=>{const item=summary.get(name);const quran=[...item.quran].sort((a,b)=>a[0]-b[0]).map(([juz,count])=>`<span class="summary-tag quran-tag">Juzuk ${juz}<b>${count} rekod</b></span>`).join('');const iqra=[...item.iqra].sort((a,b)=>a[0]-b[0]).map(([level,count])=>`<span class="summary-tag iqra-tag">Jilid ${level}<b>${count} rekod</b></span>`).join('');const showQuran=!readingFilter||readingFilter==='Al-Quran',showIqra=!readingFilter||readingFilter==='Iqra';const parts=[showQuran?`<div><small>Al-Quran</small><div class="summary-tags">${quran||'<span class="summary-muted">Tiada rekod halaman</span>'}</div></div>`:'',showIqra?`<div><small>Iqra’</small><div class="summary-tags">${iqra||'<span class="summary-muted">Tiada rekod Iqra’</span>'}</div></div>`:'',showQuran&&item.withoutPages?`<span class="summary-muted summary-unmapped">${item.withoutPages} rekod Al-Quran tanpa julat muka surat</span>`:''].join('');const detail=item.total?`<div class="class-summary-breakdown ${showQuran&&showIqra?'':'single-breakdown'}">${parts}</div>`:'<div class="class-summary-no-record">Tiada rekod untuk kriteria ini.</div>';return `<article class="class-summary-row"><div class="class-summary-class"><strong>${esc(name)}</strong><span>${item.total} rekod</span></div>${detail}</article>`;}).join('');return `<section class="class-summary-session ${session.key}"><header><div><h3>${session.title}</h3><small>${session.subtitle}</small></div><span>${names.length} kelas</span></header><div class="class-summary-list">${rows||'<div class="class-summary-empty">Tiada kelas untuk pilihan ini.</div>'}</div></section>`;}).join('')||'<div class="class-summary-empty">Tiada kelas untuk pilihan ini.</div>';
    const filters=[sessionFilter?sessionFilter==='pagi'?'Sesi pagi':'Sesi petang':'Semua sesi',classFilter||'Semua kelas',readingFilter||'Semua bacaan',from||to?`${from?shortDate(from):'Tiada had'} – ${to?shortDate(to):'Tiada had'}`:'Semua tarikh'];
    $('summary-preview-meta').textContent=`Pratonton: ${records.length} rekod · ${classNames.length} kelas · ${filters.join(' · ')}`;
    summaryPreviewRows=[];classNames.forEach(name=>{const item=summary.get(name);const session=summarySessions.find(s=>s.years.includes(recordYear(name)))?.title||'—';if(item.quran.size){[...item.quran].sort((a,b)=>a[0]-b[0]).forEach(([juz,count])=>summaryPreviewRows.push([session,name,'Al-Quran',`Juzuk ${juz}`,count]));}if(item.iqra.size){[...item.iqra].sort((a,b)=>a[0]-b[0]).forEach(([level,count])=>summaryPreviewRows.push([session,name,'Iqra’',`Jilid ${level}`,count]));}if(item.withoutPages)summaryPreviewRows.push([session,name,'Al-Quran','Tanpa julat muka surat',item.withoutPages]);if(!item.total)summaryPreviewRows.push([session,name,'—','Tiada rekod',0]);});
    summaryPreviewReady=true;$('download-summary-xlsx').disabled=false;$('download-summary-csv').disabled=false;
  }
  const csvCell=value=>`"${String(value??'').replace(/"/g,'""')}"`;
  function downloadBlob(blob,filename){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function summaryExportMatrix(){return [['Sesi','Kelas','Jenis bacaan','Juzuk / Jilid','Bilangan rekod'],...summaryPreviewRows];}
  function downloadSummaryCsv(){if(!summaryPreviewReady)return;const csv='\uFEFF'+summaryExportMatrix().map(row=>row.map(csvCell).join(',')).join('\r\n');downloadBlob(new Blob([csv],{type:'text/csv;charset=utf-8'}),`rumusan-tasmik-${getLocalDate()}.csv`);}
  function xmlEscape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
  function xlsxColumn(index){let out='';for(index++;index;index=Math.floor((index-1)/26))out=String.fromCharCode(65+(index-1)%26)+out;return out;}
  const crc32=bytes=>{let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;};
  function makeStoredZip(files){const encoder=new TextEncoder(),local=[],central=[];let offset=0;files.forEach(file=>{const name=encoder.encode(file.name),data=encoder.encode(file.text),crc=crc32(data),header=new Uint8Array(30+name.length),view=new DataView(header.buffer);view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);view.setUint16(6,0x0800,true);view.setUint16(8,0,true);view.setUint32(14,crc,true);view.setUint32(18,data.length,true);view.setUint32(22,data.length,true);view.setUint16(26,name.length,true);header.set(name,30);local.push(header,data);const dir=new Uint8Array(46+name.length),dv=new DataView(dir.buffer);dv.setUint32(0,0x02014b50,true);dv.setUint16(4,20,true);dv.setUint16(6,20,true);dv.setUint16(8,0x0800,true);dv.setUint16(10,0,true);dv.setUint32(16,crc,true);dv.setUint32(20,data.length,true);dv.setUint32(24,data.length,true);dv.setUint16(28,name.length,true);dv.setUint32(42,offset,true);dir.set(name,46);central.push(dir);offset+=header.length+data.length;});const centralSize=central.reduce((sum,p)=>sum+p.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);return new Blob([...local,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});}
  function downloadSummaryXlsx(){if(!summaryPreviewReady)return;const matrix=summaryExportMatrix(),rows=matrix.map((row,r)=>`<row r="${r+1}">${row.map((value,c)=>{const ref=`${xlsxColumn(c)}${r+1}`;return typeof value==='number'?`<c r="${ref}"><v>${value}</v></c>`:`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;}).join('')}</row>`).join('');const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`;const blob=makeStoredZip([{name:'[Content_Types].xml',text:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'},{name:'_rels/.rels',text:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},{name:'xl/workbook.xml',text:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Rumusan Tasmik" sheetId="1" r:id="rId1"/></sheets></workbook>'},{name:'xl/_rels/workbook.xml.rels',text:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'},{name:'xl/worksheets/sheet1.xml',text:sheet}]);downloadBlob(blob,`rumusan-tasmik-${getLocalDate()}.xlsx`);}
  function invalidateSummaryPreview(){summaryPreviewReady=false;$('download-summary-xlsx').disabled=true;$('download-summary-csv').disabled=true;$('summary-preview-meta').textContent='Kriteria berubah. Tekan “Pratonton rumusan” untuk mengemas kini hasil.';}
  function renderYearRecords(){
    const activeStudents=state.students.filter(s=>s.active!==false&&s['Aktif']!=='Tidak');
    const sessions=[{title:'Sesi Pagi',years:['4','5','6'],label:'Tahun 4–6',theme:'dashboard-morning'},{title:'Sesi Petang',years:['1','2','3'],label:'Tahun 1–3',theme:'dashboard-afternoon'}];
    $('year-records').innerHTML=sessions.map(session=>{
      const sessionStudents=activeStudents.filter(s=>session.years.includes(recordYear(s.className||s.Kelas)));
      const sessionClasses=new Set(sessionStudents.map(s=>s.className||s.Kelas).filter(Boolean));
      const sessionRecords=state.records.filter(r=>session.years.includes(recordYear(r.className)));
      const yearCards=session.years.map(year=>{const count=sessionRecords.filter(r=>recordYear(r.className)===year).length;const i=Number(year)-1;return `<button class="year-card" type="button" data-year="${year}" aria-label="Lihat ${count} rekod Tahun ${year}"><span class="year-card-top"><span class="year-card-icon">${['✿','☼','✦','❋','✧','❀'][i]}</span><span class="year-card-arrow">↗</span></span><strong>Tahun ${year}</strong><span class="year-card-count">${count.toLocaleString('ms-MY')} rekod</span></button>`;}).join('');
      return `<section class="dashboard-session-card ${session.theme}"><div class="dashboard-session-heading"><div><h3>${session.title}</h3><p>${session.label}</p></div><span class="dashboard-session-total">${sessionRecords.length.toLocaleString('ms-MY')} rekod</span></div><div class="dashboard-session-meta"><span>${sessionClasses.size} kelas</span><span>${sessionStudents.length.toLocaleString('ms-MY')} murid aktif</span></div><div class="session-year-grid">${yearCards}</div></section>`;
    }).join('');
  }
  function renderTeachers(){
    const teachers=state.teachers.filter(t=>t.active!==false&&t['Aktif']!=='Tidak');[ $('record-teacher'), $('bulk-teacher') ].forEach(select=>{const selected=select.value;select.innerHTML='<option value="">Pilih guru (pilihan)</option>'+teachers.map(t=>`<option value="${esc(t.id||t['ID Guru'])}">${esc(t.name||t['Nama Guru'])}</option>`).join('');if(teachers.some(t=>String(t.id||t['ID Guru'])===selected))select.value=selected;});
    $('teachers-list').innerHTML=teachers.map(t=>`<div class="teacher-row"><span class="teacher-avatar">${esc(initials(t.name||t['Nama Guru']))}</span><span class="teacher-name">${esc(t.name||t['Nama Guru'])}</span><span class="teacher-active">Aktif</span></div>`).join('');$('teachers-empty').classList.toggle('hidden',teachers.length>0);
  }
  function renderStudentChoices(source=state.students.filter(s=>s.active!==false&&s['Aktif']!=='Tidak')) {
    const cls=$('student-class').value, select=$('student-select');
    const matching=source.filter(s=>(s.className||s.Kelas)===cls);
    select.disabled=!cls; select.innerHTML=cls?'<option value="">Pilih murid</option>'+matching.map(s=>`<option value="${esc(s.id||s['ID Murid'])}">${esc(s.name||s['Nama Murid'])}</option>`).join(''):'<option value="">Pilih kelas dahulu</option>';
  }
  function renderStats() {
    const todayRecords=state.records.filter(r=>r.date===getLocalDate()); const smooth=state.records.filter(r=>r.status==='Lancar').length; const repeat=state.records.filter(r=>r.status==='Perlu ulang').length;
    $('stat-today').textContent=todayRecords.length; $('stat-today-note').textContent=todayRecords.length?`${todayRecords.length} sesi telah direkodkan`:'Belum ada rekod hari ini';
    $('stat-smooth').innerHTML=`${state.records.length?Math.round(smooth/state.records.length*100):0}<span class="stat-suffix">%</span>`; $('stat-smooth-note').textContent=`Daripada ${state.records.length} rekod keseluruhan`; $('stat-repeat').textContent=repeat;
    $('nav-count').textContent=state.records.length; $('record-count').textContent=state.records.length;
  }
  function renderActivity() {
    const days=Number($('chart-range').value)||7; const counts=[]; const dates=[];
    for(let i=days-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;dates.push(key);counts.push(state.records.filter(r=>r.date===key).length);}
    const max=Math.max(4,...counts); $('activity-chart').innerHTML=counts.map((n,i)=>`<div class="bar-column ${dates[i]===getLocalDate()?'today':''}"><div class="bar-fill" style="height:${n?Math.max(5,n/max*100):2}%" title="${n} rekod"></div></div>`).join('');
    $('chart-labels').innerHTML=dates.map((d,i)=>`<span>${i===0||i===days-1||days<=7?new Date(`${d}T00:00:00`).toLocaleDateString('ms-MY',{day:'numeric',month:'short'}):new Date(`${d}T00:00:00`).getDate()}</span>`).join(''); $('chart-total').textContent=`Jumlah: ${counts.reduce((a,b)=>a+b,0)} sesi`;
  }
  function renderClasses() {
    const counts={}; state.records.forEach(r=>counts[r.className||'Lain-lain']=(counts[r.className||'Lain-lain']||0)+1);
    const list=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5); const box=$('class-progress');
    $('class-empty').classList.toggle('hidden',list.length>0); box.innerHTML=list.map(([name,count])=>`<div class="class-row"><span>${esc(name)}</span><div class="class-track"><div class="class-fill" style="width:${Math.max(4,count/Math.max(...list.map(x=>x[1]))*100)}%"></div></div><b>${count}</b></div>`).join('');
  }
  function renderRecent() {
    const recent=[...state.records].sort((a,b)=>todayMs(b.date)-todayMs(a.date)).slice(0,5); $('recent-empty').style.display=recent.length?'none':'block';
    $('recent-body').innerHTML=recent.map(r=>`<tr><td><div class="student-cell"><span class="student-avatar">${esc(initials(r.studentName))}</span><span><span class="student-name">${esc(r.studentName)}</span><span class="cell-sub">${esc(r.teacher||'Guru tasmik')}</span></span></div></td><td>${esc(r.className)}</td><td><span class="reading-name">${readingTitle(r)}</span><span class="cell-sub">${readingDetail(r)}</span></td><td>${esc(shortDate(r.date))}</td><td>${badge(r.status)}</td></tr>`).join('');
  }
  function renderRecords() {
    const q=$('record-search').value.trim().toLocaleLowerCase('ms'); const year=$('year-filter').value; const cls=$('class-filter').value; const status=$('status-filter').value;
    const rows=[...state.records].sort((a,b)=>todayMs(b.date)-todayMs(a.date)).filter(r=>(!q||`${r.studentName} ${r.surah} ${r.readingType} ${r.iqraLevel} ${r.page} ${r.pageStart} ${r.pageEnd} ${r.notes}`.toLocaleLowerCase('ms').includes(q))&&(!year||recordYear(r.className)===year)&&(!cls||r.className===cls)&&(!status||r.status===status));
    const groups=new Map(); rows.forEach(r=>{const name=r.className||'Kelas tidak ditetapkan';if(!groups.has(name))groups.set(name,[]);groups.get(name).push(r);});
    const groupNames=[...groups.keys()].sort((a,b)=>a.localeCompare(b,'ms',{numeric:true,sensitivity:'base'}));
    $('records-empty').classList.toggle('visible',rows.length===0);
    $('records-body').innerHTML=groupNames.map(name=>{
      const group=groups.get(name);
      return `<tr class="class-group-row"><td colspan="5"><div class="class-group-heading"><span class="class-group-icon">▦</span><strong>${esc(name)}</strong><small>${group.length} rekod</small></div></td></tr>`+group.map(r=>`<tr><td><div class="student-cell"><span class="student-avatar">${esc(initials(r.studentName))}</span><span class="student-name">${esc(r.studentName)}</span></div></td><td><span class="reading-name">${readingTitle(r)}</span><span class="cell-sub">${readingDetail(r)}</span></td><td>${esc(shortDate(r.date))}</td><td>${badge(r.status)}</td><td title="${esc(r.notes)}">${esc((r.notes||'—').slice(0,36))}${(r.notes||'').length>36?'…':''}</td></tr>`).join('');
    }).join('');
  }
  function renderRecordOverview(){const todayRecords=state.records.filter(r=>r.date===getLocalDate());$('record-overview-total').textContent=state.records.length;$('record-overview-today').textContent=todayRecords.length;$('record-overview-students').textContent=new Set(todayRecords.map(r=>r.studentId||r.studentName).filter(Boolean)).size;$('record-overview-classes').textContent=new Set(todayRecords.map(r=>r.className).filter(Boolean)).size;}
  function renderAll() { renderHeader();renderStudents();renderTeachers();renderStats();renderRecordOverview();renderClassSummary();renderYearRecords();renderActivity();renderClasses();renderRecent();renderRecords(); }
  function gotoPage(name) {
    document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${name}`)); document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===name));
    const titles={dashboard:'Dashboard',records:'Rekod tasmik',settings:'Tetapan'}; $('crumb-title').textContent=titles[name]||'Dashboard'; window.scrollTo({top:0,behavior:'smooth'});
  }
  async function refreshFromServer() {
    if(!isLive()) { renderAll(); notify('Paparan dikemas kini.'); return; }
    try { const data=await api('bootstrap'); if(!data.ok) throw new Error(data.error||'Tidak dapat membaca data.'); state.students=data.students||[]; state.records=data.records||[]; state.teachers=mergeTeachers(window.TEACHERS||[],data.teachers||[]); state.settings={...state.settings,...data.settings}; persist(); renderAll(); notify('Data Google Sheets dikemas kini.'); }
    catch(e) { notify(`Gagal memuatkan Google Sheets: ${e.message}`); }
  }
  document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>gotoPage(b.dataset.page)));
  document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>{gotoPage(b.dataset.goto);if(b.dataset.goto==='records')$('record-session').focus();}));
  $('record-session').addEventListener('change',()=>renderSessionClasses());
  $('student-class').addEventListener('change',()=>renderStudentChoices());
  document.querySelectorAll('[data-record-mode]').forEach(button=>button.addEventListener('click',()=>{
    const bulk=button.dataset.recordMode==='bulk';document.querySelectorAll('[data-record-mode]').forEach(tab=>{const active=tab===button;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));});
    $('record-form').classList.toggle('hidden',bulk);$('bulk-record-form').classList.toggle('hidden',!bulk);if(bulk)$('bulk-session').focus();
  }));
  $('bulk-session').addEventListener('change',()=>renderBulkClasses());
  $('bulk-class').addEventListener('change',()=>renderBulkStudents());
  $('bulk-select-all').addEventListener('click',()=>{$('bulk-student-list').querySelectorAll('.bulk-include').forEach(input=>{input.checked=true;setBulkRowEnabled(input.closest('.bulk-student-row'),true);});updateBulkSaveButton();});
  $('bulk-clear-all').addEventListener('click',()=>{$('bulk-student-list').querySelectorAll('.bulk-include').forEach(input=>{input.checked=false;setBulkRowEnabled(input.closest('.bulk-student-row'),false);});updateBulkSaveButton();});
  $('bulk-student-list').addEventListener('change',e=>{const row=e.target.closest('.bulk-student-row');if(!row)return;if(e.target.matches('.bulk-include')){setBulkRowEnabled(row,e.target.checked);updateBulkSaveButton();}else if(e.target.matches('.bulk-reading-type'))toggleBulkRowReading(row);});
  $('bulk-date').value=getLocalDate();
  $('bulk-record-form').addEventListener('submit',async e=>{
    e.preventDefault();const checked=[...$('bulk-student-list').querySelectorAll('.bulk-include:checked')];
    if(!checked.length){$('bulk-feedback').textContent='Pilih sekurang-kurangnya seorang murid untuk direkodkan.';return;}
    const selectedTeacher=state.teachers.find(t=>String(t.id||t['ID Guru'])===$('bulk-teacher').value);const teacher=selectedTeacher?(selectedTeacher.name||selectedTeacher['Nama Guru']):(state.settings['Nama Guru']||'');
    const selectedStudents=checked.map(input=>({input,row:input.closest('.bulk-student-row'),student:state.students.find(s=>String(s.id||s['ID Murid'])===input.value)}));if(selectedStudents.some(x=>!x.student)){$('bulk-feedback').textContent='Senarai murid berubah. Pilih semula kelas dan murid.';return;}
    const records=[];
    for(const {row,student} of selectedStudents){
      const iqra=row.querySelector('.bulk-reading-type').value==='Iqra';const pageStart=iqra?'':Number(row.querySelector('.bulk-page-start').value);const pageEnd=iqra?'':Number(row.querySelector('.bulk-page-end').value);const iqraLevel=iqra?Number(row.querySelector('.bulk-iqra-level').value):'';const page=iqra?Number(row.querySelector('.bulk-iqra-page').value):'';
      if(!iqra&&(!Number.isInteger(pageStart)||!Number.isInteger(pageEnd)||pageStart<1||pageEnd<pageStart||pageEnd>604)){$('bulk-feedback').textContent=`Sila masukkan julat muka surat Al-Quran yang sah (1–604) untuk ${student.name||student['Nama Murid']}.`;row.querySelector('.bulk-page-start').focus();return;}
      if(iqra&&(!Number.isInteger(iqraLevel)||iqraLevel<1||iqraLevel>6||!Number.isInteger(page)||page<1)){$('bulk-feedback').textContent=`Sila pilih jilid dan muka surat Iqra yang sah untuk ${student.name||student['Nama Murid']}.`;row.querySelector('.bulk-iqra-level').focus();return;}
      records.push({studentId:student.id||student['ID Murid'],date:$('bulk-date').value,readingType:iqra?'Iqra':'Al-Quran',pageStart,pageEnd,iqraLevel,page,status:row.querySelector('.bulk-student-status').value,teacher,notes:''});
    }
    const button=$('save-bulk-records');button.disabled=true;button.textContent='Menyimpan…';$('bulk-feedback').textContent='';
    try{
      if(isLive()){const result=await api('',{action:'saveRecords',records});if(!result.ok)throw new Error(result.error||'Rekod berkumpulan tidak berjaya disimpan.');state.records.unshift(...(result.records||[]));}
      else{const newRecords=records.map((record,i)=>{const student=state.students.find(s=>String(s.id||s['ID Murid'])===String(record.studentId));return {id:`L-${Date.now()}-${i+1}`,...record,studentName:student.name||student['Nama Murid'],className:student.className||student.Kelas};});state.records.unshift(...newRecords);persist();}
      renderAll();$('bulk-feedback').textContent=`${records.length} rekod berjaya disimpan.`;$('bulk-feedback').classList.add('success');notify(`${records.length} rekod tasmik berjaya disimpan.`);
    }catch(err){$('bulk-feedback').textContent=err.message||'Ralat menyimpan rekod berkumpulan.';}
    finally{updateBulkSaveButton();setTimeout(()=>$('bulk-feedback').classList.remove('success'),2500);}
  });
  const toggleReadingType=()=>{const iqra=$('reading-type').value==='Iqra';$('quran-fields').classList.toggle('hidden',iqra);$('iqra-fields').classList.toggle('hidden',!iqra);$('quran-page-start').required=!iqra;$('quran-page-end').required=!iqra;$('iqra-level').required=iqra;$('iqra-page').required=iqra;};
  $('reading-type').addEventListener('change',toggleReadingType);toggleReadingType();
  $('record-date').value=getLocalDate();
  $('record-form').addEventListener('submit',async e=>{
    e.preventDefault(); const student=state.students.find(s=>String(s.id||s['ID Murid'])===$('student-select').value); if(!student){$('form-feedback').textContent='Sila pilih murid.';return;}
    const iqra=$('reading-type').value==='Iqra';const selectedTeacher=state.teachers.find(t=>String(t.id||t['ID Guru'])===$('record-teacher').value);const record={studentId:student.id||student['ID Murid'],date:$('record-date').value,readingType:iqra?'Iqra':'Al-Quran',pageStart:iqra?'':Number($('quran-page-start').value),pageEnd:iqra?'':Number($('quran-page-end').value),iqraLevel:iqra?Number($('iqra-level').value):'',page:iqra?Number($('iqra-page').value):'',status:document.querySelector('input[name="status"]:checked').value,teacher:selectedTeacher?(selectedTeacher.name||selectedTeacher['Nama Guru']):(state.settings['Nama Guru']||''),notes:$('record-notes').value.trim()};
    if(!iqra&&(record.pageStart<1||record.pageEnd<record.pageStart||record.pageEnd>604)){$('form-feedback').textContent='Sila masukkan julat muka surat Al-Quran yang sah (1–604).';return;}
    const button=$('save-record');button.disabled=true;button.textContent='Menyimpan…';$('form-feedback').textContent='';
    try {
      if(isLive()){const result=await api('',{action:'saveRecord',record});if(!result.ok)throw new Error(result.error||'Rekod tidak berjaya disimpan.');state.records.unshift(result.record);}
      else {const id=`L-${Date.now()}`;state.records.unshift({id,...record,studentName:student.name||student['Nama Murid'],className:student.className||student.Kelas});persist();}
      $('record-form').reset();$('record-date').value=getLocalDate();document.querySelector('input[name="status"][value="Lancar"]').checked=true;toggleReadingType();renderAll();$('form-feedback').textContent='Rekod berjaya disimpan.';$('form-feedback').classList.add('success');notify(isLive()?'Rekod dihantar ke Google Sheets.':'Rekod disimpan pada peranti ini.');
    } catch(err) {$('form-feedback').textContent=err.message||'Ralat menyimpan rekod.';}
    finally {button.disabled=false;button.innerHTML='Simpan rekod <span>→</span>';setTimeout(()=>$('form-feedback').classList.remove('success'),2500);}
  });
  $('summary-session').addEventListener('change',()=>{renderSummaryClassOptions();invalidateSummaryPreview();});$('summary-class').addEventListener('change',invalidateSummaryPreview);$('summary-reading').addEventListener('change',invalidateSummaryPreview);$('summary-date-from').addEventListener('change',invalidateSummaryPreview);$('summary-date-to').addEventListener('change',invalidateSummaryPreview);$('preview-summary').addEventListener('click',renderClassSummary);$('download-summary-xlsx').addEventListener('click',downloadSummaryXlsx);$('download-summary-csv').addEventListener('click',downloadSummaryCsv);
  $('record-search').addEventListener('input',renderRecords);$('class-filter').addEventListener('change',renderRecords);$('status-filter').addEventListener('change',renderRecords);$('chart-range').addEventListener('change',renderActivity);
  $('year-filter').addEventListener('change',renderRecords);
  $('year-records').addEventListener('click',e=>{const card=e.target.closest('[data-year]');if(!card)return;$('year-filter').value=card.dataset.year;$('class-filter').value='';$('status-filter').value='';$('record-search').value='';gotoPage('records');renderRecords();});
  $('open-record-form').addEventListener('click',()=>$('record-session').focus()); $('refresh-button').addEventListener('click',refreshFromServer);
  $('sync-students-button').addEventListener('click',async()=>{
    if(!isLive())return;
    const button=$('sync-students-button');button.disabled=true;button.textContent='Mengemas kini…';
    try{const result=await api('',{action:'syncRoster',students:window.ROSTER||[]});if(!result.ok)throw new Error(result.error||'Senarai murid tidak berjaya dikemas kini.');const data=await api('bootstrap');if(!data.ok)throw new Error(data.error||'Tidak dapat memuat semula data.');state.students=data.students||[];state.records=data.records||[];state.teachers=mergeTeachers(window.TEACHERS||[],data.teachers||[]);state.settings={...state.settings,...data.settings};persist();renderAll();notify(`Senarai dikemas kini: ${result.active} murid aktif dalam ${result.classes} kelas.`);}
    catch(err){notify(`Senarai murid tidak dikemas kini: ${err.message}`);}
    finally{button.disabled=!isLive();button.textContent='Kemas kini senarai Google Sheets';}
  });
  $('connect-button').addEventListener('click',async()=>{
    const value=$('api-url').value.trim();if(!value){state.apiUrl='';persist();renderHeader();notify('URL sambungan dikosongkan.');return;}
    try {const u=new URL(value);if(!u.hostname.endsWith('google.com')&&!u.hostname.endsWith('googleusercontent.com'))throw new Error('Gunakan URL Web App Google Apps Script.');state.apiUrl=value;const data=await api('bootstrap');if(!data.ok)throw new Error(data.error||'Respons Apps Script tidak sah.');state.students=data.students||[];state.records=data.records||[];state.teachers=mergeTeachers(window.TEACHERS||[],data.teachers||[]);state.settings={...state.settings,...data.settings};persist();renderAll();notify('Google Sheets berjaya disambungkan.');}
    catch(err){state.apiUrl='';persist();renderHeader();notify(`Sambungan gagal: ${err.message}`);}
  });
  $('teacher-form').addEventListener('submit',async e=>{
    e.preventDefault();const name=$('teacher-input').value.trim();if(!name)return;
    if(state.teachers.some(t=>String(t.name||t['Nama Guru']).trim().toLocaleLowerCase('ms')===name.toLocaleLowerCase('ms'))){notify('Nama guru sudah ada dalam senarai.');return;}
    const button=$('teacher-form').querySelector('button');button.disabled=true;
    try{
      if(isLive()){const result=await api('',{action:'saveTeacher',teacher:{name}});if(!result.ok)throw new Error(result.error||'Guru tidak berjaya disimpan.');state.teachers.unshift(result.teacher);}
      else state.teachers.unshift({id:`T-${Date.now()}`,name,active:true});
      persist();$('teacher-input').value='';renderTeachers();notify(isLive()?'Guru disimpan ke Google Sheets.':'Guru disimpan pada peranti ini.');
    }catch(err){notify(`Guru tidak disimpan: ${err.message}`);}
    finally{button.disabled=false;}
  });
  $('save-school-settings').addEventListener('click',async()=>{
    const settings={'Nama Sekolah':$('setting-school').value.trim(),'Kod Sekolah':$('setting-code').value.trim(),'Nama Guru':$('setting-teacher').value.trim()};
    if(isLive()){try{const result=await api('',{action:'updateSettings',settings});if(!result.ok)throw new Error(result.error||'Gagal menyimpan tetapan.');state.settings={...state.settings,...result.settings};}catch(e){notify(`Tetapan tidak disimpan: ${e.message}`);return;}}
    else state.settings={...state.settings,...settings};persist();renderAll();notify(isLive()?'Tetapan disimpan ke Google Sheets.':'Tetapan disimpan pada peranti ini.');
  });
  $('chart-range').value='7';getData();renderAll();if(isLive())refreshFromServer();
})();
