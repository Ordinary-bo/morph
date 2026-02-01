use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use sysproxy::Sysproxy;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

use crate::config;
use crate::settings;
use crate::subscriptions::{self, Node};

pub struct SingBoxState {
    pub process: Mutex<Option<CommandChild>>,
}

impl SingBoxState {
    pub fn new() -> Self {
        Self {
            process: Mutex::new(None),
        }
    }
}

fn find_node_by_id(app: &AppHandle, node_id: &str) -> Option<Node> {
    match subscriptions::get_subscriptions(app.clone()) {
        Ok(subs) => {
            for sub in subs {
                for node in sub.nodes {
                    if node.id == node_id {
                        return Some(node);
                    }
                }
            }
            None
        }
        Err(_) => None,
    }
}

fn get_config_path(app: &AppHandle) -> PathBuf {
    let mut path = app
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");
    if !path.exists() {
        let _ = fs::create_dir_all(&path);
    }
    path.push("config.json");
    path
}

pub fn enable_system_proxy(port: u16) -> Result<(), String> {
    let sys = Sysproxy {
            enable: true, host: "127.0.0.1".into(), port: port,
            bypass: "localhost;127.*;10.*;172.16.*;172.17.*;172.18.*;172.19.*;172.20.*;172.21.*;172.22.*;172.23.*;172.24.*;172.25.*;172.26.*;172.27.*;172.28.*;172.29.*;172.30.*;172.31.*;192.168.*".into(),
        };
    sys.set_system_proxy().map_err(|e| format!("{:?}", e))
}

pub fn disable_system_proxy(port: u16) -> Result<(), String> {
    let sys = Sysproxy {
        enable: false,
        host: "127.0.0.1".into(),
        port: port,
        bypass: "".into(),
    };
    let _ = sys.set_system_proxy();

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let registry_path = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings";
        let _ = Command::new("reg")
            .args([
                "add",
                registry_path,
                "/v",
                "ProxyEnable",
                "/t",
                "REG_DWORD",
                "/d",
                "0",
                "/f",
            ])
            .creation_flags(0x08000000)
            .output();
        let _ = Command::new("reg")
            .args(["delete", registry_path, "/v", "AutoConfigURL", "/f"])
            .creation_flags(0x08000000)
            .output();
        let _ = Command::new("reg")
            .args(["delete", registry_path, "/v", "ProxyServer", "/f"])
            .creation_flags(0x08000000)
            .output();
    }
    Ok(())
}

fn force_kill_singbox() {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let _ = Command::new("taskkill")
            .args(["/F", "/IM", "singbox-x86_64-pc-windows-msvc.exe", "/T"])
            .creation_flags(0x08000000)
            .output();
    }
}

// --- Commands ---

#[tauri::command]
pub fn start_singbox(
    app: AppHandle,
    state: State<SingBoxState>,
    node_id: String,
    mode: String,
) -> Result<String, String> {
    let mut process_guard = state.process.lock().unwrap();

    if let Some(child) = process_guard.take() {
        let _ = child.kill();
    }

    // 1. 获取配置
    let settings = settings::get_settings(app.clone());
    let port = settings.mixed_port;
    let whitelist = settings.whitelist;
    let allow_lan = settings.allow_lan;

    // 2. 强力清理环境
    let _ = disable_system_proxy(port);
    let _ = disable_system_proxy(2080);
    force_kill_singbox();
    std::thread::sleep(std::time::Duration::from_millis(200));

    // 3. 生成配置
    let node = find_node_by_id(&app, &node_id).ok_or("未找到该节点")?;
    let singbox_config = config::generate_singbox_config(&node, &mode, port, &whitelist, allow_lan);
    let config_json = serde_json::to_string_pretty(&singbox_config).map_err(|e| e.to_string())?;

    println!(">>> 生成的配置内容:\n{}", config_json);

    let config_path = get_config_path(&app);
    fs::write(&config_path, &config_json).map_err(|e| e.to_string())?;

    let config_path_str = config_path.to_string_lossy().to_string();
    let config_dir = config_path.parent().unwrap();

    // 4. 启动 Sidecar
    let sidecar_command = app.shell().sidecar("singbox").map_err(|e| e.to_string())?;
    let (mut rx, child) = sidecar_command
        .current_dir(config_dir)
        .args(["run", "-c", &config_path_str])
        .spawn()
        .map_err(|e| format!("启动失败: {}", e))?;

    println!(">>> 进程启动 PID: {}", child.pid());
    *process_guard = Some(child);

    // 5. 设置代理
    if mode != "Direct" {
        if let Err(e) = enable_system_proxy(port) {
            println!(">>> 警告：系统代理设置失败: {}", e);
            force_kill_singbox();
            *process_guard = None;
            let _ = disable_system_proxy(port);
            return Err(format!("系统代理失败: {}", e));
        }
    }

    // 6. 日志监听
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    let log = String::from_utf8_lossy(&line).to_string();
                    let _ = app_handle.emit("app-log", log);
                }
                CommandEvent::Stderr(line) => {
                    let log = String::from_utf8_lossy(&line).to_string();
                    let _ = app_handle.emit("app-log", log);
                }
                CommandEvent::Error(e) => {
                    let msg = format!("Process Error: {}", e);
                    let _ = app_handle.emit("singbox-stopped", &msg);
                    let _ = app_handle.emit("app-log", msg);
                }
                CommandEvent::Terminated(_) => {
                    let _ = app_handle.emit("singbox-stopped", "Terminated");
                    let _ = app_handle.emit("app-log", "Process Terminated");
                }
                _ => {}
            }
        }
    });

    Ok("启动成功".to_string())
}

#[tauri::command]
pub fn stop_singbox(app: AppHandle, state: State<SingBoxState>) -> Result<String, String> {
    let mut process_guard = state.process.lock().unwrap();

    let settings = settings::get_settings(app);
    let _ = disable_system_proxy(settings.mixed_port);

    if let Some(child) = process_guard.take() {
        let _ = child.kill();
    }
    force_kill_singbox();

    Ok("已停止".to_string())
}
