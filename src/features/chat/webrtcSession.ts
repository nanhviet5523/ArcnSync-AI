import type { CallSignalPayload, IceServerItem, IncomingCallSignalEvent } from '@/types/chat';

export type WebRtcConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
export type MediaWarningCode = 'audio-only' | 'receive-only' | null;

export interface WebRtcSessionCallbacks {
  sendSignal: (payload: CallSignalPayload) => Promise<{ ok: boolean; code?: string }>;
  onLocalStream: (stream: MediaStream | null) => void;
  onRemoteStream: (stream: MediaStream | null) => void;
  onConnectionStatus: (status: WebRtcConnectionStatus) => void;
  onMediaWarning: (warning: MediaWarningCode) => void;
  onScreenShareChange: (sharing: boolean) => void;
}

/**
 * Encapsulates one 1-1 WebRTC P2P session for a video call.
 * - Gracefully degrades media: video+audio → audio-only → receive-only so two-tab / single-camera demos never break.
 * - Buffers incoming `call.signal` events while initializing and buffers ICE candidates until remoteDescription is set.
 * - Supports live mic mute, camera toggle, and screen sharing via `replaceTrack`.
 */
export class WebRtcCallSession {
  private readonly callId: string;
  private readonly iceServers: IceServerItem[];
  private readonly callbacks: WebRtcSessionCallbacks;

  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private cameraVideoTrack: MediaStreamTrack | null = null;
  private videoSender: RTCRtpSender | null = null;

  private disposed = false;
  private ready = false;
  private isMuted = false;
  private isCameraOff = false;
  private isSharingScreen = false;

  /** Signals received before `init()` finishes setting up the peer connection. */
  private pendingSignals: IncomingCallSignalEvent[] = [];
  /** ICE candidates received before `setRemoteDescription` finishes. */
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private signalChain: Promise<void> = Promise.resolve();

  constructor(callId: string, iceServers: IceServerItem[], callbacks: WebRtcSessionCallbacks) {
    this.callId = callId;
    this.iceServers = iceServers;
    this.callbacks = callbacks;
  }

  getCallId(): string {
    return this.callId;
  }

  /** Acquire local media preview and prepare the RTCPeerConnection. */
  async prepareMedia(): Promise<void> {
    if (this.disposed || this.localStream) return;
    const acquired = await this.acquireBestMedia();
    if (this.disposed) {
      acquired.stream?.getTracks().forEach((track) => track.stop());
      return;
    }
    this.localStream = acquired.stream;
    this.cameraVideoTrack = acquired.stream?.getVideoTracks()[0] ?? null;
    this.isCameraOff = !this.cameraVideoTrack;
    this.callbacks.onMediaWarning(acquired.warning);
    this.callbacks.onLocalStream(this.localStream);
  }

  /** Create the RTCPeerConnection, attach tracks/transceivers, and flush buffered signals. */
  async connect(asCaller: boolean): Promise<void> {
    if (this.disposed) return;
    if (!this.localStream) {
      await this.prepareMedia();
    }
    if (this.disposed) return;

    if (!this.pc) {
      this.createPeerConnection();
    }
    this.ready = true;
    this.callbacks.onConnectionStatus('connecting');

    if (asCaller && this.pc) {
      const offer = await this.pc.createOffer();
      if (this.disposed || !this.pc) return;
      await this.pc.setLocalDescription(offer);
      await this.callbacks.sendSignal({
        callId: this.callId,
        kind: 'offer',
        data: this.pc.localDescription,
      });
    }

    // Flush any offer/ICE signals that arrived while media/PC were initializing.
    const queued = this.pendingSignals.splice(0, this.pendingSignals.length);
    for (const signal of queued) {
      this.handleSignal(signal);
    }
  }

