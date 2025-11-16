'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Send } from 'lucide-react';
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
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!selectedChatId || !selectedConversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Select a friend to start messaging</p>
        </div>
      </div>
    );
  }

  return (
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
            const isOwn = message.senderId === currentUserId;
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
                onSendMessage();
              }
            }}
            className="flex-1"
          />
          <Button onClick={onSendMessage} disabled={sending || !messageText.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

