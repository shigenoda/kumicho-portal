import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Calendar as CalendarIcon, CheckCircle2, Circle } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function Calendar() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: events = [] } = trpc.events.getAll.useQuery();

  if (!isAuthenticated) {
    return <div className="page-container flex items-center justify-center min-h-screen">ログインが必要です</div>;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 to-green-700 text-white py-6">
        <div className="container flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="w-6 h-6" />
              年間カレンダー
            </h1>
            <p className="text-green-100">月別の行事・締切・準備ToDo</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {events.length > 0 ? (
          <div className="space-y-4">
            {events.map((event) => (
              <Card key={event.id} className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.date).toLocaleDateString("ja-JP")} - {event.category}
                    </p>
                  </div>
                </div>
                {event.notes && (
                  <p className="text-sm text-muted-foreground mb-4">{event.notes}</p>
                )}
                {event.checklist && event.checklist.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">チェックリスト:</p>
                    <ul className="space-y-1">
                      {event.checklist.map((item) => (
                        <li key={item.id} className="flex items-center gap-2 text-sm">
                          {item.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                            {item.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">イベントがまだ登録されていません</p>
          </Card>
        )}
      </main>
    </div>
  );
}
