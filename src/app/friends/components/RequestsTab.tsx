'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Check, X } from 'lucide-react';
import { UserResult } from '../types';

interface RequestsTabProps {
  friendRequests: UserResult[];
  onAcceptRequest: (uid: string) => void;
  onDeclineRequest: (uid: string) => void;
}

export function RequestsTab({
  friendRequests,
  onAcceptRequest,
  onDeclineRequest,
}: RequestsTabProps) {
  if (friendRequests.length === 0) {
    return (
      <div className="space-y-2 p-4">
        <p className="text-center text-muted-foreground py-8">
          No pending friend requests.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {friendRequests.map((request) => (
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
              <p className="text-sm text-muted-foreground">
                wants to be your friend
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => onAcceptRequest(request.uid)}
              className="cursor-pointer hover:scale-105 transition-transform"
            >
              <Check className="w-4 h-4 mr-2" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDeclineRequest(request.uid)}
              className="cursor-pointer hover:scale-105 transition-transform hover:bg-destructive/10 hover:border-destructive/50"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
