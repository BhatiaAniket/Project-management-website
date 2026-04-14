import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff, MessageSquare, 
  Users, Settings, ScreenShare, Monitor, Download, Clock, 
  AlertCircle, CheckCircle2, RefreshCw, X
} from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  stream?: MediaStream;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
}

interface MeetingMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
}

interface MeetingRoomProps {
  roomId: string;
  meetingTitle: string;
  onLeave: () => void;
}

const MeetingRoom: React.FC<MeetingRoomProps> = ({ roomId, meetingTitle, onLeave }) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<MeetingMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    // Initialize WebRTC connection
    initializeWebRTC();
    
    // Simulate connection
    setTimeout(() => {
      setConnectionStatus('connected');
      // Add mock participants
      setParticipants([
        {
          id: '1',
          name: 'John Manager',
          isMuted: false,
          isVideoOff: false,
          isScreenSharing: false,
        },
        {
          id: '2',
          name: 'Jane Smith',
          isMuted: true,
          isVideoOff: false,
          isScreenSharing: false,
        },
      ]);
    }, 2000);

    return () => {
      // Cleanup WebRTC connections
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const initializeWebRTC = async () => {
    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
        ],
      });

      peerConnectionRef.current = peerConnection;

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      setConnectionStatus('disconnected');
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      const screenTrack = localStreamRef.current?.getVideoTracks().find(
        track => track.label.includes('screen')
      );
      if (screenTrack) {
        screenTrack.stop();
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        
        if (localStreamRef.current && peerConnectionRef.current) {
          const screenTrack = screenStream.getVideoTracks()[0];
          peerConnectionRef.current.getSenders().forEach(sender => {
            if (sender.track && sender.track.kind === 'video') {
              sender.replaceTrack(screenTrack);
            }
          });
          
          screenTrack.onended = () => {
            setIsScreenSharing(false);
          };
        }
        
        setIsScreenSharing(true);
      } catch (error) {
        console.error('Failed to start screen sharing:', error);
      }
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    // Start recording logic here
  };

  const stopRecording = () => {
    setIsRecording(false);
    setRecordingTime(0);
    // Stop recording and generate AI summary
    generateAISummary();
  };

  const generateAISummary = async () => {
    setIsGeneratingSummary(true);
    try {
      // Simulate AI summary generation
      setTimeout(() => {
        setAiSummary(`Meeting Summary for "${meetingTitle}":

Key Discussion Points:
- Discussed project timeline and deliverables
- Reviewed current sprint progress
- Identified blockers in API integration
- Planned next steps for frontend development

Action Items:
1. John to resolve database connection issues by EOD
2. Jane to complete UI mockups by Friday
3. Schedule follow-up meeting for next week

Decisions Made:
- Approved additional testing resources
- Extended project deadline by 1 week
- Agreed on new priority order for features

Next Meeting: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}`);
        setIsGeneratingSummary(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
      setIsGeneratingSummary(false);
    }
  };

  const sendMessage = () => {
    if (!messageInput.trim()) return;
    
    const newMessage: MeetingMessage = {
      id: Date.now().toString(),
      senderId: 'current-user',
      senderName: 'You',
      content: messageInput,
      timestamp: new Date().toISOString(),
    };
    
    setMessages([...messages, newMessage]);
    setMessageInput('');
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-amber-500';
      case 'disconnected': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">{meetingTitle}</h2>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`} />
              <span className={`text-sm ${getConnectionStatusColor()}`}>
                {getConnectionStatusText()}
              </span>
            </div>
            {isRecording && (
              <div className="flex items-center gap-2 text-red-500">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">REC {formatTime(recordingTime)}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Users className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowChat(!showChat)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
              onClick={onLeave}
              className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 relative bg-black">
          {/* Local Video */}
          <div className="absolute top-4 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden border-2 border-white/20">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <VideoOff className="w-8 h-8 text-gray-600" />
              </div>
            )}
          </div>

          {/* Remote Videos */}
          <div className="grid grid-cols-2 gap-4 p-4 h-full">
            {participants.map((participant) => (
              <div key={participant.id} className="bg-gray-900 rounded-lg overflow-hidden relative">
                {participant.isVideoOff ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-medium mb-2">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-white">{participant.name}</p>
                    </div>
                  </div>
                ) : (
                  <video
                    className="w-full h-full object-cover"
                    // participant.stream would be set here
                  />
                )}
                {participant.isMuted && (
                  <div className="absolute bottom-2 left-2 p-1 bg-red-500 rounded-full">
                    <MicOff className="w-3 h-3 text-white" />
                  </div>
                )}
                {participant.isScreenSharing && (
                  <div className="absolute top-2 left-2 p-1 bg-blue-500 rounded-full">
                    <Monitor className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-card/90 backdrop-blur-sm rounded-full p-2">
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition-colors ${
                isMuted ? 'bg-red-500 text-white' : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full transition-colors ${
                isVideoOff ? 'bg-red-500 text-white' : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
            
            <button
              onClick={toggleScreenShare}
              className={`p-3 rounded-full transition-colors ${
                isScreenSharing ? 'bg-blue-500 text-white' : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <ScreenShare className="w-5 h-5" />
            </button>
            
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-3 rounded-full transition-colors ${
                isRecording ? 'bg-red-500 text-white' : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {isRecording ? <PhoneOff className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Sidebar */}
        {(showChat || showParticipants) && (
          <div className="w-80 bg-card border-l border-border flex flex-col">
            {showChat && (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold">Meeting Chat</h3>
                </div>
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((message) => (
                    <div key={message.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{message.senderName}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  ))}
                </div>
                
                {/* Message Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      onClick={sendMessage}
                      className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {showParticipants && (
              <>
                {/* Participants Header */}
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold">Participants ({participants.length + 1})</h3>
                </div>
                
                {/* Participants List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                      Y
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">You (Host)</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {isMuted && <MicOff className="w-3 h-3" />}
                        {isVideoOff && <VideoOff className="w-3 h-3" />}
                        {isScreenSharing && <Monitor className="w-3 h-3" />}
                      </div>
                    </div>
                  </div>
                  
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{participant.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {participant.isMuted && <MicOff className="w-3 h-3" />}
                          {participant.isVideoOff && <VideoOff className="w-3 h-3" />}
                          {participant.isScreenSharing && <Monitor className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* AI Summary Modal */}
      {aiSummary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        >
          <div className="bg-card rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">AI-Generated Meeting Summary</h3>
              <button
                onClick={() => setAiSummary('')}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {isGeneratingSummary ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2">Generating AI summary...</span>
              </div>
            ) : (
              <>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm">{aiSummary}</pre>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      // Download summary
                      const blob = new Blob([aiSummary], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `meeting-summary-${new Date().toISOString().split('T')[0]}.txt`;
                      a.click();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Summary
                  </button>
                  <button
                    onClick={() => setAiSummary('')}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MeetingRoom;
