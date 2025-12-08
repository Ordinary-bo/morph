import React, { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
// 引入 xterm 的样式文件 (必须)
import "xterm/css/xterm.css";

const LogsPage: React.FC = () => {
  // 引用挂载点
  const terminalRef = useRef<HTMLDivElement>(null);
  // 保存 terminal 实例，防止重复创建
  const xtermRef = useRef<{ term: Terminal; fitAddon: FitAddon } | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // 1. 初始化 Terminal
    const term = new Terminal({
      cursorBlink: true,
      convertEol: true, // 重要：把 \n 转换为 \r\n，防止阶梯状输出
      fontFamily: '"Cascadia Code", Menlo, monospace',
      fontSize: 14,
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#ffffff",
        selectionBackground: "rgba(255, 255, 255, 0.3)",
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

    // 2. 加载自适应插件 (让终端填满父容器)
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // 3. 挂载到 DOM
    term.open(terminalRef.current);
    fitAddon.fit();

    // 保存实例
    xtermRef.current = { term, fitAddon };

    // 初始欢迎语
    term.writeln("\x1b[32m✔ Log Terminal Initialized.\x1b[0m");
    term.writeln("\x1b[90mWaiting for Sing-box core logs...\x1b[0m");
    term.writeln(""); // 空一行

    // 4. 监听窗口大小变化，自动调整终端大小
    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    // 5. 监听 Rust 后端日志
    // 注意：这里不需要清洗乱码了，xterm 会自动解析 ANSI 颜色！
    const unlistenPromise = listen<string>("app-log", (event) => {
      // 写入终端
      term.writeln(event.payload);
    });

    // 6. 清理函数
    return () => {
      window.removeEventListener("resize", handleResize);
      unlistenPromise.then((unlisten) => unlisten());
      term.dispose(); // 销毁终端实例
    };
  }, []);

  return (
    // 容器必须有明确的高度，否则 xterm 可能会塌陷
    <div className="h-screen w-screen bg-[#1e1e1e] overflow-hidden flex flex-col">
      {/* 这里的 div 是终端的实际挂载点 */}
      <div 
        ref={terminalRef} 
        className="flex-1 w-full h-full" 
        style={{ padding: '8px' }} // 给终端一点内边距
      />
    </div>
  );
};

export default LogsPage;