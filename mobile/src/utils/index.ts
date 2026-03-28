import { Alert, Linking } from 'react-native';

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(timeStr: string): string {
  return timeStr; // Times already stored as "HH:MM AM" format
}

export function handleCallPhone(phone?: string) {
  if (!phone) {
    Alert.alert('No Phone', 'No phone number available.');
    return;
  }
  Linking.openURL(`tel:${phone}`);
}

export function handleWhatsApp(whatsapp?: string) {
  if (!whatsapp) {
    Alert.alert('No WhatsApp', 'No WhatsApp number available.');
    return;
  }
  Linking.openURL(`whatsapp://send?phone=${whatsapp}`);
}

export function logError(message: string, error: unknown) {
  if (__DEV__) {
    console.error(message, error);
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Something went wrong';
}
