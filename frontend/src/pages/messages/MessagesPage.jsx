import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Send } from 'lucide-react';
import { conversationApi } from '../../services/conversationApi.js';
import { getSocket } from '../../services/socket.js';
import { Card, Spinner, Button } from '../../components/ui.jsx';

export default function MessagesPage() {
  const { conversationId } = useParams();
  const { user } = useSelector((s) => s.auth);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: convosData, isLoading: loadingConvos } = useQuery({
    queryKey: ['conversations'],
    queryFn: conversationApi.list,
  });
  const conversations = convosData?.data?.conversations || [];

  const { data: messagesData, isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => conversationApi.getMessages(conversationId),
    enabled: !!conversationId,
  });
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    setMessages(messagesData?.data?.messages || []);
  }, [messagesData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !conversationId) return undefined;

    socket.emit('join_conversation', conversationId);

    function onNewMessage(msg) {
      if (msg.conversation !== conversationId) return;
      setMessages((prev) => [...prev, msg]);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
    function onTyping({ userId, conversationId: cid }) {
      if (cid === conversationId && userId !== user._id) setTypingUser(userId);
    }
    function onStopTyping({ conversationId: cid }) {
      if (cid === conversationId) setTypingUser(null);
    }

    socket.on('new_message', onNewMessage);
    socket.on('user_typing', onTyping);
    socket.on('user_stop_typing', onStopTyping);
    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('user_typing', onTyping);
      socket.off('user_stop_typing', onStopTyping);
    };
  }, [conversationId, user?._id, queryClient]);

  function handleTyping(value) {
    setDraft(value);
    const socket = getSocket();
    if (!socket || !conversationId) return;
    socket.emit('typing', { conversationId });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket.emit('stop_typing', { conversationId }), 1500);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    const text = draft;
    setDraft('');
    try {
      await conversationApi.sendMessage(conversationId, { text });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch {
      setDraft(text); // put it back so nothing's lost
    }
  }

  const activeConvo = conversations.find((c) => c._id === conversationId);
  const otherParticipant = activeConvo?.participants.find((p) => p._id !== user._id);

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
      <Card className="flex flex-col overflow-hidden !p-0">
        <div className="border-b border-slate/15 px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-ink">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConvos && <Spinner />}
          {!loadingConvos && conversations.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate">No conversations yet.</p>
          )}
          {conversations.map((c) => {
            const other = c.participants.find((p) => p._id !== user._id);
            return (
              <button
                key={c._id}
                onClick={() => navigate(`/messages/${c._id}`)}
                className={`flex w-full flex-col items-start gap-0.5 border-b border-slate/10 px-4 py-3 text-left transition-colors hover:bg-slate-soft/40 ${
                  c._id === conversationId ? 'bg-brass-soft/25' : ''
                }`}
              >
                <p className="text-sm font-medium text-ink">{other?.name || 'Unknown user'}</p>
                {c.gig?.title && <p className="text-xs text-brass">{c.gig.title}</p>}
                <p className="line-clamp-1 text-xs text-slate">{c.lastMessageText || 'No messages yet'}</p>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="flex flex-col overflow-hidden !p-0">
        {!conversationId ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate">Pick a conversation</div>
        ) : (
          <>
            <div className="border-b border-slate/15 px-4 py-3">
              <p className="text-sm font-medium text-ink">{otherParticipant?.name}</p>
              {typingUser && <p className="text-xs text-brass">typing…</p>}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {loadingMessages && <Spinner />}
              <div className="flex flex-col gap-2">
                {messages.map((m) => {
                  const mine = m.sender?._id === user._id || m.sender === user._id;
                  return (
                    <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm ${
                          mine ? 'bg-ink text-paper' : 'bg-slate-soft text-ink'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="flex gap-2 border-t border-slate/15 p-3">
              <input
                value={draft}
                onChange={(e) => handleTyping(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 rounded-lg border border-slate/30 bg-paper-raised px-3.5 py-2 text-sm outline-none focus:border-brass"
              />
              <Button type="submit">
                <Send size={14} />
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
