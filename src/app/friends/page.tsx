'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebaseAuth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, UserPlus, Users } from 'lucide-react';
import { UserResult, Conversation } from './types';
import { SearchTab } from './components/SearchTab';
import { FriendsTab } from './components/FriendsTab';
import { RequestsTab } from './components/RequestsTab';
import { ChatPanel } from './components/ChatPanel';
import { getChatId, formatTimestamp } from './utils';
import { canMessageUser, ensureConversation, sendMessage } from './services/messaging';
import { sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend } from './services/friendRequests';
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
  const [activeTab, setActiveTab] = useState<'search' | 'friends' | 'requests'>('friends');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [removeFriendDialogOpen, setRemoveFriendDialogOpen] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<UserResult | null>(null);

  // Use custom hooks
  const { friends, friendRequests, loading } = useFriendsAndRequests(
    user?.uid || null,
    authLoading,
    setSearchResults
  );
  const conversations = useConversations(user?.uid || null, authLoading);
  const messages = useMessages(user?.uid || null, selectedChatId);

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
      const results = await searchUsers(user.uid, searchQuery);
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
      await ensureConversation(user.uid, conversation.chatId, conversation.otherUser.uid);
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

  // Remove friend
  const handleRemoveFriend = async (friendId: string) => {
    if (!user || !friendToRemove) return;
    try {
      await removeFriend(user.uid, friendId);
      const chatId = getChatId(user.uid, friendId);
      if (selectedChatId === chatId) {
        setSelectedChatId(null);
      }
      setRemoveFriendDialogOpen(false);
      setFriendToRemove(null);
    } catch (err) {
      console.error('Error removing friend:', err);
    }
  };

  // Wrapper for canMessageUser to match component interface
  const canMessageUserWrapper = async (otherUserId: string): Promise<boolean> => {
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
              canMessageUser={canMessageUserWrapper}
              getChatId={getChatId}
              currentUserId={user.uid}
            />
          )}
          {activeTab === 'friends' && (
            <FriendsTab
              friends={friends}
              conversations={conversations}
              selectedChatId={selectedChatId}
              currentUserId={user.uid}
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
          currentUserId={user.uid}
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
