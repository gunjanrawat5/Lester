import 'dotenv/config';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const key=process.env.FISH_API_KEY?.trim();
if(!key)throw new Error('Set FISH_API_KEY in the local .env file.');
const apply=process.argv.includes('--apply');
async function api(path,method='GET',body){
 const response=await fetch(`https://api.fish.audio/v1/agent${path}`,{method,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error(`Fish ${method} ${path} returned HTTP ${response.status}. No credentials logged.`);
 return response.json();
}
const definitions=[
 {id:'e8434f5b6cc646c4b426c07d01ebfd72',label:'Bond',file:'bond',doc:'Fish_Bond_Agent_Setup.md'},
 {id:'50a6c83da0584763bc7662f6908454a3',label:'Security Guard',file:'guard',doc:'Fish_Guard_Agent_Setup.md'},
];
const library=[];let cursor;
do{const page=await api(`/tools${cursor?`?cursor=${encodeURIComponent(cursor)}`:''}`);library.push(...page.tools);cursor=page.has_more?page.next_cursor:undefined;}while(cursor);
const plans=[];
for(const agent of definitions){
 const config=await api(`/agents/${agent.id}/config`);
 const declaration=JSON.parse(await readFile(new URL(`../docs/${agent.file}-client-tool.json`,import.meta.url),'utf8'));
 const doc=await readFile(new URL(`../docs/${agent.doc}`,import.meta.url),'utf8');
 const instructions=agent.file==='bond'?doc.match(/^> (.+)$/m)?.[1]:doc.match(/```text\n([\s\S]*?)\n```/)?.[1];
 if(!instructions)throw new Error(`Missing gameplay prompt for ${agent.label}`);
 const marker='[OPERATION GLASSHOUSE GAMEPLAY]';
 const existing=config.prompt.system_prompt??'';
 const base=existing.split(marker)[0].trimEnd();
 const systemPrompt=`${base}\n\n${marker}\n${instructions}`;
 const tool=library.find(t=>t.name===declaration.name&&t.tool_type==='client');
 plans.push({agent,config,declaration,tool,systemPrompt});
 console.log(`${agent.label}: ${tool?'update':'create'} ${declaration.name}, attach alongside ${config.tools.tool_ids.length} existing tools; add gameplay instructions; publish.`);
}
if(!apply){console.log('Review only. Pass --apply to configure and publish both agents.');process.exit(0);}
const backup=await mkdtemp(join(tmpdir(),'q-fish-agents-'));
for(const plan of plans){
 const {agent,config,declaration,systemPrompt}=plan;
 await writeFile(join(backup,`${agent.file}-config-before.json`),JSON.stringify(config,null,2),{mode:0o600});
 const {tool_type,...update}=declaration;
 const tool=plan.tool?await api(`/tools/${plan.tool.tool_id}`,'PATCH',update):await api('/tools','POST',declaration);
 const ids=[...new Set([...config.tools.tool_ids,tool.tool_id])];
 await api(`/agents/${agent.id}/config`,'PATCH',{tools:{enabled:true,tool_ids:ids},prompt:{system_prompt:systemPrompt}});
 const verified=await api(`/agents/${agent.id}/config`);
 if(!verified.tools.tool_ids.includes(tool.tool_id)||verified.prompt.system_prompt!==systemPrompt)throw new Error(`${agent.label} configuration verification failed. Not publishing.`);
 const published=await api(`/agents/${agent.id}/publish`,'POST',{version_title:'Operation Glasshouse gameplay tools',version_description:`Attach ${declaration.name} client tool and engine-authoritative gameplay instructions.`});
 console.log(`${agent.label}: published version ${published.version_number}; tool ${declaration.name} attached.`);
}
console.log(`Previous configurations saved privately in ${backup}`);
