// ==========================================================================
// 初中英语题库与智能组卷系统 - 核心业务逻辑
// ==========================================================================
const TYPES=["语法选择","完形填空","阅读理解","选词填空","书面表达"],CN="一二三四五六七八九十",DL=["","易","中","难"],GRADES=["七年级","八年级","九年级"],SEMS=["七年级上册","七年级下册","八年级上册","八年级下册","九年级上册","九年级下册"];
const ld=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}},sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};

// 兼容并自动迁移七年级和八年级原先的自建题库与试卷篮
const initCustom=()=>{
  const saved=ld("zj_all_custom",null);
  if(saved!==null)return saved;
  const legacy=[...ld("zj_custom",[]),...ld("zj7_custom",[])];
  const m=new Map();
  legacy.forEach(x=>{if(x&&x.id)m.set(x.id,x)});
  return Array.from(m.values()).filter(i=>i.type!=="单项选择");
};
const initBasket=()=>{
  const saved=ld("zj_all_basket",null);
  if(saved!==null)return saved;
  return [...new Set([...ld("zj_basket",[]),...ld("zj7_basket",[])])];
};

const S={custom:initCustom(),basket:initBasket(),view:"pick",open:{},f:{q:"",type:"",grade:"",sem:"",kp:"",diff:""},title:"初中英语练习卷",ans:true};
const bank=()=>SAMPLE.concat(S.custom),byId=id=>bank().find(i=>i.id===id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
const $=s=>document.querySelector(s),L="ABCDEFGH";
const cur=()=>bank();

const gradeOf=i=>{
  const s=semesterOf(i);
  const m=s.match(/^[七八九]年级/);
  if(m)return m[0];
  const k=(i.kp||[]).find(x=>/^[七八九]年级/.test(x));
  return k?k.replace(/[上下]册$/,""):"七年级";
};
const semesterOf=i=>i.semester||(i.kp||[]).find(k=>/^[七八九]年级[上下]册$/.test(k))||(gradeOf(i)+"上册");
const semesters=()=>{
  const all=[...new Set(SEMS.concat(cur().map(semesterOf)))];
  return S.f.grade?all.filter(s=>s.startsWith(S.f.grade)):all;
};
const kps=()=>[...new Set(cur()
  .filter(i=>(!S.f.grade||gradeOf(i)===S.f.grade)&&(!S.f.sem||semesterOf(i)===S.f.sem))
  .flatMap(i=>i.kp)
  .filter(k=>!TYPES.includes(k)&&!/^[七八九]年级[上下]册$/.test(k)))];

function filt(){
  const f=S.f,q=f.q.toLowerCase();
  return cur().filter(i=>
    (!f.type||i.type===f.type)&&
    (!f.grade||gradeOf(i)===f.grade)&&
    (!f.sem||semesterOf(i)===f.sem)&&
    (!f.kp||i.kp.includes(f.kp))&&
    (!f.diff||i.diff==f.diff)&&
    (!q||JSON.stringify(i).toLowerCase().includes(q))
  );
}

const tog=(arr,id)=>{const k=arr.indexOf(id);k<0?arr.push(id):arr.splice(k,1)};
const persist=()=>{
  sv("zj_all_basket",S.basket);
  sv("zj_all_custom",S.custom);
  sv("zj_basket",S.basket);
  sv("zj_custom",S.custom);
};
const keepIds=new Set(bank().map(i=>i.id));S.basket=S.basket.filter(id=>keepIds.has(id));persist();

function qHTML(it,start,withAns){if(it.type==="选词填空")return "";return it.qs.map((q,i)=>it.type==="语法选择"?`<div class="q grammar-q"><b>${start+i}.</b><div class="opts">${q.opts.map((o,j)=>`<span>${L[j]}. ${o.includes("<img")?o:esc(o)}</span>`).join("")}</div></div>`:`<div class="q">${start+i}. ${esc(q.q)}<div class="opts">${q.opts.map((o,j)=>`<span>${L[j]}. ${o.includes("<img")?o:esc(o)}</span>`).join("")}</div></div>`).join("")}
function expHTML(it){const m=it.qs.length>1;return `<div class="exp"><div><b>【知识点】</b>${esc(it.kp.join("  "))}</div><div><b>【答案】</b>${it.qs.map((q,i)=>(m?`【小题${i+1}】`:"")+q.ans).join("  ")}</div>${it.intro?`<div><b>【导语】</b>${esc(it.intro)}</div>`:""}<div><b>【详解】</b>${it.qs.map((q,i)=>(m?`【小题${i+1}】`:"")+esc(q.exp)).join("<br>")}</div></div>`}
function passageHTML(it){return it.passageHtml?`<div class="source-art">${it.passageHtml}</div>`:it.passage?`<div class="pass">${esc(it.passage)}</div>`:""}
function shortTitle(it){return (it.title||"").replace(/^[七八九][上下][^·]*·\s*/,"")}
function card(it){const inB=S.basket.includes(it.id),op=S.open[it.id],sem=semesterOf(it),labels=it.kp.filter(k=>k!==it.type&&!/^[七八九]年级[上下]册$/.test(k));
return `<article class="card"><div class="meta"><span class="tag">${it.type}</span><span class="tag">${esc(sem)}</span>${it.title?`<b>${esc(shortTitle(it))}</b>`:""}<span class="muted">难度：${DL[it.diff]||"-"}</span>${labels.map(k=>`<span class="tag">${esc(k)}</span>`).join("")}</div>${passageHTML(it)}${qHTML(it,1)}${op?expHTML(it):""}<div class="card-foot">${S.custom.some(c=>c.id===it.id)?`<button class="d" data-a="x" data-id="${it.id}">删除</button>`:""}<button class="cart ${inB?"added":""}" data-a="b" data-id="${it.id}" aria-label="${inB?"移出试卷":"加入试卷"}" title="${inB?"移出试卷":"加入试卷"}">🛒</button></div></article>`}
function drawList(){const r=filt();$("#list").innerHTML=r.length?r.map(card).join(""):`<p class="muted">没有符合条件的题目。</p>`;$("#cnt").textContent=`共 ${r.length} 题组`;navUpdate();stageBarUpdate()}

function paperGroups(){const its=S.basket.map(byId).filter(Boolean);const g=[];TYPES.concat([...new Set(its.map(i=>i.type))].filter(t=>!TYPES.includes(t))).forEach(t=>{const a=its.filter(i=>i.type===t);if(a.length)g.push([t,a])});return g}
function sheetHTML(prev){let n=1;return `<div class="sheet"><h2>${esc(S.title)}</h2>${paperGroups().map(([t,a],gi)=>`<h3>${CN[gi]}、${t}</h3>${a.map(it=>{const s=n;n+=it.qs.length;return `<div>${prev?`<div class="ctl"><button data-a="u" data-id="${it.id}">上移</button><button data-a="dn" data-id="${it.id}">下移</button><button class="d" data-a="b" data-id="${it.id}">移除</button></div>`:""}${passageHTML(it)}${qHTML(it,s)}${S.ans?expHTML(it):""}</div>`}).join("")}`).join("")||`<p class="muted">试卷为空，请先到“选题”页加入题目，或使用“智能组卷”。</p>`}</div>`}

function stageBarUpdate(){
  const el=$("#stageBar");if(!el)return;
  el.innerHTML=`<span>年级：</span>`+[["","全部"],...GRADES.map(g=>[g,g])].map(([g,lbl])=>`<button class="grade-btn ${S.f.grade===g?"on":""}" data-grade="${g}">${lbl}</button>`).join("");
}

function view(){const v=S.view,a=$("#app");
if(v==="pick"){
a.innerHTML=`<div class="bar"><input id="fq" placeholder="搜索题干、材料、知识点" value="${esc(S.f.q)}" style="flex:1;min-width:180px"><select id="ft"><option value="">全部题型</option>${TYPES.map(t=>`<option ${S.f.type===t?"selected":""}>${t}</option>`).join("")}</select><select id="fg"><option value="">全部年级</option>${GRADES.map(g=>`<option value="${g}" ${S.f.grade===g?"selected":""}>${g}</option>`).join("")}</select><select id="fs"><option value="">全部学期</option>${semesters().map(k=>`<option value="${k}" ${S.f.sem===k?"selected":""}>${esc(k)}</option>`).join("")}</select><select id="fk"><option value="">全部知识点</option>${kps().map(k=>`<option ${S.f.kp===k?"selected":""}>${esc(k)}</option>`).join("")}</select><select id="fd"><option value="">全部难度</option>${[1,2,3].map(d=>`<option value="${d}" ${S.f.diff==d?"selected":""}>${DL[d]}</option>`).join("")}</select><span id="cnt" class="muted" style="align-self:center"></span></div><div id="list"></div>`;
const up=()=>{S.f.q=$("#fq").value;S.f.type=$("#ft").value;S.f.sem=$("#fs").value;S.f.kp=$("#fk").value;S.f.diff=$("#fd").value;drawList()};
$("#fg").onchange=e=>{
  S.f.grade=e.target.value;
  if(S.f.sem&&S.f.grade&&!S.f.sem.startsWith(S.f.grade))S.f.sem="";
  if(!S.title||S.title.endsWith("英语练习卷"))S.title=(S.f.grade||"初中")+"英语练习卷";
  view();
};
["fq","ft","fs","fk","fd"].forEach(i=>$("#"+i).addEventListener("input",up));drawList()}
else if(v==="auto"){a.innerHTML=`<div class="card"><h3 style="margin-top:0">智能组卷（按题型数量随机抽题）</h3><div class="grid">${TYPES.map(t=>`<label>${t}（题组数）<br><input type="number" min="0" value="0" data-t="${t}" style="width:100%"></label>`).join("")}<label>年级<br><select id="ag" style="width:100%"><option value="">不限</option>${GRADES.map(g=>`<option value="${g}" ${S.f.grade===g?"selected":""}>${g}</option>`).join("")}</select></label><label>学期<br><select id="as" style="width:100%"><option value="">不限</option>${SEMS.map(k=>`<option value="${k}" ${S.f.sem===k?"selected":""}>${esc(k)}</option>`).join("")}</select></label><label>难度<br><select id="ad" style="width:100%"><option value="">不限</option>${[1,2,3].map(d=>`<option value="${d}">${DL[d]}</option>`).join("")}</select></label><label>知识点<br><select id="ak" style="width:100%"><option value="">不限</option>${[...new Set(cur().flatMap(i=>i.kp).filter(k=>!TYPES.includes(k)&&!/^[七八九]年级[上下]册$/.test(k)))].map(k=>`<option>${esc(k)}</option>`).join("")}</select></label></div><p class="muted">一道阅读理解/语法选择/选词填空算 1 个题组（含多道小题）。生成后会替换当前试卷。</p><button class="p" data-a="gen">生成试卷</button> <span id="msg"></span></div>`}
else if(v==="paper"){a.innerHTML=`<div class="bar noprint"><input id="pt" value="${esc(S.title)}" style="flex:1;min-width:200px"><label style="align-self:center"><input type="checkbox" id="pa" ${S.ans?"checked":""}> 含答案解析（教师版）</label></div><div class="bar noprint"><button class="p" data-a="docx">导出 Word</button><button data-a="print">打印</button><button class="d" data-a="clr">清空试卷</button></div><div id="sh">${sheetHTML(1)}</div>`;
$("#pt").oninput=e=>S.title=e.target.value;$("#pa").onchange=e=>{S.ans=e.target.checked;view()}}
else{a.innerHTML=`<div class="card"><h3 style="margin-top:0">题库管理</h3><p>把题目以 JSON 数组粘贴到下方并导入。字段说明：</p><pre>[{"type":"语法选择|完形填空|阅读理解|选词填空|书面表达","diff":1-3,"kp":["记叙文","七年级上册"],"title":"可空","passage":"材料，换行用\n","intro":"导语，可空","qs":[{"q":"题干","opts":["A项","B项","C项"],"ans":"A","exp":"解析"}]}]</pre><textarea id="js" rows="9" style="width:100%" placeholder="在此粘贴 JSON"></textarea><div class="acts"><button class="p" data-a="imp">导入（追加）</button><button data-a="exp">导出自建题库</button><span id="msg"></span></div><p class="muted">自建题目保存在本浏览器中，建议定期导出备份。当前自建 ${S.custom.length} 个题组，内置题库 ${SAMPLE.length} 个（七年级 ${SAMPLE.filter(i=>gradeOf(i)==="七年级").length} 个，八年级 ${SAMPLE.filter(i=>gradeOf(i)==="八年级").length} 个，九年级 ${SAMPLE.filter(i=>gradeOf(i)==="九年级").length} 个）。</p></div>`}
navUpdate();stageBarUpdate()}
function navUpdate(){$("#nav").innerHTML=[["pick","选题"],["auto","智能组卷"],["paper",`试卷（${S.basket.length}）`],["mgr","题库管理"]].map(([k,t])=>`<button data-v="${k}" class="${S.view===k?"on":""}">${t}</button>`).join("")}

function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}

