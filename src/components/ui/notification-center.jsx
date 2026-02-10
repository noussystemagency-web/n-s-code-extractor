import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import moment from 'moment';

const NOTIFICATION_TYPES = {
  success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50' },
  loading: { icon: Loader2, color: 'text-amber-500', bg: 'bg-amber-50', spin: true },
};

export default function NotificationCenter({ notifications = [], onDismiss, onClearAll }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const handleDismiss = (id) => {
    if (onDismiss) onDismiss(id);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-red-500">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 z-50 w-80 max-h-96 overflow-y-auto bg-white rounded-lg shadow-xl border border-slate-200">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Notificaciones {unreadCount > 0 && `(${unreadCount})`}
              </h3>
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (onClearAll) onClearAll();
                    setIsOpen(false);
                  }}
                  className="h-6 text-xs text-slate-600"
                >
                  Limpiar todo
                </Button>
              )}
            </div>

            {/* Notifications List */}
            <div className="divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No hay notificaciones</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const type = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.info;
                  const Icon = type.icon;
                  
                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-3 hover:bg-slate-50 transition-colors",
                        !notification.read && "bg-blue-50/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("p-1.5 rounded-lg", type.bg)}>
                          <Icon className={cn("w-4 h-4", type.color, type.spin && "animate-spin")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-xs text-slate-600 mt-0.5">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-1">
                            {moment(notification.timestamp).fromNow()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDismiss(notification.id)}
                          className="h-6 w-6 flex-shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}