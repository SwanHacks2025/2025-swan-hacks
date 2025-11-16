'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, UserPlus, Check, X, MessageCircle } from 'lucide-react';
import { UserResult, Conversation } from '../types';

interface SearchTabProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: UserResult[];
  isSearching: boolean;
  onSearch: () => void;
  onSendFriendRequest: (uid: string) => void;
  onAcceptRequest: (uid: string) => void;
  onDeclineRequest: (uid: string) => void;
  onSelectChat: (conversation: Conversation) => void;
  canMessageUser: (uid: string) => Promise<boolean>;
  getChatId: (uid1: string, uid2: string) => string;
  currentUserId: string;
}

export function SearchTab({
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  onSearch,
  onSendFriendRequest,
  onAcceptRequest,
  onDeclineRequest,
  onSelectChat,
  canMessageUser,
  getChatId,
  currentUserId,
}: SearchTabProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Search by username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSearch();
            }
          }}
          className="flex-1"
        />
        <Button onClick={onSearch} disabled={isSearching}>
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
              <div className="flex gap-2">
                {/* Message button - show for friends, or for non-private accounts (even if request sent), or for private accounts that are friends */}
                {((!result.isPrivate && (result.status === 'friends' || result.status === 'none' || result.status === 'sent')) || 
                  (result.isPrivate && result.status === 'friends')) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const canMessage = await canMessageUser(result.uid);
                      if (canMessage) {
                        const chatId = getChatId(currentUserId, result.uid);
                        onSelectChat({
                          chatId,
                          otherUser: result,
                          lastMessage: '',
                          lastMessageTime: null,
                        });
                      }
                    }}
                    title="Message"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                )}
                {result.status === 'none' && (
                  <Button
                    size="sm"
                    onClick={() => onSendFriendRequest(result.uid)}
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
                      onClick={() => onAcceptRequest(result.uid)}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDeclineRequest(result.uid)}
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
  );
}

