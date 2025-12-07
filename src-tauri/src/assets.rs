use tauri::{AppHandle, Manager}; // ✅ 核心修复：引入 Manager trait
use std::fs;
use std::path::PathBuf;
use std::io::Write;

// 获取 AppData 目录
fn get_assets_path(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_data_dir().ok().map(|p| {
        if !p.exists() {
            let _ = fs::create_dir_all(&p);
        }
        p
    })
}

#[tauri::command]
pub fn check_assets(app: AppHandle) -> bool {
    if let Some(path) = get_assets_path(&app) {
        let geoip = path.join("geoip.db");
        let geosite = path.join("geosite.db");
        return geoip.exists() && geosite.exists();
    }
    false
}

#[tauri::command]
pub async fn download_assets(app: AppHandle) -> Result<String, String> {
    let path = get_assets_path(&app).ok_or("无法获取数据目录")?;
    let client = reqwest::Client::new();

    // 1. 下载 GeoIP
    let geoip_url = "https://github.com/SagerNet/sing-geoip/releases/latest/download/geoip.db";
    let geoip_path = path.join("geoip.db");
    download_file(&client, geoip_url, &geoip_path).await.map_err(|e| format!("GeoIP下载失败: {}", e))?;

    // 2. 下载 Geosite
    let geosite_url = "https://github.com/SagerNet/sing-geosite/releases/latest/download/geosite.db";
    let geosite_path = path.join("geosite.db");
    download_file(&client, geosite_url, &geosite_path).await.map_err(|e| format!("Geosite下载失败: {}", e))?;

    Ok("资源下载完成".to_string())
}

async fn download_file(client: &reqwest::Client, url: &str, path: &PathBuf) -> Result<(), String> {
    let res = client.get(url).send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("下载请求失败: {}", res.status()));
    }
    let content = res.bytes().await.map_err(|e| e.to_string())?;
    let mut file = fs::File::create(path).map_err(|e| e.to_string())?;
    file.write_all(&content).map_err(|e| e.to_string())?;
    Ok(())
}