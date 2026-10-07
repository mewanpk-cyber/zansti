// Zansti AI backend
// Node.js 18+
// API key stays on the server; never put it in app.js.
import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();
const app=express();
const __dirname=path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({limit:"12mb"}));
app.use(express.static(__dirname));

const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
const model=process.env.OPENAI_MODEL || "gpt-6-luna";

// Demo license store: 100 users. For production, replace with a database.
// Each account can be bound to ONE browser/device ID.
const users = JSON.parse(process.env.ZANSTI_USERS_JSON || "[]");
if(users.length===0){
  try { users.push(...JSON.parse(fs.readFileSync(new URL("./users.json", import.meta.url),"utf8"))); } catch {}
}
const sessions = new Map();
const hash = s => crypto.createHash("sha256").update(s).digest("hex");
const getUser = username => users.find(u => u.username === username);
function auth(req,res,next){
  const token=(req.headers.authorization||"").replace(/^Bearer\s+/i,"");
  const s=sessions.get(token);
  if(!s) return res.status(401).json({error:"unauthorized"});
  req.user=s.username; next();
}

app.post("/api/login",(req,res)=>{
  const {username,password,deviceId}=req.body||{};
  const u=getUser(username);
  if(!u || hash(password)!==u.passwordHash) return res.status(401).json({error:"invalid_credentials"});
  if(!deviceId) return res.status(400).json({error:"device_required"});
  if(u.deviceId && u.deviceId!==deviceId) return res.status(403).json({error:"device_bound"});
  if(!u.deviceId) u.deviceId=deviceId;
  const token=crypto.randomBytes(32).toString("hex");
  sessions.set(token,{username:u.username,created:Date.now()});
  res.json({token});
});
app.get("/api/me",auth,(req,res)=>res.json({username:req.user}));



const prompts={
 summary:"لە وێنە/دەقی وانەکە، تەنها گرنگترین خاڵەکان بە کوردی سۆرانی و بە شێوەی قوتابی ڕوون بکەوە. پێناسە، خاڵە گرنگەکان و ئەو شتانەی بۆ تاقیکردنەوە گرنگن جیا بکەوە.",
 explain:"وانەکە وەک مامۆستایەکی زۆر باش بە کوردی سۆرانی ڕوون بکەوە. لە ئاسانەوە بۆ قووڵتر بچۆ، هۆکار و ئەنجام و نموونەی ڕۆژانە بدە. هەر هەنگاوێک کورت و ڕوون بێت.",
 practice:"لەسەر هەمان وانە، 5 پرسیاری ڕاهێنان دروست بکە: 2 ئاسان، 2 مامناوەند، 1 چالاک. لە کۆتایی وەڵامی دروست و کورت بدە."
};

app.post("/api/analyze",auth,async(req,res)=>{
  try{
    const {subject,mode,text,image}=req.body||{};
    if(!subject || !prompts[mode]) return res.status(400).json({error:"invalid input"});
    const content=[{type:"input_text",text:`بابەت: ${subject}\n\n${prompts[mode]}\n\nدەقی بەکارهێنەر:\n${text||"نییە"}\n\nتەنها ئەنجامەکە بە HTML ـی سادە بنووسە؛ <h3>, <p>, <ul>, <li>, <div class="key"> بەکاربهێنە. هیچ <html> یان markdown ـێک مەنووسە.`}];
    if(image) content.push({type:"input_image",image_url:image,detail:"high"});
    const response=await client.responses.create({model,input:[{role:"user",content}]});
    res.json({html:response.output_text});
  }catch(err){
    console.error(err);
    res.status(500).json({error:"AI request failed"});
  }
});

const port=process.env.PORT||3000;
app.listen(port,()=>console.log(`Zansti AI running on http://localhost:${port}`));
