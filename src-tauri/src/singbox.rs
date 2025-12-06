use std::sync::Mutex;
use tauri::{AppHandle, Manager, State, Emitter}; // 引入 Emitter 用于发送事件
use std::fs;
use std::path::PathBuf;
use sysproxy::Sysproxy;

use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};

use crate::subscriptions::{self, Node};
use crate::config; 

pub struct SingBoxState {
    pub process: Mutex<Option<CommandChild>>,
}

impl SingBoxState {
    pub fn new() -> Self {
        Self { process: Mutex::new(None) }
    }
}

// ... find_node_by_id, get_config_path 等辅助函数请保持原样 ...
// 为了篇幅，请确保你保留了 find_node_by_id, get_config_path, enable_system_proxy, disable_system_proxy
// 这里不再重复粘贴辅助函数，请直接复用上面的或之前的代码

// ----- 必须补全辅助函数，防止编译错误 -----
fn find_node_by_id(app: &AppHandle, node_id: &str) -> Option<Node> {
    match subscriptions::get_subscriptions(app.clone()) {
        Ok(subs) => {
            for sub in subs {
                for node in sub.nodes { if node.id == node_id { return Some(node); } }
            }
            None
        }
        Err(_) => None,
    }
}

fn get_config_path(app: &AppHandle) -> PathBuf {
    let mut path = app.path().app_data_dir().expect("failed to get app data dir");
    if !path.exists() { let _ = fs::create_dir_all(&path); }
    path.push("config.json");
    path
}

pub fn enable_system_proxy() -> Result<(), String> {
    let sys = Sysproxy {
        enable: true, host: "127.0.0.1".into(), port: 2080,
        bypass: "localhost;127.*;10.*;172.16.*;172.17.*;172.18.*;172.19.*;172.20.*;172.21.*;172.22.*;172.23.*;172.24.*;172.25.*;172.26.*;172.27.*;172.28.*;172.29.*;172.30.*;172.31.*;192.168.*".into(),
    };
    sys.set_system_proxy().map_err(|e| format!("{:?}", e))
}

pub fn disable_system_proxy() -> Result<(), String> {
    let sys = Sysproxy {
        enable: false, host: "127.0.0.1".into(), port: 2080, bypass: "".into(),
    };
    sys.set_system_proxy().map_err(|e| format!("{:?}", e))
}
// ----------------------------------------

#[tauri::command]
pub fn start_singbox(
    app: AppHandle,
    state: State<SingBoxState>, 
    node_id: String,
    mode: String 
) -> Result<String, String> {
    let mut process_guard = state.process.lock().unwrap();
    if process_guard.is_some() { return Err("Sing-box 已经在运行中".to_string()); }

    let node = find_node_by_id(&app, &node_id).ok_or("未找到该节点")?;
    let singbox_config = config::generate_singbox_config(&node, &mode);
    let config_json = serde_json::to_string_pretty(&singbox_config).map_err(|e| e.to_string())?;
    
    let config_path = get_config_path(&app);
    fs::write(&config_path, &config_json).map_err(|e| e.to_string())?;
    
    let config_path_str = config_path.to_string_lossy().to_string();
    println!(">>> 配置文件: {}", config_path_str);

    let sidecar_command = app.shell().sidecar("singbox").map_err(|e| e.to_string())?;

    let (mut rx, child) = sidecar_command
        .env("ENABLE_DEPRECATED_SPECIAL_OUTBOUNDS", "true") // 兼容旧版配置
        .args(["run", "-c", &config_path_str]) 
        .spawn()
        .map_err(|e| format!("启动失败: {}", e))?;

    println!(">>> 进程启动 PID: {}", child.pid());
    *process_guard = Some(child);

    // 设置代理
    if mode != "Direct" {
        let _ = enable_system_proxy();
    }

    // ✅ 核心修改：开启线程监听，如果进程退出，通知前端
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => println!("[SingBox] {}", String::from_utf8_lossy(&line)),
                CommandEvent::Stderr(line) => println!("[SingBox ERR] {}", String::from_utf8_lossy(&line)),
                // 监听进程终止事件 (例如 Error 或 Terminated)
                CommandEvent::Error(e) => {
                     println!(">>> 进程发生错误: {}", e);
                     let _ = app_handle.emit("singbox-stopped", format!("Core Error: {}", e));
                }
                CommandEvent::Terminated(payload) => {
                     println!(">>> 进程已退出 code: {:?}", payload.code);
                     let _ = app_handle.emit("singbox-stopped", "Core Terminated");
                }
                _ => {}
            }
        }
        // 循环结束也意味着进程管道断开了
        println!(">>> 日志管道关闭");
    });
    
    Ok("启动成功".to_string())
}

#[tauri::command]
pub fn stop_singbox(state: State<SingBoxState>) -> Result<String, String> {
    let mut process_guard = state.process.lock().unwrap();
    let _ = disable_system_proxy();

    if let Some(child) = process_guard.take() {
        match child.kill() {
            Ok(_) => Ok("已停止".to_string()),
            Err(e) => Err(format!("停止失败: {}", e)),
        }
    } else {
        Ok("未运行".to_string())
    }
}