  /** Process an incoming `call.signal` event (serialized to avoid SDP/ICE races). */
  handleSignal(event: IncomingCallSignalEvent): void {
    if (this.disposed || event.callId !== this.callId) return;
    if (!this.ready || !this.pc) {
      this.pendingSignals.push(event);
      return;
    }
    this.signalChain = this.signalChain
      .then(() => this.applySignal(event))
      .catch((error: unknown) => {
        if (!this.disposed) {
          console.error('WebRTC signal handling failed', error);
        }
      });
  }

  toggleMute(): boolean {
    const audioTracks = this.localStream?.getAudioTracks() ?? [];
    if (audioTracks.length === 0) return this.isMuted;
    this.isMuted = !this.isMuted;
    for (const track of audioTracks) {
      track.enabled = !this.isMuted;
    }
    return this.isMuted;
  }

  toggleCamera(): boolean {
    if (!this.cameraVideoTrack) return true;
    this.isCameraOff = !this.isCameraOff;
    this.cameraVideoTrack.enabled = !this.isCameraOff;
    return this.isCameraOff;
  }

  hasAudioTrack(): boolean {
    return (this.localStream?.getAudioTracks().length ?? 0) > 0;
  }

  hasVideoTrack(): boolean {
    return this.cameraVideoTrack !== null;
  }

  /** Toggle screen sharing via `getDisplayMedia` + `RTCRtpSender.replaceTrack`. */
  async toggleScreenShare(): Promise<boolean> {
    if (this.disposed) return false;
    if (this.isSharingScreen) {
      await this.stopScreenShare();
      return false;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('SCREEN_SHARE_UNSUPPORTED');
    }
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    if (this.disposed) {
      displayStream.getTracks().forEach((t) => t.stop());
      return false;
    }
    const screenTrack = displayStream.getVideoTracks()[0];
    if (!screenTrack) {
      displayStream.getTracks().forEach((t) => t.stop());
      return false;
    }

    this.screenStream = displayStream;
    this.isSharingScreen = true;
    this.callbacks.onScreenShareChange(true);

    screenTrack.onended = () => {
      void this.stopScreenShare();
    };

    if (this.videoSender) {
      await this.videoSender.replaceTrack(screenTrack);
    }

    // Show the shared screen in the local preview as well.
    const preview = new MediaStream([
      screenTrack,
      ...(this.localStream?.getAudioTracks() ?? []),
    ]);
    this.callbacks.onLocalStream(preview);
    return true;
  }

  async stopScreenShare(): Promise<void> {
    if (!this.isSharingScreen) return;
    this.isSharingScreen = false;
    this.callbacks.onScreenShareChange(false);

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      this.screenStream = null;
    }

