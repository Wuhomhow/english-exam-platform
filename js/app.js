// ==========================================================================
// 初中英语题库与智能组卷系统 - 核心业务逻辑
// ==========================================================================
const TYPES=["语法选择","完形填空","阅读理解","配对阅读","选词填空","读写综合","书面表达"],CN="一二三四五六七八九十",DL=["","易","中","难"],GRADES=["七年级","八年级","九年级"],SEMS=["七年级上册","七年级下册","八年级上册","八年级下册","九年级上册","九年级下册"];
const PAPER_TYPES=["阶段检测","月考","期中考试","期末考试","模拟考"];

// 名校试卷索引库（按年级、试卷类型分类）
const FAMOUS_PAPERS=[
  {
    id:"paper_zh_wy_8a",
    title:"广东珠海市文园中学（集团）2026-2027年度第一学期阶段学情自测八年级英语试卷",
    shortTitle:"珠海文园中学 2026-2027 八上阶段学情自测",
    school:"珠海市文园中学（集团）",
    city:"珠海市",
    year:"2026-2027学年",
    grade:"八年级",
    semester:"八年级上册",
    paperType:"阶段检测",
    itemIds:[
      "paper_zh_wy_8a_1",
      "paper_zh_wy_8a_2",
      "paper_zh_wy_8a_3",
      "paper_zh_wy_8a_4",
      "paper_zh_wy_8a_5",
      "paper_zh_wy_8a_6",
      "paper_zh_wy_8a_7",
      "paper_zh_wy_8a_8",
      "paper_zh_wy_8a_9"
    ]
  },
  {
    id:"paper_st_lh_8a",
    title:"广东汕头市龙湖实验中学2026-2027学年上学期阶段质量检测卷初二英语",
    shortTitle:"汕头龙湖实验中学 2026-2027 八上阶段质量检测",
    school:"汕头市龙湖实验中学",
    city:"汕头市",
    year:"2026-2027学年",
    grade:"八年级",
    semester:"八年级上册",
    paperType:"阶段检测",
    itemIds:[
      "paper_st_lh_8a_1",
      "paper_st_lh_8a_2",
      "paper_st_lh_8a_3",
      "paper_st_lh_8a_4",
      "paper_st_lh_8a_5",
      "paper_st_lh_8a_6",
      "paper_st_lh_8a_7"
    ]
  },
  {
    id:"paper_jm_gk_9a",
    title:"广东省江门市港口中学2026-2027学年九年级上学期第一次月考英语试题",
    shortTitle:"江门港口中学 2026-2027 九上第一次月考",
    school:"江门市港口中学",
    city:"江门市",
    year:"2026-2027学年",
    grade:"九年级",
    semester:"九年级上册",
    paperType:"月考",
    itemIds:[
      "paper_jm_gk_9a_1",
      "paper_jm_gk_9a_2",
      "paper_jm_gk_9a_3",
      "paper_jm_gk_9a_4",
      "paper_jm_gk_9a_5",
      "paper_jm_gk_9a_6",
      "paper_jm_gk_9a_7",
      "paper_jm_gk_9a_8"
    ]
  }
];

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

const S={
  custom:initCustom(),
  basket:initBasket(),
  view:"pick",
  open:{},
  catalogOpen:false,
  famousCatOpen:false,
  f:{q:"",type:"",grade:"",sem:"",diff:""},
  pf:{grade:"",paperType:"",q:"",activeId:""},
  title:"初中英语练习卷",
  ans:false
};
const bank=()=>SAMPLE.concat(S.custom),byId=id=>bank().find(i=>i.id===id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
const $=s=>document.querySelector(s),L="ABCDEFGH";
const cur=()=>bank();

const gradeOf=i=>{
  if(i.grade&&/^[七八九]年级$/.test(i.grade))return i.grade;
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

const stripHTML=s=>{
  if(!s||typeof s!=="string")return "";
  return s.replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/\s+/g," ").trim();
};

const itemSearchText=it=>{
  if(it._searchText)return it._searchText;
  const g=gradeOf(it),sem=semesterOf(it),semShort=sem.replace(/^[七八九]年级/,""),gShort=g.replace(/年级$/,"");
  const abbrev=gShort+(semShort.includes("上")?"上":semShort.includes("下")?"下":"");
  const aliases=g==="七年级"?"初一":g==="八年级"?"初二":"初三";
  const parts=[it.title||"",it.paperTitle||"",it.sectionTitle||"",it.id||"",it.type||"",g,sem,abbrev,aliases,(it.kp||[]).join(" "),DL[it.diff]||"",it.intro||"",it.passage||"",stripHTML(it.passageHtml||"")];
  if(it.qs&&it.qs.length){
    it.qs.forEach(q=>{
      parts.push(stripHTML(q.q||""));
      if(q.opts&&q.opts.length)q.opts.forEach(o=>parts.push(stripHTML(o||"")));
      parts.push(stripHTML(q.exp||""));
      parts.push(q.ans||"");
    });
  }
  const text=parts.join(" ").toLowerCase();
  it._searchText=text;
  return text;
};

function filt(){
  const f=S.f,q=(f.q||"").trim().toLowerCase();
  const hasQ=q.length>0;
  const tokens=hasQ?q.split(/\s+/).filter(Boolean):[];
  return cur().filter(i=>{
    if(hasQ){
      const text=itemSearchText(i);
      return tokens.every(t=>text.includes(t));
    }
    if(f.type&&i.type!==f.type)return false;
    if(f.grade&&gradeOf(i)!==f.grade)return false;
    if(f.sem&&semesterOf(i)!==f.sem)return false;
    if(f.diff&&i.diff!=f.diff)return false;
    return true;
  });
}

const tog=(arr,id)=>{const k=arr.indexOf(id);k<0?arr.push(id):arr.splice(k,1)};
const persist=()=>{
  sv("zj_all_basket",S.basket);
  sv("zj_all_custom",S.custom);
  sv("zj_basket",S.basket);
  sv("zj_custom",S.custom);
};
const keepIds=new Set(bank().map(i=>i.id));S.basket=S.basket.filter(id=>keepIds.has(id));persist();

const fmtQ=s=>s.includes("<img")||s.includes("<br>")||s.includes("<div")||s.includes("<u>")?s:esc(s);
function qHTML(it,start,withAns){if(it.type==="选词填空")return `<div class="cloze-ans-lines">${it.qs.map((_,i)=>`<span>${start+i}. __________</span>`).join("")}</div>`;const isInline=it.type==="语法选择"||it.type==="完形填空";return it.qs.map((q,i)=>{const isWriting=(it.type==="读写综合"&&(q.q.includes("B．书面表达")||q.q.includes("B. 书面表达")||q.q.includes("B.书面表达")))||it.type==="书面表达";if(isInline||!q.q||/^\(?\d+\)?$/.test(q.q.trim()))return `<div class="q grammar-q"><b>${start+i}.</b><div class="opts">${q.opts.map((o,j)=>`<span>${L[j]}. ${o.includes("<img")||o.includes("<u>")?o:esc(o)}</span>`).join("")}</div></div>`;return `<div class="q">${isWriting?"":`${start+i}. `}${fmtQ(q.q)}${it.type==="读写综合"&&!isWriting?`<div class="rw-ans-line"></div>`:""}${isWriting?`<div class="essay-lines">${Array(10).fill('<div class="essay-line"></div>').join("")}</div>`:""}${q.opts&&q.opts.length?`<div class="opts">${q.opts.map((o,j)=>`<span>${L[j]}. ${o.includes("<img")||o.includes("<u>")?o:esc(o)}</span>`).join("")}</div>`:""}</div>`}).join("")}
function expHTML(it){const m=it.qs.length>1,isLong=it.type==="读写综合"||it.type==="书面表达";return `<div class="exp"><div><b>【答案】</b>${it.qs.map((q,i)=>(m?`【小题${i+1}】`:"")+esc(q.ans).replace(/\n/g,"<br>")).join(isLong?"<br>":"  ")}</div>${it.intro?`<div><b>【导语】</b>${esc(it.intro)}</div>`:""}<div><b>【详解】</b>${it.qs.map((q,i)=>(m?`【小题${i+1}】`:"")+esc(q.exp).replace(/\n/g,"<br>")).join("<br>")}</div></div>`}
function shiftBlanks(s,start,isHtml){if(!start||start===1)return s;return isHtml?s.replace(/<u>((?:\s|&nbsp;)*)(\d+)((?:\s|&nbsp;)*)<\/u>/g,(_,a,d,b)=>`<u>${a}${start+parseInt(d,10)-1}${b}</u>`):s.replace(/___(\d+)___/g,(_,d)=>`___${start+parseInt(d,10)-1}___`)}
function passageHTML(it,start=1){const noBox=" no-box";return it.passageHtml?`<div class="source-art${noBox}">${shiftBlanks(it.passageHtml,start,true)}</div>`:it.passage?`<div class="pass${noBox}">${esc(shiftBlanks(it.passage,start,false))}</div>`:""}
function shortTitle(it){return (it.title||"").replace(/^[七八九][上下][^·]*·\s*/,"")}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>${esc(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

async function captureQuestionCard(cardEl, btnEl, qTitle) {
  if (typeof window.html2canvas !== 'function') {
    showToast('截图组件加载中，请稍候再试', 'warn');
    return;
  }
  if (!cardEl || btnEl.disabled) return;
  const textSpan = btnEl.querySelector('.shot-text') || btnEl;
  const origText = textSpan.textContent;
  btnEl.disabled = true;
  textSpan.textContent = '截图中...';

  try {
    const canvas = await window.html2canvas(cardEl, {
      scale: Math.min(window.devicePixelRatio || 2, 3),
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      ignoreElements: (el) => el && el.hasAttribute && el.hasAttribute('data-html2canvas-ignore')
    });

    const hasAnalysis = Boolean(cardEl.querySelector('.exp'));
    const modeLabel = hasAnalysis ? '（含答案解析）' : '';

    const canvasToBlob = (cv) => new Promise((resolve, reject) => {
      cv.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), 'image/png');
    });

    if (navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
      const blobPromise = canvasToBlob(canvas);
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blobPromise })
      ]);
      showToast(`【${qTitle}】截图${modeLabel}已成功复制到剪贴板！`, 'success');
    } else {
      const blob = await canvasToBlob(canvas);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `【${qTitle}】截图${hasAnalysis ? '_含解析' : ''}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`当前环境限制剪贴板，已为您自动下载【${qTitle}】高清截图！`, 'info');
    }
  } catch (err) {
    console.warn('Screenshot capture fallback:', err);
    try {
      const canvas = await window.html2canvas(cardEl, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        ignoreElements: (el) => el && el.hasAttribute && el.hasAttribute('data-html2canvas-ignore')
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `【${qTitle}】截图.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`已为您下载【${qTitle}】高清截图文件！`, 'info');
    } catch (fallbackErr) {
      showToast('截图失败，请在现代浏览器或服务环境下使用', 'error');
    }
  } finally {
    btnEl.disabled = false;
    textSpan.textContent = origText;
  }
}

