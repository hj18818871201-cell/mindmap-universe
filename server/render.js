import {mkdir,writeFile,unlink} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import {validatePlan} from '../shared/plan.js';
export const mediaRoot=process.env.MEDIA_ROOT?path.resolve(process.env.MEDIA_ROOT):fileURLToPath(new URL('../media/',import.meta.url));
const jobs=new Map();let active=false;
function run(command,args,timeout=180000){return new Promise((resolve,reject)=>{let output='';const child=spawn(command,args,{stdio:['ignore','ignore','pipe']});const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('媒体处理超时'));},timeout);child.stderr.on('data',b=>{output=(output+b).slice(-12000);});child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('close',code=>{clearTimeout(timer);code===0?resolve(output):reject(new Error(`媒体处理失败：${output.slice(-600)}`));});});}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function lines(s,n=28){return Array.from(s).reduce((a,c,i)=>{if(i%n===0)a.push('');a[a.length-1]+=c;return a;},[]);}
export function sceneSvg(scene,title){const points=scene.knowledge_card.points.slice(0,4);return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><defs><linearGradient id="b" x2="1" y2="1"><stop stop-color="#07172f"/><stop offset="1" stop-color="#114858"/></linearGradient></defs><rect width="1280" height="720" fill="url(#b)"/><g stroke="#4eddeb" opacity=".15">${Array.from({length:22},(_,i)=>`<path d="M${i*64} 0V720 M0 ${i*64}H1280"/>`).join('')}</g><circle cx="1100" cy="150" r="220" fill="none" stroke="#64ddea" opacity=".3"/><g font-family="PingFang SC,Heiti SC,Arial,sans-serif" fill="#eefcff"><text x="65" y="62" font-size="22" fill="#75dce9">${esc(title.slice(0,42))}</text><text x="65" y="137" font-size="40" font-weight="bold">${esc(scene.index+'. '+scene.scene_name.slice(0,25))}</text>${points.map((p,i)=>`<rect x="65" y="${176+i*104}" width="1150" height="92" rx="18" fill="#ffffff" opacity=".07"/>${lines(p,42).slice(0,2).map((l,j)=>`<text x="90" y="${213+i*104+j*32}" font-size="26">${esc(l)}</text>`).join('')}`).join('')}<text x="65" y="682" font-size="18" fill="#75dce9">脑图宇宙 · ${esc(scene.knowledge_card.title.slice(0,48))}</text></g></svg>`;}
function music(seconds){const rate=22050,n=Math.ceil(seconds*rate),buf=Buffer.alloc(44+n*2);buf.write('RIFF');buf.writeUInt32LE(36+n*2,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(1,22);buf.writeUInt32LE(rate,24);buf.writeUInt32LE(rate*2,28);buf.writeUInt16LE(2,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*2,40);const chords=[[261.63,329.63,392],[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66]];for(let i=0;i<n;i++){const t=i/rate,notes=chords[Math.floor(t/4)%4],fade=Math.min(1,t/2,(seconds-t)/2);const v=notes.reduce((a,f)=>a+Math.sin(2*Math.PI*f*t),0)/3*.12*fade;buf.writeInt16LE(Math.round(v*32767),44+i*2);}return buf;}
function stamp(t){return new Date(Math.round(t*1000)).toISOString().slice(11,23).replace('.',',');}
export function effectiveSceneDuration(plannedSeconds,speechSeconds){
 const narrated=Math.max(2,Math.ceil(speechSeconds+.6));
 return Math.max(plannedSeconds,narrated);
}
export function speechRateForTarget(initialSpeechSeconds,plannedSeconds,baseRate=190){
 if(initialSpeechSeconds+.8>=plannedSeconds)return baseRate;
 return Math.max(105,Math.min(baseRate,Math.round(baseRate*initialSpeechSeconds/Math.max(1,plannedSeconds-.6))));
}
async function audioDuration(inputPath){
 const info=await run(ffmpegPath,['-hide_banner','-i',inputPath,'-f','null','-']);
 const match=info.match(/Duration: (\d+):(\d+):([\d.]+)/);
 if(!match)throw new Error('配音时长不可读');
 return Number(match[1])*3600+Number(match[2])*60+Number(match[3]);
}
function ttsProvider(){return process.env.TTS_PROVIDER||(process.platform==='darwin'?'local':'siliconflow');}
async function synthesizeNarration(text,stem,plannedSeconds){
 const provider=ttsProvider();
 if(provider==='local'){
  if(process.platform!=='darwin')throw new Error('云服务器不支持本机语音，请把 TTS_PROVIDER 设置为 siliconflow');
  const textPath=stem+'.txt',audioPath=stem+'.aiff';await writeFile(textPath,text);
  const voice=process.env.LOCAL_TTS_VOICE||'Tingting';
  const configuredRate=Number(process.env.LOCAL_TTS_RATE||190);const baseRate=Number.isFinite(configuredRate)?configuredRate:190;
  const synthesize=rate=>run('/usr/bin/say',['-v',voice,'-r',String(rate),'-f',textPath,'-o',audioPath]);
  await synthesize(baseRate);let speech=await audioDuration(audioPath);const adjusted=speechRateForTarget(speech,plannedSeconds,baseRate);
  if(adjusted<baseRate){await synthesize(adjusted);speech=await audioDuration(audioPath);}
  return {audioPath,speech};
 }
 if(provider!=='siliconflow')throw new Error('TTS_PROVIDER 只能是 local 或 siliconflow');
 const apiKey=process.env.TTS_API_KEY||process.env.IMAGE_API_KEY;
 if(!apiKey)throw new Error('云端配音缺少 TTS_API_KEY（也可复用 IMAGE_API_KEY）');
 const model=process.env.TTS_MODEL||'FunAudioLLM/CosyVoice2-0.5B';
 const voice=process.env.TTS_VOICE||`${model}:anna`;
 const naturalSeconds=Math.max(1,Array.from(text).length/5);
 const speed=Math.max(.5,Math.min(1.35,naturalSeconds/Math.max(1,plannedSeconds-.6)));
 const base=(process.env.TTS_API_BASE_URL||process.env.IMAGE_API_BASE_URL||'https://api.siliconflow.cn/v1').replace(/\/$/,'');
 const response=await fetch(`${base}/audio/speech`,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model,input:text,voice,response_format:'mp3',speed:Number(speed.toFixed(2)),gain:-2}),signal:AbortSignal.timeout(120000)});
 if(!response.ok){const detail=await response.text().catch(()=>'');throw new Error(`SiliconFlow 配音失败（${response.status}）${detail?'：'+detail.slice(0,120):''}`);}
 const audioPath=stem+'.mp3';await writeFile(audioPath,Buffer.from(await response.arrayBuffer()));
 return {audioPath,speech:await audioDuration(audioPath)};
}
export function motionFilter(mode,index,duration){
 const frames=Math.max(1,Math.ceil(duration*25));
 const zoom=mode==='html'?'0.0012':'0.0007';
 const maxZoom=mode==='html'?'1.14':'1.09';
 const x=index%2===0?`(iw-iw/zoom)*on/${frames}`:`(iw-iw/zoom)*(1-on/${frames})`;
 return `scale=1440:810,zoompan=z='min(zoom+${zoom},${maxZoom})':x='${x}':y='ih/2-ih/zoom/2':d=1:s=1280x720:fps=25,format=yuv420p`;
}
export function getJob(id){return jobs.get(id);}
export function imageGenerationConfigured(){return Boolean(process.env.IMAGE_API_KEY);}
export async function generateSceneImage(scene,plan,target,{downloadImage}={}){
 const apiKey=process.env.IMAGE_API_KEY;
 if(!apiKey){await sharp(Buffer.from(sceneSvg(scene,plan.video.title))).png().toFile(target);return 'knowledge-card';}
 const base=(process.env.IMAGE_API_BASE_URL||'https://api.siliconflow.cn/v1').replace(/\/$/,'');
 const response=await fetch(`${base}/images/generations`,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.IMAGE_MODEL||'Qwen/Qwen-Image',prompt:`${scene.visual_prompt}\n16:9 cinematic educational visual, holographic future city style, cyan and deep blue palette, clean composition, no logo, no watermark, no readable text.`,negative_prompt:'watermark, logo, distorted text, blurry, low quality',image_size:'1664x928',batch_size:1,num_inference_steps:20,guidance_scale:7.5}),signal:AbortSignal.timeout(120000)});
 if(!response.ok){
  const messages={401:'SiliconFlow 图片 API Key 无效',402:'SiliconFlow 图片账户余额不足，请在 SiliconFlow 充值',403:'SiliconFlow 当前模型权限不足，请检查实名认证或模型权限',429:'SiliconFlow 图片请求过于频繁，请稍后重试'};
  const failure=Object.assign(new Error(messages[response.status]||`图片服务返回 ${response.status}`),{imageFatal:[401,402,403].includes(response.status),status:response.status});
  throw failure;
 }
 const data=await response.json();const url=data.images?.[0]?.url;
 if(typeof url!=='string'||!url.startsWith('https://'))throw new Error('图片服务没有返回有效图片');
 const download=target+'.download';
 try{
  if(downloadImage)await downloadImage(url,download);
  else await run('/usr/bin/curl',['--fail','--location','--silent','--show-error','--retry','2','--retry-delay','2','--retry-all-errors','--max-time','120','--max-filesize','20971520','--output',download,url],130000);
  await sharp(download).resize(1280,720,{fit:'cover'}).png().toFile(target);
 }finally{await unlink(download).catch(()=>{});}
 return 'siliconflow';
}
export function startRender(data){
 const plan=validatePlan(data,data?.video?.mode);
 if(plan.video.total_duration_seconds>600||plan.scenes.some(s=>s.narration.length>1200))throw Object.assign(new Error('本地成片暂支持10分钟以内，单分镜旁白不超过1200字'),{status:400});
 if(active)throw Object.assign(new Error('已有视频正在合成，请稍候'),{status:429});
 if(!imageGenerationConfigured())throw Object.assign(new Error('缺少 SiliconFlow IMAGE_API_KEY，AI 图片为必需项，已停止成片'),{status:503});
 if(ttsProvider()==='local'&&process.platform!=='darwin')throw Object.assign(new Error('云服务器请把 TTS_PROVIDER 设置为 siliconflow'),{status:503});
 if(ttsProvider()==='siliconflow'&&!(process.env.TTS_API_KEY||process.env.IMAGE_API_KEY))throw Object.assign(new Error('云端配音缺少 TTS_API_KEY（也可复用 IMAGE_API_KEY）'),{status:503});
 if(!ffmpegPath||!existsSync(ffmpegPath))throw Object.assign(new Error('FFmpeg 未安装完成，请运行 npm install 并允许 ffmpeg-static 安装脚本'),{status:503});
 const id=randomUUID(),job={id,status:'running',progress:0,message:'准备成片',scenes:[],imageProvider:'siliconflow',warnings:[]};jobs.set(id,job);active=true;
 render(plan,job).catch(error=>{job.status='failed';job.message=`成片失败：${error.message||'请检查语音与 FFmpeg 配置'}`;}).finally(()=>{active=false;});return job;
}
async function render(plan,job){
 const dir=path.join(mediaRoot,job.id);await mkdir(dir,{recursive:true});let total=0;const subtitles=[];
 for(const [i,scene] of plan.scenes.entries()){
  job.message=`生成分镜 ${i+1}/${plan.scenes.length} 的图像与旁白`;job.progress=Math.round(i/plan.scenes.length*80);
  const stem=path.join(dir,`scene-${i+1}`);
  try{await generateSceneImage(scene,plan,stem+'.png');}
  catch(error){throw new Error(`${error.message}；AI 图片为必需项，本次没有生成不完整视频`);}
  const {audioPath,speech}=await synthesizeNarration(scene.narration,stem,scene.duration_seconds);
  const duration=effectiveSceneDuration(scene.duration_seconds,speech);
  // Preserve the requested plan duration, keep narration complete, and animate every still image.
  const vf=motionFilter(plan.video.mode,i,duration);
  await run(ffmpegPath,['-y','-loop','1','-framerate','25','-i',stem+'.png','-i',audioPath,'-vf',vf,'-af','apad','-t',String(duration),'-c:v','libx264','-preset','ultrafast','-crf','23','-c:a','aac','-ar','44100','-ac','2',stem+'.mp4']);
  const chunks=lines(scene.narration,32);chunks.forEach((line,j)=>subtitles.push(`${subtitles.length+1}\n${stamp(total+j*speech/chunks.length)} --> ${stamp(total+(j+1)*speech/chunks.length)}\n${line}\n`));
  job.scenes.push({index:scene.index,image:`/media/${job.id}/scene-${i+1}.png`,duration_seconds:duration});total+=duration;
  job.progress=Math.round((i+1)/plan.scenes.length*80);
 }
 job.message='混合旁白与配乐，封装 MP4';job.progress=85;
 const concatPath=path.join(dir,'concat.txt'),subtitlePath=path.join(dir,'subtitles.srt');
 await writeFile(concatPath,plan.scenes.map((_,i)=>`file 'scene-${i+1}.mp4'`).join('\n'));await writeFile(subtitlePath,subtitles.join('\n'));await writeFile(path.join(dir,'subtitles.vtt'),'WEBVTT\n\n'+subtitles.join('\n').replaceAll(',', '.'));await writeFile(path.join(dir,'bgm.wav'),music(total));
 const subtitleStyle='FontName=PingFang SC,FontSize=24,PrimaryColour=&H00FFFFFF,BackColour=&H80000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=42,Alignment=2';
 const filters=`[0:v]subtitles=filename='${subtitlePath}':force_style='${subtitleStyle}'[video];[0:a]loudnorm=I=-19:TP=-2:LRA=11[voice];[1:a]volume=0.16[bgm];[voice][bgm]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[out]`;
 await run(ffmpegPath,['-y','-f','concat','-safe','1','-i',concatPath,'-i',path.join(dir,'bgm.wav'),'-i',subtitlePath,'-filter_complex',filters,'-map','[video]','-map','[out]','-map','2:s','-c:v','libx264','-preset','veryfast','-crf','21','-c:a','aac','-ar','48000','-c:s','mov_text','-metadata:s:s:0','language=zho','-t',String(total),'-movflags','+faststart',path.join(dir,'video.mp4')]);
 await writeFile(path.join(dir,'plan.json'),JSON.stringify(plan,null,2));job.status='completed';job.progress=100;job.message=`视频已完成，包含${job.imageProvider==='siliconflow'?'AI 分镜图片':'知识图卡'}、清晰中文配音、配乐和画面字幕`;job.url=`/media/${job.id}/video.mp4`;job.subtitles=`/media/${job.id}/subtitles.srt`;job.captions=`/media/${job.id}/subtitles.vtt`;job.duration_seconds=total;await writeFile(path.join(dir,'result.json'),JSON.stringify(job));
}
