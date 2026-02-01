use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use url::Url;

// --- 1. 数据结构定义 ---

// 辅助函数：让 serde 默认值为 true
fn default_true() -> bool {
    true
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Node {
    pub id: String,
    pub protocol: String, // "vmess" | "trojan"
    pub name: String,
    pub address: String,
    pub port: u16,
    // 可选字段
    pub uuid: Option<String>,     // vmess
    pub password: Option<String>, // trojan
    pub cipher: Option<String>,   // ss
    pub sni: Option<String>,
    pub allow_insecure: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Subscription {
    pub url: String,
    pub name: String,
    pub status: String, // "active" | "error" | "new"
    pub last_updated: String,

    // 新增字段：是否启用 (默认开启)
    #[serde(default = "default_true")]
    pub enabled: bool,

    #[serde(default)]
    pub nodes: Vec<Node>,
}

// --- 2. 文件与路径辅助函数 ---

fn get_data_path(app_handle: &AppHandle) -> PathBuf {
    let mut path = app_handle
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");
    if !path.exists() {
        fs::create_dir_all(&path).expect("failed to create data dir");
    }
    path.push("subscriptions.json");
    path
}

fn load_from_disk(path: &PathBuf) -> Vec<Subscription> {
    if path.exists() {
        let content = fs::read_to_string(path).unwrap_or_else(|_| "[]".to_string());
        serde_json::from_str(&content).unwrap_or_else(|_| Vec::new())
    } else {
        Vec::new()
    }
}

fn save_to_disk(path: &PathBuf, data: &Vec<Subscription>) -> Result<(), String> {
    let content = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

// --- 3. 解析器逻辑 ---

// 修复 Base64 Padding
fn fix_padding(input: &str) -> String {
    let mut output = input.trim().to_string();
    while output.len() % 4 != 0 {
        output.push('=');
    }
    output
}

// 解码 Base64
fn decode_base64(input: &str) -> Result<String, String> {
    let clean_input = fix_padding(input);
    // 尝试标准解码
    if let Ok(bytes) = general_purpose::STANDARD.decode(&clean_input) {
        return String::from_utf8(bytes).map_err(|e| e.to_string());
    }
    // 尝试 URL 安全解码
    if let Ok(bytes) = general_purpose::URL_SAFE.decode(&clean_input) {
        return String::from_utf8(bytes).map_err(|e| e.to_string());
    }
    Err("Base64 解码失败".to_string())
}

// VMess JSON 结构
#[derive(Deserialize)]
struct VmessJson {
    ps: String,
    add: String,
    port: serde_json::Value,
    id: String,
    // net: Option<String>, tls: Option<String>
}

fn parse_vmess(link: &str) -> Option<Node> {
    let base64_part = link.trim_start_matches("vmess://");
    let json_str = decode_base64(base64_part).ok()?;
    let v: VmessJson = serde_json::from_str(&json_str).ok()?;

    let port_num = match v.port {
        serde_json::Value::Number(n) => n.as_u64()? as u16,
        serde_json::Value::String(s) => s.parse::<u16>().ok()?,
        _ => return None,
    };

    Some(Node {
        id: uuid::Uuid::new_v4().to_string(),
        protocol: "vmess".to_string(),
        name: v.ps,
        address: v.add,
        port: port_num,
        uuid: Some(v.id),
        password: None,
        cipher: None,
        sni: None,
        allow_insecure: false,
    })
}

// Trojan 解析
fn parse_trojan(link: &str) -> Option<Node> {
    let parsed_url = Url::parse(link).ok()?;

    let host = parsed_url.host_str()?.to_string();
    let port = parsed_url.port().unwrap_or(443);
    let password = parsed_url.username().to_string();

    // URL 解码节点名称
    let raw_fragment = parsed_url.fragment().unwrap_or("Unknown Trojan");
    let name = urlencoding::decode(raw_fragment)
        .unwrap_or(std::borrow::Cow::Borrowed(raw_fragment))
        .to_string();

    let mut sni = None;
    let mut allow_insecure = false;

    for (key, value) in parsed_url.query_pairs() {
        if key == "sni" || key == "peer" {
            sni = Some(value.to_string());
        }
        if key == "allowInsecure" && value == "1" {
            allow_insecure = true;
        }
    }

    Some(Node {
        id: uuid::Uuid::new_v4().to_string(),
        protocol: "trojan".to_string(),
        name,
        address: host,
        port,
        uuid: None,
        password: Some(password),
        cipher: None,
        sni,
        allow_insecure,
    })
}

// --- 4. Tauri Commands ---

#[tauri::command]
pub fn get_subscriptions(app: AppHandle) -> Result<Vec<Subscription>, String> {
    let path = get_data_path(&app);
    Ok(load_from_disk(&path))
}

#[tauri::command]
pub async fn add_subscription(
    app: AppHandle,
    name: String,
    url: String,
) -> Result<Vec<Subscription>, String> {
    let path = get_data_path(&app);
    let mut current_data = load_from_disk(&path);

    if current_data.iter().any(|s| s.url == url) {
        return Err("订阅源已存在".to_string());
    }

    let new_sub = Subscription {
        url: url.clone(),
        name,
        status: "new".to_string(),
        last_updated: "从未".to_string(),
        enabled: true,
        nodes: Vec::new(),
    };
    current_data.push(new_sub);
    save_to_disk(&path, &current_data)?;
    Ok(current_data)
}

#[tauri::command]
pub fn delete_subscription(app: AppHandle, url: String) -> Result<Vec<Subscription>, String> {
    let path = get_data_path(&app);
    let mut current_data = load_from_disk(&path);
    current_data.retain(|s| s.url != url);
    save_to_disk(&path, &current_data)?;
    Ok(current_data)
}

// 新增：切换启用状态
#[tauri::command]
pub fn toggle_subscription_enabled(
    app: AppHandle,
    url: String,
    enabled: bool,
) -> Result<Vec<Subscription>, String> {
    let path = get_data_path(&app);
    let mut current_data = load_from_disk(&path);

    if let Some(sub) = current_data.iter_mut().find(|s| s.url == url) {
        sub.enabled = enabled;
        save_to_disk(&path, &current_data)?;
        Ok(current_data)
    } else {
        Err("未找到该订阅".to_string())
    }
}

#[tauri::command]
pub async fn update_all_subscriptions(app: AppHandle) -> Result<Vec<Subscription>, String> {
    println!("--- 开始更新所有订阅 ---");
    let path = get_data_path(&app);
    let mut current_data = load_from_disk(&path);

    for sub in current_data.iter_mut() {
        // 关键逻辑：如果未启用，直接跳过
        if !sub.enabled {
            println!(">> 订阅源已禁用，跳过: {}", sub.name);
            continue;
        }

        println!(">> 正在请求订阅源: {}", sub.url);
        let client = reqwest::Client::new();

        match client
            .get(&sub.url)
            .header("User-Agent", "v2rayng/1.8.5") // 模拟客户端
            .send()
            .await
        {
            Ok(resp) => {
                if let Ok(text) = resp.text().await {
                    // Base64 解码，如果失败则假设是明文
                    let decoded = match decode_base64(&text) {
                        Ok(d) => d,
                        Err(_) => text,
                    };

                    let mut nodes = Vec::new();
                    for line in decoded.lines() {
                        let line = line.trim();
                        if line.is_empty() {
                            continue;
                        }

                        if line.starts_with("vmess://") {
                            if let Some(node) = parse_vmess(line) {
                                nodes.push(node);
                            }
                        } else if line.starts_with("trojan://") {
                            if let Some(node) = parse_trojan(line) {
                                nodes.push(node);
                            }
                        } else if line.starts_with("ss://") {
                            // SS暂未实现，需要时可添加
                        }
                    }

                    println!("   解析完成，共找到 {} 个节点", nodes.len());
                    sub.nodes = nodes;
                    sub.status = "active".to_string();
                    sub.last_updated = chrono::Local::now().format("%Y-%m-%d %H:%M").to_string();
                } else {
                    println!("   读取响应文本失败");
                    sub.status = "error".to_string();
                }
            }
            Err(e) => {
                println!("   网络请求失败: {}", e);
                sub.status = "error".to_string();
            }
        }
    }

    save_to_disk(&path, &current_data)?;
    println!("--- 更新结束，已保存 ---");
    Ok(current_data)
}