function card(it,start=1){const inB=S.basket.includes(it.id),op=S.open[it.id],sem=semesterOf(it),st=shortTitle(it);
return `<article class="card" data-id="${it.id}"><div class="meta"><span class="tag">${esc(it.sectionTitle||it.type)}</span><span class="tag">${esc(sem)}</span>${it.title?`<b>${esc(st)}</b>`:""}<span class="muted">难度：${DL[it.diff]||"-"}</span></div>${passageHTML(it,start)}${qHTML(it,start)}${op?expHTML(it):""}<div class="card-foot" data-html2canvas-ignore="true"><div class="card-foot-left"><button type="button" class="text-btn" data-a="exp-toggle" data-id="${it.id}"><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg><span>${op?"收起答案解析":"查看答案解析"}</span></button><button type="button" class="text-btn btn-screenshot" data-a="shot" data-id="${it.id}" title="复制题目高清截图"><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"></path></svg><span class="shot-text">截图复制</span></button></div><div class="card-foot-right">${S.custom.some(c=>c.id===it.id)?`<button class="d" data-a="x" data-id="${it.id}">删除</button>`:""}<button class="cart ${inB?"added":""}" data-a="b" data-id="${it.id}" aria-label="${inB?"移出试卷":"加入试卷"}" title="${inB?"移出试卷":"加入试卷"}">🛒</button></div></div></article>`}

// 生成数学网页同款左侧分级树状题库目录 (年级 -> 上下册 -> 题型)
function catalogHTML(){
  const allItems=cur();
  const isAllActive=!S.f.grade&&!S.f.sem&&!S.f.type;
  const activeBadgeText=isAllActive?"全部题库":[S.f.sem||S.f.grade,S.f.type].filter(Boolean).join(" · ");

  // 构建 年级 -> 学期 -> 题型 统计树
  const gradeMap=new Map();
  GRADES.forEach(g=>gradeMap.set(g,new Map()));

  allItems.forEach(it=>{
    const g=gradeOf(it);
    const sem=semesterOf(it);
    const shortSem=sem.replace(/^[七八九]年级/,"")||"上册";
    if(!gradeMap.has(g))gradeMap.set(g,new Map());
    const semMap=gradeMap.get(g);
    if(!semMap.has(shortSem))semMap.set(shortSem,{fullSem:sem,total:0,types:new Map()});
    const semObj=semMap.get(shortSem);
    semObj.total++;
    semObj.types.set(it.type,(semObj.types.get(it.type)||0)+1);
  });

  const treeHTML=[...gradeMap.entries()].map(([g,semMap])=>{
    const gradeTotal=[...semMap.values()].reduce((s,o)=>s+o.total,0);
    if(!gradeTotal)return "";
    const semOrder=["上册","下册"];
    const orderedSems=[...semMap.keys()].sort((a,b)=>semOrder.indexOf(a)-semOrder.indexOf(b));

    const semsHTML=orderedSems.map(shortSem=>{
      const semObj=semMap.get(shortSem);
      const isSemOnlyActive=S.f.sem===semObj.fullSem&&!S.f.type;
      const orderedTypes=TYPES.filter(t=>semObj.types.has(t)).concat([...semObj.types.keys()].filter(t=>!TYPES.includes(t)));
      const topicsHTML=orderedTypes.map(t=>{
        const cnt=semObj.types.get(t);
        const isTopicActive=S.f.sem===semObj.fullSem&&S.f.type===t;
        return `<button type="button" class="chapter-tree-btn nav-topic-button ${isTopicActive?"is-active":""}" data-nav-grade="${esc(g)}" data-nav-sem="${esc(semObj.fullSem)}" data-nav-type="${esc(t)}"><span class="nav-topic-label">${esc(t)}</span><span class="nav-topic-count">${cnt}</span></button>`;
      }).join("");

      return `<div class="nav-semester-group"><div class="nav-semester-label ${isSemOnlyActive?"is-active":""}" data-nav-grade="${esc(g)}" data-nav-sem="${esc(semObj.fullSem)}" data-nav-type="" title="点击查看${esc(semObj.fullSem)}全部题目"><span>${esc(shortSem)}</span><span>${semObj.total} 题</span></div><div class="nav-topic-list">${topicsHTML}</div></div>`;
    }).join("");

    return `<details class="nav-grade-card" open><summary><span>${esc(g)}</span><span class="grade-summary-right"><span class="grade-total">${gradeTotal} 题</span></span></summary><div class="nav-grade-content">${semsHTML}</div></details>`;
  }).join("");

  return `<div class="catalog-box ${S.catalogOpen?"is-open":""}" id="catalogBox"><div class="catalog-header" id="catalogHeaderToggle"><h3 class="catalog-title"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg><span>题库目录</span></h3><div class="catalog-mobile-meta"><span class="mobile-active-badge">${esc(activeBadgeText)}</span><span class="mobile-toggle-hint">展开/收起</span><svg class="mobile-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></div></div><div class="catalog-body"><button type="button" class="chapter-tree-btn chapter-tree-all ${isAllActive?"is-active":""}" data-nav-grade="" data-nav-sem="" data-nav-type=""><span>全部题库</span><span class="all-count-badge">${allItems.length} 题</span></button><div class="chapter-tree-list">${treeHTML}</div></div></div>`;
}

