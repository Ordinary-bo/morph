use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use std::net::UdpSocket; 

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub mixed_port: u16,
    pub whitelist: Vec<String>,
    #[serde(default)]
    pub allow_lan: bool,
}

// 默认设置
impl Default for AppSettings {
    fn default() -> Self {
        Self {
            mixed_port: 2080,
            whitelist: vec![
                "localhost".to_string(),
                "127.0.0.1".to_string(),
                "baidu.com".to_string(),
                "qq.com".to_string(),
            ],
            allow_lan: false, 
        }
    }
}

fn get_settings_path(app: &AppHandle) -> PathBuf {
    let mut path = app.path().app_data_dir().expect("failed to get data dir");
    if !path.exists() {
        let _ = fs::create_dir_all(&path);
    }
    path.push("settings.json");
    path
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> AppSettings {
    let path = get_settings_path(&app);
    if path.exists() {
        let content = fs::read_to_string(path).unwrap_or_default();
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        AppSettings::default()
    }
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    let path = get_settings_path(&app);
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

// 获取本机局域网 IP
#[tauri::command]
pub fn get_local_ip() -> String {
    // 技巧：创建一个 UDP socket 连接到公共 DNS (8.8.8.8:80)
    // 这不会真正发送任何数据包，但操作系统会告诉我们
    // 如果要到达那个地址，应该使用哪个本地网络接口的 IP。
    match UdpSocket::bind("0.0.0.0:0") {
        Ok(socket) => {
            match socket.connect("8.8.8.8:80") {
                Ok(_) => {
                    match socket.local_addr() {
                        Ok(addr) => addr.ip().to_string(),
                        Err(_) => "无法获取 IP".to_string(),
                    }
                },
                Err(_) => "无法获取 IP".to_string(),
            }
        },
        Err(_) => "无法获取 IP".to_string(),
    }
}