async function makeDocx(){if(!window.docx){alert("Word 生成库未能加载，请检查网络后刷新页面。");return}
const {Document,Packer,Paragraph,TextRun,ImageRun,Table,TableRow,TableCell,WidthType,AlignmentType,TabStopType,Tab,Footer,PageNumber}=docx,W=9638,F={ascii:"Times New Roman",hAnsi:"Times New Roman",eastAsia:"宋体"};
const run=(t,o={})=>new TextRun({text:t,font:F,...o}),P=(ch,o={})=>new Paragraph({children:ch,spacing:{after:50,line:300},...o});
async function htmlPassage(html){const root=new DOMParser().parseFromString(html,"text/html").body,out=[];let cur=[];const flush=()=>{if(cur.length){out.push(P(cur));cur=[]}};const imageRun=async el=>{const src=el.getAttribute("src")||"",im=new Image();im.src=src;try{await im.decode()}catch(e){}const w=im.naturalWidth||160,h=im.naturalHeight||100,scale=Math.min(1,420/w,280/h),tw=Math.max(1,Math.round(w*scale)),th=Math.max(1,Math.round(h*scale));if(!src.startsWith("data:image/svg")&&!src.toLowerCase().endsWith(".svg")){try{const res=await fetch(src);if(res.ok){const buf=await res.arrayBuffer();return new ImageRun({data:new Uint8Array(buf),transformation:{width:tw,height:th},type:src.toLowerCase().endsWith(".jpg")||src.toLowerCase().endsWith(".jpeg")?"jpeg":"png"})}}catch(e){}}const canvas=document.createElement("canvas");canvas.width=tw;canvas.height=th;canvas.getContext("2d").drawImage(im,0,0,tw,th);const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("image conversion failed")),"image/png"));return new ImageRun({data:new Uint8Array(await blob.arrayBuffer()),transformation:{width:tw,height:th},type:"png"})};const walk=async(node,fmt={})=>{if(node.nodeType===Node.TEXT_NODE){if(node.nodeValue)cur.push(new TextRun({text:node.nodeValue,font:F,...fmt}));return}if(node.nodeType!==Node.ELEMENT_NODE)return;const tag=node.tagName.toLowerCase();if(tag==="img"){try{cur.push(await imageRun(node))}catch(e){cur.push(run(`[图片：${node.alt||"插图"}]`))}return}if(tag==="br"){cur.push(run("\n"));return}const block=["p","div","table","tr","li"].includes(tag);if(block)flush();const next={...fmt};if(["b","strong"].includes(tag))next.bold=true;if(["i","em"].includes(tag))next.italics=true;if(tag==="u")next.underline={};for(const child of node.childNodes)await walk(child,next);if(block)flush()};for(const node of root.childNodes)await walk(node);flush();return out}
const lab=(l,t)=>P([run(l,{color:"1F6FB5"}),run(t)]);
const wt=o=>o.replace(/[^\x00-\xff]/g,"xx").length;
function opts(os,prefix=""){const t=os.map((o,i)=>L[i]+". "+o),m=Math.max(...os.map(wt)),per=m<=16?4:m<=36?2:1,out=[];
for(let i=0;i<t.length;i+=per){const row=t.slice(i,i+per),ch=[];row.forEach((x,k)=>{if(k)ch.push(new Tab());ch.push((i===0&&k===0?prefix:"")+x)});
out.push(P([new TextRun({children:ch,font:F})],{tabStops:Array.from({length:per-1},(_,k)=>({type:TabStopType.LEFT,position:Math.round((k+1)*W/per)}))}))}return out}
const groups=paperGroups(),htmlPassages=new Map();for(const [,items] of groups)for(const it of items)if(it.passageHtml)htmlPassages.set(it.id,await htmlPassage(it.passageHtml));
const kids=[P([run(S.title,{bold:true,size:32})],{alignment:AlignmentType.CENTER,spacing:{after:160}})];let n=1;
groups.forEach(([t,a],gi)=>{kids.push(P([run(CN[gi]+"、"+t,{bold:true,size:24})],{spacing:{before:160,after:80}}));
a.forEach(it=>{const s=n;n+=it.qs.length;
if(htmlPassages.has(it.id)){const body=htmlPassages.get(it.id);if(it.type==="语法选择")kids.push(...body);else{const bd={style:"single",size:4,color:"000000"};kids.push(new Table({width:{size:W,type:WidthType.DXA},columnWidths:[W],rows:[new TableRow({children:[new TableCell({width:{size:W,type:WidthType.DXA},margins:{top:80,bottom:80,left:140,right:140},borders:{top:bd,bottom:bd,left:bd,right:bd},children:body.length?body:[P([run("")])]})]})]}))}kids.push(P([run("")],{spacing:{after:20}}))}else if(it.passage){if(it.type==="语法选择"){kids.push(...it.passage.split("\n").map(l=>P([run(l)],{style:"Normal",spacing:{after:30,line:280}})));kids.push(P([run("")],{spacing:{after:20}}))}else{const bd={style:"single",size:4,color:"000000"};kids.push(new Table({width:{size:W,type:WidthType.DXA},columnWidths:[W],rows:[new TableRow({children:[new TableCell({width:{size:W,type:WidthType.DXA},margins:{top:80,bottom:80,left:140,right:140},borders:{top:bd,bottom:bd,left:bd,right:bd},children:it.passage.split("\n").map(l=>P([run(l)],{spacing:{after:30,line:280}}))})]})]}));kids.push(P([run("")],{spacing:{after:20}}))}}
if(it.type!=="选词填空")it.qs.forEach((q,i)=>{if(it.type==="语法选择")kids.push(...opts(q.opts,(s+i)+". "));else{kids.push(P([run((s+i)+". "+q.q)],{style:"Normal",keepNext:true}));kids.push(...opts(q.opts))}});
if(S.ans){const m=it.qs.length>1;kids.push(lab("【知识点】",it.kp.join("  ")),lab("【答案】",it.qs.map((q,i)=>(m?`【小题${i+1}】`:"")+q.ans).join("  ")));if(it.intro)kids.push(lab("【导语】",it.intro));kids.push(lab("【详解】",it.qs.map((q,i)=>(m?`【小题${i+1}】`:"")+q.exp).join("")))}
kids.push(P([run("")],{spacing:{after:60}}))})});
const doc=new Document({styles:{default:{document:{run:{size:21,font:F}}}},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1134,bottom:1134,left:1134,right:1134}}},footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({children:[PageNumber.CURRENT],font:F})]})]})},children:kids}]});
download(await Packer.toBlob(doc),(S.title||"试卷")+".docx")}