// ==========================================================================
// 【名校卷】专区：按年级、试卷类型分类导航与套卷详情预览
// ==========================================================================
function getPaperStats(p){
  const items=p.itemIds.map(byId).filter(Boolean);
  const subCount=items.reduce((s,it)=>s+(it.qs?it.qs.length:0),0);
  const inBasketCount=items.filter(it=>S.basket.includes(it.id)).length;
  return {items,groupCount:items.length,subCount,inBasketCount,allInBasket:items.length>0&&inBasketCount===items.length};
}

function filtPapers(){
  const pf=S.pf,q=(pf.q||"").trim().toLowerCase();
  return FAMOUS_PAPERS.filter(p=>{
    if(pf.grade&&p.grade!==pf.grade)return false;
    if(pf.paperType&&p.paperType!==pf.paperType)return false;
    if(q){
      const {items}=getPaperStats(p);
      const hay=[p.title,p.shortTitle,p.school,p.city,p.grade,p.semester,p.paperType,p.year,...items.map(itemSearchText)].join(" ").toLowerCase();
      return q.split(/\s+/).filter(Boolean).every(t=>hay.includes(t));
    }
    return true;
  });
}

function famousCatalogHTML(){
  const pf=S.pf;
  const isAllActive=!pf.grade&&!pf.paperType&&!pf.activeId;
  const activeBadgeText=pf.activeId
    ?(FAMOUS_PAPERS.find(p=>p.id===pf.activeId)?.shortTitle||"查看套卷")
    :(isAllActive?"全部名校卷":[pf.grade,pf.paperType].filter(Boolean).join(" · "));

  // 构建 年级 -> 试卷类型 -> 套卷 树状目录
  const treeHTML=GRADES.map(g=>{
    const gPapers=FAMOUS_PAPERS.filter(p=>p.grade===g);
    if(!gPapers.length)return "";
    const typeMap=new Map();
    gPapers.forEach(p=>{
      if(!typeMap.has(p.paperType))typeMap.set(p.paperType,[]);
      typeMap.get(p.paperType).push(p);
    });

    const typesHTML=[...typeMap.entries()].map(([pt,list])=>{
      const isTypeActive=pf.grade===g&&pf.paperType===pt&&!pf.activeId;
      const papersListHTML=list.map(p=>{
        const isPaperActive=pf.activeId===p.id;
        const {subCount}=getPaperStats(p);
        return `<button type="button" class="chapter-tree-btn nav-topic-button ${isPaperActive?"is-active":""}" data-pnav-id="${esc(p.id)}" title="${esc(p.title)}"><span class="nav-topic-label">📄 ${esc(p.shortTitle)}</span><span class="nav-topic-count">${subCount}题</span></button>`;
      }).join("");

      return `<div class="nav-semester-group"><div class="nav-semester-label ${isTypeActive?"is-active":""}" data-pnav-grade="${esc(g)}" data-pnav-type="${esc(pt)}" title="点击筛选${esc(g)}·${esc(pt)}"><span>${esc(pt)}</span><span>${list.length} 份</span></div><div class="nav-topic-list">${papersListHTML}</div></div>`;
    }).join("");

    return `<details class="nav-grade-card" open><summary><span>${esc(g)}</span><span class="grade-summary-right"><span class="grade-total">${gPapers.length} 份试卷</span></span></summary><div class="nav-grade-content">${typesHTML}</div></details>`;
  }).join("");

  return `<div class="catalog-box ${S.famousCatOpen?"is-open":""}" id="famousCatalogBox"><div class="catalog-header" id="famousCatalogHeaderToggle"><h3 class="catalog-title"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><span>名校卷分类目录</span></h3><div class="catalog-mobile-meta"><span class="mobile-active-badge">${esc(activeBadgeText)}</span><span class="mobile-toggle-hint">展开/收起</span><svg class="mobile-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></div></div><div class="catalog-body"><button type="button" class="chapter-tree-btn chapter-tree-all ${isAllActive?"is-active":""}" data-pnav-grade="" data-pnav-type=""><span>全部名校真题卷</span><span class="all-count-badge">${FAMOUS_PAPERS.length} 份</span></button><div class="chapter-tree-list">${treeHTML}</div></div></div>`;
}

function paperCardHTML(p){
  const {items,groupCount,subCount,inBasketCount,allInBasket}=getPaperStats(p);
  const sections=[...new Set(items.map(it=>it.sectionTitle||it.type))];
  return `<article class="card famous-paper-card" data-paper-id="${esc(p.id)}">
    <div class="famous-paper-top">
      <div class="famous-paper-badges">
        <span class="tag tag-grade">${esc(p.grade)} · ${esc(p.semester)}</span>
        <span class="tag tag-ptype">${esc(p.paperType)}</span>
        <span class="tag">${esc(p.city)} · ${esc(p.school)}</span>
        <span class="muted">${esc(p.year)}</span>
      </div>
      <h3 class="famous-paper-title" data-a="paper-open" data-pid="${esc(p.id)}">${esc(p.title)}</h3>
      <div class="famous-paper-sections">
        ${sections.map(s=>`<span class="sec-pill">${esc(s)}</span>`).join("")}
      </div>
    </div>
    <div class="famous-paper-foot">
      <div class="famous-paper-stat">
        <span>共 <b>${groupCount}</b> 个大题组 / <b>${subCount}</b> 道小题</span>
        ${inBasketCount>0?`<span class="in-basket-pill">已选 ${inBasketCount}/${groupCount} 题组入卷</span>`:""}
      </div>
      <div class="famous-paper-actions">
        <button type="button" class="text-btn" data-a="paper-open" data-pid="${esc(p.id)}">📖 浏览整卷题目</button>
        <button type="button" class="text-btn" data-a="paper-add-all" data-pid="${esc(p.id)}">${allInBasket?"✓ 整卷已在试卷篮":"➕ 整卷加入试卷"}</button>
        <button type="button" class="p" data-a="paper-use-now" data-pid="${esc(p.id)}">⚡ 一键组卷 / 导出Word</button>
      </div>
    </div>
  </article>`;
}

