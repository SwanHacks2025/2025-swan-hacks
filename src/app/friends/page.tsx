'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebaseAuth';
import { Button } from '@/components/ui/button';
import { Search, UserPlus, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserResult, Conversation } from './types';
import { SearchTab } from './components/SearchTab';
import { FriendsTab } from './components/FriendsTab';
import { RequestsTab } from './components/RequestsTab';
import { ChatPanel } from './components/ChatPanel';
import { getChatId, formatTimestamp } from './utils';
import {
  canMessageUser,
  ensureConversation,
  sendMessage,
} from './services/messaging';
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
} from './services/friendRequests';
import { searchUsers } from './services/search';
import { useFriendsAndRequests } from './hooks/useFriendsAndRequests';
import { useConversations } from './hooks/useConversations';
import { useMessages } from './hooks/useMessages';

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  // Use custom hooks
  const { friends, friendRequests, loading } = useFriendsAndRequests(
    user?.uid || null,
    authLoading,
    setSearchResults
  );
  const conversations = useConversations(user?.uid || null, authLoading);
  const messages = useMessages(user?.uid || null, selectedChatId);

  // Restore search state from sessionStorage when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      const savedQuery = sessionStorage.getItem('friendsSearchQuery');
      const savedModalOpen = sessionStorage.getItem('friendsSearchModalOpen');

      if (savedQuery !== null) {
        setSearchQuery(savedQuery);
      }

      if (savedModalOpen === 'true') {
        setSearchModalOpen(true);
      }
    }
  }, [user]);

  // Load all users when search modal opens
  useEffect(() => {
    if (searchModalOpen && user) {
      // If we have a saved query, restore the search results
      const savedQuery = sessionStorage.getItem('friendsSearchQuery');
      if (savedQuery !== null && savedQuery.trim()) {
        // Use the saved query for search
        const performSearch = async () => {
          setIsSearching(true);
          try {
            const results = await searchUsers(user.uid, savedQuery);
            setSearchResults(results);
          } catch (err) {
            console.error('Error searching users:', err);
          } finally {
            setIsSearching(false);
          }
        };
        performSearch();
      } else if (!searchQuery.trim()) {
        // Otherwise, load all users if no query
        handleSearch();
      }
    }
  }, [searchModalOpen, user]);

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
        router.replace('/friends', { scroll: false });
      }
    }
  }, [user, conversations, friends, selectedChatId, router]);

  // Search for users
  const handleSearch = async () => {
    if (!user) return;
    setIsSearching(true);
    try {
      // Use saved query from sessionStorage if available, otherwise use current query
      const queryToUse =
        sessionStorage.getItem('friendsSearchQuery') || searchQuery;
      const results = await searchUsers(user.uid, queryToUse);
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle chat selection
  const handleSelectChat = async (conversation: Conversation) => {
    if (!user) return;
    setSelectedChatId(conversation.chatId);
    try {
      await ensureConversation(
        user.uid,
        conversation.chatId,
        conversation.otherUser.uid
      );
    } catch (err) {
      console.error('Error ensuring conversation:', err);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!user || !selectedChatId || !messageText.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(user.uid, selectedChatId, messageText);
      setMessageText('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  // Send friend request
  const handleSendFriendRequest = async (targetUserId: string) => {
    if (!user) return;
    try {
      await sendFriendRequest(user.uid, targetUserId);
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
      await acceptFriendRequest(user.uid, requestUserId);
    } catch (err) {
      console.error('Error accepting friend request:', err);
    }
  };

  // Decline friend request
  const handleDeclineRequest = async (requestUserId: string) => {
    if (!user) return;
    try {
      await declineFriendRequest(user.uid, requestUserId);
    } catch (err) {
      console.error('Error declining friend request:', err);
    }
  };

  // Wrapper for canMessageUser to match component interface
  const canMessageUserWrapper = async (
    otherUserId: string
  ): Promise<boolean> => {
    if (!user) return false;
    return canMessageUser(user.uid, otherUserId);
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

  // Get selected conversation
  const selectedConversation = selectedChatId
    ? conversations.find((c) => c.chatId === selectedChatId) ||
      (() => {
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
    <div
      className="spotlight-container relative"
      style={{ minHeight: '100vh', height: '100vh' }}
    >
      {/* Spotlight Background Overlay */}
      <div className="spotlight-overlay fixed inset-0 pointer-events-none z-0">
        <motion.div
          initial={{ x: 200, y: 100 }}
          animate={{
            x: [200, 400, 100, 200],
            y: [100, 200, 50, 100],
          }}
          transition={{
            duration: 18,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatType: 'reverse',
          }}
          className="spotlight spotlight-left absolute rounded-full will-change-transform"
          style={{
            width: '1000px',
            height: '1000px',
            filter: 'blur(100px)',
            opacity: 0.35,
            background:
              'radial-gradient(circle, rgba(2, 129, 116, 0.15) 0%, rgba(2, 129, 116, 0.1) 25%, rgba(2, 129, 116, 0.05) 50%, transparent 70%)',
          }}
        />

        <motion.div
          initial={{ x: '80%', y: '20%' }}
          animate={{
            x: ['80%', '60%', '90%', '80%'],
            y: ['20%', '40%', '10%', '20%'],
          }}
          transition={{
            duration: 22,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatType: 'reverse',
            delay: 1.5,
          }}
          className="spotlight spotlight-mid absolute rounded-full will-change-transform"
          style={{
            width: '1000px',
            height: '1000px',
            filter: 'blur(100px)',
            opacity: 0.35,
            background:
              'radial-gradient(circle, rgba(10, 182, 139, 0.15) 0%, rgba(10, 182, 139, 0.1) 25%, rgba(10, 182, 139, 0.05) 50%, transparent 70%)',
          }}
        />

        <motion.div
          initial={{ x: 100, y: 300 }}
          animate={{
            x: [100, -100, 300, 100],
            y: [300, 500, 200, 300],
          }}
          transition={{
            duration: 20,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatType: 'reverse',
            delay: 3,
          }}
          className="spotlight spotlight-right absolute rounded-full will-change-transform"
          style={{
            width: '1000px',
            height: '1000px',
            filter: 'blur(100px)',
            opacity: 0.35,
            background:
              'radial-gradient(circle, rgba(255, 227, 179, 0.2) 0%, rgba(255, 227, 179, 0.12) 25%, rgba(255, 227, 179, 0.06) 50%, transparent 70%)',
          }}
        />
      </div>

      {/* Content with proper z-index to overlap background */}
      <main
        className="relative z-10 pt-20 md:pt-28 pb-4 md:pb-8 px-3 md:px-6 flex flex-col w-full"
        style={{ minHeight: '100vh', height: '100vh' }}
      >
        <div className="max-w-7xl mx-auto w-full flex-1 flex gap-3 md:gap-6 min-h-0">
          {/* Left Sidebar - Friends/Requests/Search - Floating Island */}
          <div
            className={`${
              selectedChatId ? 'hidden md:flex' : 'flex'
            } w-full md:w-96 bg-background/70 backdrop-blur-xl rounded-xl md:rounded-2xl border border-border shadow-lg flex-col relative z-20`}
          >
            <div className="p-4 md:p-6 border-b border-border/50">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h1 className="text-xl md:text-2xl font-bold">Friends</h1>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchModalOpen(true)}
                  className="gap-2 cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-all"
                >
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:inline">Find Friends</span>
                </Button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-muted/30 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('friends')}
                  className={`flex-1 px-2 md:px-3 py-1.5 md:py-2 rounded-md font-medium text-xs md:text-sm transition-all cursor-pointer ${
                    activeTab === 'friends'
                      ? 'bg-background text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  }`}
                >
                  <Users className="inline w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-1.5" />
                  <span className="hidden sm:inline">Friends</span>
                  <span className="sm:hidden">Fr</span>
                  <span className="ml-0.5">({friends.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`flex-1 px-2 md:px-3 py-1.5 md:py-2 rounded-md font-medium text-xs md:text-sm transition-all relative cursor-pointer ${
                    activeTab === 'requests'
                      ? 'bg-background text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  }`}
                >
                  <UserPlus className="inline w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-1.5" />
                  <span className="hidden sm:inline">Requests</span>
                  <span className="sm:hidden">Req</span>
                  {friendRequests.length > 0 && (
                    <span className="ml-1 md:ml-1.5 px-1 md:px-1.5 py-0.5 text-[10px] md:text-xs bg-primary text-primary-foreground rounded-full">
                      {friendRequests.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {activeTab === 'friends' && (
                <FriendsTab
                  friends={friends}
                  conversations={conversations}
                  selectedChatId={selectedChatId}
                  currentUserId={user.uid}
                  onSelectChat={handleSelectChat}
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

          {/* Right Side - Chat Interface - Floating Island */}
          <div
            className={`${
              selectedChatId ? 'flex' : 'hidden md:flex'
            } flex-1 bg-background/70 backdrop-blur-xl rounded-xl md:rounded-2xl border border-border shadow-lg flex-col relative z-20`}
          >
            <ChatPanel
              selectedChatId={selectedChatId}
              selectedConversation={selectedConversation}
              messages={messages}
              messageText={messageText}
              setMessageText={setMessageText}
              sending={sending}
              onSendMessage={handleSendMessage}
              formatTimestamp={formatTimestamp}
              currentUserId={user.uid}
              onBack={() => setSelectedChatId(null)}
            />
          </div>
        </div>
      </main>

      {/* Search Modal */}
      <Dialog
        open={searchModalOpen}
        onOpenChange={(open) => {
          setSearchModalOpen(open);
          // Save modal state to sessionStorage
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('friendsSearchModalOpen', open.toString());
            if (!open) {
              // Clear saved state when modal is closed manually
              sessionStorage.removeItem('friendsSearchQuery');
              sessionStorage.removeItem('friendsSearchModalOpen');
            }
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Find Friends</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            <SearchTab
              searchQuery={searchQuery}
              setSearchQuery={(query) => {
                setSearchQuery(query);
                // Save query to sessionStorage
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('friendsSearchQuery', query);
                }
              }}
              searchResults={searchResults}
              isSearching={isSearching}
              onSearch={handleSearch}
              onSendFriendRequest={handleSendFriendRequest}
              onAcceptRequest={handleAcceptRequest}
              onDeclineRequest={handleDeclineRequest}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
