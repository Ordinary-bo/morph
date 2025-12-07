use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub mixed_port: u16,
    // ✅ 新增：白名单列表
    pub whitelist: Vec<String>,
}

// 默认设置
impl Default for AppSettings {
    fn default() -> Self {
        Self { 
            mixed_port: 2080,
            // 默认给几个常用的内网或国内域名示例
            whitelist: vec![
                "localhost".to_string(),
                "127.0.0.1".to_string(),
                "baidu.com".to_string(),
                "qq.com".to_string()
            ]
        }
    }
}

fn get_settings_path(app: &AppHandle) -> PathBuf {
    let mut path = app.path().app_data_dir().expect("failed to get data dir");
    if !path.exists() { let _ = fs::create_dir_all(&path); }
    path.push("settings.json");
    path
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> AppSettings {
    let path = get_settings_path(&app);
    if path.exists() {
        let content = fs::read_to_string(path).unwrap_or_default();
        // 如果旧配置没有 whitelist 字段，unwrap_or_default 可能不够完美
        // 这里简单处理：反序列化失败就用默认值。生产环境可以做 merge。
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