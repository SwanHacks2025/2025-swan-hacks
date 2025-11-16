'use client';

import { useEffect, useState, useRef } from 'react';
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
import { Send, MessageCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  timestamp: Timestamp | null;
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
}

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFriendId?: string;
  initialFriendUsername?: string;
  initialFriendPhotoURL?: string | null;
}

export function MessagesModal({
  isOpen,
  onClose,
  initialFriendId,
  initialFriendUsername,
  initialFriendPhotoURL,
}: MessagesModalProps) {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
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
        otherPhotoURL: otherUserData.customPhotoURL || otherUserData.photoURL || null,
      });
    }
  };

  // Load conversations list
  useEffect(() => {
    if (!user || !isOpen) return;

    const loadConversations = async () => {
      try {
        setLoading(true);
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
          const otherUserId = participants.find((id: string) => id !== user.uid);
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
                  photoURL: friendData.customPhotoURL || friendData.photoURL || null,
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

        // If initial friend is provided, select that conversation
        if (initialFriendId) {
          const chatId = getChatId(user.uid, initialFriendId);
          setSelectedChatId(chatId);
          await ensureConversation(chatId, initialFriendId);
        }
      } catch (err) {
        console.error('Error loading conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [user, isOpen, initialFriendId]);

  // Load and listen to messages for selected chat
  useEffect(() => {
    if (!user || !selectedChatId || !isOpen) return;

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
  }, [user, selectedChatId, isOpen]);

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
        otherPhotoURL: otherUserData.customPhotoURL || otherUserData.photoURL || null,
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
  };

  const selectedConversation = conversations.find((c) => c.chatId === selectedChatId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[90vw] h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Messages</DialogTitle>
        </DialogHeader>
        <div className="flex flex-1 overflow-hidden">
          {/* Conversations List */}
          <div className="w-56 border-r bg-card flex flex-col flex-shrink-0">
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : conversations.length > 0 ? (
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
                            {conversation.otherUser.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {conversation.otherUser.username}
                          </p>
                          {conversation.lastMessage && (
                            <p className="text-sm text-foreground/80 truncate">
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
                  <Avatar className="h-10 w-10">
                    {selectedConversation.otherUser.photoURL && (
                      <AvatarImage src={selectedConversation.otherUser.photoURL} />
                    )}
                    <AvatarFallback>
                      {selectedConversation.otherUser.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{selectedConversation.otherUser.username}</p>
                  </div>
                </div>

                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                  {messages.length > 0 ? (
                    messages.map((message) => {
                      const isOwn = message.senderId === user?.uid;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              isOwn
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/80 text-foreground border border-border/50'
                            }`}
                          >
                            <p className="text-base font-medium leading-relaxed">{message.text}</p>
                            {message.timestamp && formatTimestamp(message.timestamp) && (
                              <p
                                className={`text-xs mt-1.5 font-medium ${
                                  isOwn 
                                    ? 'text-primary-foreground/90' 
                                    : 'text-foreground/70'
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
                    <Button onClick={handleSendMessage} disabled={sending || !messageText.trim()}>
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
      </DialogContent>
    </Dialog>
  );
}