function gen(){const g=(t,l)=>l.sort(()=>Math.random()-.5);let ids=[];const gr=$("#ag").value,s=$("#as").value,d=$("#ad").value,k=$("#ak").value;
TYPES.forEach(t=>{const n=+document.querySelector(`[data-t="${t}"]`).value||0;if(!n)return;ids.push(...g(0,cur().filter(i=>i.type===t&&(!gr||gradeOf(i)===gr)&&(!s||semesterOf(i)===s)&&(!d||i.diff==d)&&(!k||i.kp.includes(k)))).slice(0,n).map(i=>i.id))});
if(!ids.length){$("#msg").textContent="没有抽到题目，请调整数量或条件。";return}S.basket=ids;persist();S.view="paper";view()}
function imp(){try{let a=JSON.parse($("#js").value);if(!Array.isArray(a))a=[a];if(a.some(x=>x.type==="单项选择"))throw new Error("单项选择题已从题库中移除");a.forEach((x,i)=>{if(!x.qs||!x.qs.length||!x.qs.every(q=>q.q&&(x.type==="选词填空"||Array.isArray(q.opts))&&q.ans))throw new Error("第"+(i+1)+"项缺少 qs 字段")});
S.custom.push(...a.map((x,i)=>{const kp=x.kp||[];if(!kp.some(k=>/^[七八九]年级[上下]册$/.test(k)))kp.push(S.f.grade?(S.f.grade+"上册"):"七年级上册");return {id:x.id||"c"+Date.now()+"_"+i,stage:"junior",type:x.type||"阅读理解",diff:+x.diff||2,kp,title:x.title||"",passage:x.passage||"",passageHtml:x.passageHtml||"",intro:x.intro||"",qs:x.qs.map(q=>({q:q.q,opts:q.opts||[],ans:q.ans,exp:q.exp||""}))}}));
persist();$("#msg").textContent="已导入 "+a.length+" 个题组";$("#js").value=""}catch(e){$("#msg").textContent="导入失败："+e.message}}

