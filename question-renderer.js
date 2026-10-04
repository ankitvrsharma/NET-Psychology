(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clean=value=>String(value??'').replace(/\r/g,'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/&nbsp;/gi,' ').replace(/Tap\s+to\s+check\s+answer\s+key/gi,' ').replace(/\s+-\s+/g,'-').replace(/\s*\*\s*/g,' × ').replace(/[ \t]{2,}/g,' ').replace(/\n{3,}/g,'\n\n').trim();
const stripTail=value=>{let t=clean(value);t=t.replace(/\s+\d+\s*\.?\s*Codes?\s*:\s*[\s\S]*$/i,'');t=t.replace(/\s+Codes?\s*:\s*[\s\S]*$/i,'');return t.trim()};
const markers=value=>{
 const text=clean(value),hits=[],re=/(?<!\S)([a-d]|[1-4]|i{1,3}|iv|v)\s*[.)]+\s+/gi;let m;
 while((m=re.exec(text)))hits.push({label:m[1].toLowerCase(),start:m.index,end:re.lastIndex});
 return hits.map((h,i)=>({label:h.label,text:text.slice(h.end,i+1<hits.length?hits[i+1].start:text.length).trim()})).filter(x=>x.text);
};
const matchLists=value=>{
 const raw=clean(value),lh=/\bList\s*[-–—]?\s*I\b/i.exec(raw),rh=/\bList\s*[-–—]?\s*II\b/i.exec(raw);
 if(!lh||!rh||rh.index<=lh.index)return{raw,left:[],right:[],hasLeft:!!lh,hasRight:!!rh};
 const cut=x=>x.split(/\bChoose\s+the\s+correct\s+answer\b/i)[0].split(/\bCodes?\s*:/i)[0].trim();
 return{raw,left:markers(cut(raw.slice(lh.index+lh[0].length,rh.index))),right:markers(cut(raw.slice(rh.index+rh[0].length))),hasLeft:true,hasRight:true};
};
const listHTML=items=>items.map(x=>'<div class="structured-item"><span class="structured-item-label">'+esc(x.label)+'.</span><span>'+esc(x.text)+'</span></div>').join('');
const matchHTML=q=>{
 const raw=clean(q?.question||q?.q||''),p=matchLists(raw);
 if(!p.hasLeft||!p.hasRight||p.left.length<4||p.right.length<4)return '<div class="question-stem match-stem"><p>'+esc(stripTail(raw))+'</p></div>';
 const stem=stripTail(raw).replace(/^[\s\S]*?(?:match(?:\s+the\s+following)?|match)\s+list\s*[-–—]?\s*i\b[\s\S]*?List\s*[-–—]?\s*II\b/i,'').trim();
 return '<div class="question-stem match-stem">'+(stem?'<p>'+esc(stem)+'</p>':'')+'<div class="matching-lists"><section><div class="matching-label">LIST I</div><div class="matching-items">'+listHTML(p.left)+'</div></section><section><div class="matching-label">LIST II</div><div class="matching-items">'+listHTML(p.right)+'</div></section></div></div>';
};
const assertionHTML=q=>{
 const raw=clean(q?.question||q?.q||''),a=(raw.match(/Assertion\s*\(A\)\s*:\s*([\s\S]*?)(?=\s+Reason\s*\(R\)|\s+\d+\s*\.?\s*Reason\s*\(R\))/i)||[])[1]||'',r=(raw.match(/Reason\s*\(R\)\s*:\s*([\s\S]*?)(?=\s+\d+\s*\.?\s*Codes?\s*:|\s+Codes?\s*:|$)/i)||[])[1]||'',stem=raw.split(/Assertion\s*\(A\)\s*:/i)[0].replace(/[\s:–-]+$/,'').replace(/\s+\d+\s*\.?\s*$/,'').trim();
 return '<div class="question-stem assertion-stem">'+(stem?'<p>'+esc(stem)+'</p>':'')+'<div class="assertion-reason-grid"><section><span class="statement-label">A</span><div><b>Assertion</b><p>'+esc(a||'Assertion statement')+'</p></div></section><section><span class="statement-label">R</span><div><b>Reason</b><p>'+esc(r||'Reason statement')+'</p></div></section></div></div>';
};
const structured=q=>{
 const kind=q?.kind||'direct',raw=clean(q?.question||q?.q||'');
 if(kind==='match')return matchHTML(q);
 if(kind==='assertion-reason')return assertionHTML(q);
 if(kind==='sequence'||kind==='statement-set'){
  const body=raw.split(/\bCodes?\s*:/i)[0],items=markers(body),preferred=items.filter(x=>/^\d+$/.test(x.label)||/^(?:[a-d]|i{1,3}|iv|v)$/i.test(x.label));
  let stem=body;
  if(preferred.length){const re=new RegExp('(?<!\\S)'+preferred[0].label+'\\s*[.)]+\\s+','i'),idx=body.search(re);if(idx>=0)stem=body.slice(0,idx)}
  const cleanStem=stem.replace(/\s*:\s*$/,'').trim();
  return '<div class="question-stem structured-stem">'+(cleanStem?'<p>'+esc(cleanStem)+'</p>':'')+(preferred.length?'<div class="question-items">'+listHTML(preferred)+'</div>':'')+'</div>';
 }
 return '<div class="question-stem direct-stem"><p>'+esc(stripTail(raw))+'</p></div>';
};
window.NETPSYQuestionRenderer={version:'2026-10-04-structural1',clean,stripTail,markers,matchLists,structuredQuestionHTML:structured};
})();