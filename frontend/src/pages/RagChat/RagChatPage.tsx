import React, { useState } from 'react';
import { BookOpen, Send, Loader2 } from 'lucide-react';
import { apiClient } from '../../services/api';

interface Source { id: number; document: string; page: number; excerpt: string }
interface Reply { answer: string; sources: Source[]; status: string }
interface Message { role: 'user' | 'assistant'; text: string; sources?: Source[]; status?: string }

export const RagChatPage: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = question.trim();
    if (!text || busy) return;
    setQuestion('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setBusy(true);
    try {
      const reply = await apiClient<Reply>('/rag-chat/ask', { method: 'POST', body: JSON.stringify({ question: text }) });
      setMessages(prev => [...prev, {role: 'assistant', text: reply.answer, sources: reply.sources, status: reply.status}]);
    } catch (e) {
      setMessages(prev => [...prev, {role: 'assistant', text: e instanceof Error ? e.message : 'Unable to contact chatbot.'}]);
    } finally { setBusy(false); }
  };
  return (
    <main style={{maxWidth:1000,margin:'0 auto', padding:'24px', color:'var(--text-main)'}}>
      <header style={{marginBottom:20}}>
        <h1 style={{display:'flex',alignItems:'center',gap:10,fontSize:26}}><BookOpen size={27}/> SIRA Regulatory Assistant</h1>
        <p style={{color:'var(--text-secondary)',marginTop:8}}>Ask about security rules, cameras, alarms, and applicable requirements. Answers are retrieved from indexed SIRA documents and include PDF page references.</p>
      </header>
      <section aria-label="Chat history" style={{background:'var(--bg-card)',border:'1px solid var(--border-card)',borderRadius:12,minHeight:430,padding:22,display:'flex',flexDirection:'column',gap:18}}>
        {!messages.length && <div style={{color:'var(--text-secondary)'}}><p>Example questions:</p><p>What are the CCTV recording retention requirements?</p><p>What does the manual say about camera placement at entrances?</p><p>What security requirements apply to warehouses?</p></div>}
        {messages.map((m,idx) => <article key={idx} style={{maxWidth:'92%',alignSelf:m.role==='user'?'flex-end':'flex-start',padding:16,borderRadius:10,background:m.role==='user'?'var(--color-primary-subtle)':'var(--bg-surface-subtle)',whiteSpace:'pre-wrap',lineHeight:1.6}}>
          <strong>{m.role==='user'?'You':'SIRA RAG Assistant'}</strong>
          <p style={{margin:'8px 0 0'}}>{m.text}</p>
          {m.sources && m.sources.length>0 && <details style={{marginTop:12}}>
            <summary style={{cursor:'pointer',fontWeight:600}}>Retrieved evidence ({m.sources.length})</summary>
            {m.sources.map(s=><div key={s.id} style={{padding:'10px 0',borderTop:'1px solid var(--border-subtle)'}}>
              <strong>[Source {s.id}] {s.document} — PDF page {s.page}</strong>
              <div style={{fontSize:13,color:'var(--text-secondary)',marginTop:5}}>{s.excerpt}…</div>
            </div>)}
          </details>}
        </article>)}
        {busy && <p role="status" style={{display:'flex',gap:8,alignItems:'center'}}><Loader2 size={16}/> Retrieving regulatory evidence…</p>}
      </section>
      <form onSubmit={submit} style={{display:'flex',gap:12,marginTop:16}}>
        <input aria-label="Ask a regulatory question" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={1500} placeholder="Ask a SIRA regulations question..." style={{flex:1,padding:14,border:'1px solid var(--border-card)',borderRadius:8,background:'var(--bg-card)',color:'var(--text-main)',fontSize:15}} />
        <button type="submit" disabled={busy || question.trim().length<3} style={{display:'flex',gap:8,alignItems:'center',padding:'10px 20px',border:0,borderRadius:8,background:'var(--color-primary)',color:'white',cursor:'pointer',opacity:busy?0.6:1}}><Send size={16}/> Ask</button>
      </form>
      <p style={{fontSize:12,color:'var(--text-muted)',marginTop:14}}>Research assistance only. Verify exact requirements and effective versions against official SIRA publications. Final compliance decisions require an authorized reviewer.</p>
    </main>
  );
};
