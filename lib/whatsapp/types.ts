export type WhatsAppStatus =
  "DISCONNECTED" | "CONNECTING" | "AWAITING_SCAN" | "CONNECTED" | "FAILED";

export interface WhatsAppConnectionState {
  organizationId: string;
  status: WhatsAppStatus;
  phoneNumber?: string | null;
  jid?: string | null;
  platform?: string | null;
  pushName?: string | null;
  qrCode?: string | null;
  qrExpiresAt?: string | null;
  lastConnectedAt?: string | null;
  lastDisconnectedAt?: string | null;
  disconnectReason?: string | null;
}

export interface WorkerSessionStatusResponse {
  success: boolean;
  state: WhatsAppConnectionState;
  isSocketActive: boolean;
}

export interface WorkerConnectResponse {
  success: boolean;
  message: string;
  status: WhatsAppStatus;
  qrCode?: string | null;
}

export interface WorkerDisconnectResponse {
  success: boolean;
  message: string;
}

export interface IncomingWhatsAppMessagePayload {
  organizationId: string;
  remoteJid: string;
  senderJid?: string;
  messageId: string;
  text: string;
  timestamp: number;
}
