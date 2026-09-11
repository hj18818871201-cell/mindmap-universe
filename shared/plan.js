import {z} from 'zod';
const text=z.string().trim().min(1).max(6000);
export const PlanSchema=z.object({
 video:z.object({title:text,summary:text,mode:z.enum(['image','html']),total_duration_seconds:z.number().int().min(1).max(7200)}).strict(),
 scenes:z.array(z.object({index:z.number().int().min(1),scene_name:text,duration_seconds:z.number().int().min(1).max(600),visual_prompt:text,narration:text,knowledge_card:z.object({title:text,points:z.array(text).min(1).max(8)}).strict()}).strict()).min(1).max(12),
 bgm:z.object({style_tags:z.array(text).min(1).max(8),recommended_type:text,description:text}).strict(),
 quiz_cards:z.array(z.object({id:text,question:text,answer:text}).strict()).min(3).max(5)
}).strict();
export function validatePlan(data,mode){
 const plan=PlanSchema.parse(data);
 if(plan.video.mode!==mode)throw new Error('生成模式不匹配');
 if(plan.scenes.some((s,i)=>s.index!==i+1))throw new Error('分镜序号必须从 1 连续排列');
 if(new Set(plan.quiz_cards.map(q=>q.id)).size!==plan.quiz_cards.length)throw new Error('测验 ID 重复');
 if(plan.video.total_duration_seconds!==plan.scenes.reduce((n,s)=>n+s.duration_seconds,0))throw new Error('总时长与分镜时长不一致');
 return plan;
}
export function demoPlan(prompt,mode){return {video:{title:'演示：'+prompt.slice(0,24),summary:'这是离线示例，用于验证画布更新；未调用 GPT。',mode,total_duration_seconds:15},scenes:['主题引入','核心概念','回顾总结'].map((name,i)=>({index:i+1,scene_name:name,duration_seconds:5,visual_prompt:`${mode==='html'?'节点网络与文字动画':'全息风格插画'}：${prompt}，${name}`,narration:`这是关于“${prompt}”的${name}演示。`,knowledge_card:{title:name,points:['此处将显示 GPT 根据主题生成的知识要点']}})),bgm:{style_tags:['轻柔','环境音乐'],recommended_type:'低音量电子氛围',description:'演示建议：避免遮盖旁白。'},quiz_cards:[1,2,3].map(i=>({id:`q${i}`,question:`演示问题 ${i}：本片的主题是什么？`,answer:prompt}))};}
