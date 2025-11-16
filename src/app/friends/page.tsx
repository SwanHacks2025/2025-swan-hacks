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
import { Search, UserPlus, Check, X, Users, MessageCircle, Send, UserMinus } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

type FriendRequestStatus = 'none' | 'sent' | 'received' | 'friends';

interface UserResult {
  uid: string;
  username: string;
  photoURL: string | null;
  status: FriendRequestStatus;
}

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
            if (sentRequests.includes(result.uid)) {
              return { ...result, status: 'sent' };
            }
            if (friendsList.includes(result.uid)) {
              return { ...result, status: 'friends' };
            }
            if (receivedRequests.includes(result.uid)) {
              return { ...result, status: 'received' };
            }
            return { ...result, status: 'none' };
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

  // Load conversations
  useEffect(() => {
    if (!user || !authLoading) return;

    const loadConversations = async () => {
      try {
        // Get user's friends
        const userRef = doc(db, 'Users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return;

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
      } catch (err) {
        console.error('Error loading conversations:', err);
      }
    };

    loadConversations();
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

      // Get current user's data to check friend status
      const currentUserRef = doc(db, 'Users', user.uid);
      const currentUserSnap = await getDoc(currentUserRef);
      const currentUserData = currentUserSnap.exists() ? currentUserSnap.data() : {};
      const currentFriends = currentUserData.friends || [];
      const sentRequests = currentUserData.sentFriendRequests || [];
      const receivedRequests = currentUserData.receivedFriendRequests || [];

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

        let status: FriendRequestStatus = 'none';
        if (currentFriends.includes(uid)) {
          status = 'friends';
        } else if (sentRequests.includes(uid)) {
          status = 'sent';
        } else if (receivedRequests.includes(uid)) {
          status = 'received';
        }

        results.push({
          uid,
          username: data.Username || 'Unknown',
          photoURL: data.customPhotoURL || data.photoURL || null,
          status,
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
        await setDoc(conversationRef, conversationData);
      } else {
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
          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={isSearching}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <div
                      key={result.uid}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                    >
                      <Link
                        href={`/profile/${result.uid}`}
                        className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="h-10 w-10">
                          {result.photoURL && <AvatarImage src={result.photoURL} />}
                          <AvatarFallback>
                            {result.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{result.username}</p>
                        </div>
                      </Link>
                      <div>
                        {result.status === 'none' && (
                          <Button
                            size="sm"
                            onClick={() => handleSendFriendRequest(result.uid)}
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add
                          </Button>
                        )}
                        {result.status === 'sent' && (
                          <Button size="sm" variant="outline" disabled>
                            Sent
                          </Button>
                        )}
                        {result.status === 'friends' && (
                          <Button size="sm" variant="outline" disabled>
                            Friends
                          </Button>
                        )}
                        {result.status === 'received' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptRequest(result.uid)}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeclineRequest(result.uid)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <p className="text-center text-muted-foreground py-8">
                  No users found. Try a different search term.
                </p>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {isSearching ? 'Searching...' : 'All users will appear here. Use search to filter.'}
                </p>
              )}
            </div>
          )}

          {/* Friends Tab */}
          {activeTab === 'friends' && (
            <div className="space-y-2 p-4">
              {friends.length > 0 ? (
                friends.map((friend) => {
                  const chatId = getChatId(user.uid, friend.uid);
                  const conversation = conversations.find((c) => c.chatId === chatId);
                  return (
                    <div
                      key={friend.uid}
                      className={`w-full p-3 rounded-lg border transition-colors ${
                        selectedChatId === chatId ? 'bg-accent border-primary' : 'hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleSelectChat(conversation || {
                            chatId,
                            otherUser: friend,
                            lastMessage: '',
                            lastMessageTime: null,
                          })}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          <Avatar className="h-12 w-12">
                            {friend.photoURL && <AvatarImage src={friend.photoURL} />}
                            <AvatarFallback>
                              {friend.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {friend.username}
                            </p>
                            {conversation?.lastMessage && (
                              <p className="text-sm text-foreground/80 truncate">
                                {conversation.lastMessage}
                              </p>
                            )}
                          </div>
                        </button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFriendToRemove(friend);
                            setRemoveFriendDialogOpen(true);
                          }}
                          className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                          title="Remove friend"
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  You don't have any friends yet. Search for users to add them!
                </p>
              )}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-2 p-4">
              {friendRequests.length > 0 ? (
                friendRequests.map((request) => (
                  <div
                    key={request.uid}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {request.photoURL && <AvatarImage src={request.photoURL} />}
                        <AvatarFallback>
                          {request.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{request.username}</p>
                        <p className="text-sm text-muted-foreground">wants to be your friend</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptRequest(request.uid)}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeclineRequest(request.uid)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No pending friend requests.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Chat Interface */}
      <div className="flex-1 flex flex-col">
        {selectedChatId && selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center gap-3 bg-card sticky top-0 z-10">
              <Avatar className="h-10 w-10">
                {selectedConversation.otherUser.photoURL && (
                  <AvatarImage src={selectedConversation.otherUser.photoURL} />
                )}
                <AvatarFallback>
                  {selectedConversation.otherUser.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Link
                  href={`/profile/${selectedConversation.otherUser.uid}`}
                  className="font-semibold text-foreground hover:text-primary transition-colors"
                >
                  {selectedConversation.otherUser.username}
                </Link>
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
              <p>Select a friend to start messaging</p>
            </div>
          </div>
        )}
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
