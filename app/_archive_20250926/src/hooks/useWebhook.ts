import { useState, useEffect, useCallback, useRef } from 'react';
import { usePaymentStore } from '../store/paymentStore';

export interface WebhookEvent {
  id: string;
  type: string;
  object: string;
  created: number;
  data: {
    object: any;
    previous_attributes?: any;
  };
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  };
}

export interface WebhookStatus {
  connected: boolean;
  lastEventAt: Date | null;
  processingCount: number;
  errorCount: number;
  status: 'healthy' | 'warning' | 'error' | 'disconnected';
}

export interface UseWebhookOptions {
  autoReconnect?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  eventTypes?: string[];
}

export const useWebhook = (options: UseWebhookOptions = {}) => {
  const {
    autoReconnect = true,
    maxRetries = 3,
    retryDelay = 1000,
    eventTypes = []
  } = options;

  const [status, setStatus] = useState<WebhookStatus>({
    connected: false,
    lastEventAt: null,
    processingCount: 0,
    errorCount: 0,
    status: 'disconnected'
  });

  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const retryCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    syncWebhookState,
    updateSubscriptionFromWebhook,
    handleSubscriptionUpdatedWebhook,
    handleSubscriptionDeletedWebhook,
    handleTrialEndingWebhook,
    handlePaymentSucceededWebhook,
    handlePaymentFailedWebhook,
    isLoading
  } = usePaymentStore();

  const processWebhookEvent = useCallback(async (event: WebhookEvent) => {
    try {
      setStatus(prev => ({
        ...prev,
        processingCount: prev.processingCount + 1,
        lastEventAt: new Date()
      }));

      // Filter events if specific types are requested
      if (eventTypes.length > 0 && !eventTypes.includes(event.type)) {
        return;
      }

      // Route to appropriate handler based on event type
      switch (event.type) {
        case 'customer.subscription.updated':
          await handleSubscriptionUpdatedWebhook(event);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionDeletedWebhook(event);
          break;
        case 'customer.subscription.trial_will_end':
          await handleTrialEndingWebhook(event);
          break;
        case 'invoice.payment_succeeded':
          await handlePaymentSucceededWebhook(event);
          break;
        case 'invoice.payment_failed':
          await handlePaymentFailedWebhook(event);
          break;
        default:
          // Handle generic webhook event
          await updateSubscriptionFromWebhook(event);
      }

      // Add to events list (keep last 50 events)
      setEvents(prev => [event, ...prev.slice(0, 49)]);

      // Reset retry count on success
      retryCountRef.current = 0;

      setStatus(prev => ({
        ...prev,
        processingCount: Math.max(0, prev.processingCount - 1),
        status: prev.errorCount > 0 ? 'warning' : 'healthy'
      }));

    } catch (error) {
      console.error('Failed to process webhook event:', error);

      setStatus(prev => ({
        ...prev,
        processingCount: Math.max(0, prev.processingCount - 1),
        errorCount: prev.errorCount + 1,
        status: 'error'
      }));

      // Retry logic
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        setTimeout(() => processWebhookEvent(event), retryDelay * retryCountRef.current);
      }
    }
  }, [
    eventTypes,
    maxRetries,
    retryDelay,
    updateSubscriptionFromWebhook,
    handleSubscriptionUpdatedWebhook,
    handleSubscriptionDeletedWebhook,
    handleTrialEndingWebhook,
    handlePaymentSucceededWebhook,
    handlePaymentFailedWebhook
  ]);

  const connect = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      connected: true,
      status: 'healthy'
    }));
  }, []);

  const disconnect = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      connected: false,
      status: 'disconnected'
    }));

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  const reconnect = useCallback(() => {
    if (!autoReconnect) return;

    disconnect();

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, retryDelay);
  }, [autoReconnect, retryDelay, connect, disconnect]);

  const syncEvents = useCallback(async (webhookEvents: WebhookEvent[]) => {
    try {
      await syncWebhookState(webhookEvents);

      // Process each event
      for (const event of webhookEvents) {
        await processWebhookEvent(event);
      }
    } catch (error) {
      console.error('Failed to sync webhook events:', error);
      if (autoReconnect) {
        reconnect();
      }
    }
  }, [syncWebhookState, processWebhookEvent, autoReconnect, reconnect]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setStatus(prev => ({
      ...prev,
      errorCount: 0,
      status: prev.connected ? 'healthy' : 'disconnected'
    }));
  }, []);

  const getEventsByType = useCallback((type: string) => {
    return events.filter(event => event.type === type);
  }, [events]);

  const getRecentEvents = useCallback((minutes: number = 30) => {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return events.filter(event => new Date(event.created * 1000) > cutoff);
  }, [events]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Auto-reconnect on connection loss
  useEffect(() => {
    if (!status.connected && autoReconnect && status.status !== 'disconnected') {
      reconnect();
    }
  }, [status.connected, autoReconnect, status.status, reconnect]);

  return {
    status,
    events,
    connect,
    disconnect,
    reconnect,
    syncEvents,
    processWebhookEvent,
    clearEvents,
    getEventsByType,
    getRecentEvents,
    isLoading
  };
};

export const useWebhookSubscription = (customerId?: string) => {
  const webhook = useWebhook({
    eventTypes: [
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'customer.subscription.trial_will_end',
      'invoice.payment_succeeded',
      'invoice.payment_failed'
    ]
  });

  const subscriptionEvents = webhook.getEventsByType('customer.subscription.updated');
  const paymentEvents = webhook.events.filter(event =>
    event.type.startsWith('invoice.payment_')
  );

  return {
    ...webhook,
    subscriptionEvents,
    paymentEvents,
    hasRecentPaymentFailure: paymentEvents.some(event =>
      event.type === 'invoice.payment_failed' &&
      new Date(event.created * 1000) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    )
  };
};

export const useWebhookMonitoring = () => {
  const [metrics, setMetrics] = useState({
    totalEvents: 0,
    successRate: 100,
    averageProcessingTime: 0,
    errorCount: 0,
    lastErrorAt: null as Date | null
  });

  const webhook = useWebhook();

  useEffect(() => {
    // Calculate metrics from webhook events
    const recentEvents = webhook.getRecentEvents(60); // Last hour
    const errorEvents = recentEvents.filter(event =>
      webhook.status.errorCount > 0 // This is a simplification
    );

    setMetrics({
      totalEvents: recentEvents.length,
      successRate: recentEvents.length > 0
        ? ((recentEvents.length - errorEvents.length) / recentEvents.length) * 100
        : 100,
      averageProcessingTime: 250, // Mock value - would be calculated from actual processing times
      errorCount: errorEvents.length,
      lastErrorAt: errorEvents.length > 0 ? new Date(errorEvents[0].created * 1000) : null
    });
  }, [webhook.events, webhook.status.errorCount]);

  return {
    metrics,
    webhook,
    isHealthy: metrics.successRate > 95 && webhook.status.connected,
    needsAttention: metrics.successRate < 95 || webhook.status.errorCount > 5
  };
};