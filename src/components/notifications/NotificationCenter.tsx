
import React, { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import NotificationList from "./NotificationList";
import Link from "next/link";

const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();

    // Add click outside listener
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
        
      if (!error) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? {...n, read: true} : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
    
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'welcome':
        return "🎉";
      case 'insurancePurchase':
      case 'insuranceUpgrade':
        return "🛡️";
      case 'insuranceCancel':
        return "⚠️";
      case 'claimSubmitted':
      case 'claimUpdate':
      case 'claim':
        return "📋";
      case 'protectionDisabled':
        return "🔒";
      default:
        return "📣";
    }
  };

  return (
    <div ref={notificationRef} className="relative">
      <Button
        variant="ghost"
        className="relative p-2 hover:bg-iris-darker transition-all"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-iris-purple" />
        {unreadCount > 0 && (
          <span className="absolute flex h-2 w-2 top-1.5 right-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-iris-purple opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-iris-purple"></span>
          </span>
        )}
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-iris-darker border border-iris-purple/20 rounded-md shadow-lg z-50 overflow-hidden">
          <div className="p-3 border-b border-iris-purple/10 flex justify-between items-center">
            <h3 className="font-medium text-white">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="outline" className="bg-iris-purple/10 border-iris-purple/20 text-iris-purple-light">
                {unreadCount} new
              </Badge>
            )}
          </div>
          
          <div className="max-h-72 overflow-y-auto">
            <NotificationList 
              notifications={notifications}
              loading={loading}
              onItemClick={handleNotificationClick}
              getNotificationIcon={getNotificationIcon}
            />
          </div>
          
          <Link 
            href="/notifications" 
            className="block p-3 text-center text-sm text-iris-purple hover:bg-iris-purple/5 border-t border-iris-purple/10"
            onClick={() => setIsOpen(false)}
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
