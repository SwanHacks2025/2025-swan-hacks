'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/firebaseAuth';
import { db } from '@/lib/firebaseClient';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, ArrowLeft, MessageCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  timestamp: Timestamp;
}

interface Conversation {
  chatId: string;
  otherUser: {
    uid: string;
    username: string;
    photoURL: string | null;
  };
  lastMessage: string;
  lastMessageTime: Timestamp | null;
  unreadCount?: number;
}

function MessagesPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatIdParam = searchParams.get('chat');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(
    chatIdParam
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Generate chat ID from two user IDs (sorted for consistency)
  const getChatId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
  };

  // Format timestamp safely
  const formatTimestamp = (timestamp: Timestamp | null | undefined): string => {
    if (!timestamp) return '';
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return '';
  };

  // Ensure conversation document exists
  const ensureConversation = async (chatId: string, otherUserId: string) => {
    if (!user) return;
    const conversationRef = doc(db, 'conversations', chatId);
    const conversationSnap = await getDoc(conversationRef);

    if (!conversationSnap.exists()) {
      const otherUserRef = doc(db, 'Users', otherUserId);
      const otherUserSnap = await getDoc(otherUserRef);
      const otherUserData = otherUserSnap.exists() ? otherUserSnap.data() : {};

      await setDoc(conversationRef, {
        participants: [user.uid, otherUserId],
        lastMessage: '',
        lastMessageTime: null,
        otherUsername: otherUserData.Username || 'Unknown',
        otherPhotoURL:
          otherUserData.customPhotoURL || otherUserData.photoURL || null,
      });
    }
  };

  // Handle initial chat selection from URL
  useEffect(() => {
    if (chatIdParam && chatIdParam !== selectedChatId && user) {
      const [uid1, uid2] = chatIdParam.split('_');
      const otherUserId = uid1 === user.uid ? uid2 : uid1;
      if (otherUserId) {
        ensureConversation(chatIdParam, otherUserId).then(() => {
          setSelectedChatId(chatIdParam);
        });
      }
    }
  }, [chatIdParam, user, selectedChatId]);

  // Load conversations list
  useEffect(() => {
    if (!user || authLoading) {
      if (!authLoading && !user) {
        router.push('/');
      }
      return;
    }

    const loadConversations = async () => {
      try {
        // Get user's friends
        const userRef = doc(db, 'Users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          setLoading(false);
          return;
        }

        const userData = userSnap.data();
        const friends = userData.friends || [];

        // Load all conversations
        const conversationsRef = collection(db, 'conversations');
        const conversationsQuery = query(
          conversationsRef,
          where('participants', 'array-contains', user.uid)
        );

        const conversationsSnap = await getDocs(conversationsQuery);
        const conversationsMap = new Map<string, Conversation>();

        // Process existing conversations
        conversationsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          const participants = data.participants || [];
          const otherUserId = participants.find(
            (id: string) => id !== user.uid
          );
          if (otherUserId) {
            conversationsMap.set(docSnap.id, {
              chatId: docSnap.id,
              otherUser: {
                uid: otherUserId,
                username: data.otherUsername || 'Unknown',
                photoURL: data.otherPhotoURL || null,
              },
              lastMessage: data.lastMessage || '',
              lastMessageTime: data.lastMessageTime || null,
            });
          }
        });

        // Create conversations for friends who don't have one yet
        const conversationsList: Conversation[] = [];
        for (const friendId of friends) {
          const chatId = getChatId(user.uid, friendId);
          if (conversationsMap.has(chatId)) {
            conversationsList.push(conversationsMap.get(chatId)!);
          } else {
            // Load friend data
            const friendRef = doc(db, 'Users', friendId);
            const friendSnap = await getDoc(friendRef);
            if (friendSnap.exists()) {
              const friendData = friendSnap.data();
              conversationsList.push({
                chatId,
                otherUser: {
                  uid: friendId,
                  username: friendData.Username || 'Unknown',
                  photoURL:
                    friendData.customPhotoURL || friendData.photoURL || null,
                },
                lastMessage: '',
                lastMessageTime: null,
              });
            }
          }
        }

        // Sort by last message time
        conversationsList.sort((a, b) => {
          if (!a.lastMessageTime) return 1;
          if (!b.lastMessageTime) return -1;
          return b.lastMessageTime.toMillis() - a.lastMessageTime.toMillis();
        });

        setConversations(conversationsList);
      } catch (err) {
        console.error('Error loading conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [user, authLoading, router]);

  // Load and listen to messages for selected chat
  useEffect(() => {
    if (!user || !selectedChatId) return;

    const chatId = selectedChatId;
    const messagesRef = collection(db, 'conversations', chatId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList: Message[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        messagesList.push({
          id: docSnap.id,
          text: data.text || '',
          senderId: data.senderId || '',
          receiverId: data.receiverId || '',
          timestamp: data.timestamp || null,
        });
      });
      setMessages(messagesList);
    });

    return () => unsubscribe();
  }, [user, selectedChatId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!user || !selectedChatId || !messageText.trim() || sending) return;

    setSending(true);
    try {
      const chatId = selectedChatId;
      const [uid1, uid2] = chatId.split('_');
      const receiverId = uid1 === user.uid ? uid2 : uid1;

      // Add message to subcollection
      const messagesRef = collection(db, 'conversations', chatId, 'messages');
      await addDoc(messagesRef, {
        text: messageText.trim(),
        senderId: user.uid,
        receiverId,
        timestamp: serverTimestamp(),
      });

      // Update conversation metadata
      const conversationRef = doc(db, 'conversations', chatId);
      const conversationSnap = await getDoc(conversationRef);

      // Get other user's info
      const otherUserRef = doc(db, 'Users', receiverId);
      const otherUserSnap = await getDoc(otherUserRef);
      const otherUserData = otherUserSnap.exists() ? otherUserSnap.data() : {};

      const conversationData = {
        participants: [user.uid, receiverId],
        lastMessage: messageText.trim(),
        lastMessageTime: serverTimestamp(),
        otherUsername: otherUserData.Username || 'Unknown',
        otherPhotoURL:
          otherUserData.customPhotoURL || otherUserData.photoURL || null,
      };

      if (!conversationSnap.exists()) {
        // Create conversation document
        await setDoc(conversationRef, conversationData);
      } else {
        // Update existing conversation
        await updateDoc(conversationRef, {
          lastMessage: messageText.trim(),
          lastMessageTime: serverTimestamp(),
        });
      }

      setMessageText('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  // Handle chat selection
  const handleSelectChat = async (conversation: Conversation) => {
    setSelectedChatId(conversation.chatId);
    await ensureConversation(conversation.chatId, conversation.otherUser.uid);
    // Update URL
    router.push(`/messages?chat=${conversation.chatId}`, { scroll: false });
  };

  const selectedConversation = conversations.find(
    (c) => c.chatId === selectedChatId
  );

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-6 py-24">
        <p className="text-center">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-6 py-24 max-w-6xl">
      <div className="flex h-[calc(100vh-12rem)] border rounded-lg overflow-hidden bg-card">
        {/* Conversations List */}
        <div className="w-full md:w-80 border-r bg-card flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-2xl font-bold">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length > 0 ? (
              <div>
                {conversations.map((conversation) => (
                  <button
                    key={conversation.chatId}
                    onClick={() => handleSelectChat(conversation)}
                    className={`w-full p-4 border-b hover:bg-accent transition-colors text-left ${
                      selectedChatId === conversation.chatId ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        {conversation.otherUser.photoURL && (
                          <AvatarImage src={conversation.otherUser.photoURL} />
                        )}
                        <AvatarFallback>
                          {conversation.otherUser.username
                            .charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          {conversation.otherUser.username}
                        </p>
                        {conversation.lastMessage && (
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-sm mt-2">Start messaging your friends!</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat View */}
        <div className="flex-1 flex flex-col">
          {selectedChatId && selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedChatId(null);
                    router.push('/messages', { scroll: false });
                  }}
                  className="md:hidden"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Avatar className="h-10 w-10">
                  {selectedConversation.otherUser.photoURL && (
                    <AvatarImage
                      src={selectedConversation.otherUser.photoURL}
                    />
                  )}
                  <AvatarFallback>
                    {selectedConversation.otherUser.username
                      .charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">
                    {selectedConversation.otherUser.username}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
              >
                {messages.length > 0 ? (
                  messages.map((message) => {
                    const isOwn = message.senderId === user.uid;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${
                          isOwn ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            isOwn
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          <p className="text-sm">{message.text}</p>
                          {message.timestamp &&
                            formatTimestamp(message.timestamp) && (
                              <p
                                className={`text-xs mt-1 ${
                                  isOwn
                                    ? 'text-primary-foreground/70'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {formatTimestamp(message.timestamp)}
                              </p>
                            )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={sending || !messageText.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50 animate-pulse" />
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        </div>
      }
    >
      <MessagesPageContent />
    </Suspense>
  );
}