function famousDetailHTML(p){
  const {items,groupCount,subCount,AllInBasket,allInBasket}=getPaperStats(p);
  const allOpen=items.length>0&&items.every(it=>S.open[it.id]);
  let qNum=1;
  let lastSec="";
  const itemsHTML=items.map(it=>{
    const s=qNum;
    qNum+=it.qs.length;
    const sec=it.sectionTitle||it.type;
    const secHeader=sec!==lastSec?`<div class="paper-sec-divider"><span>${esc(sec)}</span></div>`:"";
    lastSec=sec;
    return secHeader+card(it,s);
  }).join("");

  return `<div class="card famous-detail-banner">
    <div class="famous-detail-top">
      <button type="button" class="text-btn" data-a="paper-back">← 返回名校卷列表</button>
      <div class="famous-paper-badges">
        <span class="tag tag-grade">${esc(p.grade)} · ${esc(p.semester)}</span>
        <span class="tag tag-ptype">${esc(p.paperType)}</span>
        <span class="tag">${esc(p.city)} · ${esc(p.school)}</span>
      </div>
    </div>
    <h2 class="famous-detail-title">${esc(p.title)}</h2>
    <div class="famous-detail-bar">
      <span class="muted">全卷共 <b>${groupCount}</b> 个大题组，<b>${subCount}</b> 道小题（题号已按原卷自动连续编排）</span>
      <div class="famous-paper-actions">
        <button type="button" class="text-btn" data-a="paper-toggle-all-exp" data-pid="${esc(p.id)}">${allOpen?"🙈 收起全卷解析":"👁️ 展开全卷解析"}</button>
        <button type="button" class="text-btn" data-a="paper-add-all" data-pid="${esc(p.id)}">${allInBasket?"✓ 移出整卷题目":"➕ 整卷加入试卷篮"}</button>
        <button type="button" class="p" data-a="paper-use-now" data-pid="${esc(p.id)}">⚡ 一键载入试卷页 / 导出Word</button>
      </div>
    </div>
  </div>
  <div id="list">${itemsHTML}</div>`;
}

function drawFamous(){
  const pf=S.pf;
  const side=$("#famousCatalogSide");
  if(side)side.innerHTML=famousCatalogHTML();
  const mainBox=$("#famousMainContent");
  if(!mainBox)return;

  if(pf.activeId){
    const p=FAMOUS_PAPERS.find(x=>x.id===pf.activeId);
    if(p){
      mainBox.innerHTML=famousDetailHTML(p);
      navUpdate();
      return;
    }
    pf.activeId="";
  }

  const list=filtPapers();
  const activeTypes=["",...new Set(FAMOUS_PAPERS.map(p=>p.paperType))];
  const activeGrades=["",...GRADES.filter(g=>FAMOUS_PAPERS.some(p=>p.grade===g))];

  mainBox.innerHTML=`<div class="card famous-filter-card">
    <div class="famous-filter-row">
      <span class="famous-filter-label">所属年级：</span>
      <div class="famous-pills">
        ${activeGrades.map(g=>`<button type="button" class="pill-btn ${pf.grade===g?"is-active":""}" data-pf-grade="${esc(g)}">${g||"全部年级"} (${g?FAMOUS_PAPERS.filter(p=>p.grade===g).length:FAMOUS_PAPERS.length})</button>`).join("")}
      </div>
    </div>
    <div class="famous-filter-row">
      <span class="famous-filter-label">试卷类型：</span>
      <div class="famous-pills">
        ${activeTypes.map(pt=>`<button type="button" class="pill-btn ${pf.paperType===pt?"is-active":""}" data-pf-type="${esc(pt)}">${pt||"全部类型"} (${pt?FAMOUS_PAPERS.filter(p=>p.paperType===pt).length:FAMOUS_PAPERS.length})</button>`).join("")}
      </div>
    </div>
    <div class="famous-search-row">
      <div class="search-input-box">
        <svg class="search-box-icon" width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        <input id="pfq" placeholder="搜索名校名称、城市、试卷标题或卷内题目关键词..." value="${esc(pf.q)}">
      </div>
      <span class="muted">共找到 <b>${list.length}</b> 份名校套卷</span>
    </div>
  </div>
  <div id="famousList">${list.length?list.map(paperCardHTML).join(""):`<div class="card"><p class="muted" style="text-align:center;margin:20px 0">暂无符合筛选条件的名校试卷，请切换年级或试卷类型。</p></div>`}</div>`;

  const pfq=$("#pfq");
  if(pfq){
    pfq.oninput=e=>{
      S.pf.q=e.target.value;
      const filtered=filtPapers();
      const fl=$("#famousList");
      if(fl)fl.innerHTML=filtered.length?filtered.map(paperCardHTML).join(""):`<div class="card"><p class="muted" style="text-align:center;margin:20px 0">未找到匹配的试卷。</p></div>`;
    };
  }
  navUpdate();
}

function drawCatalog(){
  const c=$("#catalogSide");
  if(c)c.innerHTML=catalogHTML();
}

function syncToolbarControls(){
  const ft=$("#ft"),fg=$("#fg"),fs=$("#fs"),fd=$("#fd");
  if(ft)ft.value=S.f.type;
  if(fg)fg.value=S.f.grade;
  if(fs){
    fs.innerHTML=`<option value="">全部学期</option>${semesters().map(k=>`<option value="${k}" ${S.f.sem===k?"selected":""}>${esc(k)}</option>`).join("")}`;
    fs.value=S.f.sem;
  }
  if(fd)fd.value=S.f.diff;
}

function drawList(){
  if(S.view==="famous"){drawFamous();return;}
  const r=filt();
  const q=(S.f.q||"").trim();
  if(q){
    $("#list").innerHTML=r.length
      ?`<div class="search-summary-banner"><div class="search-banner-left"><span class="search-banner-icon">🔍</span><span>全库搜索 “<strong>${esc(q)}</strong>”：找到 <strong>${r.length}</strong> 个题组（覆盖所有年级与题型）</span></div><button type="button" class="btn-clear-search" data-a="clear-search">清空搜索，返回原目录</button></div>`+r.map(it=>card(it,1)).join("")
      :`<div class="card"><div class="search-empty-state"><div class="search-empty-icon">🔍</div><h3>全库未找到相关题目</h3><p class="muted">全库 ${cur().length} 个题组中未找到包含 “<strong>${esc(q)}</strong>” 的题干、材料、标题或解析。<br>建议：尝试缩短关键词、使用拼音或英文单词，或点击下方按钮返回原目录。</p><button type="button" class="btn-clear-search-p" data-a="clear-search">清空搜索，返回原目录</button></div></div>`;
    $("#cnt").textContent=`全库搜索：共 ${r.length} 题组`;
  }else{
    $("#list").innerHTML=r.length?r.map(it=>card(it,1)).join(""):`<div class="card"><p class="muted" style="text-align:center;margin:20px 0">没有符合条件的题目，请尝试切换左侧目录或调整筛选条件。</p></div>`;
    $("#cnt").textContent=`共 ${r.length} 题组`;
  }
  const clearBtn=$("#searchClearBtn");
  if(clearBtn&&clearBtn.classList)clearBtn.classList.toggle("is-visible",Boolean(q));
  drawCatalog();
  navUpdate();
}

function paperGroups(){
  const its=S.basket.map(byId).filter(Boolean);
  if(!its.length)return [];
  // 若当前试卷篮全部来自同一份名校卷，优先按原卷大题顺序展示
  const pids=new Set(its.map(i=>i.paperId).filter(Boolean));
  if(pids.size===1&&its.every(i=>i.paperId)){
    const g=[];
    its.forEach(it=>{
      const secName=(it.sectionTitle||it.type).replace(/^[一二三四五六七八九十]+[、．\.]\s*/,"");
      if(!g.length||g[g.length-1][0]!==secName)g.push([secName,[it]]);
      else g[g.length-1][1].push(it);
    });
    return g;
  }
  const g=[];
  TYPES.concat([...new Set(its.map(i=>i.type))].filter(t=>!TYPES.includes(t))).forEach(t=>{
    const a=its.filter(i=>i.type===t);
    if(a.length)g.push([t,a]);
  });
  return g;
}
function sheetHTML(prev){let n=1;return `<div class="sheet"><h2>${esc(S.title)}</h2>${paperGroups().map(([t,a],gi)=>`<h3>${CN[gi]||gi+1}、${t}</h3>${a.map(it=>{const s=n;n+=it.qs.length;return `<div>${prev?`<div class="ctl"><button data-a="u" data-id="${it.id}">上移</button><button data-a="dn" data-id="${it.id}">下移</button><button class="d" data-a="b" data-id="${it.id}">移除</button></div>`:""}${passageHTML(it,s)}${qHTML(it,s)}${S.ans?expHTML(it):""}</div>`}).join("")}`).join("")||`<p class="muted">试卷为空，请先到“选题”或“名校卷”页加入题目，或使用“智能组卷”。</p>`}</div>`}

