import React, { useState, useEffect, useRef } from 'react';
import { 
  BrainCircuit, Network, Play, Pause, MonitorPlay, 
  MessageSquare, Plus, Share2, Mic, Music, Sparkles, 
  ChevronRight, Image as ImageIcon, Send, 
  Volume2, Maximize, CheckCircle2, Loader2, PlayCircle, Settings,
  Brain, X, Check, XCircle, Layers, Box, Cpu, Video, BookOpen,
  Clock3, Trash2, RotateCcw
} from 'lucide-react';

import {validatePlan} from '../shared/plan.js';

const HISTORY_KEY='mindmap-universe-history-v2';
const WRONG_KEY='mindmap-universe-wrong-v2';
const RESULT_KEY='mindmap-universe-quiz-results-v2';
const readSaved=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key));return Array.isArray(value)?value:fallback;}catch{return fallback;}};

const initialSceneNodes = [
  { id: 1, type: 'intro', title: '概念引入', duration: '5s', desc: '经典比特与量子比特对比', img: '/placeholder.svg' },
  { id: 2, type: 'core', title: '叠加态', duration: '8s', desc: '薛定谔的猫粒子级展示', img: '/placeholder.svg' },
  { id: 3, type: 'core', title: '量子纠缠', duration: '12s', desc: '两个粒子跨空间同步状态', img: '/placeholder.svg' },
  { id: 4, type: 'data', title: '算力跃迁', duration: '6s', desc: '算力呈指数级上升折线图', img: '/placeholder.svg' },
  { id: 5, type: 'outro', title: '未来展望', duration: '5s', desc: '赛博朋克风格的未来城市', img: '/placeholder.svg' },
];

const initialQuizCards = [
  { id: 1, q: "经典比特与量子比特最大的区别是什么？", a: "经典比特只能是0或1，而量子比特可以同时处于0和1的叠加态。" },
  { id: 2, q: "什么是量子纠缠？", a: "多个粒子的联合量子态具有特殊关联，但不能用于超光速传递信息。" },
  { id: 3, q: "薛定谔的猫常用来解释量子的什么特性？", a: "量子叠加态。在未观测前，系统同时处于多种状态的概率叠加。" },
];

const WorkspaceTabs = ({ view, setView }) => (
  <div className="flex items-center bg-white/40 border border-white/60 rounded-full p-1 backdrop-blur-xl shadow-[0_4px_15px_rgba(0,0,0,0.05)]">
    <button 
      onClick={() => setView('video')}
      className={`flex items-center gap-2 px-4 py-1.5 whitespace-nowrap rounded-full text-xs font-semibold transition-all duration-500 ${
        view === 'video' 
          ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.6)]' 
          : 'text-slate-500 hover:text-cyan-600'
      }`}
    >
      <Video className="w-4 h-4" /> 视频工作台
    </button>
    <button 
      onClick={() => setView('mindmap')}
      className={`flex items-center gap-2 px-4 py-1.5 whitespace-nowrap rounded-full text-xs font-semibold transition-all duration-500 ${
        view === 'mindmap' 
          ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.6)]' 
          : 'text-slate-500 hover:text-cyan-600'
      }`}
    >
      <Network className="w-4 h-4" /> 知识脑图
    </button>
  </div>
);

const MindMapView=({plan,scenes})=>(
  <div className="w-full max-w-6xl mt-24 mb-10 relative z-20">
    <div className="text-center mb-10">
      <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 border border-cyan-200 px-4 py-2 text-xs font-bold text-cyan-700"><Network className="w-4 h-4"/>知识自动生成脑图</span>
      <h2 className="mt-4 text-3xl font-black text-slate-800">{plan?.video.title||'示例知识结构'}</h2>
      <p className="mt-2 text-sm text-slate-500">{plan?.video.summary||'生成视频方案后，知识会同步整理成可阅读的脑图。'}</p>
    </div>
    <div className="flex justify-center mb-8">
      <div className="relative rounded-3xl bg-gradient-to-r from-cyan-500 to-blue-500 px-10 py-5 text-white font-black shadow-[0_0_30px_rgba(34,211,238,.35)]">
        <BrainCircuit className="inline w-6 h-6 mr-2"/>{plan?.video.title||'核心知识'}
      </div>
    </div>
    <div className="h-8 w-px bg-cyan-300 mx-auto"/>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 relative before:absolute before:-top-0 before:left-[16%] before:right-[16%] before:h-px before:bg-cyan-300">
      {scenes.map(scene=><article key={scene.id} className="relative pt-7">
        <div className="absolute top-0 left-1/2 h-7 w-px bg-cyan-300"/>
        <div className="meta-glass rounded-2xl p-5 h-full border-cyan-100 hover:border-cyan-300 transition-colors">
          <div className="flex gap-3 items-start"><span className="w-8 h-8 shrink-0 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-black">{scene.id}</span><div><h3 className="font-black text-slate-800">{scene.title}</h3><p className="text-xs text-slate-400 mt-1">{scene.duration}</p></div></div>
          <div className="mt-4 space-y-2">{(scene.knowledgeCard?.points||scene.desc.split(' · ')).slice(0,4).map((point,index)=><div key={index} className="flex gap-2 text-sm text-slate-600 bg-white/60 rounded-xl p-3"><span className="mt-1.5 w-2 h-2 shrink-0 rounded-full bg-cyan-400"/><span>{point}</span></div>)}</div>
        </div>
      </article>)}
    </div>
  </div>
);

