"use client";

import { useState, useRef, useEffect } from "react";
import { consumeToolUse } from "@/lib/api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isError?: boolean;
}

const SAMPLE_QUESTIONS = [
  "What is DNA replication?",
  "Explain the Krebs Cycle in biology",
  "How do you prepare 500 mL of 0.1 M HCl?",
  "Difference between ionic and covalent bonds?",
  "Explain enzyme kinetics & Michaelis-Menten",
  "What are peptide bonds in proteins?",
];

interface BioChemChatbotProps {
  embedded?: boolean;
}

export default function BioChemChatbot({ embedded = false }: BioChemChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "Welcome to **BioChem AI** by CellsInVitro. I am specialized strictly in Chemistry and Biology.\n\nAsk me about organic/inorganic chemistry, cell biology, genetics, biochemistry, laboratory calculations, or reaction protocols.",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen || embedded) {
      scrollToBottom();
    }
  }, [messages, loading, isOpen, embedded]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (!textToSend) setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setLoading(true);
    setConfigError(null);

    try {
      await consumeToolUse("chatbot");
      const apiHistory = newMessages
        .filter((m) => !m.isError && m.id !== "welcome-1")
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiHistory }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.isConfigError) {
          setConfigError(data.error);
        }
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.error || "Sorry, I encountered an error connecting to Groq API.",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
      } else {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages((prev) => [...prev, botMessage]);
      }
    } catch (err) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: err instanceof Error ? err.message : "Network error. Please check your internet connection or try again.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "welcome-1",
        role: "assistant",
        content:
          "Chat reset! Ask me any question related to **Chemistry** or **Biology**.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setConfigError(null);
  };

  // Sanitize raw LaTeX tokens into human-readable plain text
  const sanitizeText = (str: string): string => {
    return str
      .replace(/\\\[|\\\]|\\\(|\\\)/g, "")
      .replace(/\\boxed\{([^}]+)\}/g, "$1")
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1 / $2)")
      .replace(/\\text\{([^}]+)\}/g, "$1")
      .replace(/\\mathrm\{([^}]+)\}/g, "$1")
      .replace(/\\approx/g, "≈")
      .replace(/\\times/g, "×")
      .replace(/\\cdot/g, "·")
      .replace(/\\quad/g, " ")
      .replace(/\\,/g, " ")
      .replace(/\\;/g, " ");
  };

  // Helper to format text with simple markdown bold, list, and linebreaks
  const renderFormattedText = (text: string, isUser: boolean = false) => {
    const cleanedText = sanitizeText(text);
    const lines = cleanedText.split("\n");

    const textStyle = isUser ? "text-white" : "text-slate-800";
    const boldStyle = isUser ? "text-white font-bold" : "text-slate-950 font-bold";
    const headerStyle = isUser ? "text-white font-bold border-slate-800" : "text-slate-950 font-bold border-slate-200/60";

    return lines.map((line, lineIdx) => {
      if (line.startsWith("```")) {
        return null;
      }

      const trimmed = line.trim();

      if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
        const headerText = trimmed.replace(/^#{2,3}\s+/, "");
        return (
          <h4 key={lineIdx} className={`font-semibold mt-2 mb-1 text-sm border-b pb-0.5 ${headerStyle}`}>
            {headerText}
          </h4>
        );
      }

      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedLine = parts.map((part, partIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={partIdx} className={boldStyle}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed)) {
        return (
          <li key={lineIdx} className={`ml-4 list-disc my-1 leading-relaxed ${textStyle}`}>
            {formattedLine}
          </li>
        );
      }

      if (trimmed === "") {
        return <div key={lineIdx} className="h-1.5" />;
      }

      return (
        <p key={lineIdx} className={`my-0.5 leading-relaxed ${textStyle}`}>
          {formattedLine}
        </p>
      );
    });
  };

  const chatContent = (
    <div
      className={`flex flex-col bg-white border border-slate-200 shadow-2xl overflow-hidden transition-all duration-300 ${
        embedded
          ? "w-full h-[650px] rounded-[2rem]"
          : "w-[92vw] sm:w-[420px] h-[580px] max-h-[82vh] rounded-[1.75rem]"
      }`}
    >
      {/* Header matching CellsInVitro Dark Palette */}
      <div className="bg-slate-950 text-white p-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-white">
            <svg
              className="w-5 h-5 text-slate-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.6 15.12a2 2 0 00-1.18.106l-1.5 1.5a2 2 0 000 2.828l1.5 1.5a2 2 0 002.828 0l1.5-1.5a2 2 0 00.106-1.18l-.477-2.387a6 6 0 01.517-3.86l.158-.318a6 6 0 00.517-3.86L8.88 5.6a2 2 0 00-.106-1.18l-1.5-1.5a2 2 0 00-2.828 0l-1.5 1.5a2 2 0 000 2.828l1.5 1.5"
              />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm tracking-tight text-white">
                BioChem AI
              </h3>
              <span className="bg-slate-800 text-slate-300 text-[10px] uppercase font-semibold tracking-widest px-2 py-0.5 rounded-full border border-slate-700/70">
                Chem & Bio
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              CellsInVitro Assistant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClearChat}
            title="Clear Chat"
            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
          {!embedded && (
            <button
              onClick={() => setIsOpen(false)}
              title="Close"
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Notice Banner */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="font-medium">Direct Chemistry & Biology queries only</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Strict Guardrails</span>
      </div>

      {/* Config Error Banner */}
      {configError && (
        <div className="m-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col gap-1 shadow-sm">
          <div className="font-semibold flex items-center gap-1.5 text-amber-950">
            <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            API Key Required
          </div>
          <p className="leading-normal text-amber-800">{configError}</p>
          <code className="bg-amber-100/80 p-1 rounded font-mono text-[11px] mt-1 text-amber-950">
            GROQ_API_KEY=gsk_...
          </code>
        </div>
      )}

      {/* Messages Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`flex gap-2 max-w-[88%] ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 ${
                  msg.role === "user"
                    ? "bg-slate-950 text-white"
                    : msg.isError
                    ? "bg-rose-100 text-rose-700 border border-rose-200"
                    : "bg-slate-200 text-slate-800 border border-slate-300/60"
                }`}
              >
                {msg.role === "user" ? (
                  "You"
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.6 15.12a2 2 0 00-1.18.106l-1.5 1.5a2 2 0 000 2.828l1.5 1.5a2 2 0 002.828 0l1.5-1.5a2 2 0 00.106-1.18l-.477-2.387a6 6 0 01.517-3.86l.158-.318a6 6 0 00.517-3.86L8.88 5.6a2 2 0 00-.106-1.18l-1.5-1.5a2 2 0 00-2.828 0l-1.5 1.5a2 2 0 000 2.828l1.5 1.5" />
                  </svg>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`p-3.5 rounded-2xl text-sm ${
                  msg.role === "user"
                    ? "bg-slate-950 text-white rounded-tr-none shadow-sm"
                    : msg.isError
                    ? "bg-rose-50 text-rose-900 border border-rose-200 rounded-tl-none"
                    : "bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-none"
                }`}
              >
                {renderFormattedText(msg.content, msg.role === "user")}
                <span
                  className={`text-[10px] block mt-1.5 ${
                    msg.role === "user"
                      ? "text-slate-400 text-right"
                      : "text-slate-400"
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center gap-2 text-slate-500 text-xs pl-9">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3.5 py-2 rounded-2xl shadow-sm">
              <span className="w-1.5 h-1.5 bg-slate-800 rounded-full animate-bounce"></span>
              <span
                className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce"
                style={{ animationDelay: "0.15s" }}
              ></span>
              <span
                className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.3s" }}
              ></span>
              <span className="ml-1 text-slate-500 font-medium text-[11px]">BioChem AI is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Preset Suggestions */}
      {messages.length <= 2 && !loading && (
        <div className="p-3 bg-slate-50 border-t border-slate-200/80 flex flex-wrap gap-1.5">
          <p className="w-full text-[10px] font-semibold text-slate-400 uppercase tracking-[0.18em] px-0.5">
            Suggested Prompts
          </p>
          {SAMPLE_QUESTIONS.slice(0, 4).map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="text-[11px] bg-white hover:bg-slate-100 hover:text-slate-950 text-slate-600 px-3 py-1 rounded-full border border-slate-200 transition-colors text-left font-medium"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <div className="p-3 bg-white border-t border-slate-200 flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask a Chemistry or Biology question..."
          rows={1}
          disabled={loading}
          className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:border-slate-950 disabled:opacity-50"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={loading || !input.trim()}
          className="p-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shrink-0"
          title="Send message"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );

  if (embedded) {
    return chatContent;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Expanded Chat Window */}
      {isOpen && (
        <div className="mb-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {chatContent}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-2.5 bg-slate-950 hover:bg-slate-900 text-white px-5 py-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border border-slate-800"
        aria-label="Open BioChem AI Chatbot"
      >
        <svg className="w-5 h-5 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.6 15.12a2 2 0 00-1.18.106l-1.5 1.5a2 2 0 000 2.828l1.5 1.5a2 2 0 002.828 0l1.5-1.5a2 2 0 00.106-1.18l-.477-2.387a6 6 0 01.517-3.86l.158-.318a6 6 0 00.517-3.86L8.88 5.6a2 2 0 00-.106-1.18l-1.5-1.5a2 2 0 00-2.828 0l-1.5 1.5a2 2 0 000 2.828l1.5 1.5"
          />
        </svg>
        <span className="font-semibold text-sm tracking-tight">
          {isOpen ? "Close Chat" : "BioChem AI"}
        </span>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </button>
    </div>
  );
}