function view(){const v=S.view,a=$("#app");
if(v==="pick"){
a.innerHTML=`<div class="bank-layout"><aside class="catalog-sidebar" id="catalogSide">${catalogHTML()}</aside><section class="bank-main"><div class="bar"><div class="search-input-box"><svg class="search-box-icon" width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg><input id="fq" placeholder="全库搜索：题干、材料、标题、年级、题型等" value="${esc(S.f.q)}"><button type="button" id="searchClearBtn" class="search-clear-btn ${S.f.q?'is-visible':''}" title="清空搜索" aria-label="清空搜索">✕</button></div><select id="ft"><option value="">全部题型</option>${TYPES.map(t=>`<option value="${t}" ${S.f.type===t?"selected":""}>${t}</option>`).join("")}</select><select id="fg"><option value="">全部年级</option>${GRADES.map(g=>`<option value="${g}" ${S.f.grade===g?"selected":""}>${g}</option>`).join("")}</select><select id="fs"><option value="">全部学期</option>${semesters().map(k=>`<option value="${k}" ${S.f.sem===k?"selected":""}>${esc(k)}</option>`).join("")}</select><select id="fd"><option value="">全部难度</option>${[1,2,3].map(d=>`<option value="${d}" ${S.f.diff==d?"selected":""}>${DL[d]}</option>`).join("")}</select><span id="cnt" class="muted" style="align-self:center"></span></div><div id="list"></div></section></div>`;
const up=()=>{S.f.q=$("#fq").value;S.f.type=$("#ft").value;S.f.sem=$("#fs").value;S.f.diff=$("#fd").value;drawList()};
$("#fg").onchange=e=>{
  S.f.grade=e.target.value;
  if(S.f.sem&&S.f.grade&&!S.f.sem.startsWith(S.f.grade))S.f.sem="";
  if(!S.title||S.title.endsWith("英语练习卷"))S.title=(S.f.grade||"初中")+"英语练习卷";
  S.f.q="";
  const fq=$("#fq");if(fq)fq.value="";
  syncToolbarControls();
  drawList();
};
$("#fq").onkeydown=e=>{
  if(e.key==="Escape"){
    S.f.q="";
    $("#fq").value="";
    drawList();
  }
};
const clearBtn=$("#searchClearBtn");
if(clearBtn){
  clearBtn.onclick=()=>{
    S.f.q="";
    $("#fq").value="";
    $("#fq").focus();
    drawList();
  };
}
["fq","ft","fs","fd"].forEach(i=>$("#"+i).addEventListener("input",up));drawList()}
else if(v==="famous"){
  a.innerHTML=`<div class="bank-layout"><aside class="catalog-sidebar" id="famousCatalogSide">${famousCatalogHTML()}</aside><section class="bank-main" id="famousMainContent"></section></div>`;
  drawFamous();
}
else if(v==="auto"){a.innerHTML=`<div class="card"><h3 style="margin-top:0">智能组卷（按题型数量随机抽题）</h3><div class="grid">${TYPES.map(t=>`<label>${t}（题组数）<br><input type="number" min="0" value="0" data-t="${t}" style="width:100%"></label>`).join("")}<label>年级<br><select id="ag" style="width:100%"><option value="">不限</option>${GRADES.map(g=>`<option value="${g}" ${S.f.grade===g?"selected":""}>${g}</option>`).join("")}</select></label><label>学期<br><select id="as" style="width:100%"><option value="">不限</option>${SEMS.map(k=>`<option value="${k}" ${S.f.sem===k?"selected":""}>${esc(k)}</option>`).join("")}</select></label><label>难度<br><select id="ad" style="width:100%"><option value="">不限</option>${[1,2,3].map(d=>`<option value="${d}">${DL[d]}</option>`).join("")}</select></label></div><p class="muted">一道阅读理解/语法选择/选词填空算 1 个题组（含多道小题）。生成后会替换当前试卷。</p><button class="p" data-a="gen">生成试卷</button> <span id="msg"></span></div>`}
else if(v==="paper"){a.innerHTML=`<div class="bar noprint"><input id="pt" value="${esc(S.title)}" style="flex:1;min-width:200px"><label style="align-self:center;display:inline-flex;align-items:center;gap:6px;cursor:pointer;user-select:none;font-weight:500"><input type="checkbox" id="pa" autocomplete="off" ${S.ans?"checked":""}> 含答案解析（教师版）</label><span class="tag" style="align-self:center;font-size:12px;font-weight:600;${S.ans?'background:#fef3c7;color:#b45309;border-color:#fde68a':'background:#e0f2fe;color:#0369a1;border-color:#bae6fd'}">${S.ans?'当前：教师解析版':'当前：学生作答版'}</span></div><div class="bar noprint"><button class="p" data-a="docx">导出 Word</button><button data-a="print">打印</button><button class="d" data-a="clr">清空试卷</button></div><div id="sh">${sheetHTML(1)}</div>`;
const pa=$("#pa");if(pa){pa.checked=Boolean(S.ans);pa.onchange=e=>{S.ans=e.target.checked;view()}}
const pt=$("#pt");if(pt)pt.oninput=e=>S.title=e.target.value;}
else{a.innerHTML=`<div class="card"><h3 style="margin-top:0">题库管理</h3><p>把题目以 JSON 数组粘贴到下方并导入。字段说明：</p><pre>[{"type":"语法选择|完形填空|阅读理解|配对阅读|选词填空|读写综合|书面表达","diff":1-3,"kp":["记叙文","七年级上册"],"title":"可空","passage":"材料，换行用\\n","intro":"导语，可空","qs":[{"q":"题干","opts":["A项","B项","C项"],"ans":"A","exp":"解析"}]}]</pre><textarea id="js" rows="9" style="width:100%" placeholder="在此粘贴 JSON"></textarea><div class="acts"><button class="p" data-a="imp">导入（追加）</button><button data-a="exp">导出自建题库</button><span id="msg"></span></div><p class="muted">自建题目保存在本浏览器中，建议定期导出备份。当前自建 ${S.custom.length} 个题组，内置题库 ${SAMPLE.length} 个（七年级 ${SAMPLE.filter(i=>gradeOf(i)==="七年级").length} 个，八年级 ${SAMPLE.filter(i=>gradeOf(i)==="八年级").length} 个，九年级 ${SAMPLE.filter(i=>gradeOf(i)==="九年级").length} 个）。</p></div>`}
navUpdate()}
function navUpdate(){$("#nav").innerHTML=[["pick","选题"],["famous",`名校卷（${FAMOUS_PAPERS.length}）`],["auto","智能组卷"],["paper",`试卷（${S.basket.length}）`],["mgr","题库管理"]].map(([k,t])=>`<button data-v="${k}" class="${S.view===k?"on":""}">${t}</button>`).join("")}

function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}

