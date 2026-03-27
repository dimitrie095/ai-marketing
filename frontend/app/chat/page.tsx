"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Send,
  Plus,
  MessageSquare,
  MoreVertical,
  Trash2,
  RefreshCw,
  Bot,
  User,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  getConversations,
  getConversation,
  createConversation,
  deleteConversation,
  clearConversation,
  sendChatMessage,
  createChatStream,
} from "@/lib/api";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  tokens_used?: number;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  message_count?: number;
}

const AVAILABLE_MODELS = [
  { value: "default", label: "Standard (Auto)" },
  { value: "gpt-4", label: "GPT-4 (OpenAI)" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (OpenAI)" },
  { value: "deepseek-chat", label: "DeepSeek Chat" },
  { value: "kimi", label: "Kimi (Moonshot)" },
];

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState("default");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<{ close: () => void } | null>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadConversationMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.close();
    };
  }, []);

  const loadConversations = async () => {
    try {
      const response = await getConversations();
      if (response.status === "success") {
        setConversations(response.conversations || []);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
      setError("Konnte Konversationen nicht laden");
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    try {
      setLoading(true);
      const response = await getConversation(conversationId);
      if (response.status === "success" && response.conversation) {
        setMessages(response.conversation.messages || []);
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
      setError("Konnte Nachrichten nicht laden");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConversation = async () => {
    try {
      const response = await createConversation("Neue Konversation");
      if (response.status === "success" && response.conversation) {
        const newConversation = response.conversation;
        setConversations((prev) => [newConversation, ...prev]);
        setActiveConversationId(newConversation.id);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to create conversation:", err);
      setError("Konnte neue Konversation nicht erstellen");
    }
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Möchten Sie diese Konversation wirklich löschen?")) return;
    
    try {
      await deleteConversation(conversationId);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      setError("Konnte Konversation nicht löschen");
    }
  };

  const handleClearConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Möchten Sie alle Nachrichten in dieser Konversation löschen?")) return;
    
    try {
      await clearConversation(conversationId);
      if (activeConversationId === conversationId) {
        setMessages([]);
      }
      loadConversations();
    } catch (err) {
      console.error("Failed to clear conversation:", err);
      setError("Konnte Nachrichten nicht löschen");
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || streaming) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setError(null);

    // Add user message to UI immediately
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    // If no active conversation, create one
    let conversationId = activeConversationId;
    if (!conversationId) {
      try {
        const response = await createConversation(userMessage.slice(0, 50));
        if (response.status === "success" && response.conversation) {
          conversationId = response.conversation.id;
          setActiveConversationId(conversationId);
          setConversations((prev) => [response.conversation, ...prev]);
        }
      } catch (err) {
        console.error("Failed to create conversation:", err);
        setError("Konnte Konversation nicht erstellen");
        return;
      }
    }

    setStreaming(true);

    // Create placeholder for AI response
    const aiMessageId = `ai-${Date.now()}`;
    const tempAiMessage: Message = {
      id: aiMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempAiMessage]);

    // Use streaming
    const model = selectedModel === "default" ? undefined : selectedModel;
    
    streamRef.current = createChatStream(
      userMessage,
      conversationId || undefined,
      model,
      (chunk) => {
        // On chunk received
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? { ...msg, content: msg.content + chunk }
              : msg
          )
        );
      },
      (fullResponse) => {
        // On complete
        setStreaming(false);
        loadConversations(); // Refresh conversation list
      },
      (error) => {
        // On error
        console.error("Stream error:", error);
        setStreaming(false);
        setError("Fehler bei der Antwortgenerierung");
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? { ...msg, content: msg.content || "Entschuldigung, es ist ein Fehler aufgetreten." }
              : msg
          )
        );
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStopStreaming = () => {
    streamRef.current?.close();
    setStreaming(false);
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] gap-4">
        {/* Sidebar - Conversations */}
        <Card
          className={cn(
            "flex flex-col transition-all duration-300",
            sidebarOpen ? "w-80" : "w-0 overflow-hidden"
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Konversationen
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <div className="h-[calc(100%-8rem)] overflow-y-auto">
              <div className="space-y-1 px-3 pb-4">
                {conversations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Noch keine Konversationen</p>
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => setActiveConversationId(conversation.id)}
                      className={cn(
                        "group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                        activeConversationId === conversation.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">
                          {conversation.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {conversation.updated_at
                            ? format(new Date(conversation.updated_at), "dd.MM.yyyy HH:mm", { locale: de })
                            : format(new Date(conversation.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => handleClearConversation(conversation.id, e as any)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Nachrichten löschen
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => handleDeleteConversation(conversation.id, e as any)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="p-3 border-t">
              <Button
                onClick={handleCreateConversation}
                className="w-full"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Neue Konversation
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Chat Area */}
        <Card className="flex-1 flex flex-col">
          {/* Chat Header */}
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                <MessageSquare className="h-5 w-5" />
              </Button>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Marketing Assistant
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {activeConversationId
                    ? conversations.find((c) => c.id === activeConversationId)?.title || "Konversation"
                    : "Neue Konversation"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Modell wählen" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {activeConversationId && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setActiveConversationId(null);
                    setMessages([]);
                  }}
                  title="Neue Konversation"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>

          {/* Messages Area */}
          <CardContent className="flex-1 overflow-hidden p-0">
            <div className="h-[calc(100vh-16rem)] overflow-y-auto">
              <div className="p-4 space-y-4 pb-8">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <Bot className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Willkommen beim AI Marketing Assistant
                    </h3>
                    <p className="text-muted-foreground max-w-md mb-6">
                      Stellen Sie Fragen zu Ihren Marketing-Kampagnen, KPIs, 
                      Audience-Insights oder lassen Sie sich Handlungsempfehlungen geben.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {[
                        "Wie ist mein ROAS in den letzten 7 Tagen?",
                        "Welche Kampagne performt am besten?",
                        "Analysiere meine Audience-Demografie",
                        "Gib mir Tipps zur Budget-Optimierung",
                      ].map((suggestion) => (
                        <Button
                          key={suggestion}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setInputMessage(suggestion);
                            inputRef.current?.focus();
                          }}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-4 py-2",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.content || (streaming && index === messages.length - 1 ? (
                            <span className="animate-pulse">▊</span>
                          ) : "")}
                        </p>
                        <div
                          className={cn(
                            "flex items-center gap-2 mt-1 text-xs",
                            message.role === "user"
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          {format(new Date(message.timestamp), "HH:mm", { locale: de })}
                          {message.tokens_used && (
                            <span>• {message.tokens_used} tokens</span>
                          )}
                        </div>
                      </div>
                      
                      {message.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </CardContent>

          {/* Error Display */}
          {error && (
            <div className="px-4 pb-2">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Input Area */}
          <CardContent className="border-t pt-4">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Stellen Sie eine Frage zu Ihren Marketing-Daten..."
                disabled={streaming}
                className="flex-1"
              />
              {streaming ? (
                <Button onClick={handleStopStreaming} variant="destructive">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              ) : (
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || loading}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Senden
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Drücken Sie Enter zum Senden • Der AI Assistant kann Fehler machen
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
