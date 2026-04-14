import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Search, Users, MessageCircle, Loader2 } from 'lucide-react';
import { companyAPI } from '../../api/company';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export default function ManagerChat() {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [conversations, setConversations] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts'>('chats');
  const [activeConv, setActiveConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const fetchConvs = async () => {
      try {
        const res = await companyAPI.listConversations();
        setConversations(res.data.data || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    const fetchContacts = async () => {
      try {
        const res = await companyAPI.listPeople({ limit: 500 });
        setContacts(res.data.data.people || []);
      } catch { /* ignore */ }
    };
    fetchConvs();
    fetchContacts();
  }, []);

  useEffect(() => {
    if (!activeConv) return;
    const fetchMessages = async () => {
      setMsgLoading(true);
      try {
        const res = await companyAPI.getMessages(activeConv._id);
        setMessages(res.data.data || []);
      } catch { /* ignore */ }
      finally { setMsgLoading(false); }
    };
    fetchMessages();

    socket?.emit('chat:join', activeConv._id);
    return () => { socket?.emit('chat:leave', activeConv._id); };
  }, [activeConv?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    const handleMessage = (data: any) => {
      if (data.conversationId === activeConv?._id) {
        setMessages((prev) => [...prev, data]);
      }
      setConversations((prev) => prev.map((c) => c._id === data.conversationId ? { ...c, lastMessage: { content: data.content, timestamp: new Date() }, unreadCount: (c.unreadCount || 0) + (data.conversationId !== activeConv?._id ? 1 : 0) } : c));
    };
    const handleTyping = ({ userName }: { userName: string }) => { setTypingUser(userName); };
    const handleStopTyping = () => { setTypingUser(''); };

    socket.on('chat:message', handleMessage);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:stopTyping', handleStopTyping);
    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:stopTyping', handleStopTyping);
    };
  }, [socket, activeConv?._id]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConv) return;
    try {
      const res = await companyAPI.sendMessage(activeConv._id, { content: newMessage });
      setMessages((prev) => [...prev, res.data.data]);
      socket?.emit('chat:message', { conversationId: activeConv._id, ...res.data.data });
      socket?.emit('chat:stopTyping', { conversationId: activeConv._id });
      setNewMessage('');
    } catch { /* ignore */ }
  };

  const handleTyping = () => {
    socket?.emit('chat:typing', { conversationId: activeConv?._id, userName: user?.fullName });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('chat:stopTyping', { conversationId: activeConv?._id });
    }, 2000);
  };

  const getConversationName = (conv: any) => {
    const other = conv.participants?.find((p: any) => p._id !== user?.id);
    return other?.fullName || 'Unknown';
  };

  const startChat = async (contact: any) => {
    try {
      const existing = conversations.find(c => c.type === 'dm' && c.participants.some((p: any) => p._id === contact._id));
      if (existing) {
        setActiveConv(existing);
        setActiveTab('chats');
        return;
      }
      setLoading(true);
      const res = await companyAPI.createConversation({ type: 'dm', participants: [contact._id] });
      const newConv = res.data.data;
      setConversations(prev => [newConv, ...prev.filter(c => c._id !== newConv._id)]);
      setActiveConv(newConv);
      setActiveTab('chats');
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="w-80 border-r border-border flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold font-heading">Team Chat</h2>
            <div className="flex bg-muted/50 p-1 rounded-lg">
              <button onClick={() => setActiveTab('chats')} className={`px-3 py-1 text-xs font-medium rounded-md ${activeTab === 'chats' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Chats</button>
              <button onClick={() => setActiveTab('contacts')} className={`px-3 py-1 text-xs font-medium rounded-md ${activeTab === 'contacts' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Team</button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder={`Search...`} className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'contacts' ? (
            contacts.length <= 1 ? (
              <div className="text-center py-8"><Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Team list empty</p></div>
            ) : (
              contacts.filter(c => c._id !== user?.id).map((contact) => (
                <button key={contact._id} onClick={() => startChat(contact)} className="w-full text-left px-4 py-3 border-b border-border hover:bg-muted/30 flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center text-sm font-bold shrink-0">{contact.fullName.charAt(0)}</div>
                    {onlineUsers.includes(contact._id) && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{contact.fullName}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{contact.role.replace('_',' ')}</p>
                  </div>
                </button>
              ))
            )
          ) : (
            loading ? (
               <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : conversations.length === 0 ? (
               <div className="text-center py-8"><MessageCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">No conversations</p></div>
            ) : (
               conversations.map((conv) => {
                 const isOnline = conv.participants?.some((p: any) => p._id !== user?.id && onlineUsers.includes(p._id));
                 return (
                   <button key={conv._id} onClick={() => setActiveConv(conv)} className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/30 flex items-center gap-3 ${activeConv?._id === conv._id ? 'bg-muted/40' : ''}`}>
                     <div className="relative">
                       <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center text-sm font-bold shrink-0">{getConversationName(conv).charAt(0)}</div>
                       {isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />}
                     </div>
                     <div className="flex-1 min-w-0">
                       <div className="flex justify-between"><p className="text-sm font-medium truncate">{getConversationName(conv)}</p>{conv.unreadCount > 0 && <span className="bg-foreground text-background text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">{conv.unreadCount}</span>}</div>
                       <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage?.content || 'No messages'}</p>
                     </div>
                   </button>
                 );
               })
            )
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-muted/10">
        {!activeConv ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div><MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" /><p className="text-lg font-semibold">Select a chat</p><p className="text-sm text-muted-foreground">Message your team members</p></div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-border flex items-center gap-3 bg-card">
              <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-sm font-bold">{getConversationName(activeConv).charAt(0)}</div>
              <div><p className="text-sm font-semibold">{getConversationName(activeConv)}</p>{typingUser && <p className="text-xs text-accent animate-pulse">{typingUser} is typing...</p>}</div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {msgLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : (
                messages.map((msg, i) => {
                  const isMine = msg.sender?._id === user?.id || msg.sender === user?.id;
                  return (
                    <div key={msg._id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm shadow-sm border border-border/50 ${isMine ? 'bg-foreground text-background rounded-br-none' : 'bg-card text-foreground rounded-bl-none'}`}>
                        {!isMine && <p className="text-xs font-semibold mb-1 opacity-70">{msg.sender?.fullName}</p>}
                        <p>{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMine ? 'text-background/60' : 'text-muted-foreground'}`}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-border bg-card">
              <div className="flex gap-2">
                <input type="text" value={newMessage} onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground shadow-sm" />
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={sendMessage} disabled={!newMessage.trim()} className="p-3 rounded-xl bg-foreground text-background disabled:opacity-50 shadow-sm">
                  <Send className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
