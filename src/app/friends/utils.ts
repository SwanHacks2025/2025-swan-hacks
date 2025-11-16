import { Timestamp } from 'firebase/firestore';

// Generate chat ID from two user IDs (sorted for consistency)
export const getChatId = (uid1: string, uid2: string): string => {
  return [uid1, uid2].sort().join('_');
};

// Format timestamp safely
export const formatTimestamp = (timestamp: Timestamp | null | undefined): string => {
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