async function makeDocx(){if(!window.docx){alert("Word 生成库未能加载，请检查网络后刷新页面。");return}
const {Document,Packer,Paragraph,TextRun,ImageRun,Table,TableRow,TableCell,WidthType,AlignmentType,TabStopType,Tab,Footer,PageNumber}=docx,W=9638,F={ascii:"Times New Roman",hAnsi:"Times New Roman",eastAsia:"宋体"},bd={style:"single",size:4,color:"000000"};
const run=(t,o={})=>new TextRun({text:t,font:F,...o}),P=(ch,o={})=>new Paragraph({children:ch,spacing:{after:40,line:280},...o});
async function htmlPassage(html){const root=new DOMParser().parseFromString(html,"text/html").body,out=[];let cur=[];const flush=(align,ind)=>{if(cur.length){out.push(P(cur,{...(align?{alignment:align}:{}),...(ind?{indent:{firstLine:480}}:{})}));cur=[]}};const imageRun=async(el,maxDxa)=>{let src=el.getAttribute("src")||"";let buf=null,mime="png";const mapKey=src.replace(/^\.?\//,"");const base64Data=window.IMAGE_BASE64_MAP&&(window.IMAGE_BASE64_MAP[src]||window.IMAGE_BASE64_MAP[mapKey]||window.IMAGE_BASE64_MAP["assets/images/"+mapKey.split("/").pop()]);if(base64Data&&base64Data.startsWith("data:")){const commaIdx=base64Data.indexOf(",");if(commaIdx!==-1){if(base64Data.includes("image/jpeg")||base64Data.includes("image/jpg"))mime="jpeg";const bin=atob(base64Data.slice(commaIdx+1));buf=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);}}let w=160,h=100;if(buf&&buf.length>=24&&buf[0]===0x89&&buf[1]===0x50){w=(buf[16]<<24)|(buf[17]<<16)|(buf[18]<<8)|buf[19];h=(buf[20]<<24)|(buf[21]<<16)|(buf[22]<<8)|buf[23];}else{const im=new Image();im.src=base64Data||src;try{await im.decode()}catch(e){}w=im.naturalWidth||160;h=im.naturalHeight||100;}const maxPixelW=maxDxa?Math.max(60,Math.floor((maxDxa-240)/20)):360;const styleMax=el.style&&el.style.maxWidth?parseInt(el.style.maxWidth,10):0;const limitW=styleMax>0?Math.min(maxPixelW,styleMax):maxPixelW;const scale=Math.min(1,limitW/w,240/h),tw=Math.max(1,Math.round(w*scale)),th=Math.max(1,Math.round(h*scale));if(buf){return new ImageRun({data:buf,transformation:{width:tw,height:th},type:mime});}if(!src.startsWith("data:image/svg")&&!src.toLowerCase().endsWith(".svg")){try{const res=await fetch(src);if(res.ok){const ab=await res.arrayBuffer();return new ImageRun({data:new Uint8Array(ab),transformation:{width:tw,height:th},type:src.toLowerCase().endsWith(".jpg")||src.toLowerCase().endsWith(".jpeg")?"jpeg":"png"});}}catch(e){}}const canvas=document.createElement("canvas");canvas.width=tw;canvas.height=th;canvas.getContext("2d").drawImage(im,0,0,tw,th);const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("image conversion failed")),"image/png"));return new ImageRun({data:new Uint8Array(await blob.arrayBuffer()),transformation:{width:tw,height:th},type:"png"});};const walk=async(node,fmt={},align=undefined,isInd=false,maxDxa=W)=>{if(node.nodeType===Node.TEXT_NODE){const txt=node.nodeValue.replace(/\s+/g," ");if(txt.trim()||cur.length)cur.push(new TextRun({text:txt,font:F,...fmt}));return}if(node.nodeType!==Node.ELEMENT_NODE)return;const tag=node.tagName.toLowerCase();if(tag==="img"){try{cur.push(await imageRun(node,maxDxa))}catch(e){cur.push(run(`[图片：${node.alt||"插图"}]`))}return}if(tag==="br"){cur.push(new TextRun({break:1,font:F}));return}const isWordBank=tag==="div"&&node.classList&&node.classList.contains("bx")&&node.classList.contains("ct")&&!node.querySelector("div, p, table");if(isWordBank){flush(align,isInd);const bxTxt=(node.textContent||"").replace(/\s+/g,"   ").trim();out.push(new Table({width:{size:W,type:WidthType.DXA},columnWidths:[W],rows:[new TableRow({children:[new TableCell({width:{size:W,type:WidthType.DXA},margins:{top:80,bottom:80,left:140,right:140},borders:{top:bd,bottom:bd,left:bd,right:bd},children:[P([run(bxTxt)],{alignment:AlignmentType.CENTER,spacing:{after:0,line:260}})]})]})]}));return}const isMatchBox=tag==="div"&&node.classList&&node.classList.contains("bx")&&!node.classList.contains("ct")&&!node.querySelector("div, table");if(isMatchBox){flush(align,isInd);const cellOut=[],prevOut=out.slice();out.length=0;for(const ch of node.childNodes)await walk(ch,fmt,align,isInd,W);flush(align,isInd);cellOut.push(...out);out.length=0;out.push(...prevOut);out.push(new Table({width:{size:W,type:WidthType.DXA},columnWidths:[W],rows:[new TableRow({children:[new TableCell({width:{size:W,type:WidthType.DXA},margins:{top:80,bottom:80,left:140,right:140},borders:{top:bd,bottom:bd,left:bd,right:bd},children:cellOut.length?cellOut:[P([run("")])]})]})]}));return}if(tag==="div"&&node.classList&&node.classList.contains("g2")){flush(align,isInd);const directDivs=Array.from(node.children).filter(ch=>ch.tagName.toLowerCase()==="div");if(directDivs.length){const colW=Math.floor(W/2),rows=[];for(let i=0;i<directDivs.length;i+=2){const pair=directDivs.slice(i,i+2),cells=[];for(const d of pair){const cellOut=[],prevOut=out.slice();out.length=0;for(const ch of d.childNodes)await walk(ch,fmt,align,false,colW);flush(align,false);cellOut.push(...out);out.length=0;out.push(...prevOut);cells.push(new TableCell({width:{size:colW,type:WidthType.DXA},margins:{top:60,bottom:60,left:100,right:100},borders:{top:bd,bottom:bd,left:bd,right:bd},children:cellOut.length?cellOut:[P([run("")])]}));}if(cells.length===1){cells.push(new TableCell({width:{size:colW,type:WidthType.DXA},margins:{top:60,bottom:60,left:100,right:100},borders:{top:bd,bottom:bd,left:bd,right:bd},children:[P([run("")])]}));}rows.push(new TableRow({children:cells}));}if(rows.length)out.push(new Table({width:{size:W,type:WidthType.DXA},columnWidths:[colW,colW],rows}));}return}if(tag==="table"){flush(align,isInd);const trs=Array.from(node.querySelectorAll(":scope > tbody > tr, :scope > tr"));if(trs.length){const rowSpanCounts=trs.map(tr=>Array.from(tr.children).reduce((sum,td)=>{const cs=parseInt(td.getAttribute("colspan"),10);return sum+(cs>0?cs:1);},0));const maxCols=Math.max(1,...rowSpanCounts);const colW=Math.floor(W/maxCols);const rows=[];for(const tr of trs){const cells=[];const trTds=Array.from(tr.children);const isSingleCell=trTds.length===1&&maxCols>1;for(let ci=0;ci<trTds.length;ci++){const td=trTds[ci];let span=parseInt(td.getAttribute("colspan"),10)||1;if(isSingleCell)span=maxCols;const cellWidth=Math.min(W,colW*span);const cellOut=[],prevOut=out.slice();out.length=0;for(const ch of td.childNodes)await walk(ch,fmt,undefined,false,cellWidth);flush(undefined,false);cellOut.push(...out);out.length=0;out.push(...prevOut);cells.push(new TableCell({width:{size:cellWidth,type:WidthType.DXA},...(span>1?{columnSpan:span}:{}),margins:{top:60,bottom:60,left:100,right:100},borders:{top:bd,bottom:bd,left:bd,right:bd},children:cellOut.length?cellOut:[P([run("")])]}));}if(cells.length)rows.push(new TableRow({children:cells}));}if(rows.length)out.push(new Table({width:{size:W,type:WidthType.DXA},columnWidths:Array(maxCols).fill(colW),rows}));}return;}const isCenter=(node.classList&&node.classList.contains("ct"))||(node.style&&node.style.textAlign==="center");const nextAlign=isCenter?AlignmentType.CENTER:align;const block=["p","div","tr","li"].includes(tag);if(block)flush(align,isInd);let nextInd=isInd;if(tag==="p"||tag==="div"){nextInd=(node.classList&&node.classList.contains("ind"))||Boolean(node.querySelector&&node.querySelector(".ind"));}else if(tag==="span"&&node.classList&&node.classList.contains("ind")){nextInd=true;}const next={...fmt};if(["b","strong"].includes(tag))next.bold=true;if(["i","em"].includes(tag))next.italics=true;if(tag==="u")next.underline={};for(const child of node.childNodes)await walk(child,next,nextAlign,nextInd,maxDxa);if(block)flush(nextAlign,nextInd)};for(const node of root.childNodes)await walk(node);flush();return out}
const lab=(l,t)=>P([run(l,{color:"1F6FB5"}),run(t)]);
const wt=o=>o.replace(/<[^>]+>/g,"").replace(/[^\x00-\xff]/g,"xx").length;
async function opts(os,prefix=""){if(!os||!os.length)return [];if(os.some(o=>o.includes("<img")||o.includes("<u>"))){const per=os.some(o=>o.includes("<img"))?2:4,out=[];for(let i=0;i<os.length;i+=per){const row=os.slice(i,i+per);const htmlRow=row.map((x,k)=>`${(i===0&&k===0?prefix:"")+L[i+k]}. ${x}`).join("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");out.push(...await htmlPassage(htmlRow))}return out}const t=os.map((o,i)=>L[i]+". "+o),m=Math.max(...os.map(wt)),per=m<=16?4:m<=36?2:1,out=[];
for(let i=0;i<t.length;i+=per){const row=t.slice(i,i+per),ch=[];row.forEach((x,k)=>{if(k)ch.push(new Tab());ch.push((i===0&&k===0?prefix:"")+x)});
out.push(P([new TextRun({children:ch,font:F})],{tabStops:Array.from({length:per-1},(_,k)=>({type:TabStopType.LEFT,position:Math.round((k+1)*W/per)}))}))}return out}
function clozeLines(start,cnt){const per=5,out=[];for(let i=0;i<cnt;i+=per){const ch=[];for(let k=0;k<per&&i+k<cnt;k++){if(k)ch.push(new Tab());ch.push(`${start+i+k}. ____________`)}out.push(P([new TextRun({children:ch,font:F})],{spacing:{before:60,after:60,line:300},tabStops:Array.from({length:per-1},(_,k)=>({type:TabStopType.LEFT,position:Math.round((k+1)*W/per)}))}))}return out}
const groups=paperGroups(),htmlPassages=new Map();let pNum=1;for(const [,items] of groups)for(const it of items){const s=pNum;pNum+=it.qs.length;if(it.passageHtml)htmlPassages.set(it.id,await htmlPassage(shiftBlanks(it.passageHtml,s,true)))}
const kids=[P([run(S.title,{bold:true,size:32})],{alignment:AlignmentType.CENTER,spacing:{after:160}})];let n=1;
for(let gi=0;gi<groups.length;gi++){const [t,a]=groups[gi];kids.push(P([run((CN[gi]||gi+1)+"、"+t,{bold:true,size:24})],{spacing:{before:160,after:80}}));
for(const it of a){const s=n;n+=it.qs.length;
const fullLine="_".repeat(90);
if(htmlPassages.has(it.id)){kids.push(...htmlPassages.get(it.id));kids.push(P([run("")],{spacing:{after:20}}))}else if(it.passage){const shifted=shiftBlanks(it.passage,s,false);kids.push(...shifted.split("\n").filter(l=>l.trim()).map(l=>{const isH=l.startsWith("A．")||l.startsWith("B．")||l.startsWith("Dear ")||l.startsWith("Yours,")||l.startsWith("|")||l.startsWith("【");return P([run(l)],{style:"Normal",spacing:{after:30,line:280},...(isH?{}:{indent:{firstLine:480}})})}));kids.push(P([run("")],{spacing:{after:20}}))}
if(it.type==="选词填空"){kids.push(...clozeLines(s,it.qs.length))}else{for(let i=0;i<it.qs.length;i++){const q=it.qs[i];if(it.type==="语法选择"||it.type==="完形填空")kids.push(...await opts(q.opts,(s+i)+". "));else{const isWritingPart=(it.type==="读写综合"&&(q.q.includes("B．书面表达")||q.q.includes("B. 书面表达")||q.q.includes("B.书面表达")))||it.type==="书面表达";const prefix=isWritingPart?"":(s+i)+". ";if(q.q.includes("<img")||q.q.includes("<br>")||q.q.includes("<div")||q.q.includes("<u>"))kids.push(...await htmlPassage(prefix+q.q));else kids.push(P([run(prefix+q.q)],{style:"Normal"}));if(it.type==="读写综合"&&!isWritingPart){kids.push(P([run(fullLine)],{spacing:{before:40,after:80}}));}if(isWritingPart){for(let k=0;k<10;k++){kids.push(P([run(fullLine)],{spacing:{before:30,after:60,line:340}}));}}kids.push(...await opts(q.opts))}}}
if(S.ans){const m=it.qs.length>1,isLong=it.type==="读写综合"||it.type==="书面表达";if(isLong){kids.push(P([run("【答案】",{color:"1F6FB5",bold:true})]));it.qs.forEach((q,i)=>{const lines=String(q.ans||"").split("\n").filter(Boolean);lines.forEach((ln,li)=>kids.push(P([run((li===0&&m?`【小题${i+1}】`:"")+ln)])))});}else{kids.push(lab("【答案】",it.qs.map((q,i)=>(m?`【小题${i+1}】`:"")+q.ans).join("  ")));}if(it.intro)kids.push(lab("【导语】",it.intro));if(isLong){kids.push(P([run("【详解】",{color:"1F6FB5",bold:true})]));it.qs.forEach((q,i)=>{const lines=String(q.exp||"").split("\n").filter(Boolean);lines.forEach((ln,li)=>kids.push(P([run((li===0&&m?`【小题${i+1}】`:"")+ln)])))});}else{kids.push(lab("【详解】",it.qs.map((q,i)=>(m?`【小题${i+1}】`:"")+q.exp).join("")));}}
kids.push(P([run("")],{spacing:{after:60}}))}}
const doc=new Document({styles:{default:{document:{run:{size:21,font:F}}}},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1134,bottom:1134,left:1134,right:1134}}},footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({children:[PageNumber.CURRENT],font:F})]})]})},children:kids}]});
download(await Packer.toBlob(doc),(S.title||"试卷")+".docx")}

