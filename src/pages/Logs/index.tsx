import { FC, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

const LogsPage: FC = () => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<{ term: Terminal; fitAddon: FitAddon } | null>(
    null
  );
  const isInitialized = useRef(false);

  useEffect(() => {
    // 1. 定义初始化函数
    const initTerminal = () => {
      if (isInitialized.current || !terminalContainerRef.current) return;

      const container = terminalContainerRef.current;
      if (container.clientWidth === 0 || container.clientHeight === 0) return;

      // 初始化 Terminal
      const term = new Terminal({
        cursorBlink: true,
        convertEol: true,
        fontFamily: '"Cascadia Code", Menlo, monospace',
        fontSize: 14,
        disableStdin: true, 
        rightClickSelectsWord: true, 
        theme: {
          background: "#1e1e1e",
          foreground: "#d4d4d4",
          cursor: "#ffffff",
          selectionBackground: "rgba(255, 255, 255, 0.4)", // 增加选中高亮的透明度，让它更明显
          black: "#000000",
          red: "#f87171",
          green: "#4ade80",
          yellow: "#facc15",
          blue: "#60a5fa",
          magenta: "#c084fc",
          cyan: "#22d3ee",
          white: "#ffffff",
          brightBlack: "#808080",
          brightRed: "#f87171",
          brightGreen: "#4ade80",
          brightYellow: "#facc15",
          brightBlue: "#60a5fa",
          brightMagenta: "#c084fc",
          brightCyan: "#22d3ee",
          brightWhite: "#ffffff",
        },
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      term.open(container);

      // ✅ 新增功能：Ctrl + C 复制
      term.attachCustomKeyEventHandler((arg) => {
        if (arg.ctrlKey && arg.code === "KeyC" && arg.type === "keydown") {
          const selection = term.getSelection();
          if (selection) {
            navigator.clipboard.writeText(selection);
            return false; // 阻止默认的 Ctrl+C 发送给后端（虽然 disableStdin 已经禁了，但双重保险）
          }
        }
        return true;
      });

      // ✅ 新增功能：右键点击复制选中内容
      // 注意：xterm 的 canvas 可能会拦截 contextmenu，这里监听容器
      container.addEventListener("contextmenu", (e) => {
        const selection = term.getSelection();
        if (selection) {
          e.preventDefault(); // 阻止浏览器默认右键菜单
          navigator.clipboard.writeText(selection);
          // 可选：给个视觉反馈，比如光标闪一下，或者在这里你可以 console.log 确认
        }
      });

      try {
        fitAddon.fit();
      } catch (e) {}

      term.writeln("\x1b[32m✔ Log Terminal Ready.\x1b[0m");
      term.writeln(
        "\x1b[90mTip: Select text and press Ctrl+C or Right Click to copy.\x1b[0m"
      );
      term.writeln("\x1b[90mWaiting for Sing-box core logs...\x1b[0m");

      xtermInstance.current = { term, fitAddon };
      isInitialized.current = true;
    };

    // 2. ResizeObserver 逻辑 (保持不变)
    const resizeObserver = new ResizeObserver((entries) => {
      if (!isInitialized.current) {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            initTerminal();
          }
        }
      } else {
        window.requestAnimationFrame(() => {
          try {
            xtermInstance.current?.fitAddon.fit();
          } catch (e) {}
        });
      }
    });

    if (terminalContainerRef.current) {
      resizeObserver.observe(terminalContainerRef.current);
    }

    // 3. 监听日志
    const unlistenPromise = listen<string>("app-log", (event) => {
      if (xtermInstance.current?.term) {
        xtermInstance.current.term.writeln(event.payload);
      }
    });

    // 4. 清理
    return () => {
      resizeObserver.disconnect();
      unlistenPromise.then((unlisten) => unlisten());
      if (xtermInstance.current) {
        xtermInstance.current.term.dispose();
        xtermInstance.current = null;
      }
      isInitialized.current = false;
    };
  }, []);

  return (
    // ✅ 核心修复：添加 select-text 允许选择，并强制 cursor-text
    <div className="h-screen w-screen bg-[#1e1e1e] overflow-hidden flex flex-col select-text cursor-text">
      <div
        ref={terminalContainerRef}
        className="flex-1 w-full h-full"
        style={{ padding: "8px", minWidth: "100px", minHeight: "100px" }}
      />
    </div>
  );
};

export default LogsPage;
