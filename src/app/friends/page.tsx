'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/firebaseAuth';
import { db } from '@/lib/firebaseClient';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, UserPlus, Users } from 'lucide-react';
import { UserResult, Message, Conversation, FriendRequestStatus } from './types';
import { SearchTab } from './components/SearchTab';
import { FriendsTab } from './components/FriendsTab';
import { RequestsTab } from './components/RequestsTab';
import { ChatPanel } from './components/ChatPanel';

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friends, setFriends] = useState<UserResult[]>([]);
  const [friendRequests, setFriendRequests] = useState<UserResult[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'friends' | 'requests'>('friends');
  const [loading, setLoading] = useState(true);

  // Chat state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [removeFriendDialogOpen, setRemoveFriendDialogOpen] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<UserResult | null>(null);
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

      // Verify they can message each other
      const canMessage = await canMessageUser(otherUserId);
      if (!canMessage) {
        throw new Error('You cannot message this user.');
      }

      await setDoc(conversationRef, {
        participants: [user.uid, otherUserId],
        lastMessage: '',
        lastMessageTime: null,
        otherUsername: otherUserData.Username || 'Unknown',
        otherPhotoURL: otherUserData.customPhotoURL || otherUserData.photoURL || null,
      });
    }
  };

  // Load user's friends and friend requests with real-time updates
  useEffect(() => {
    if (!user || authLoading) {
      if (!authLoading && !user) {
        router.push('/login');
      }
      return;
    }

    const userRef = doc(db, 'Users', user.uid);
    
    // Set up real-time listener for user document
    const unsubscribe = onSnapshot(userRef, async (userSnap) => {
      if (!userSnap.exists()) {
        setLoading(false);
        return;
      }

      try {
        const data = userSnap.data();
        const friendsList = data.friends || [];
        const sentRequests = data.sentFriendRequests || [];
        const receivedRequests = data.receivedFriendRequests || [];

        // Load friends details
        const friendsDetails = await Promise.all(
          friendsList.map(async (friendId: string) => {
            const friendRef = doc(db, 'Users', friendId);
            const friendSnap = await getDoc(friendRef);
            if (friendSnap.exists()) {
              const friendData = friendSnap.data();
              return {
                uid: friendId,
                username: friendData.Username || 'Unknown',
                photoURL: friendData.customPhotoURL || friendData.photoURL || null,
                status: 'friends' as FriendRequestStatus,
              };
            }
            return null;
          })
        );

        // Load received requests details
        const receivedDetails = await Promise.all(
          receivedRequests.map(async (requestId: string) => {
            const requestRef = doc(db, 'Users', requestId);
            const requestSnap = await getDoc(requestRef);
            if (requestSnap.exists()) {
              const requestData = requestSnap.data();
              return {
                uid: requestId,
                username: requestData.Username || 'Unknown',
                photoURL: requestData.customPhotoURL || requestData.photoURL || null,
                status: 'received' as FriendRequestStatus,
              };
            }
            return null;
          })
        );

        // Remove duplicates by filtering based on uid
        const uniqueFriends = friendsDetails
          .filter((f): f is UserResult => f !== null)
          .filter((friend, index, self) => 
            index === self.findIndex((f) => f.uid === friend.uid)
          );

        setFriends(uniqueFriends);
        setFriendRequests(receivedDetails.filter((f): f is UserResult => f !== null));
        
        // Update search results with current sent requests status
        setSearchResults((prev) =>
          prev.map((result) => {
            let newStatus: FriendRequestStatus = result.status;
            if (sentRequests.includes(result.uid)) {
              newStatus = 'sent';
            } else if (friendsList.includes(result.uid)) {
              newStatus = 'friends';
            } else if (receivedRequests.includes(result.uid)) {
              newStatus = 'received';
            } else {
              newStatus = 'none';
            }
            return { ...result, status: newStatus };
          })
        );
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading friends data:', err);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user, authLoading, router]);

  // Load conversations with real-time updates
  useEffect(() => {
    if (!user || authLoading) return;

    let unsubscribe: (() => void) | undefined;

    const setupConversations = async () => {
      try {
        // Get user's friends
        const userRef = doc(db, 'Users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return;

        const userData = userSnap.data();
        const friends = userData.friends || [];
        const isCurrentUserOrganizer = userData.organizer || false;
        const isCurrentUserPrivate = userData.isPrivate || false;

        // Set up real-time listener for conversations
        const conversationsRef = collection(db, 'conversations');
        const conversationsQuery = query(
          conversationsRef,
          where('participants', 'array-contains', user.uid)
        );

        unsubscribe = onSnapshot(conversationsQuery, async (snapshot) => {
          // Get fresh friends list each time
          const currentUserRef = doc(db, 'Users', user.uid);
          const currentUserSnap = await getDoc(currentUserRef);
          const currentUserData = currentUserSnap.exists() ? currentUserSnap.data() : {};
          const currentFriends = currentUserData.friends || [];

          const conversationsMap = new Map<string, Conversation>();

          // Process existing conversations - load other user's data fresh
          const conversationPromises = snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const participants = data.participants || [];
            const otherUserId = participants.find((id: string) => id !== user.uid);
            if (otherUserId) {
              // Load other user's data fresh to avoid stale/wrong data
              const otherUserRef = doc(db, 'Users', otherUserId);
              const otherUserSnap = await getDoc(otherUserRef);
              const otherUserData = otherUserSnap.exists() ? otherUserSnap.data() : {};
              
              return {
                chatId: docSnap.id,
                otherUser: {
                  uid: otherUserId,
                  username: otherUserData.Username || 'Unknown',
                  photoURL: otherUserData.customPhotoURL || otherUserData.photoURL || null,
                },
                lastMessage: data.lastMessage || '',
                lastMessageTime: data.lastMessageTime || null,
              };
            }
            return null;
          });
          
          const conversationResults = await Promise.all(conversationPromises);
          conversationResults.forEach((conv) => {
            if (conv) {
              conversationsMap.set(conv.chatId, conv);
            }
          });

          // Create conversations for friends who don't have one yet
          const conversationsList: Conversation[] = [];
          for (const friendId of currentFriends) {
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

          // Also include conversations with organizers (even if not friends)
          // Process conversations that already exist and check for organizers or public/private rules
          for (const [chatId, conversation] of conversationsMap.entries()) {
            const otherUserId = conversation.otherUser.uid;
            if (!currentFriends.includes(otherUserId)) {
              // Check if other user is an organizer or if messaging is allowed by privacy rules
              const otherUserRef = doc(db, 'Users', otherUserId);
              const otherUserSnap = await getDoc(otherUserRef);
              if (otherUserSnap.exists()) {
                const otherUserData = otherUserSnap.data();
                const isOtherUserOrganizer = otherUserData.organizer || false;
                const isOtherUserPrivate = otherUserData.isPrivate || false;
                
                // Add if organizer
                if (isOtherUserOrganizer || isCurrentUserOrganizer) {
                  if (!conversationsList.find((c) => c.chatId === chatId)) {
                    conversationsList.push(conversation);
                  }
                }
                // Add if private account messaged public account
                else if (isCurrentUserPrivate && !isOtherUserPrivate) {
                  if (!conversationsList.find((c) => c.chatId === chatId)) {
                    conversationsList.push(conversation);
                  }
                }
                // Add if public account has conversation with private account
                // (If conversation exists, private account must have messaged first, so public can see it)
                else if (!isCurrentUserPrivate && isOtherUserPrivate) {
                  // Public account can always see conversations with private accounts
                  // because the only way the conversation exists is if private account messaged first
                  if (!conversationsList.find((c) => c.chatId === chatId)) {
                    conversationsList.push(conversation);
                  }
                }
                // Add if both are private and the other user messaged first
                else if (isCurrentUserPrivate && isOtherUserPrivate) {
                  // Check if there are messages from the other user
                  const messagesRef = collection(db, 'conversations', chatId, 'messages');
                  const messagesQuery = query(messagesRef, where('senderId', '==', otherUserId), limit(1));
                  const messagesSnap = await getDocs(messagesQuery);
                  
                  if (!messagesSnap.empty) {
                    // Other user has sent a message, so we can see this conversation
                    if (!conversationsList.find((c) => c.chatId === chatId)) {
                      conversationsList.push(conversation);
                    }
                  }
                }
                // Add if both are public accounts
                else if (!isCurrentUserPrivate && !isOtherUserPrivate) {
                  if (!conversationsList.find((c) => c.chatId === chatId)) {
                    conversationsList.push(conversation);
                  }
                }
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
        });
      } catch (err) {
        console.error('Error loading conversations:', err);
      }
    };

    setupConversations();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, authLoading]);

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

  // Search for users - show all users with accounts
  const handleSearch = async () => {
    if (!user) return;

    setIsSearching(true);
    try {
      const usersRef = collection(db, 'Users');
      // Get all users (limit to 50 for performance)
      const q = query(usersRef, limit(50));

      const querySnapshot = await getDocs(q);
      const results: UserResult[] = [];

      // Get current user's data to check friend status and organizer status
      const currentUserRef = doc(db, 'Users', user.uid);
      const currentUserSnap = await getDoc(currentUserRef);
      const currentUserData = currentUserSnap.exists() ? currentUserSnap.data() : {};
      const currentFriends = currentUserData.friends || [];
      const sentRequests = currentUserData.sentFriendRequests || [];
      const receivedRequests = currentUserData.receivedFriendRequests || [];
      const isCurrentUserOrganizer = currentUserData.organizer || false;

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const uid = docSnap.id;

        // Skip current user
        if (uid === user.uid) return;

        // Filter by search query if provided
        const username = (data.Username || '').toLowerCase();
        if (searchQuery.trim() && !username.includes(searchQuery.trim().toLowerCase())) {
          return;
        }

        const isOtherUserOrganizer = data.organizer || false;
        const isOtherUserPrivate = data.isPrivate || false;
        const isCurrentUserPrivate = currentUserData.isPrivate || false;

        let status: FriendRequestStatus = 'none';
        if (currentFriends.includes(uid)) {
          status = 'friends';
        } else if (sentRequests.includes(uid)) {
          status = 'sent';
        } else if (receivedRequests.includes(uid)) {
          status = 'received';
        }
        // Note: We don't set status to 'friends' for messaging permissions
        // Only actual friends should have 'friends' status

        results.push({
          uid,
          username: data.Username || 'Unknown',
          photoURL: data.customPhotoURL || data.photoURL || null,
          status,
          isPrivate: isOtherUserPrivate,
          isOrganizer: isOtherUserOrganizer,
          canMessage: false, // Will be determined when rendering
        });
      });

      setSearchResults(results);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Load all users on mount or when search query is empty
  useEffect(() => {
    if (activeTab === 'search' && user && !searchQuery.trim()) {
      handleSearch();
    }
  }, [activeTab, user]);

  // Handle chat selection from URL parameter
  useEffect(() => {
    if (user && typeof window !== 'undefined' && conversations.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const chatParam = urlParams.get('chat');
      if (chatParam && chatParam !== selectedChatId) {
        const conversation = conversations.find((c) => c.chatId === chatParam);
        if (conversation) {
          handleSelectChat(conversation);
        } else {
          // If conversation doesn't exist, try to create it from the chat ID
          const [uid1, uid2] = chatParam.split('_');
          const otherUserId = uid1 === user.uid ? uid2 : uid1;
          const friend = friends.find((f) => f.uid === otherUserId);
          if (friend) {
            handleSelectChat({
              chatId: chatParam,
              otherUser: friend,
              lastMessage: '',
              lastMessageTime: null,
            });
          }
        }
        // Clean up URL
        router.replace('/friends', { scroll: false });
      }
    }
  }, [user, conversations, friends, selectedChatId, router]);

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

      if (!conversationSnap.exists()) {
        // Only set other user info when creating the conversation
        // We'll load it fresh when displaying, so we don't need to store it
        const conversationData = {
          participants: [user.uid, receiverId],
          lastMessage: messageText.trim(),
          lastMessageTime: serverTimestamp(),
        };
        await setDoc(conversationRef, conversationData);
      } else {
        // Just update the last message, don't update other user info
        // (it might be from the other user's perspective)
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

  // Check if user can message another user (friends, organizer, or public/private rules)
  const canMessageUser = async (otherUserId: string): Promise<boolean> => {
    if (!user) return false;
    
    const currentUserRef = doc(db, 'Users', user.uid);
    const otherUserRef = doc(db, 'Users', otherUserId);
    
    const [currentUserSnap, otherUserSnap] = await Promise.all([
      getDoc(currentUserRef),
      getDoc(otherUserRef),
    ]);
    
    if (!currentUserSnap.exists() || !otherUserSnap.exists()) return false;
    
    const currentUserData = currentUserSnap.data();
    const otherUserData = otherUserSnap.data();
    
    const isCurrentUserOrganizer = currentUserData.organizer || false;
    const isOtherUserOrganizer = otherUserData.organizer || false;
    const isFriend = (currentUserData.friends || []).includes(otherUserId);
    const isCurrentUserPrivate = currentUserData.isPrivate || false;
    const isOtherUserPrivate = otherUserData.isPrivate || false;
    
    // Organizers can always message
    if (isCurrentUserOrganizer || isOtherUserOrganizer) {
      return true;
    }
    
    // Friends can always message each other
    if (isFriend) {
      return true;
    }
    
    // Private accounts can message public accounts
    if (isCurrentUserPrivate && !isOtherUserPrivate) {
      return true;
    }
    
    // Public accounts can message private accounts only if the private account messaged them first
    // Private accounts can message private accounts if the other private account messaged them first
    // Check if there's an existing conversation where the other user sent a message first
    if ((!isCurrentUserPrivate && isOtherUserPrivate) || (isCurrentUserPrivate && isOtherUserPrivate)) {
      const chatId = getChatId(user.uid, otherUserId);
      const conversationRef = doc(db, 'conversations', chatId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        // Check if there are any messages from the other user
        const messagesRef = collection(db, 'conversations', chatId, 'messages');
        const messagesQuery = query(messagesRef, where('senderId', '==', otherUserId), limit(1));
        const messagesSnap = await getDocs(messagesQuery);
        
        if (!messagesSnap.empty) {
          return true; // Other user has sent a message, so we can reply
        }
      }
      return false; // Cannot message private account that hasn't messaged first
    }
    
    // Public accounts can message other public accounts
    if (!isCurrentUserPrivate && !isOtherUserPrivate) {
      return true;
    }
    
    return false;
  };

  // Handle chat selection
  const handleSelectChat = async (conversation: Conversation) => {
    setSelectedChatId(conversation.chatId);
    await ensureConversation(conversation.chatId, conversation.otherUser.uid);
    
    // If conversation doesn't exist in list, add it
    if (!conversations.find((c) => c.chatId === conversation.chatId)) {
      setConversations((prev) => [...prev, conversation]);
    }
  };

  // Send friend request
  const handleSendFriendRequest = async (targetUserId: string) => {
    if (!user) return;

    try {
      const currentUserRef = doc(db, 'Users', user.uid);
      const targetUserRef = doc(db, 'Users', targetUserId);

      await updateDoc(currentUserRef, {
        sentFriendRequests: arrayUnion(targetUserId),
      });

      await updateDoc(targetUserRef, {
        receivedFriendRequests: arrayUnion(user.uid),
      });

      setSearchResults((prev) =>
        prev.map((result) =>
          result.uid === targetUserId ? { ...result, status: 'sent' } : result
        )
      );
    } catch (err) {
      console.error('Error sending friend request:', err);
    }
  };

  // Accept friend request
  const handleAcceptRequest = async (requestUserId: string) => {
    if (!user) return;

    try {
      const currentUserRef = doc(db, 'Users', user.uid);
      const requestUserRef = doc(db, 'Users', requestUserId);

      // Check if already friends to prevent duplicates
      const currentUserSnap = await getDoc(currentUserRef);
      const currentFriends = currentUserSnap.exists() 
        ? currentUserSnap.data().friends || []
        : [];
      
      if (!currentFriends.includes(requestUserId)) {
        await updateDoc(currentUserRef, {
          receivedFriendRequests: arrayRemove(requestUserId),
          friends: arrayUnion(requestUserId),
        });

        await updateDoc(requestUserRef, {
          sentFriendRequests: arrayRemove(user.uid),
          friends: arrayUnion(user.uid),
        });
      }
      // Note: friends list will update automatically via real-time listener
    } catch (err) {
      console.error('Error accepting friend request:', err);
    }
  };

  // Decline friend request
  const handleDeclineRequest = async (requestUserId: string) => {
    if (!user) return;

    try {
      const currentUserRef = doc(db, 'Users', user.uid);
      const requestUserRef = doc(db, 'Users', requestUserId);

      await updateDoc(currentUserRef, {
        receivedFriendRequests: arrayRemove(requestUserId),
      });

      await updateDoc(requestUserRef, {
        sentFriendRequests: arrayRemove(user.uid),
      });

      setFriendRequests((prev) => prev.filter((f) => f.uid !== requestUserId));
    } catch (err) {
      console.error('Error declining friend request:', err);
    }
  };

  // Remove friend
  const handleRemoveFriend = async (friendId: string) => {
    if (!user || !friendToRemove) return;

    try {
      const currentUserRef = doc(db, 'Users', user.uid);
      const friendRef = doc(db, 'Users', friendId);

      await updateDoc(currentUserRef, {
        friends: arrayRemove(friendId),
      });

      await updateDoc(friendRef, {
        friends: arrayRemove(user.uid),
      });

      // If the removed friend's chat is currently selected, clear the selection
      const chatId = getChatId(user.uid, friendId);
      if (selectedChatId === chatId) {
        setSelectedChatId(null);
        setMessages([]);
      }

      // Remove from conversations list
      setConversations((prev) => prev.filter((c) => c.chatId !== chatId));
      
      setRemoveFriendDialogOpen(false);
      setFriendToRemove(null);
      
      // Note: friends list will update automatically via the real-time listener
    } catch (err) {
      console.error('Error removing friend:', err);
    }
  };

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

  // Get selected conversation - either from list or create from friend data
  const selectedConversation = selectedChatId
    ? conversations.find((c) => c.chatId === selectedChatId) ||
      (() => {
        // If not in conversations list, try to find from friends
        if (user) {
          const [uid1, uid2] = selectedChatId.split('_');
          const otherUserId = uid1 === user.uid ? uid2 : uid1;
          const friend = friends.find((f) => f.uid === otherUserId);
          if (friend) {
            return {
              chatId: selectedChatId,
              otherUser: friend,
              lastMessage: '',
              lastMessageTime: null,
            };
          }
        }
        return null;
      })()
    : null;

  return (
    <div className="h-[calc(100vh-5rem)] flex pt-20">
      {/* Left Sidebar - Friends/Requests/Search */}
      <div className="w-80 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold mb-4">Friends</h1>
          
          {/* Tabs */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setActiveTab('friends')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === 'friends'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="inline w-4 h-4 mr-2" />
              Friends ({friends.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 font-semibold transition-colors relative ${
                activeTab === 'requests'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserPlus className="inline w-4 h-4 mr-2" />
              Requests
              {friendRequests.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                  {friendRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === 'search'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Search className="inline w-4 h-4 mr-2" />
              Find
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'search' && (
            <SearchTab
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              isSearching={isSearching}
              onSearch={handleSearch}
              onSendFriendRequest={handleSendFriendRequest}
              onAcceptRequest={handleAcceptRequest}
              onDeclineRequest={handleDeclineRequest}
              onSelectChat={handleSelectChat}
              canMessageUser={canMessageUser}
              getChatId={getChatId}
              currentUserId={user?.uid || ''}
            />
          )}
          {activeTab === 'friends' && (
            <FriendsTab
              friends={friends}
              conversations={conversations}
              selectedChatId={selectedChatId}
              currentUserId={user?.uid || ''}
              onSelectChat={handleSelectChat}
              onRemoveFriend={(friend) => {
                setFriendToRemove(friend);
                setRemoveFriendDialogOpen(true);
              }}
              getChatId={getChatId}
            />
          )}
          {activeTab === 'requests' && (
            <RequestsTab
              friendRequests={friendRequests}
              onAcceptRequest={handleAcceptRequest}
              onDeclineRequest={handleDeclineRequest}
            />
          )}
        </div>
      </div>

      {/* Right Side - Chat Interface */}
      <div className="flex-1 flex flex-col">
        <ChatPanel
          selectedChatId={selectedChatId}
          selectedConversation={selectedConversation}
          messages={messages}
          messageText={messageText}
          setMessageText={setMessageText}
          sending={sending}
          onSendMessage={handleSendMessage}
          formatTimestamp={formatTimestamp}
          currentUserId={user?.uid || ''}
        />
      </div>

      {/* Remove Friend Confirmation Dialog */}
      <Dialog open={removeFriendDialogOpen} onOpenChange={setRemoveFriendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Friend?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {friendToRemove?.username} from your friends list? 
              You'll need to send a new friend request to message them again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRemoveFriendDialogOpen(false);
                setFriendToRemove(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => friendToRemove && handleRemoveFriend(friendToRemove.uid)}
            >
              Remove Friend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
