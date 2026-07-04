export const CONTACT_MESSAGES_STORAGE_KEY = 'cdb-contact-messages-v1';

export const getStoredContactMessages = () => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(CONTACT_MESSAGES_STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

export const saveLocalContactMessage = (message) => {
  const messages = getStoredContactMessages();
  const nextMessage = { id: `message-${Date.now()}`, status: 'new', created_at: new Date().toISOString(), ...message };
  window.localStorage.setItem(CONTACT_MESSAGES_STORAGE_KEY, JSON.stringify([nextMessage, ...messages]));
  return nextMessage;
};

export const saveStoredContactMessages = (messages) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(CONTACT_MESSAGES_STORAGE_KEY, JSON.stringify(messages));
  return messages;
};