// Holographic audio waveform
const MiniWaveform = ({ active }) => (
  <div className="flex items-end justify-center gap-[3px] h-4">
    {[...Array(8)].map((_, i) => (
      <div 
        key={i}
        className={`w-[2px] rounded-t-sm transition-all duration-300 ${active ? 'bg-cyan-400 shadow-[0_0_5px_#22d3ee]' : 'bg-slate-300'}`}
        style={{ 
          height: active ? `${Math.random() * 100 + 20}%` : '30%',
          opacity: active ? 1 : 0.5
        }}
      />
    ))}
  </div>
);

export default function App() {
  const [mode, setMode] = useState('image');
  const [workspaceView,setWorkspaceView]=useState('video');
  const [historyProjects,setHistoryProjects]=useState(()=>readSaved(HISTORY_KEY,[]));
  const [currentHistoryId,setCurrentHistoryId]=useState(null);
  const [wrongAnswers,setWrongAnswers]=useState(()=>readSaved(WRONG_KEY,[]));
  const [quizResults,setQuizResults]=useState(()=>readSaved(RESULT_KEY,[]));
  const [showWrongBook,setShowWrongBook]=useState(false);
  const [activeNode, setActiveNode] = useState(2);
  const [isPlaying, setIsPlaying] = useState(false);
  const [subtitles, setSubtitles] = useState(true);

  const [showQuiz, setShowQuiz] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const [plan, setPlan] = useState(null);
  const [renderJob,setRenderJob]=useState(null);
  const renderBusy=renderJob?.status==='running';
  const [prompt, setPrompt] = useState('');
  const [lastPrompt, setLastPrompt] = useState('输入主题，生成你的视频方案。当前画布为示例。');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [provider, setProvider] = useState('');
  const [health, setHealth] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const requestLock = useRef(false);
  const sceneNodes = plan ? plan.scenes.map((scene,i)=>{const rendered=renderJob?.scenes?.find(s=>s.index===scene.index);const seconds=rendered?.duration_seconds||scene.duration_seconds;return {id:scene.index,title:scene.scene_name,duration:`${seconds}s`,seconds,desc:scene.knowledge_card.points.join(' · '),narration:scene.narration,visualPrompt:scene.visual_prompt,knowledgeCard:scene.knowledge_card,img:rendered?.image||initialSceneNodes[i%initialSceneNodes.length].img};}) : initialSceneNodes.map(n=>({...n,seconds:parseInt(n.duration),narration:n.desc}));
  const quizCards = plan ? plan.quiz_cards.map(q=>({id:q.id,q:q.question,a:q.answer})) : initialQuizCards;
  const activeScene = sceneNodes.find(n=>n.id===activeNode)||sceneNodes[0];
  const total = sceneNodes.reduce((n,s)=>n+s.seconds,0);
  const formatTime = n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
  const handleNextCard = ()=>{setIsFlipped(false);setCardIndex(i=>(i+1)%quizCards.length);};
  useEffect(()=>localStorage.setItem(HISTORY_KEY,JSON.stringify(historyProjects)),[historyProjects]);
  useEffect(()=>localStorage.setItem(WRONG_KEY,JSON.stringify(wrongAnswers)),[wrongAnswers]);
  useEffect(()=>localStorage.setItem(RESULT_KEY,JSON.stringify(quizResults)),[quizResults]);
  useEffect(()=>{fetch('/api/health').then(r=>{if(!r.ok)throw Error();return r.json();}).then(setHealth).catch(()=>setHealth({configured:false,unreachable:true}));},[]);
  useEffect(()=>{
    if(!isPlaying)return;
    const timer=setInterval(()=>setElapsed(t=>Math.min(t+1,total)),1000);
    return ()=>clearInterval(timer);
  },[isPlaying,total]);
  useEffect(()=>{
    if(elapsed>=total){setIsPlaying(false);return;}
    let sum=0;
    for(const scene of sceneNodes){sum+=scene.seconds;if(elapsed<sum){setActiveNode(scene.id);break;}}
  },[elapsed,plan]);
  const selectScene=id=>{setActiveNode(id);setElapsed(sceneNodes.slice(0,id-1).reduce((n,s)=>n+s.seconds,0));};
  const togglePlay=()=>{if(elapsed>=total)setElapsed(0);setIsPlaying(v=>!v);};
  const handleGenerate=async()=>{
    if(!prompt.trim()||requestLock.current||renderBusy)return;
    requestLock.current=true;setIsGenerating(true);setGenerationError('');setIsPlaying(false);
    const submitted=prompt.trim();
    try{
      const response=await fetch('/api/generate-video-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:submitted,mode}),signal:AbortSignal.timeout(100000)});
      const result=await response.json().catch(()=>{throw new Error('后端响应异常，请确认服务已启动');});
      if(!response.ok||!result.success)throw new Error(result.error||'生成失败，请重试');
      const next=validatePlan(result.data,mode);
      const historyId=String(Date.now());
      const historyEntry={id:historyId,title:next.video.title,prompt:submitted,mode,createdAt:new Date().toISOString(),plan:next,renderJob:null,provider:result.provider};
      setHistoryProjects(items=>[historyEntry,...items].slice(0,30));setCurrentHistoryId(historyId);
      setPlan(next);setProvider(result.provider);setLastPrompt(submitted);setActiveNode(1);setElapsed(0);setCardIndex(0);setIsFlipped(false);setShowQuiz(false);setPrompt('');setWorkspaceView('video');
      await renderVideo(next,historyId);
    }catch(error){setGenerationError(error.name==='TimeoutError'?'请求超时，请重试':error.message||'无法连接服务，请确认后端已启动');}
    finally{requestLock.current=false;setIsGenerating(false);}
  };
  const renderVideo=async(next,historyId=currentHistoryId)=>{
    if(historyId)setCurrentHistoryId(historyId);
    setRenderJob({status:'running',progress:0,message:'提交视频合成任务',scenes:[]});
    try{const r=await fetch('/api/render-video',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan:next})});const j=await r.json();if(!r.ok)throw Error(j.error);setRenderJob(j.data);}catch(e){setRenderJob({status:'failed',message:e.message});}
  };
  useEffect(()=>{
    if(!renderJob?.id||renderJob.status!=='running')return;
    let cancelled=false;
    const poll=async()=>{try{const r=await fetch('/api/render-video/'+renderJob.id);const j=await r.json();if(!r.ok)throw Error(j.error);if(!cancelled)setRenderJob(j.data);}catch(e){if(!cancelled)setRenderJob(j=>({...j,status:'failed',message:'无法读取合成进度，请刷新后重试'}));}};
    const timer=setInterval(poll,1500);return()=>{cancelled=true;clearInterval(timer);};
  },[renderJob?.id,renderJob?.status]);
  useEffect(()=>{
    if(!currentHistoryId||!renderJob)return;
    setHistoryProjects(items=>items.map(item=>item.id===currentHistoryId?{...item,renderJob}:item));
  },[renderJob,currentHistoryId]);
  const openHistory=item=>{
    setCurrentHistoryId(item.id);setPlan(item.plan);setRenderJob(item.renderJob);setProvider(item.provider||'');setMode(item.mode||'image');
    setLastPrompt(item.prompt);setActiveNode(1);setElapsed(0);setIsPlaying(false);setShowQuiz(false);setWorkspaceView('video');setGenerationError('');
  };
  const removeHistory=(event,id)=>{event.stopPropagation();setHistoryProjects(items=>items.filter(item=>item.id!==id));if(currentHistoryId===id)setCurrentHistoryId(null);};
  const recordAnswer=correct=>{
    if(!plan){handleNextCard();return;}
    const card=quizCards[cardIndex];const title=plan?.video.title||'示例知识测验';
    setQuizResults(items=>[{id:String(Date.now()),question:card.q,correct,title,answeredAt:new Date().toISOString()},...items].slice(0,100));
    if(!correct)setWrongAnswers(items=>items.some(item=>item.question===card.q)?items:[{id:String(Date.now()),question:card.q,answer:card.a,title,createdAt:new Date().toISOString()},...items]);
    handleNextCard();
  };
  const exportPlan=()=>{
    if(!plan)return;
    const url=URL.createObjectURL(new Blob([JSON.stringify(plan,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='video-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  return (
    <div className="font-sans text-slate-800 h-screen w-full flex overflow-hidden relative bg-[#f5f7fa]">
      
      <style dangerouslySetInnerHTML={{__html: `
        /* Warm ambient background with soft radial glow */
        .ambient-bg {
          background: radial-gradient(circle at 50% 30%, #ffffff 0%, #e8edf2 50%, #d1d8e0 100%);
        }
        
        /* 3D Holographic Floor Grid */
        .holo-floor {
          position: absolute;
          bottom: -20%;
          left: -50%;
          width: 200%;
          height: 100%;
          background-image: 
            linear-gradient(rgba(34, 211, 238, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 211, 238, 0.2) 1px, transparent 1px);
          background-size: 60px 60px;
          transform: perspective(1000px) rotateX(75deg);
          transform-origin: top center;
          pointer-events: none;
          z-index: 0;
          mask-image: radial-gradient(ellipse at top, black 20%, transparent 70%);
          -webkit-mask-image: radial-gradient(ellipse at top, black 20%, transparent 70%);
        }

        /* Heavy Glassmorphism Panel */
        .meta-glass {
          background: rgba(255, 255, 255, 0.45);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
        }

        /* Luminous text glow */
        .holo-text-glow {
          text-shadow: 0 0 12px rgba(34, 211, 238, 0.7), 0 0 24px rgba(255, 255, 255, 0.8);
        }

        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34, 211, 238, 0.6); }

        /* 3D Flip Card */
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .flip-card-inner { transition: transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1); }

        /* Floating Animation */
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}} />

      {/* Global Background Layer */}
      <div className="absolute inset-0 ambient-bg z-0"></div>
      <div className="holo-floor"></div>

      {}
      <div className="w-[280px] h-full flex flex-col meta-glass z-10 border-r border-white/60 relative shrink-0">
        
        {/* Brand Header */}
        <div className="p-6 border-b border-white/50 relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="relative group">
              {/* Holographic glowing orb behind icon */}
              <div className="absolute inset-0 bg-cyan-400 rounded-full blur-md opacity-40 group-hover:opacity-70 transition-opacity"></div>
              <div className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-2xl flex items-center justify-center relative border border-white/80 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                <BrainCircuit className="w-6 h-6 text-cyan-500 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
              </div>
            </div>
            <span className="font-black text-xl tracking-wider text-slate-800 relative">
              脑图<span className="text-cyan-500 holo-text-glow font-bold">宇宙</span>
            </span>
          </div>

          <button disabled={isGenerating||renderBusy} onClick={()=>{setPlan(null);setRenderJob(null);setCurrentHistoryId(null);setPrompt('');setElapsed(0);setIsPlaying(false);setGenerationError('');setShowQuiz(false);setCardIndex(0);setWorkspaceView('video');setLastPrompt('输入主题，生成新的视频方案。');}} className="w-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 border border-cyan-200 hover:border-cyan-400 text-cyan-700 text-sm font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_4px_12px_rgba(34,211,238,0.1)] hover:shadow-[0_4px_20px_rgba(34,211,238,0.3)] backdrop-blur-md">
            <Plus className="w-5 h-5" /> 新建知识视频
          </button>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2 flex items-center gap-2">
            <Clock3 className="w-4 h-4 text-cyan-400" /> 生成历史
          </div>
          
          <div className="space-y-3">
            {historyProjects.map((project) => (
              <div 
                key={project.id}
                onClick={() => openHistory(project)}
                className={`relative group cursor-pointer p-4 rounded-2xl transition-all duration-500 bg-white/30 backdrop-blur-sm border ${
                  currentHistoryId===project.id 
                    ? 'border-cyan-300 shadow-[0_4px_20px_rgba(34,211,238,0.15)] bg-gradient-to-br from-white/60 to-cyan-50/40' 
                    : 'border-white/40 hover:border-cyan-200 hover:bg-white/50'
                }`}
              >
                {currentHistoryId===project.id && (
                  <div className="absolute -left-[1px] top-3 bottom-3 w-1.5 bg-cyan-400 rounded-r-full shadow-[0_0_10px_#22d3ee]" />
                )}
                
                <h4 className={`text-sm font-bold truncate mb-2 ${project.active ? 'text-slate-800' : 'text-slate-600 group-hover:text-slate-800'}`}>
                  {project.title}<button onClick={event=>removeHistory(event,project.id)} title="删除记录" className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4"/></button>
                </h4>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Video className={`w-4 h-4 ${currentHistoryId===project.id ? 'text-cyan-500' : 'text-slate-400'}`} />
                    <span className={`font-semibold ${currentHistoryId===project.id ? 'text-cyan-600' : 'text-slate-500'}`}>
                      {project.renderJob?.status==='completed'?'视频已完成':'方案已保存'}
                    </span>
                  </div>
                  <span className="text-slate-400 font-medium">{new Date(project.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            ))}
            {!historyProjects.length&&<div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-xs text-slate-400"><Clock3 className="w-6 h-6 mx-auto mb-2"/>生成第一条视频后会自动保存在这里</div>}
          </div>
          <button onClick={()=>setShowWrongBook(true)} className="mt-6 w-full rounded-xl bg-rose-50 border border-rose-100 p-3 text-sm font-bold text-rose-600 flex items-center justify-center gap-2"><BookOpen className="w-4 h-4"/>错题库 · {wrongAnswers.length} 题</button>
        </div>
      </div>

      {}
      <div className="flex-1 flex flex-col z-10 relative overflow-hidden min-w-0">
        
        {/* Top Header Panel */}
        <div className="min-h-[100px] meta-glass border-b border-white/60 px-6 py-3 flex flex-wrap gap-3 items-center justify-between shrink-0 shadow-sm z-20">
          <div className="flex items-center gap-3 whitespace-nowrap">
            <h2 className="text-base font-black text-slate-800 tracking-wide flex items-center gap-3 max-w-[250px]">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 shadow-[0_0_8px_#22d3ee]"></span>
              </span>
              <span className="truncate" title={plan?.video.title}>{plan?.video.title || '视频方案 · 示例画布'}</span>
            </h2>
            <div className="w-px h-6 bg-slate-300" />
            <WorkspaceTabs view={workspaceView} setView={setWorkspaceView} />
          </div>
          
          <div className="flex items-center gap-3 whitespace-nowrap">
            <label onClick={()=>setSubtitles(v=>!v)} className="flex items-center gap-2 text-sm font-bold text-slate-500 cursor-pointer hover:text-slate-700 transition-colors">
              全息字幕
              <div className={`w-10 h-5 rounded-full relative transition-colors shadow-inner ${subtitles ? 'bg-cyan-200' : 'bg-slate-200'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${subtitles ? 'left-5 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'left-1 shadow-sm'}`} />
              </div>
            </label>
            <div className="w-px h-6 bg-slate-300" />
            <button 
              onClick={() => setShowQuiz(true)}
              className="bg-white/50 hover:bg-white/80 text-cyan-600 border border-white/60 hover:border-cyan-300 text-sm font-bold py-2 px-5 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-sm hover:shadow-[0_4px_15px_rgba(34,211,238,0.2)]"
            >
              <Brain className="w-4 h-4" /> 知识闪卡
            </button>
            <button onClick={()=>setShowWrongBook(true)} className="bg-rose-50/80 hover:bg-rose-100 text-rose-600 border border-rose-100 text-sm font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-all"><BookOpen className="w-4 h-4"/>错题库 {wrongAnswers.length}</button>
            <button onClick={exportPlan} disabled={!plan || isGenerating} className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-sm font-bold py-2 px-5 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-[0_4px_15px_rgba(34,211,238,0.4)] hover:shadow-[0_6px_20px_rgba(34,211,238,0.6)]">
              <Share2 className="w-4 h-4" /> 导出方案 JSON
            </button>
          </div>
        </div>

        {/* Holographic Projection Canvas */}
        <div className="flex-1 relative flex flex-col p-8 overflow-y-auto items-center">
          
          {/* Luminous Tagline */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="bg-white/30 backdrop-blur-md px-8 py-3 rounded-full border border-white/60 shadow-[0_8px_32px_rgba(34,211,238,0.15)] flex items-center justify-center gap-4">
              <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
              <h1 className="text-base md:text-lg font-bold tracking-[0.3em] text-slate-700">
                知识不是线性的，而是<span className="text-cyan-500 holo-text-glow font-black mx-2">网状的</span>
              </h1>
              <Sparkles className="w-5 h-5 text-blue-400 animate-pulse delay-75" />
            </div>
          </div>

          {workspaceView==='mindmap'?<MindMapView plan={plan} scenes={sceneNodes}/>:<>
          {}
          <div className="relative w-full max-w-4xl mt-24 mb-8 shrink-0 z-20">
            {/* Pedestal Shadow/Glow underneath the player */}
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-[80%] h-24 bg-cyan-400/20 rounded-[100%] blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[60%] h-12 bg-white/40 rounded-[100%] border border-cyan-200/50 shadow-[0_0_30px_rgba(34,211,238,0.3)] transform perspective(500px) rotateX(60deg) pointer-events-none"></div>

            <div className={`relative rounded-3xl overflow-hidden bg-white/10 backdrop-blur-2xl border-[2px] transition-colors duration-500 ${
              isPlaying ? 'border-cyan-300 shadow-[0_0_50px_rgba(34,211,238,0.3)]' : 'border-white/50 shadow-[0_20px_50px_rgba(0,0,0,0.1)]'
            }`}>
              
              {/* Glass Frame Top Bar */}
              <div className="absolute top-0 left-0 right-0 h-8 bg-white/20 backdrop-blur-md border-b border-white/30 z-30 flex items-center px-4 justify-between">
                 <div className="flex gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-slate-300 border border-white"></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-slate-300 border border-white"></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 border border-cyan-200 shadow-[0_0_8px_#22d3ee]"></div>
                 </div>
                 <span className="text-[10px] font-bold text-cyan-800/60">知识分镜预览</span>
              </div>

              {renderJob?.status==='completed' && <div className="p-3 pt-10 bg-slate-900"><video key={renderJob.url} src={renderJob.url} controls className="w-full rounded-xl"><track kind="subtitles" src={renderJob.captions} srcLang="zh" label="中文" default/></video><div className="flex gap-4 text-cyan-200 text-sm p-2"><a href={renderJob.url} download="video.mp4">下载 MP4</a><a href={renderJob.subtitles} download="subtitles.srt">下载字幕</a><span>实际时长 {renderJob.duration_seconds} 秒</span></div></div>}
              {/* Video Content */}
              {renderJob?.status!=='completed' && <div className="aspect-[16/9] relative group bg-slate-100 mt-8">
                <img 
                  src={sceneNodes.find(n => n.id === activeNode)?.img} 
                  alt="Video Node"
                  className={`w-full h-full object-cover transition-all duration-1000 ${isPlaying ? 'scale-105 filter-none' : 'opacity-90 grayscale-[15%]'}`}
                />
                
                {/* Bright Hologram Overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400/10 to-blue-500/10 mix-blend-overlay pointer-events-none" />
                
                {/* Subtle Scanlines */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(transparent 50%, #000 50%)', backgroundSize: '100% 4px' }}></div>

                {/* Central Play Button */}
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center z-30">
                    <button 
                      onClick={togglePlay} aria-label="播放分镜预览"
                      className="w-20 h-20 rounded-full bg-white/30 backdrop-blur-xl border border-white shadow-[0_0_30px_rgba(255,255,255,0.6)] flex items-center justify-center text-cyan-600 hover:scale-110 transition-transform duration-300 hover:shadow-[0_0_40px_rgba(34,211,238,0.5)] group-hover:bg-white/40"
                    >
                      <Play className="w-8 h-8 fill-current ml-1" />
                    </button>
                  </div>
                )}

                {/* Subtitles */}
                {subtitles && (
                  <div className="absolute bottom-20 left-0 right-0 text-center px-12 pointer-events-none z-30">
                    <span className="text-slate-800 text-lg tracking-widest font-bold inline-block bg-white/60 px-8 py-2 rounded-xl backdrop-blur-md border border-white/80 shadow-[0_8px_20px_rgba(0,0,0,0.1)]">
                      {activeScene.narration}
                    </span>
                  </div>
                )}

                {/* Bottom Glass Player Bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-white/40 backdrop-blur-lg border-t border-white/50 h-16 px-6 flex items-center gap-6 z-30">
                  <button onClick={togglePlay} aria-label="播放或暂停" className="text-cyan-700 hover:text-cyan-500 transition-colors">
                    {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                  </button>
                  
                  <span className="text-slate-600 font-bold text-sm tabular-nums tracking-wide">{formatTime(elapsed)} / {formatTime(total)}</span>
                  
                  {/* Holographic Timeline */}
                  <div className="flex-1 h-2 bg-white/50 rounded-full cursor-pointer relative group/progress shadow-inner">
                    <div style={{width:`${elapsed/total*100}%`}} className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.6)]">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-white border-2 border-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee] opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  
                  <button disabled title="尚未合成音频" className="text-slate-600 hover:text-cyan-600 transition-colors"><Volume2 className="w-5 h-5" /></button>
                  <button onClick={()=>document.documentElement.requestFullscreen?.()} title="全屏" className="text-slate-600 hover:text-cyan-600 transition-colors"><Maximize className="w-5 h-5" /></button>
                </div>
              </div>}
            </div>
          </div>

          {}
          <section className="w-full max-w-4xl meta-glass rounded-2xl p-5 mb-8 text-sm shrink-0" aria-label="分镜详情">
            <h3 className="font-bold text-cyan-700">{activeScene.title} · {activeScene.duration}</h3>
            <p className="mt-2">{activeScene.narration}</p>
            <h4 className="font-bold mt-3">{activeScene.knowledgeCard?.title || '知识要点'}</h4><p>{activeScene.desc}</p>
            <h4 className="font-bold mt-3">画面生成 Prompt</h4><p className="whitespace-pre-wrap">{activeScene.visualPrompt || '生成后显示详细画面提示词'}</p>
          </section>
          <div className="w-full relative z-20 pb-8">
            <div className="flex items-center justify-center gap-2 mb-6 text-cyan-600 font-bold text-sm tracking-widest uppercase">
              <Network className="w-4 h-4" /> 空间分镜序列
            </div>
            
            <div className="relative w-full max-w-5xl mx-auto flex items-center gap-8 overflow-x-auto py-6">
              {/* Connecting laser line */}
              <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-[2px] bg-cyan-200/50 shadow-[0_0_10px_rgba(34,211,238,0.5)] pointer-events-none z-0"></div>

              {sceneNodes.map((node, index) => (
                <div key={node.id} className="relative z-10 flex flex-col items-center group cursor-pointer shrink-0" onClick={() => selectScene(node.id)}>
                  
                  {/* Floating Data Ring */}
                  <div className={`w-36 aspect-video rounded-xl overflow-hidden relative transition-all duration-500 ${
                    activeNode === node.id 
                      ? 'border-[3px] border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)] -translate-y-4' 
                      : 'border-2 border-white/80 shadow-lg hover:-translate-y-2 hover:border-cyan-200'
                  }`}>
                    {/* Beam projecting down */}
                    {activeNode === node.id && (
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-8 h-8 bg-cyan-400/30 blur-xl pointer-events-none"></div>
                    )}
                    
                    <img src={node.img} alt={node.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-white/10 mix-blend-overlay"></div>
                    
                    {/* Status Dot */}
                    <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-white ${
                      activeNode === node.id ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse' : 'bg-slate-300'
                    }`} />
                  </div>
                  
                  {/* Node Label Platform */}
                  <div className={`mt-4 px-4 py-1.5 rounded-full backdrop-blur-md border transition-all duration-300 flex flex-col items-center ${
                    activeNode === node.id 
                      ? 'bg-white/80 border-cyan-300 shadow-[0_4px_15px_rgba(34,211,238,0.2)]' 
                      : 'bg-white/40 border-white/60 text-slate-600'
                  }`}>
                    <span className={`text-xs font-bold ${activeNode === node.id ? 'text-cyan-700' : 'text-slate-600'}`}>
                      {node.id}. {node.title} · {node.duration}
                    </span>
                    {/* Tiny Waveform indicator */}
                    <div className="mt-1">
                       <MiniWaveform active={isPlaying && activeNode === node.id} />
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
          </>}

        </div>
      </div>

      {}
      <div className="w-[320px] h-full flex flex-col meta-glass z-10 border-l border-white/60 shrink-0 relative bg-white/20">
        
        {/* Chat Header */}
        <div className="h-[72px] flex items-center justify-between px-6 border-b border-white/50 shrink-0 bg-white/30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center border border-cyan-200">
               <Cpu className="w-4 h-4 text-cyan-600" />
            </div>
            <span className="font-bold text-base text-slate-800 tracking-wide">全息构建助手</span>
          </div>
          <button onClick={()=>setGenerationError('API 配置位于服务端 .env；修改后请重启服务')} aria-label="配置说明" className="text-slate-400 hover:text-cyan-600 transition-colors p-2 rounded-full hover:bg-white/50">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          
          {/* User Prompt */}
          <div className="flex flex-col items-end gap-1.5">
             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pr-1">USER_NODE</span>
             <div className="bg-gradient-to-br from-blue-500 to-cyan-500 border border-cyan-300 p-4 rounded-2xl rounded-tr-sm text-sm text-white shadow-[0_4px_15px_rgba(34,211,238,0.3)]">
               {lastPrompt}
             </div>
          </div>

          {/* AI Response Block */}
          <div className="flex flex-col items-start gap-1.5">
             <span className="text-[10px] text-cyan-600 font-bold uppercase tracking-wider pl-1 flex items-center gap-1">
               <Sparkles className="w-3 h-3" /> SYS_AGENT
             </span>
             <div className="w-full bg-white/70 border border-white/80 p-5 rounded-2xl rounded-tl-sm shadow-[0_8px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl">
                <p role="status" className="text-sm leading-relaxed">{isGenerating?'正在生成分镜、旁白和知识测验…':plan?`${provider==='demo'?'离线演示':provider==='deepseek'?'DeepSeek 生成':'GPT 生成'}完成：${sceneNodes.length} 个分镜、${quizCards.length} 道测验。${renderBusy?'正在继续合成视频。':''}`:'输入创作需求后，点击发送生成视频。'}</p>
                <p className="mt-3 text-sm">{plan?.video.summary}</p>
                <p className="mt-3 text-xs text-slate-500">生成方案后自动制作{health?.imageConfigured?'AI 分镜图片':'知识图卡'}、中文配音与轻量配乐，并合成为 MP4。{!health?.imageConfigured&&'配置独立图片 API 后可使用 AI 画面。'}</p>
                {renderJob && <section role="status" className="mt-4 rounded-xl bg-cyan-50 p-3 text-sm"><p>{renderJob.message}</p>{renderBusy && <progress value={renderJob.progress} max="100" className="w-full"/>}{renderJob.warnings?.map(w=><p key={w} className="mt-2 text-amber-700">{w}</p>)}{renderJob.status==='failed' && <button onClick={()=>renderVideo(plan)} className="mt-2 text-cyan-700">重新合成（无需重新生成方案）</button>}{renderJob.status==='completed' && <a className="block mt-2 font-bold text-cyan-700" href={renderJob.url} download="video.mp4">下载视频 MP4</a>}</section>}
                {health && <p className="mt-3 text-xs">{health.unreachable?'后端未连接，请启动服务':health.provider==='demo'?'离线演示模式':health.configured?`${health.provider==='deepseek'?'DeepSeek':'GPT'} 服务已配置`:`请在服务端 .env 配置 ${health.provider==='deepseek'?'DEEPSEEK_API_KEY':'OPENAI_API_KEY'}`}</p>}
                {plan && <section className="mt-4 text-sm space-y-2"><h3 className="font-bold">BGM 建议</h3><p>{plan.bgm.style_tags.join(' · ')}</p><p>{plan.bgm.recommended_type}</p><p>{plan.bgm.description}</p></section>}

             </div>
          </div>
        </div>

        {/* Input Area */}
        {generationError && <div role="alert" className="m-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm">{generationError}。原有画布已保留。</div>}
        <div className="p-5 bg-white/40 border-t border-white/60 shrink-0 backdrop-blur-xl">
          <div className="relative flex items-center group">
            <div className="absolute inset-0 bg-cyan-400/20 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <input
              aria-label="视频创作指令" value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={6000} disabled={isGenerating||renderBusy}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing){e.preventDefault();handleGenerate();}}}
              type="text"
              placeholder="输入视频主题与要求..."
              className="w-full bg-white/80 border border-white shadow-inner rounded-2xl pl-4 pr-12 py-3.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all placeholder:text-slate-400 relative z-10"
            />
            <button onClick={handleGenerate} disabled={isGenerating||renderBusy||!prompt.trim()} aria-label="生成视频" title="生成视频" className="absolute right-2 w-10 h-10 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl flex items-center justify-center transition-all shadow-md hover:shadow-[0_0_15px_rgba(34,211,238,0.5)] z-20">
              {isGenerating?<Loader2 className="w-4 h-4 animate-spin"/>:<Send className="w-4 h-4 ml-0.5"/>}
            </button>
          </div>
        </div>

      </div>

      {}
      {showQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.2)_100%)] pointer-events-none"></div>
          
          <div className="relative w-full max-w-2xl bg-white/80 backdrop-blur-2xl rounded-[2rem] border-2 border-white p-10 shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
            
            {/* Hologram glow behind modal */}
            <div className="absolute -inset-4 bg-cyan-400/20 blur-3xl -z-10 rounded-full"></div>

            <button 
              onClick={() => { setShowQuiz(false); setIsFlipped(false); }}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-full hover:bg-white border border-transparent hover:border-slate-200 shadow-sm"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Header */}
            <div className="flex flex-col items-center mb-10">
              <div className="w-14 h-14 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center mb-4 shadow-[0_4px_15px_rgba(34,211,238,0.2)]">
                <Brain className="w-7 h-7 text-cyan-500" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-wide">全息知识闪卡</h2>
              <p className="text-cyan-600 text-sm mt-2 font-bold">第 {cardIndex+1} / {quizCards.length} 题 · 已记录 {quizResults.length} 次作答</p>
            </div>

            {/* 3D Floating Flashcard */}
            <div 
              className="perspective-1000 w-full max-w-lg h-72 cursor-pointer mb-10 group animate-float" 
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className={`w-full h-full relative transform-style-3d flip-card-inner ${isFlipped ? 'rotate-y-180' : ''}`}>
                
                {/* Front (Question) */}
                <div className="absolute inset-0 backface-hidden bg-white/90 border-2 border-white rounded-3xl flex flex-col items-center justify-center p-8 shadow-[0_10px_30px_rgba(34,211,238,0.15)] group-hover:border-cyan-300 transition-colors">
                  <div className="absolute top-5 left-5 flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_5px_#22d3ee]"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                  </div>
                  <h3 className="text-cyan-600 font-bold text-xs tracking-widest uppercase mb-6 bg-cyan-50 px-5 py-1.5 rounded-full border border-cyan-100">Question</h3>
                  <p className="text-2xl text-slate-800 text-center font-bold leading-relaxed">
                    {quizCards[cardIndex].q}
                  </p>
                  <p className="absolute bottom-6 text-slate-400 font-semibold text-xs animate-pulse">点击全息卡片翻转解析</p>
                </div>

                {/* Back (Answer) */}
                <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-300 rounded-3xl flex flex-col items-center justify-center p-8 shadow-[0_10px_30px_rgba(34,211,238,0.25)] rotate-y-180">
                  <h3 className="text-blue-600 font-bold text-xs tracking-widest uppercase mb-6 bg-white px-5 py-1.5 rounded-full border border-blue-100 shadow-sm">Answer // 解析</h3>
                  <p className="text-xl text-slate-800 text-center font-bold leading-relaxed">
                    {quizCards[cardIndex].a}
                  </p>
                </div>

              </div>
            </div>

            {/* Actions */}
            <div className={`flex items-center gap-5 transition-all duration-500 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
              <button 
                onClick={()=>recordAnswer(false)}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 transition-colors shadow-sm"
              >
                <XCircle className="w-5 h-5" /> 需复习
              </button>
              <button 
                onClick={()=>recordAnswer(true)}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-cyan-500 border border-cyan-400 text-white font-bold hover:bg-cyan-400 hover:shadow-[0_4px_20px_rgba(34,211,238,0.5)] transition-all"
              >
                <Check className="w-5 h-5" /> 已掌握
              </button>
            </div>

            {/* Progress Dots */}
            <div className="flex gap-3 mt-8">
              {quizCards.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    idx === cardIndex ? 'w-8 bg-cyan-500 shadow-[0_0_8px_#22d3ee]' : 'w-2 bg-slate-300'
                  }`} 
                />
              ))}
            </div>

          </div>
        </div>
      )}

      {showWrongBook&&(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-6">
          <div className="relative w-full max-w-3xl max-h-[82vh] overflow-hidden bg-white/95 rounded-[2rem] border border-white shadow-[0_20px_60px_rgba(0,0,0,.18)]">
            <div className="p-7 border-b border-slate-100 flex items-center justify-between">
              <div><h2 className="text-2xl font-black flex items-center gap-3"><BookOpen className="text-rose-500"/>我的错题库</h2><p className="text-sm text-slate-500 mt-1">点击“需复习”的题目会自动保存到这里</p></div>
              <button onClick={()=>setShowWrongBook(false)} className="p-2 rounded-full hover:bg-slate-100"><X className="w-6 h-6"/></button>
            </div>
            <div className="p-7 overflow-y-auto max-h-[65vh] custom-scrollbar space-y-4">
              {wrongAnswers.map((item,index)=><article key={item.id} className="rounded-2xl border border-rose-100 bg-rose-50/40 p-5">
                <div className="flex justify-between gap-4"><div className="flex gap-3"><span className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-black shrink-0">{index+1}</span><div><p className="font-bold text-slate-800">{item.question}</p><p className="mt-3 text-sm text-slate-600"><span className="font-bold text-cyan-700">答案：</span>{item.answer}</p><p className="mt-2 text-xs text-slate-400">来自《{item.title}》 · {new Date(item.createdAt).toLocaleDateString('zh-CN')}</p></div></div><button onClick={()=>setWrongAnswers(items=>items.filter(q=>q.id!==item.id))} title="移出错题库" className="text-slate-400 hover:text-rose-600 self-start"><Trash2 className="w-4 h-4"/></button></div>
              </article>)}
              {!wrongAnswers.length&&<div className="py-16 text-center text-slate-400"><CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-cyan-400"/><p className="font-bold text-slate-600">目前没有错题</p><p className="text-sm mt-2">知识闪卡中选择“需复习”后会保存到这里</p></div>}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
