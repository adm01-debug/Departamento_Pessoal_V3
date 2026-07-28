import { Card, CardContent } from '@/components/ui/card';
import { Bell } from 'lucide-react';

interface NotificationListProps {
  notifications?: Array<{ id: string; title: string; read: boolean }>;
  onMarkRead?: (id: string) => void;
}

export function NotificationList({ notifications = [], onMarkRead }: NotificationListProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5" />
          <span className="font-medium">Notificações</span>
        </div>
        {notifications.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma notificação</p>
        ) : (
          <ul className="space-y-2">
            {notifications.map(n => (
              <li key={n.id} onClick={() => onMarkRead?.(n.id)} className="cursor-pointer">
                {n.title}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default NotificationList;