document.addEventListener("dblclick",e=>{const card=e.target.closest("#list article.card");if(!card||e.target.closest(".cart"))return;const id=card.querySelector(".cart")?.dataset.id;if(!id)return;S.open[id]=!S.open[id];drawList()});
document.addEventListener("click",e=>{
const gb=e.target.closest(".grade-btn");
if(gb){
  const g=gb.dataset.grade||"";
  if(S.f.grade!==g){
    S.f.grade=g;
    if(S.f.sem&&g&&!S.f.sem.startsWith(g))S.f.sem="";
    if(!S.title||S.title.endsWith("英语练习卷"))S.title=(g||"初中")+"英语练习卷";
    stageBarUpdate();
    if(S.view==="pick")view();
    else navUpdate();
  }
  return;
}
const v=e.target.closest("[data-v]");if(v){S.view=v.dataset.v;view();return}
const b=e.target.closest("[data-a]");if(!b)return;const a=b.dataset.a,id=b.dataset.id;
if(a==="b"){if(e.detail>1)return;tog(S.basket,id);persist();S.view==="paper"?view():drawList()}
else if(a==="x"){if(confirm("删除这个自建题组？")){S.custom=S.custom.filter(c=>c.id!==id);S.basket=S.basket.filter(x=>x!==id);persist();drawList()}}
else if(a==="u"||a==="dn"){const i=S.basket.indexOf(id),j=a==="u"?i-1:i+1;if(S.basket[j]){[S.basket[i],S.basket[j]]=[S.basket[j],S.basket[i]];persist();view()}}
else if(a==="clr"){if(confirm("清空当前试卷？")){S.basket=[];persist();view()}}
else if(a==="print")window.print();else if(a==="docx"){if(!S.basket.length)alert("试卷为空");else makeDocx()}
else if(a==="gen")gen();else if(a==="imp"){imp();navUpdate()}
else if(a==="exp")download(new Blob([JSON.stringify(S.custom,null,1)],{type:"application/json"}),"初中英语自建题库.json")});
view();
