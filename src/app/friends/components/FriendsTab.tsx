'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UserResult, Conversation } from '../types';

interface FriendsTabProps {
  friends: UserResult[];
  conversations: Conversation[];
  selectedChatId: string | null;
  currentUserId: string;
  onSelectChat: (conversation: Conversation) => void;
  getChatId: (uid1: string, uid2: string) => string;
}

export function FriendsTab({
  friends,
  conversations,
  selectedChatId,
  currentUserId,
  onSelectChat,
  getChatId,
}: FriendsTabProps) {
  // Combine friends and conversations with non-friends
  const friendIds = new Set(friends.map((f) => f.uid));
  const nonFriendConversations = conversations.filter(
    (c) => !friendIds.has(c.otherUser.uid)
  );

  // Create a unified list with both friends and conversations, sorted by last message time
  const allItems: Array<{
    type: 'friend' | 'conversation';
    data: UserResult | Conversation;
    lastMessageTime: number | null; // timestamp in milliseconds for sorting
  }> = [
    // Map friends to items with their conversation's lastMessageTime
    ...friends.map((f) => {
      const chatId = getChatId(currentUserId, f.uid);
      const conversation = conversations.find((c) => c.chatId === chatId);
      return {
        type: 'friend' as const,
        data: f,
        lastMessageTime: conversation?.lastMessageTime
          ? conversation.lastMessageTime.toMillis()
          : null,
      };
    }),
    // Map non-friend conversations
    ...nonFriendConversations.map((c) => ({
      type: 'conversation' as const,
      data: c,
      lastMessageTime: c.lastMessageTime ? c.lastMessageTime.toMillis() : null,
    })),
  ];

  // Sort by last message time (most recent first), then by type (friends with messages first)
  allItems.sort((a, b) => {
    // If both have lastMessageTime, sort by time (most recent first)
    if (a.lastMessageTime && b.lastMessageTime) {
      return b.lastMessageTime - a.lastMessageTime;
    }
    // If only one has lastMessageTime, prioritize it
    if (a.lastMessageTime && !b.lastMessageTime) return -1;
    if (!a.lastMessageTime && b.lastMessageTime) return 1;
    // If neither has lastMessageTime, maintain original order (friends first)
    if (a.type === 'friend' && b.type === 'conversation') return -1;
    if (a.type === 'conversation' && b.type === 'friend') return 1;
    return 0;
  });

  if (allItems.length === 0) {
    return (
      <div className="space-y-2 p-4">
        <p className="text-center text-muted-foreground py-8">
          You don't have any friends yet. Search for users to add them!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {allItems.map((item) => {
        if (item.type === 'friend') {
          const friend = item.data as UserResult;
          const chatId = getChatId(currentUserId, friend.uid);
          const conversation = conversations.find((c) => c.chatId === chatId);
          return (
            <button
              key={friend.uid}
              onClick={() =>
                onSelectChat(
                  conversation || {
                    chatId,
                    otherUser: friend,
                    lastMessage: '',
                    lastMessageTime: null,
                  }
                )
              }
              className={`w-full p-3 rounded-lg border transition-all text-left cursor-pointer ${
                selectedChatId === chatId
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50 hover:border-primary/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {friend.photoURL && <AvatarImage src={friend.photoURL} />}
                  <AvatarFallback>
                    {friend.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{friend.username}</p>
                  {conversation?.lastMessage && (
                    <p className="text-sm truncate opacity-70">
                      {conversation.lastMessage}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        } else {
          const conversation = item.data as Conversation;
          return (
            <button
              key={conversation.chatId}
              onClick={() => onSelectChat(conversation)}
              className={`w-full p-3 rounded-lg border transition-all text-left cursor-pointer ${
                selectedChatId === conversation.chatId
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50 hover:border-primary/30'
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
                  <p className="font-semibold truncate">
                    {conversation.otherUser.username}
                  </p>
                  {conversation.lastMessage && (
                    <p className="text-sm truncate opacity-70">
                      {conversation.lastMessage}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        }
      })}
    </div>
  );
}
