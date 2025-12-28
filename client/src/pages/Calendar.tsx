import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function CalendarPage() {
  const [, setLocation] = useLocation();
  const { data: events = [] } = trpc.events.list.useQuery();

  const groupedByMonth = events.reduce((acc: Record<string, typeof events>, event) => {
    const month = new Date(event.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(event);
    return acc;
  }, {});

  return (
    <div className="page-container">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="container py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-6 h-6 text-accent" />
              年間カレンダー
            </h1>
            <p className="text-sm text-muted-foreground">行事・締切・チェックリスト</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container py-8 sm:py-12">
        <div className="space-y-8">
          {Object.entries(groupedByMonth).map(([month, monthEvents]) => (
            <section key={month}>
              <h2 className="text-xl font-semibold text-foreground mb-4">{month}</h2>
              <div className="space-y-3">
                {monthEvents.map((event) => (
                  <div key={event.id} className="info-card">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{event.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(event.date).toLocaleDateString('ja-JP')} - {event.category}
                        </p>
                        {event.notes && (
                          <p className="text-sm text-foreground mt-2">{event.notes}</p>
                        )}
                        {event.checklist && Array.isArray(event.checklist) && event.checklist.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">チェックリスト：</p>
                            <ul className="space-y-1">
                              {event.checklist.map((item: any) => (
                                <li key={item.id} className="text-sm text-foreground flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    defaultChecked={item.completed}
                                    className="w-4 h-4"
                                    disabled
                                  />
                                  {item.text}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <span className="tag-pill text-xs">{event.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
