import express from 'express';
import {startRender,getJob,mediaRoot,imageGenerationConfigured} from './render.js';
import OpenAI from 'openai';
import {zodTextFormat} from 'openai/helpers/zod';
import {PlanSchema,validatePlan,demoPlan} from '../shared/plan.js';
import {fileURLToPath} from 'node:url';
const error=(message,status=502)=>Object.assign(new Error(message),{status});
export function createApp({provider=process.env.AI_PROVIDER||'openai',apiKey=provider==='deepseek'?process.env.DEEPSEEK_API_KEY:process.env.OPENAI_API_KEY,model=provider==='deepseek'?(process.env.DEEPSEEK_MODEL||'deepseek-flash'):(process.env.OPENAI_MODEL||'gpt-4o-2024-08-06'),demo=process.env.DEMO_MODE==='true',client,timeout=90000}={}){
 if(!['openai','deepseek'].includes(provider))throw new Error('AI_PROVIDER 必须为 openai 或 deepseek');
 const providerName=provider==='deepseek'?'DeepSeek':'OpenAI';
 const keyName=provider==='deepseek'?'DEEPSEEK_API_KEY':'OPENAI_API_KEY';
 const app=express();let busy=false;
 const ai=client||(apiKey?new OpenAI({apiKey,timeout,maxRetries:0,baseURL:provider==='deepseek'?'https://api.deepseek.com':'https://api.openai.com/v1'}):null);
 app.disable('x-powered-by');
 app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');const origin=req.get('origin');let allowed=!origin||['http://127.0.0.1:5173','http://localhost:5173'].includes(origin);try{allowed=allowed||new URL(origin).host===req.get('host');}catch{}if(!allowed)return res.status(403).json({success:false,error:'请求来源不允许'});next();});
 app.use(express.json({limit:'256kb'}));
 app.get('/api/health',(_req,res)=>res.json({status:'ok',provider:demo?'demo':provider,configured:demo||Boolean(ai),model,imageProvider:imageGenerationConfigured()?'siliconflow':'knowledge-card',imageConfigured:imageGenerationConfigured()}));
 app.post('/api/generate-video-plan',async(req,res)=>{
  const {prompt,mode}=req.body||{};
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>6000||!['image','html'].includes(mode))return res.status(400).json({success:false,error:'请输入 1–6000 字的 Prompt，并选择 image 或 html 模式'});
  if(busy)return res.status(429).json({success:false,error:'正在生成，请等待当前请求完成后重试'});
  if(!demo&&!ai)return res.status(503).json({success:false,error:`尚未配置服务端 ${keyName}，请填写项目 .env 并重启服务`});
  busy=true;
  try{
   let plan;
   if(demo)plan=demoPlan(prompt.trim(),mode);
   else{
    const instructions=`你是知识视频导演。用中文根据用户需求生成完整视频方案，通常4–8个分镜，每个包含详细画面提示、口语旁白、知识卡片。当前模式必须为 ${mode}。image 模式描述主体、环境、镜头、光影和构图；html 模式描述可实现的文字、图表和节点动画，不输出可执行代码。分镜序号从1连续排列，整数秒时长之和必须等于总时长。如果用户指定总时长，total_duration_seconds 必须与用户要求完全一致，各分镜 duration_seconds 之和也必须等于该时长。每段旁白应按每秒约5个中文字符匹配该分镜时长（例如30秒约150个中文字符），内容连续、自然、有信息量，持续讲解到分镜结束前约1秒，禁止用停顿或重复内容凑时长。生成3–5道基于实际内容的问答，ID唯一。BGM提供风格与理由，音量不遮盖旁白。不要宣称已生成图像、配音或视频文件。`;
    if(provider==='deepseek'){
     const schema=zodTextFormat(PlanSchema,'video_plan').schema;
     const response=await ai.chat.completions.create({model,messages:[{role:'system',content:instructions+' 只返回一个 JSON 对象，不输出 Markdown。必须满足以下 JSON Schema：'+JSON.stringify(schema)},{role:'user',content:prompt.trim()}],response_format:{type:'json_object'},thinking:{type:'disabled'},max_tokens:8192,stream:false},{signal:AbortSignal.timeout(timeout)});
     const choice=response.choices?.[0];
     if(choice?.finish_reason==='content_filter'||choice?.message?.refusal)throw error('模型无法处理此请求，请修改主题后重试',422);
     if(choice?.finish_reason!=='stop'||!choice.message?.content?.trim())throw error('DeepSeek 输出未完成或为空，请缩短需求后重试');
     try{plan=JSON.parse(choice.message.content);}catch{throw error('DeepSeek 返回了无效 JSON，请重试');}
    }else{
     const response=await ai.responses.parse({model,store:false,max_output_tokens:10000,instructions,input:prompt.trim(),text:{format:zodTextFormat(PlanSchema,'video_plan')}},{signal:AbortSignal.timeout(timeout)});
    if(response.output?.some(item=>item.type==='message'&&item.content?.some(c=>c.type==='refusal')))throw error('模型无法处理此请求，请修改主题后重试',422);
    if(response.status!=='completed'||!response.output_parsed)throw error('AI 输出未完成，请缩短需求后重试');
    plan=response.output_parsed;
    }
   }
   try{plan=validatePlan(plan,mode);}catch{throw error('AI 返回的数据不符合视频方案要求，请重试');}
   res.json({success:true,data:plan,provider:demo?'demo':provider});
  }catch(e){
   let status=e.status||502;let message=e.message;
   if(e.name==='TimeoutError'||e.name==='APIConnectionTimeoutError'||e.name==='AbortError'){status=504;message='生成超时，请重试';}
   else if(e instanceof OpenAI.APIError){message=status===401?`${providerName} API Key 无效，请检查服务端配置`:status===402||e.type==='insufficient_quota'?`${providerName} API 余额不足，请充值后重试`:status===429?`${providerName} 请求过多或额度不足，请检查账户后重试`:`${providerName} 服务请求失败，请检查模型配置或稍后重试`;status=[402,429].includes(status)?status:502;}
   else if(!e.status){status=502;message='无法连接 AI 服务，请检查服务端网络后重试';}
   res.status(status>=400&&status<=599?status:502).json({success:false,error:message});
  }finally{busy=false;}
 });
 app.post('/api/render-video',(req,res)=>{try{res.status(202).json({success:true,data:startRender(req.body?.plan)});}catch(e){res.status(e.status||400).json({success:false,error:e.status?e.message:'视频方案无效'});}});
 app.get('/api/render-video/:id',(req,res)=>{const job=getJob(req.params.id);return job?res.json({success:true,data:job}):res.status(404).json({success:false,error:'合成任务不存在，请重新合成'});});
 app.use('/media',express.static(mediaRoot,{dotfiles:'deny',index:false}));
 app.use('/api',(_req,res)=>res.status(404).json({success:false,error:'接口不存在'}));
 app.use(express.static(fileURLToPath(new URL('../dist',import.meta.url))));
 app.use((err,_req,res,_next)=>res.status(err.status===413?413:400).json({success:false,error:err.status===413?'请求内容过长':'请求 JSON 格式错误'}));
 return app;
}