function gen(){const g=(t,l)=>l.sort(()=>Math.random()-.5);let ids=[];const gr=$("#ag").value,s=$("#as").value,d=$("#ad").value;
TYPES.forEach(t=>{const n=+document.querySelector(`[data-t="${t}"]`).value||0;if(!n)return;ids.push(...g(0,cur().filter(i=>i.type===t&&(!gr||gradeOf(i)===gr)&&(!s||semesterOf(i)===s)&&(!d||i.diff==d))).slice(0,n).map(i=>i.id))});
if(!ids.length){$("#msg").textContent="没有抽到题目，请调整数量或条件。";return}S.basket=ids;persist();S.ans=false;S.view="paper";view()}
function imp(){try{let a=JSON.parse($("#js").value);if(!Array.isArray(a))a=[a];if(a.some(x=>x.type==="单项选择"))throw new Error("单项选择题已从题库中移除");a.forEach((x,i)=>{if(!x.qs||!x.qs.length||!x.qs.every(q=>q.q&&(x.type==="选词填空"||x.type==="配对阅读"||x.type==="读写综合"||x.type==="书面表达"||Array.isArray(q.opts))&&q.ans))throw new Error("第"+(i+1)+"项缺少 qs 字段")});
S.custom.push(...a.map((x,i)=>{const kp=x.kp||[];if(!kp.some(k=>/^[七八九]年级[上下]册$/.test(k)))kp.push(S.f.grade?(S.f.grade+"上册"):"七年级上册");return {id:x.id||"c"+Date.now()+"_"+i,stage:"junior",type:x.type||"阅读理解",diff:+x.diff||2,kp,title:x.title||"",passage:x.passage||"",passageHtml:x.passageHtml||"",intro:x.intro||"",qs:x.qs.map(q=>({q:q.q,opts:q.opts||[],ans:q.ans,exp:q.exp||""}))}}));
persist();$("#msg").textContent="已导入 "+a.length+" 个题组";$("#js").value=""}catch(e){$("#msg").textContent="导入失败："+e.message}}

