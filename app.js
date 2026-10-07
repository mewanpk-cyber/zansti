
// ---- Login / one-device license ----
const DEVICE_KEY="zansti_device_id";
const SESSION_KEY="zansti_session";
function deviceId(){
  let id=localStorage.getItem(DEVICE_KEY);
  if(!id){ id=crypto.randomUUID(); localStorage.setItem(DEVICE_KEY,id); }
  return id;
}
async function doLogin(){
  const username=$("#username").value.trim(), password=$("#password").value;
  $("#loginError").textContent="";
  if(!username||!password){$("#loginError").textContent="تکایە هەردوو خانەکە پڕ بکە.";return;}
  try{
    const r=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({username,password,deviceId:deviceId()})});
    const d=await r.json();
    if(!r.ok) throw new Error(d.error||"login");
    localStorage.setItem(SESSION_KEY,d.token);
    $("#loginScreen").classList.add("hide");$("#app").classList.remove("locked");
  }catch(e){$("#loginError").textContent=e.message==="invalid_credentials"?"یوزەر یان کلیلی هەڵەیە.":e.message==="device_bound"?"ئەم کۆدە پێشتر بە ئامێرێکی تر بەستراوەتەوە.":"پەیوەندی بە سێرڤەر نەکرا."}
}
$("#loginBtn").onclick=doLogin;
$("#password").addEventListener("keydown",e=>{if(e.key==="Enter")doLogin()});
async function bootAuth(){
  const token=localStorage.getItem(SESSION_KEY);
  if(!token)return;
  try{
    const r=await fetch("/api/me",{headers:{Authorization:"Bearer "+token}});
    if(r.ok){$("#loginScreen").classList.add("hide");$("#app").classList.remove("locked");}
    else localStorage.removeItem(SESSION_KEY);
  }catch{}
}
$("#logoutBtn").onclick=()=>{localStorage.removeItem(SESSION_KEY);location.reload()};
bootAuth();

const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
let subject="زیندەزانی", mode="summary", imageData=null;

$$(".subject").forEach(b=>b.onclick=()=>{$$(".subject").forEach(x=>x.classList.remove("active"));b.classList.add("active");subject=b.dataset.subject;$("#selectedSubject").textContent=subject});
$$(".mode").forEach(b=>b.onclick=()=>{$$(".mode").forEach(x=>x.classList.remove("active"));b.classList.add("active");mode=b.dataset.mode});

$("#themeBtn").onclick=()=>document.body.classList.toggle("light");

$("#imageInput").onchange=e=>{
  const f=e.target.files[0]; if(!f)return;
  const r=new FileReader(); r.onload=()=>{imageData=r.result;$("#preview").src=imageData;$("#previewWrap").classList.remove("hidden");$("#dropZone").classList.add("hidden")};r.readAsDataURL(f);
};
$("#removeImage").onclick=()=>{imageData=null;$("#imageInput").value="";$("#previewWrap").classList.add("hidden");$("#dropZone").classList.remove("hidden")};

const demo = {
  summary:`<h3>کورتەی بابەت</h3><div class="key"><b>بابەتەکە چی دەڵێت؟</b><br>سیستەمەکە لەسەر بنەمای وانەکە، گرنگترین بیرۆکەکان بە زمانی سادە دەخاتەڕوو.</div><ul><li>پێناسەی سەرەکی بابەتەکە.</li><li>چەند خاڵی گرنگ کە بۆ تاقیکردنەوە زۆر بەکاردێن.</li><li>پەیوەندی نێوان بیرۆکە سەرەکییەکان.</li></ul>`,
  explain:`<h3>ڕوونکردنەوەی زانستی</h3><div class="key"><b>١. لە سەرەتا:</b><br>بابەتەکە بە وشەی ئاسان دەناسێنین.</div><div class="key"><b>٢. پاشان:</b><br>هۆکار و ئەنجامەکان بە نموونەی ڕۆژانە ڕوون دەکرێنەوە.</div><div class="key"><b>٣. کۆتایی:</b><br>کورتەیەک دەدەین بۆ ئەوەی قوتابی بتوانێت خۆی بابەتەکە بۆ کەسێکی تر بگێڕێتەوە.</div>`,
  practice:`<h3>ڕاهێنان</h3><div class="key"><b>پرسیاری ١:</b> بابەتە سەرەکییەکە چییە؟<br><small>وەڵام: بە وشەی خۆت پێناسەی بکە.</small></div><div class="key"><b>پرسیاری ٢:</b> بۆچی ئەم پرۆسەیە ڕوودەدات؟<br><small>وەڵام: هۆکارە سەرەکییەکە باس بکە.</small></div><div class="key"><b>پرسیاری ٣:</b> نموونەیەکی ڕۆژانە بۆی بنووسە.</div>`
};

$("#analyzeBtn").onclick=async()=>{
  const text=$("#lessonText").value.trim();
  if(!text && !imageData){ alert("تکایە وێنەی وانەکە دابنێ یان دەقی بابەتەکە بنووسە."); return; }
  $("#analyzeBtn").classList.add("hidden");$("#result").classList.add("hidden");$("#loading").classList.remove("hidden");
  try{
    const res=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({subject,mode,text,image:imageData})});
    if(!res.ok) throw new Error("API");
    const data=await res.json();
    $("#resultBody").innerHTML=data.html||demo[mode];
  }catch(e){
    // Demo fallback keeps the interface usable before API deployment.
    $("#resultBody").innerHTML=demo[mode]+`<div class="key">تێبینی: ئەمە پێشبینینی UI ـە. بۆ وەڵامی ڕاستەقینەی AI، server و API key لە README ـدا دانراوە.</div>`;
  }finally{
    $("#loading").classList.add("hidden");$("#result").classList.remove("hidden");$("#analyzeBtn").classList.remove("hidden");
    $("#resultTitle").textContent=mode==="summary"?"کورتەی بابەت":mode==="explain"?"ڕوونکردنەوەی زانستی":"ڕاهێنان و تاقیکردنەوە";
    $("#resultMeta").textContent=subject;
    $("#result").scrollIntoView({behavior:"smooth",block:"start"});
  }
};
$("#copyBtn").onclick=async()=>{await navigator.clipboard.writeText($("#resultBody").innerText);$("#copyBtn").textContent="کۆپی کرا ✓";setTimeout(()=>$("#copyBtn").textContent="کۆپی",1200)};
