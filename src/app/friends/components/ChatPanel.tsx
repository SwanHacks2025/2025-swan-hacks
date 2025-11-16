'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Send, ArrowLeft } from 'lucide-react';
import { Conversation, Message } from '../types';
import { Timestamp } from 'firebase/firestore';

interface ChatPanelProps {
  selectedChatId: string | null;
  selectedConversation: Conversation | null;
  messages: Message[];
  messageText: string;
  setMessageText: (text: string) => void;
  sending: boolean;
  onSendMessage: () => void;
  formatTimestamp: (timestamp: Timestamp | null | undefined) => string;
  currentUserId: string;
  onBack?: () => void;
}

export function ChatPanel({
  selectedChatId,
  selectedConversation,
  messages,
  messageText,
  setMessageText,
  sending,
  onSendMessage,
  formatTimestamp,
  currentUserId,
  onBack,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const previousChatIdRef = useRef<string | null>(null);
  const shouldAutoScrollRef = useRef<boolean>(true);

  // Reset scroll behavior when chat changes
  useEffect(() => {
    if (previousChatIdRef.current !== selectedChatId) {
      shouldAutoScrollRef.current = true;
      previousChatIdRef.current = selectedChatId;
    }
  }, [selectedChatId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (!messagesContainerRef.current) return;

    const container = messagesContainerRef.current;

    // Always scroll when chat changed or when we should auto-scroll
    if (shouldAutoScrollRef.current) {
      // Use double requestAnimationFrame to ensure DOM has fully updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight;
            shouldAutoScrollRef.current = false; // Reset after scrolling
          }
        });
      });
      return;
    }

    // For new messages, only scroll if user is near the bottom
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const isNearBottom =
      scrollHeight - container.scrollTop - clientHeight < 100;

    if (isNearBottom && messages.length > 0) {
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth',
          });
        }
      });
    }
  }, [messages]);

  if (!selectedChatId || !selectedConversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground px-4">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-3 md:mb-4 opacity-30" />
          <p className="text-base md:text-lg font-medium">
            Select a friend to start messaging
          </p>
          <p className="text-xs md:text-sm mt-2 opacity-70">
            Choose a conversation from the sidebar
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Chat Header */}
      <div className="p-4 md:p-6 border-b border-border/50 flex items-center gap-3 md:gap-4">
        {/* Mobile Back Button */}
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="md:hidden h-8 w-8 -ml-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <Avatar className="h-10 w-10 md:h-12 md:w-12 ring-2 ring-primary/10">
          {selectedConversation.otherUser.photoURL && (
            <AvatarImage src={selectedConversation.otherUser.photoURL} />
          )}
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm md:text-base">
            {selectedConversation.otherUser.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Link
            href={`/profile/${selectedConversation.otherUser.uid}`}
            className="text-base md:text-lg font-bold text-foreground hover:text-primary transition-colors"
          >
            {selectedConversation.otherUser.username}
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3"
      >
        {messages.length > 0 ? (
          messages.map((message) => {
            const isOwn = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-xl md:rounded-2xl px-3 py-2 md:px-4 md:py-2.5 shadow-sm ${
                    isOwn
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/60 text-foreground border border-border/40'
                  }`}
                >
                  <p className="text-sm leading-relaxed wrap-break-word">
                    {message.text}
                  </p>
                  {message.timestamp && formatTimestamp(message.timestamp) && (
                    <p
                      className={`text-[10px] mt-1 ${
                        isOwn
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground/70'
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
          <div className="text-center text-muted-foreground py-12">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No messages yet</p>
            <p className="text-sm mt-1 opacity-70">Start the conversation!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 md:p-6 border-t border-border/50">
        <div className="flex gap-2 md:gap-3">
          <Input
            type="text"
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
            className="flex-1 bg-muted/30 border-border/50 rounded-lg md:rounded-xl px-3 md:px-4 text-sm md:text-base focus-visible:ring-primary/20"
          />
          <Button
            onClick={onSendMessage}
            disabled={sending || !messageText.trim()}
            className="rounded-lg md:rounded-xl px-4 md:px-5"
            size="default"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