    if (this.videoSender && !this.disposed) {
      try {
        await this.videoSender.replaceTrack(this.cameraVideoTrack ?? null);
      } catch {
        // Peer connection may already be closed.
      }
    }
    if (!this.disposed) {
      this.callbacks.onLocalStream(this.localStream);
    }
  }

  /** Release all camera/mic/screen tracks and close the RTCPeerConnection. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.ready = false;
    this.pendingSignals = [];
    this.pendingCandidates = [];

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      this.screenStream = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    this.cameraVideoTrack = null;
    this.videoSender = null;

    if (this.pc) {
      this.pc.onicecandidate = null;
      this.pc.ontrack = null;
      this.pc.onconnectionstatechange = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.close();
      this.pc = null;
    }

    this.callbacks.onLocalStream(null);
    this.callbacks.onRemoteStream(null);
    this.callbacks.onScreenShareChange(false);
    this.callbacks.onConnectionStatus('idle');
  }

  private async acquireBestMedia(): Promise<{ stream: MediaStream | null; warning: MediaWarningCode }> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return { stream: null, warning: 'receive-only' };
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      return { stream, warning: null };
    } catch {
      // Camera missing, busy (e.g. second tab on same laptop), or denied → try audio only.
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        return { stream: audioOnly, warning: 'audio-only' };
      } catch {
        // Neither camera nor mic accessible → connect receive-only so remote stream still plays.
        return { stream: null, warning: 'receive-only' };
      }
    }
  }

  private createPeerConnection(): void {
    const pc = new RTCPeerConnection({
      iceServers: this.iceServers.length > 0
        ? this.iceServers
        : [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    const remote = new MediaStream();

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        const sender = pc.addTrack(track, this.localStream);
        if (track.kind === 'video') {
          this.videoSender = sender;
        }
      }
    }

    // Ensure video/audio m-lines exist even in audio-only or receive-only fallback mode
    // so screen-share replaceTrack (sendrecv) and incoming remote tracks always negotiate cleanly.
    if (!this.localStream || this.localStream.getVideoTracks().length === 0) {
      const videoTransceiver = pc.addTransceiver('video', { direction: 'sendrecv' });
      this.videoSender = videoTransceiver.sender;
    }
    if (!this.localStream || this.localStream.getAudioTracks().length === 0) {
      pc.addTransceiver('audio', { direction: 'recvonly' });
    }

    pc.ontrack = (event) => {
      if (this.disposed) return;
      const incoming = event.streams[0];
      if (incoming) {
        for (const track of incoming.getTracks()) {
          if (!remote.getTracks().some((t) => t.id === track.id)) {
            remote.addTrack(track);
          }
        }
      } else if (!remote.getTracks().some((t) => t.id === event.track.id)) {
        remote.addTrack(event.track);
      }
      // Emit a fresh MediaStream wrapper so React `<video>` effects re-sync srcObject cleanly.
      this.callbacks.onRemoteStream(new MediaStream(remote.getTracks()));
    };

    pc.onicecandidate = (event) => {
      if (this.disposed || !event.candidate) return;
      void this.callbacks.sendSignal({
        callId: this.callId,
        kind: 'ice-candidate',
        data: event.candidate.toJSON(),
      });
    };

    const syncConnectionState = () => {
      if (this.disposed) return;
      const state = pc.connectionState ?? pc.iceConnectionState;
      if (state === 'connected' || pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        this.callbacks.onConnectionStatus('connected');
      } else if (state === 'disconnected') {
        this.callbacks.onConnectionStatus('reconnecting');
      } else if (state === 'failed') {
        this.callbacks.onConnectionStatus('failed');
      } else if (state === 'connecting' || state === 'new') {
        this.callbacks.onConnectionStatus('connecting');
      }
    };

    pc.onconnectionstatechange = syncConnectionState;
    pc.oniceconnectionstatechange = syncConnectionState;

    this.pc = pc;
  }

  private async applySignal(event: IncomingCallSignalEvent): Promise<void> {
    if (this.disposed || !this.pc) return;

    if (event.kind === 'offer') {
      const desc = event.data as RTCSessionDescriptionInit;
      await this.pc.setRemoteDescription(new RTCSessionDescription(desc));
      await this.flushCandidates();
      if (this.disposed || !this.pc) return;
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      await this.callbacks.sendSignal({
        callId: this.callId,
        kind: 'answer',
        data: this.pc.localDescription,
      });
      return;
    }

    if (event.kind === 'answer') {
      const desc = event.data as RTCSessionDescriptionInit;
      if (this.pc.signalingState === 'have-local-offer') {
        await this.pc.setRemoteDescription(new RTCSessionDescription(desc));
        await this.flushCandidates();
      }
      return;
    }

    if (event.kind === 'ice-candidate') {
      const candidate = event.data as RTCIceCandidateInit;
      if (!this.pc.remoteDescription) {
        this.pendingCandidates.push(candidate);
        return;
      }
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  private async flushCandidates(): Promise<void> {
    if (!this.pc || !this.pc.remoteDescription) return;
    const queued = this.pendingCandidates.splice(0, this.pendingCandidates.length);
    for (const candidate of queued) {
      if (this.disposed || !this.pc) return;
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore stale candidates if ICE already settled.
      }
    }
  }
}