document.addEventListener("dblclick",e=>{const card=e.target.closest("#list article.card");if(!card||e.target.closest(".cart"))return;const id=card.querySelector(".cart")?.dataset.id;if(!id)return;S.open[id]=!S.open[id];drawList()});
document.addEventListener("click",e=>{
// 移动端题库目录折叠切换
const catToggle=e.target.closest("#catalogHeaderToggle");
if(catToggle){
  if(window.innerWidth<1024){
    S.catalogOpen=!S.catalogOpen;
    const box=$("#catalogBox");
    if(box)box.classList.toggle("is-open",S.catalogOpen);
  }
  return;
}
const famousToggle=e.target.closest("#famousCatalogHeaderToggle");
if(famousToggle){
  if(window.innerWidth<1024){
    S.famousCatOpen=!S.famousCatOpen;
    const box=$("#famousCatalogBox");
    if(box)box.classList.toggle("is-open",S.famousCatOpen);
  }
  return;
}
// 名校卷左侧目录项点击
const pnavId=e.target.closest("[data-pnav-id]");
if(pnavId){
  S.pf.activeId=pnavId.dataset.pnavId||"";
  if(window.innerWidth<1024)S.famousCatOpen=false;
  drawFamous();
  window.scrollTo({top:0,behavior:"smooth"});
  return;
}
const pnavCat=e.target.closest("[data-pnav-grade]");
if(pnavCat){
  S.pf.grade=pnavCat.dataset.pnavGrade||"";
  S.pf.paperType=pnavCat.dataset.pnavType||"";
  S.pf.activeId="";
  if(window.innerWidth<1024)S.famousCatOpen=false;
  drawFamous();
  window.scrollTo({top:0,behavior:"smooth"});
  return;
}
// 名校卷顶部胶囊筛选按钮
const pfGrade=e.target.closest("[data-pf-grade]");
if(pfGrade){
  S.pf.grade=pfGrade.dataset.pfGrade||"";
  S.pf.activeId="";
  drawFamous();
  return;
}
const pfType=e.target.closest("[data-pf-type]");
if(pfType){
  S.pf.paperType=pfType.dataset.pfType||"";
  S.pf.activeId="";
  drawFamous();
  return;
}
// 左侧题库目录项点击筛选
const navItem=e.target.closest("[data-nav-sem]");
if(navItem){
  S.f.grade=navItem.dataset.navGrade||"";
  S.f.sem=navItem.dataset.navSem||"";
  S.f.type=navItem.dataset.navType||"";
  S.f.q="";
  const fq=$("#fq");if(fq)fq.value="";
  if(!S.title||S.title.endsWith("英语练习卷"))S.title=(S.f.grade||"初中")+"英语练习卷";
  if(window.innerWidth<1024)S.catalogOpen=false;
  syncToolbarControls();
  drawList();
  window.scrollTo({top:0,behavior:"smooth"});
  return;
}
const v=e.target.closest("[data-v]");if(v){S.view=v.dataset.v;if(S.view==="paper")S.ans=false;view();return}
const b=e.target.closest("[data-a]");if(!b)return;const a=b.dataset.a,id=b.dataset.id,pid=b.dataset.pid;
if(a==="clear-search"){
  S.f.q="";
  const fq=$("#fq");if(fq)fq.value="";
  drawList();
  return;
}
else if(a==="paper-open"){
  S.pf.activeId=pid||"";
  drawFamous();
  window.scrollTo({top:0,behavior:"smooth"});
  return;
}
else if(a==="paper-back"){
  S.pf.activeId="";
  drawFamous();
  window.scrollTo({top:0,behavior:"smooth"});
  return;
}
else if(a==="paper-toggle-all-exp"){
  const p=FAMOUS_PAPERS.find(x=>x.id===pid);
  if(p){
    const {items}=getPaperStats(p);
    const allOpen=items.every(it=>S.open[it.id]);
    items.forEach(it=>{S.open[it.id]=!allOpen;});
    drawFamous();
  }
  return;
}
else if(a==="paper-add-all"){
  const p=FAMOUS_PAPERS.find(x=>x.id===pid);
  if(p){
    const {allInBasket}=getPaperStats(p);
    if(allInBasket){
      const rmSet=new Set(p.itemIds);
      S.basket=S.basket.filter(x=>!rmSet.has(x));
      showToast(`已将《${p.shortTitle}》移出试卷篮`,"warn");
    }else{
      p.itemIds.forEach(iid=>{if(!S.basket.includes(iid))S.basket.push(iid);});
      S.title=p.title;
      showToast(`已将《${p.shortTitle}》全卷 ${p.itemIds.length} 个大题组加入试卷篮！`,"success");
    }
    persist();
    drawFamous();
  }
  return;
}
else if(a==="paper-use-now"){
  const p=FAMOUS_PAPERS.find(x=>x.id===pid);
  if(p){
    S.basket=[...p.itemIds];
    S.title=p.title;
    S.ans=false;
    persist();
    S.view="paper";
    view();
    window.scrollTo({top:0,behavior:"smooth"});
    showToast(`已载入《${p.shortTitle}》整卷，可直接导出 Word 或打印！`,"success");
  }
  return;
}
else if(a==="exp-toggle"){S.open[id]=!S.open[id];drawList()}
else if(a==="shot"){const cardEl=b.closest(".card");const it=byId(id);captureQuestionCard(cardEl,b,it?shortTitle(it):"题组")}
else if(a==="b"){if(e.detail>1)return;tog(S.basket,id);persist();if(S.view==="paper"){view()}else{drawList();showToast(S.basket.includes(id)?"已加入试卷":"已移出试卷",S.basket.includes(id)?"success":"warn")}}
else if(a==="x"){if(confirm("删除这个自建题组？")){S.custom=S.custom.filter(c=>c.id!==id);S.basket=S.basket.filter(x=>x!==id);persist();drawList()}}
else if(a==="u"||a==="dn"){const i=S.basket.indexOf(id),j=a==="u"?i-1:i+1;if(S.basket[j]){[S.basket[i],S.basket[j]]=[S.basket[j],S.basket[i]];persist();view()}}
else if(a==="clr"){if(confirm("清空当前试卷？")){S.basket=[];persist();view()}}
else if(a==="print")window.print();else if(a==="docx"){if(!S.basket.length)alert("试卷为空");else makeDocx()}
else if(a==="gen")gen();else if(a==="imp"){imp();navUpdate()}
else if(a==="exp")download(new Blob([JSON.stringify(S.custom,null,1)],{type:"application/json"}),"初中英语自建题库.json")});
view();
