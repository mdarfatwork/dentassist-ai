/**
 * DentAssist AI - Embeddable Website Receptionist Widget
 * Production-grade, zero-dependency, isolated Shadow DOM runtime.
 */
(function () {
  "use strict";

  // Prevent duplicate initialization
  if (window.__DENTASSIST_WIDGET_LOADED__) {
    return;
  }
  window.__DENTASSIST_WIDGET_LOADED__ = true;

  // Identify current script element and config
  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && scripts[i].src.indexOf("widget.js") !== -1) {
          return scripts[i];
        }
      }
      return null;
    })();

  var scriptWidgetId = currentScript
    ? currentScript.getAttribute("data-widget-id")
    : null;
  var scriptSrc = currentScript ? currentScript.src : window.location.href;

  // Derive API base URL from script src
  var apiBase = (function () {
    try {
      var url = new URL(scriptSrc);
      return url.origin;
    } catch (e) {
      return window.location.origin;
    }
  })();

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function DentAssistWidget(widgetId) {
    this.widgetId = widgetId;
    this.config = null;
    this.sessionToken = null;
    this.conversationId = null;
    this.isOpen = false;
    this.isLoading = false;
    this.isListening = false;
    this.speechRecognition = null;
    this.messages = [];
    this.container = null;
    this.shadow = null;

    this.init();
  }

  DentAssistWidget.prototype.init = function () {
    var self = this;
    if (!self.widgetId) {
      console.warn("[DentAssist] Missing data-widget-id on script tag.");
      return;
    }

    self.fetchConfig(function (err, config) {
      if (err || !config) {
        console.warn("[DentAssist] Could not load widget configuration:", err);
        return;
      }
      self.config = config;
      self.mount();
      self.initVoiceIfSupported();
    });
  };

  DentAssistWidget.prototype.fetchConfig = function (callback) {
    var self = this;
    var xhr = new XMLHttpRequest();
    xhr.open(
      "GET",
      apiBase +
        "/api/widget/config?widgetId=" +
        encodeURIComponent(self.widgetId),
      true,
    );
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          callback(null, data);
        } catch (e) {
          callback(e);
        }
      } else {
        callback(new Error("Config load failed with status " + xhr.status));
      }
    };
    xhr.onerror = function () {
      callback(new Error("Network error loading widget config"));
    };
    xhr.send();
  };

  DentAssistWidget.prototype.getOrCreateSession = function (callback) {
    var self = this;
    if (self.sessionToken) {
      return callback(null, self.sessionToken);
    }

    var storageKey = "da_ses_" + self.widgetId;
    try {
      var cached = sessionStorage.getItem(storageKey);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (parsed.token && parsed.expiresAt > Date.now()) {
          self.sessionToken = parsed.token;
          self.conversationId = parsed.conversationId;
          return callback(null, self.sessionToken);
        }
      }
    } catch (e) {}

    var xhr = new XMLHttpRequest();
    xhr.open("POST", apiBase + "/api/widget/session", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = function () {
      if (xhr.status === 201) {
        try {
          var res = JSON.parse(xhr.responseText);
          self.sessionToken = res.sessionToken;
          self.conversationId = res.conversationId;
          try {
            sessionStorage.setItem(
              storageKey,
              JSON.stringify({
                token: res.sessionToken,
                conversationId: res.conversationId,
                expiresAt: new Date(res.expiresAt).getTime(),
              }),
            );
          } catch (e) {}
          callback(null, self.sessionToken);
        } catch (e) {
          callback(e);
        }
      } else {
        callback(new Error("Failed to create session (" + xhr.status + ")"));
      }
    };
    xhr.onerror = function () {
      callback(new Error("Session network failure"));
    };
    xhr.send(JSON.stringify({ widgetId: self.widgetId }));
  };

  DentAssistWidget.prototype.mount = function () {
    var self = this;
    var hostId = "dentassist-widget-root";
    var existing = document.getElementById(hostId);
    if (existing) {
      existing.remove();
    }

    self.container = document.createElement("div");
    self.container.id = hostId;
    document.body.appendChild(self.container);

    // Isolated Shadow DOM
    self.shadow = self.container.attachShadow({ mode: "open" });
    self.render();
  };

  DentAssistWidget.prototype.render = function () {
    var self = this;
    var cfg = self.config || {};
    var primaryColor = cfg.primaryColor || "#1E40AF";
    var isRight = cfg.launcherPosition !== "bottom-left";
    var posStyle = isRight ? "right: 24px;" : "left: 24px;";

    var css = [
      ":host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }",
      "* { box-sizing: border-box; margin: 0; padding: 0; }",
      ".da-launcher { position: fixed; bottom: 24px; " +
        posStyle +
        " z-index: 999999; display: flex; align-items: center; gap: 10px; background: " +
        primaryColor +
        "; color: #ffffff; border: none; border-radius: 9999px; padding: 12px 18px; box-shadow: 0 4px 14px rgba(0,0,0,0.16); cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; font-size: 14px; font-weight: 600; line-height: 1; outline: none; }",
      ".da-launcher:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.22); }",
      ".da-launcher:active { transform: translateY(0); }",
      ".da-launcher-icon { width: 20px; height: 20px; fill: currentColor; display: flex; align-items: center; justify-content: center; }",
      ".da-panel { position: fixed; bottom: 84px; " +
        posStyle +
        " z-index: 999999; width: 380px; max-width: calc(100vw - 32px); height: 560px; max-height: calc(100vh - 120px); background: #ffffff; border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.18); border: 1px solid rgba(0,0,0,0.08); display: flex; flex-direction: column; overflow: hidden; opacity: 0; transform: translateY(16px) scale(0.98); pointer-events: none; transition: opacity 0.2s ease, transform 0.2s ease; }",
      ".da-panel.da-open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }",
      ".da-header { background: " +
        primaryColor +
        "; color: #ffffff; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); }",
      ".da-header-info { display: flex; flex-direction: column; gap: 2px; }",
      ".da-header-title { font-size: 15px; font-weight: 700; line-height: 1.2; display: flex; align-items: center; gap: 6px; }",
      ".da-status-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; display: inline-block; }",
      ".da-header-sub { font-size: 11px; opacity: 0.85; font-weight: 500; }",
      ".da-close-btn { background: rgba(255,255,255,0.15); border: none; color: #ffffff; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; line-height: 1; transition: background 0.15s ease; outline: none; }",
      ".da-close-btn:hover { background: rgba(255,255,255,0.25); }",
      ".da-body { flex: 1; overflow-y: auto; padding: 16px; background: #f8fafc; display: flex; flex-direction: column; gap: 12px; }",
      ".da-msg { max-width: 82%; padding: 10px 13px; font-size: 13.5px; line-height: 1.45; border-radius: 8px; word-break: break-word; }",
      ".da-msg-assistant { align-self: flex-start; background: #ffffff; color: #1e293b; border: 1px solid #e2e8f0; border-bottom-left-radius: 2px; }",
      ".da-msg-user { align-self: flex-end; background: " +
        primaryColor +
        "; color: #ffffff; border-bottom-right-radius: 2px; }",
      ".da-typing { align-self: flex-start; display: flex; align-items: center; gap: 4px; padding: 8px 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; }",
      ".da-dot { width: 6px; height: 6px; background: #94a3b8; border-radius: 50%; animation: da-pulse 1.4s infinite ease-in-out both; }",
      ".da-dot:nth-child(1) { animation-delay: -0.32s; }",
      ".da-dot:nth-child(2) { animation-delay: -0.16s; }",
      "@keyframes da-pulse { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }",
      ".da-footer { padding: 10px 12px; background: #ffffff; border-top: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 6px; }",
      ".da-input-row { display: flex; align-items: center; gap: 8px; }",
      ".da-input { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 9px 12px; font-size: 13.5px; outline: none; background: #ffffff; color: #0f172a; transition: border-color 0.15s ease; }",
      ".da-input:focus { border-color: " + primaryColor + "; }",
      ".da-send-btn { background: " +
        primaryColor +
        "; color: #ffffff; border: none; border-radius: 6px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: opacity 0.15s ease; outline: none; }",
      ".da-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }",
      ".da-mic-btn { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s ease; outline: none; }",
      ".da-mic-btn.da-listening { background: #ef4444; color: #ffffff; border-color: #ef4444; animation: da-pulse 1s infinite alternate; }",
      ".da-branding { text-align: center; font-size: 10.5px; color: #94a3b8; }",
      ".da-branding a { color: inherit; text-decoration: none; font-weight: 600; }",
      "@media (max-width: 480px) { .da-panel { width: 100vw; height: 100vh; max-width: 100vw; max-height: 100vh; bottom: 0; left: 0; right: 0; border-radius: 0; } }",
    ].join("\n");

    var welcomeText = escapeHtml(
      cfg.welcomeMessage || "Hi! How can I help you?",
    );
    var clinicTitle = escapeHtml(cfg.clinicName || "Dental Receptionist");
    var assistantTitle = escapeHtml(cfg.assistantName || "DentAssist");

    var voiceButtonHtml = cfg.enableVoice
      ? '<button class="da-mic-btn" id="da-mic-btn" aria-label="Voice conversation" title="Speak with receptionist"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg></button>'
      : "";

    var brandingHtml = cfg.showBranding
      ? '<div class="da-branding">Powered by <a href="https://dentassist.ai" target="_blank" rel="noopener">DentAssist AI</a></div>'
      : "";

    var html = [
      "<style>" + css + "</style>",
      '<button class="da-launcher" id="da-launcher" aria-label="Open chat with ' +
        assistantTitle +
        '">',
      '  <span class="da-launcher-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg></span>',
      "  <span>Chat with " + assistantTitle + "</span>",
      "</button>",
      '<div class="da-panel" id="da-panel" role="dialog" aria-modal="true" aria-label="Chat window">',
      '  <div class="da-header">',
      '    <div class="da-header-info">',
      '      <div class="da-header-title"><span class="da-status-dot"></span> ' +
        clinicTitle +
        "</div>",
      '      <div class="da-header-sub">' + assistantTitle + " • Online</div>",
      "    </div>",
      '    <button class="da-close-btn" id="da-close-btn" aria-label="Close chat window">✕</button>',
      "  </div>",
      '  <div class="da-body" id="da-body">',
      '    <div class="da-msg da-msg-assistant">' + welcomeText + "</div>",
      "  </div>",
      '  <div class="da-footer">',
      '    <div class="da-input-row">',
      voiceButtonHtml,
      '      <input type="text" class="da-input" id="da-input" placeholder="Type a message..." aria-label="Type your message" autocomplete="off" />',
      '      <button class="da-send-btn" id="da-send-btn" aria-label="Send message"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button>',
      "    </div>",
      brandingHtml,
      "  </div>",
      "</div>",
    ].join("\n");

    self.shadow.innerHTML = html;
    self.attachEvents();
  };

  DentAssistWidget.prototype.attachEvents = function () {
    var self = this;
    var launcher = self.shadow.getElementById("da-launcher");
    var closeBtn = self.shadow.getElementById("da-close-btn");
    var panel = self.shadow.getElementById("da-panel");
    var input = self.shadow.getElementById("da-input");
    var sendBtn = self.shadow.getElementById("da-send-btn");
    var micBtn = self.shadow.getElementById("da-mic-btn");

    function toggleOpen() {
      self.isOpen = !self.isOpen;
      if (self.isOpen) {
        panel.classList.add("da-open");
        setTimeout(function () {
          if (input) input.focus();
        }, 100);
      } else {
        panel.classList.remove("da-open");
        if (self.isListening && self.speechRecognition) {
          try {
            self.speechRecognition.stop();
          } catch (e) {}
        }
      }
    }

    if (launcher) launcher.addEventListener("click", toggleOpen);
    if (closeBtn) closeBtn.addEventListener("click", toggleOpen);

    // Escape key closes panel
    self.shadow.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && self.isOpen) {
        toggleOpen();
      }
    });

    function handleSend() {
      if (!input) return;
      var text = input.value.trim();
      if (!text || self.isLoading) return;
      input.value = "";
      self.sendMessage(text);
    }

    if (sendBtn) sendBtn.addEventListener("click", handleSend);
    if (input) {
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      });
    }

    if (micBtn) {
      micBtn.addEventListener("click", function () {
        self.toggleVoice();
      });
    }
  };

  DentAssistWidget.prototype.appendMessage = function (role, text) {
    var self = this;
    var body = self.shadow.getElementById("da-body");
    if (!body) return;

    var el = document.createElement("div");
    el.className = "da-msg da-msg-" + (role === "user" ? "user" : "assistant");
    el.textContent = text;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  };

  DentAssistWidget.prototype.setTyping = function (typing) {
    var self = this;
    var body = self.shadow.getElementById("da-body");
    if (!body) return;

    var existing = self.shadow.getElementById("da-typing-indicator");
    if (typing) {
      if (!existing) {
        var el = document.createElement("div");
        el.className = "da-typing";
        el.id = "da-typing-indicator";
        el.innerHTML =
          '<span class="da-dot"></span><span class="da-dot"></span><span class="da-dot"></span>';
        body.appendChild(el);
        body.scrollTop = body.scrollHeight;
      }
    } else {
      if (existing) {
        existing.remove();
      }
    }
  };

  DentAssistWidget.prototype.sendMessage = function (text) {
    var self = this;
    self.appendMessage("user", text);
    self.isLoading = true;
    self.setTyping(true);

    self.getOrCreateSession(function (err, token) {
      if (err || !token) {
        self.setTyping(false);
        self.isLoading = false;
        self.appendMessage(
          "assistant",
          "Sorry, we could not connect to the clinic receptionist right now. Please refresh and try again.",
        );
        return;
      }

      var xhr = new XMLHttpRequest();
      xhr.open("POST", apiBase + "/api/widget/chat", true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.onload = function () {
        self.setTyping(false);
        self.isLoading = false;

        if (xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText);
            self.appendMessage("assistant", data.reply || "Thank you.");
            if (self.isListening && window.speechSynthesis) {
              self.speakText(data.reply);
            }
          } catch (e) {
            self.appendMessage("assistant", "Could not parse response.");
          }
        } else {
          try {
            var errData = JSON.parse(xhr.responseText);
            self.appendMessage(
              "assistant",
              errData.error || "A connection error occurred. Please try again.",
            );
          } catch (e) {
            self.appendMessage(
              "assistant",
              "A connection error occurred. Please try again.",
            );
          }
        }
      };
      xhr.onerror = function () {
        self.setTyping(false);
        self.isLoading = false;
        self.appendMessage(
          "assistant",
          "Network error. Please check your connection and retry.",
        );
      };
      xhr.send(
        JSON.stringify({
          widgetId: self.widgetId,
          sessionToken: token,
          message: text,
        }),
      );
    });
  };

  DentAssistWidget.prototype.initVoiceIfSupported = function () {
    var self = this;
    if (!self.config || !self.config.enableVoice) return;

    var SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      self.speechRecognition = new SpeechRecognition();
      self.speechRecognition.continuous = false;
      self.speechRecognition.interimResults = false;
      self.speechRecognition.lang = "en-US";

      self.speechRecognition.onresult = function (event) {
        var transcript = event.results[0][0].transcript;
        if (transcript) {
          self.sendMessage(transcript);
        }
      };

      self.speechRecognition.onend = function () {
        self.isListening = false;
        var btn = self.shadow.getElementById("da-mic-btn");
        if (btn) btn.classList.remove("da-listening");
      };

      self.speechRecognition.onerror = function () {
        self.isListening = false;
        var btn = self.shadow.getElementById("da-mic-btn");
        if (btn) btn.classList.remove("da-listening");
      };
    } catch (e) {
      console.warn("[DentAssist] Speech recognition initialization failed:", e);
    }
  };

  DentAssistWidget.prototype.toggleVoice = function () {
    var self = this;
    if (!self.speechRecognition) {
      alert("Voice speech recognition is not supported in this browser.");
      return;
    }

    var btn = self.shadow.getElementById("da-mic-btn");
    if (self.isListening) {
      self.speechRecognition.stop();
      self.isListening = false;
      if (btn) btn.classList.remove("da-listening");
    } else {
      try {
        self.speechRecognition.start();
        self.isListening = true;
        if (btn) btn.classList.add("da-listening");
      } catch (e) {
        console.warn("[DentAssist] Voice start error:", e);
      }
    }
  };

  DentAssistWidget.prototype.speakText = function (text) {
    if (!window.speechSynthesis || !text) return;
    try {
      window.speechSynthesis.cancel();
      // Strip markdown bold/bullets for clean audio
      var clean = text.replace(/[*_#`]/g, "").replace(/\n+/g, " ");
      var utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  };

  // Expose global API
  window.DentAssistWidget = {
    init: function (opts) {
      opts = opts || {};
      var wId = opts.widgetId || scriptWidgetId;
      return new DentAssistWidget(wId);
    },
  };

  // Auto-boot if data-widget-id is present on script tag
  if (scriptWidgetId) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        window.DentAssistWidget.init({ widgetId: scriptWidgetId });
      });
    } else {
      window.DentAssistWidget.init({ widgetId: scriptWidgetId });
    }
  }
})();
