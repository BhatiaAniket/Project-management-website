import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  PhoneOff, Mic, MicOff, Video, VideoOff, 
  MonitorUp, MessageSquare, Users, UserPlus, Send
} from 'lucide-react';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

// Configuration for WebRTC
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

export default function MeetingRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'participants' | 'chat'>('participants');
  const [duration, setDuration] = useState(0);

  // Participants Tracker
  // In a real multi-mesh we'd store an array, 
  // but for a strict 1-to-1 we just track the single remote socketId and their name (if available).
  const [remoteParticipant, setRemoteParticipant] = useState<{ socketId: string, userId?: string } | null>(null);

  // Chat Tracker
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<{ sender: string; text: string; time: Date; isTerminal?: boolean }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Format Duration HH:MM:SS
  useEffect(() => {
    const timer = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // ━━━ INIT WEBRTC & SOCKETS ━━━
  useEffect(() => {
    if (!socket || !id) return;

    // 1. Get Local Media
    const initLocalMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        
        // 2. Join Socket Room
        socket.emit('webrtc:join-room', id);
        addSystemMessage("You joined the room.");
      } catch (err) {
        showToast('Camera/Microphone access denied!', 'error');
      }
    };

    initLocalMedia();

    // ── Helper to create Peer Connection ──
    const createPeerConnection = (remoteSocketId: string) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Add local stream tracks to PC
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current as MediaStream);
        });
      }

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc:ice-candidate', {
            to: remoteSocketId,
            candidate: event.candidate,
          });
        }
      };

      // Receives Remote Stream
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      return pc;
    };

    // ── Socket Listeners ──

    // Another User Joined -> We are the Caller (Offer)
    const handleUserJoined = async ({ userId, socketId }: any) => {
      setRemoteParticipant({ socketId, userId });
      addSystemMessage("A participant joined.");
      
      const pc = createPeerConnection(socketId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socket.emit('webrtc:offer', { to: socketId, offer });
    };

    // Receive Offer -> We are the Receiver (Answer)
    const handleReceiveOffer = async ({ from, offer }: any) => {
      setRemoteParticipant({ socketId: from });
      addSystemMessage("A participant joined.");

      const pc = createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtc:answer', { to: from, answer });
    };

    // Receive Answer
    const handleReceiveAnswer = async ({ answer }: any) => {
      const pc = peerConnectionRef.current;
      if (pc) {
         await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    // Receive ICE Candidate
    const handleNewICECandidateMsg = async ({ candidate }: any) => {
      const pc = peerConnectionRef.current;
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    // User Left
    const handleUserLeft = ({ socketId }: any) => {
      if (remoteParticipant?.socketId === socketId || peerConnectionRef.current) {
        setRemoteParticipant(null);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
        addSystemMessage("Participant left the room.");
      }
    };

    // Chat
    const handleChat = (data: any) => {
      if (data.roomId === id) {
        setMessages(prev => [...prev, { sender: data.senderName, text: data.text, time: new Date() }]);
      }
    };

    socket.on('webrtc:user-joined', handleUserJoined);
    socket.on('webrtc:offer', handleReceiveOffer);
    socket.on('webrtc:answer', handleReceiveAnswer);
    socket.on('webrtc:ice-candidate', handleNewICECandidateMsg);
    socket.on('webrtc:user-left', handleUserLeft);
    socket.on('meeting:chat', handleChat);

    return () => {
      socket.off('webrtc:user-joined', handleUserJoined);
      socket.off('webrtc:offer', handleReceiveOffer);
      socket.off('webrtc:answer', handleReceiveAnswer);
      socket.off('webrtc:ice-candidate', handleNewICECandidateMsg);
      socket.off('webrtc:user-left', handleUserLeft);
      socket.off('meeting:chat', handleChat);
      
      socket.emit('webrtc:leave-room', id);
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [socket, id]);

  const addSystemMessage = (text: string) => {
    setMessages(prev => [...prev, { sender: 'System', text, time: new Date(), isTerminal: true }]);
  };

  // ━━━ CONTROLS ━━━
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted; // true means we turn it back on
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isVideoOff; // true means turn it back on
        setIsVideoOff(!isVideoOff);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Swap track in PeerConnection
        const pc = peerConnectionRef.current;
        if (pc && localStreamRef.current) {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        }
        
        // Show local view
        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        
        screenTrack.onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
      } catch (err) {
        showToast('Screen sharing failed or cancelled', 'error');
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (!localStreamRef.current) return;
    const originalVideoTrack = localStreamRef.current.getVideoTracks()[0];
    
    const pc = peerConnectionRef.current;
    if (pc) {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender && originalVideoTrack) sender.replaceTrack(originalVideoTrack);
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    setIsScreenSharing(false);
  };

  const handleEndCall = () => {
    socket?.emit('webrtc:leave-room', id);
    showToast('Meeting ended', 'success');
    navigate(user?.role === 'manager' ? '/manager/meetings' : '/company/meetings');
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    
    // Optimistic UI local add
    setMessages(prev => [...prev, { sender: 'You', text: chatMessage, time: new Date() }]);
    
    // Emit to backend
    socket?.emit('meeting:chat', { roomId: id, text: chatMessage, senderName: user?.fullName || 'Participant' });
    
    setChatMessage('');
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="h-[calc(100vh-100px)] flex bg-background -mx-6 -my-6 sm:mt-0 sm:mx-0 sm:rounded-2xl border border-border overflow-hidden">
      
      {/* ━━━ Main Video Area ━━━ */}
      <div className="flex-1 flex flex-col relative bg-muted/30">
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center bg-background/50 backdrop-blur-md px-4 py-2 rounded-xl border border-border/50 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium">Room ID: {id?.substring(0, 8)}...</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-foreground/10 text-foreground px-2 py-1 rounded-md font-mono font-bold">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Video Grid Simulation */}
        <div className="flex-1 px-8 pt-20 pb-28 flex items-center justify-center relative overflow-hidden">
          
          <div className={`w-full h-full flex items-center justify-center gap-4 transition-all duration-500 ${remoteParticipant ? 'flex-row' : 'flex-col'}`}>
             
             {/* Local Video */}
             <motion.div 
               layout
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className={`relative bg-black rounded-2xl overflow-hidden border border-border shadow-lg ${remoteParticipant ? 'w-1/2 aspect-video' : 'w-full max-w-4xl aspect-video'} transition-all`}
             >
              <video 
                ref={localVideoRef}
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${!isScreenSharing ? 'mirror' : ''}`}
                style={!isScreenSharing ? { transform: 'scaleX(-1)' } : {}}
              />
              {isVideoOff && !isScreenSharing && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/80 backdrop-blur-sm">
                   <div className="w-24 h-24 rounded-full bg-foreground text-background flex items-center justify-center text-3xl font-bold uppercase">
                     {user?.fullName?.charAt(0) || 'ME'}
                   </div>
                </div>
              )}
              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-2">
                You (Host) {isMuted && <MicOff className="w-3 h-3 text-red-400" />} {isScreenSharing && <MonitorUp className="w-3 h-3 text-blue-400" />}
              </div>
             </motion.div>

             {/* Remote Video */}
             {remoteParticipant && (
               <motion.div 
                 layout
                 initial={{ scale: 0.9, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 className="relative bg-zinc-900 rounded-2xl overflow-hidden border border-border shadow-lg w-1/2 aspect-video transition-all"
               >
                 <video 
                   ref={remoteVideoRef}
                   autoPlay 
                   playsInline 
                   className="w-full h-full object-cover"
                 />
                 <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-2">
                   Participant
                 </div>
               </motion.div>
             )}

          </div>

        </div>

        {/* Controls Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-background/80 backdrop-blur-lg px-6 py-4 rounded-full border border-border shadow-lg z-20">
          <TooltipButton 
            icon={isMuted ? <MicOff className="w-5 h-5 text-red-500" /> : <Mic className="w-5 h-5" />} 
            onClick={toggleMute} 
            label={isMuted ? 'Unmute' : 'Mute'} 
            isActive={!isMuted}
          />
          <TooltipButton 
            icon={isVideoOff ? <VideoOff className="w-5 h-5 text-red-500" /> : <Video className="w-5 h-5" />} 
            onClick={toggleVideo} 
            label={isVideoOff ? 'Start Video' : 'Stop Video'} 
            isActive={!isVideoOff}
          />
          <TooltipButton 
            icon={<MonitorUp className="w-5 h-5" />} 
            onClick={toggleScreenShare} 
            label="Share Screen" 
            isActive={isScreenSharing}
          />
          
          <div className="w-[1px] h-8 bg-border mx-2" />
          
          <button 
            onClick={handleEndCall}
            className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors shadow-sm"
            title="Leave Meeting"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ━━━ Sidebar - Chat & Participants ━━━ */}
      <div className="w-80 border-l border-border bg-card flex flex-col z-10 shadow-sm relative">
        <div className="flex border-b border-border">
          <button 
            onClick={() => setActiveTab('participants')}
            className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'participants' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Participants ({remoteParticipant ? '2' : '1'})
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'chat' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto relative">
          {activeTab === 'participants' ? (
            <div className="p-4 space-y-4">
              <button className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-accent/10 text-accent font-medium text-sm hover:bg-accent/20 transition-colors">
                <UserPlus className="w-4 h-4" /> Add People
              </button>
              
              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/50 transition-colors border border-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold shrink-0">
                    {user?.fullName?.charAt(0) || 'ME'}
                  </div>
                  <span className="text-sm font-medium">You (Host)</span>
                </div>
                <div className="flex items-center gap-2">
                  {isMuted ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4 text-muted-foreground" />}
                  {isVideoOff ? <VideoOff className="w-4 h-4 text-red-500" /> : <Video className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {remoteParticipant && (
                <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/50 transition-colors border border-transparent">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                      P
                    </div>
                    <span className="text-sm font-medium">Participant</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-muted-foreground" />
                    <Video className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full bg-muted/10">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col h-full items-center justify-center text-center opacity-50 pt-20">
                    <MessageSquare className="w-8 h-8 text-muted-foreground mb-3" />
                    <h3 className="text-sm font-semibold mb-1">Meeting Chat</h3>
                    <p className="text-xs text-muted-foreground">Messages will appear here.</p>
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.sender === 'You' ? 'items-end' : m.isTerminal ? 'items-center my-4' : 'items-start'}`}>
                      {m.isTerminal ? (
                        <div className="px-3 py-1 bg-muted rounded-full text-[10px] text-muted-foreground">
                          {m.text}
                        </div>
                      ) : (
                        <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${m.sender === 'You' ? 'bg-foreground text-background rounded-tr-sm' : 'bg-card border border-border rounded-tl-sm'}`}>
                          {m.sender !== 'You' && <p className="text-[10px] font-bold mb-1 opacity-60 text-foreground">{m.sender}</p>}
                          <p className="break-words">{m.text}</p>
                          <p className={`text-[9px] mt-1 text-right ${m.sender === 'You' ? 'text-background/60' : 'text-muted-foreground'}`}>
                            {m.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 bg-card border-t border-border">
                <form onSubmit={sendChatMessage} className="flex gap-2">
                  <input 
                    type="text" 
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type message..." 
                    className="flex-1 px-3 py-2 rounded-xl text-sm border border-border bg-background focus:outline-none focus:border-foreground"
                  />
                  <button type="submit" disabled={!chatMessage.trim()} className="p-2 bg-foreground text-background rounded-xl disabled:opacity-50">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}

const TooltipButton = ({ icon, onClick, label, isActive }: { icon: React.ReactNode, onClick: () => void, label: string, isActive: boolean }) => (
  <button 
    onClick={onClick}
    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-sm border border-border
      ${isActive ? 'bg-muted hover:bg-muted/80 text-foreground' : 'bg-background hover:bg-muted text-foreground hover:text-foreground'}
    `}
    title={label}
  >
    {icon}
  </button>
);
