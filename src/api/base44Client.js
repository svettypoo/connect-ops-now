// Shim — all real calls go through inboxAiClient.js
import api from '@/api/inboxAiClient';

export const base44 = {
  auth: { me: api.me, logout: api.logout },
  integrations: {
    Core: {
      InvokeLLM: async ({ prompt }) => {
        const res = await api.askAI(prompt);
        try { return JSON.parse(typeof res === 'string' ? res : JSON.stringify(res)); } catch { return res; }
      },
      UploadFile: async () => ({ file_url: '' }),
    }
  },
  entities: {
    Message: { create: async () => {} },
    ConversationNote: { create: async () => {} },
  },
};
