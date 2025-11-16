'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UserMinus } from 'lucide-react';
import { UserResult, Conversation } from '../types';

interface FriendsTabProps {
  friends: UserResult[];
  conversations: Conversation[];
  selectedChatId: string | null;
  currentUserId: string;
  onSelectChat: (conversation: Conversation) => void;
  onRemoveFriend: (friend: UserResult) => void;
  getChatId: (uid1: string, uid2: string) => string;
}

export function FriendsTab({
  friends,
  conversations,
  selectedChatId,
  currentUserId,
  onSelectChat,
  onRemoveFriend,
  getChatId,
}: FriendsTabProps) {
  // Combine friends and conversations with non-friends
  const friendIds = new Set(friends.map(f => f.uid));
  const nonFriendConversations = conversations.filter(c => !friendIds.has(c.otherUser.uid));
  
  // Create a combined list: friends first, then non-friend conversations
  const allItems: Array<{ type: 'friend' | 'conversation'; data: UserResult | Conversation }> = [
    ...friends.map(f => ({ type: 'friend' as const, data: f })),
    ...nonFriendConversations.map(c => ({ type: 'conversation' as const, data: c }))
  ];

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
            <div
              key={friend.uid}
              className={`w-full p-3 rounded-lg border transition-colors ${
                selectedChatId === chatId ? 'bg-accent border-primary' : 'hover:bg-accent'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onSelectChat(conversation || {
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
                    onRemoveFriend(friend);
                  }}
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                  title="Remove friend"
                >
                  <UserMinus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        } else {
          const conversation = item.data as Conversation;
          return (
            <div
              key={conversation.chatId}
              className={`w-full p-3 rounded-lg border transition-colors ${
                selectedChatId === conversation.chatId ? 'bg-accent border-primary' : 'hover:bg-accent'
              }`}
            >
              <button
                onClick={() => onSelectChat(conversation)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left w-full"
              >
                <Avatar className="h-12 w-12">
                  {conversation.otherUser.photoURL && <AvatarImage src={conversation.otherUser.photoURL} />}
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
              </button>
            </div>
          );
        }
      })}
    </div>
  );
}

