use std::io::Read; // ⬅️ 确保这里有 Read
use std::os::windows::process::CommandExt;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread; // ⬅️ 确保有 thread
use std::time::Duration;
use tauri::{path::BaseDirectory, AppHandle, Manager, State};
use winreg::enums::*;
use winreg::RegKey; // ⬅️ 确保有 Duration
                    // Windows API 引用，用于刷新系统代理设置
#[cfg(target_os = "windows")]
use windows::Win32::Networking::WinInet::{
    InternetSetOptionW, INTERNET_OPTION_REFRESH, INTERNET_OPTION_SETTINGS_CHANGED,
};

// --- 全局状态管理 ---
// 用于存储 sing-box 子进程句柄
pub struct SingBoxState {
    pub process: Mutex<Option<Child>>,
}

// --- Windows 代理工具函数 ---

// 刷新系统设置，使代理立即生效
fn refresh_system_settings() {
    #[cfg(target_os = "windows")]
    unsafe {
        // 传递 4 个参数，最后一个参数 dwbufferlength 传入 0
        let _ = InternetSetOptionW(
            None,
            INTERNET_OPTION_SETTINGS_CHANGED,
            None,
            0, // <-- 缺少且必需的参数
        );

        let _ = InternetSetOptionW(
            None,
            INTERNET_OPTION_REFRESH,
            None,
            0, // <-- 缺少且必需的参数
        );
    }
}

// 修改注册表设置代理
fn set_windows_proxy_registry(
    enable: bool,
    ip: &str,
    port: u16,
    is_pac: bool
) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = "Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings";
    let (settings, _) = hkcu.create_subkey(path).map_err(|e| e.to_string())?;
    const PROXY_OVERRIDE_LIST: &str = "<local>;10.*;172.16.*;172.17.*;172.18.*;172.19.*;172.20.*;172.21.*;172.22.*;172.23.*;172.24.*;172.25.*;172.26.*;172.27.*;172.28.*;172.29.*;172.30.*;172.31.*;192.168.*;localhost;127.*;windows10.microdone.cn";
    if enable {
        if is_pac {
            // --- PAC 模式设置 ---
            let pac_url = format!("http://{}:{}/proxy.pac", ip, 8888);

            // 1. 关闭静态代理启用 (ProxyEnable = 0)
            settings
                .set_value("ProxyEnable", &0u32)
                .map_err(|e| e.to_string())?;
            // 2. 写入 PAC URL
            settings
                .set_value("AutoConfigURL", &pac_url)
                .map_err(|e| e.to_string())?;
            // 3. 确保 AutoDetect 关闭
            let _ = settings.set_value("AutoDetect", &0u32);

            // 可选：删除 ProxyServer 和 ProxyOverride 以防冲突
            let _ = settings.delete_value("ProxyServer");
            let _ = settings.delete_value("ProxyOverride");
        } else {
            // --- 静态代理模式设置 ---
            let proxy_address = format!("{}:{}", ip, port);

            // 1. 开启静态代理 (ProxyEnable = 1)
            settings
                .set_value("ProxyEnable", &1u32)
                .map_err(|e| e.to_string())?;
            // 2. 写入 ProxyServer 地址
            settings
                .set_value("ProxyServer", &proxy_address)
                .map_err(|e| e.to_string())?;
            // 3. 写入完整的绕过列表
            settings
                .set_value("ProxyOverride", &PROXY_OVERRIDE_LIST)
                .map_err(|e| e.to_string())?;

            // 4. 清除 AutoConfigURL，防止 PAC 配置残留
            let _ = settings.delete_value("AutoConfigURL");
        }
    } else {
        // 关闭代理
        settings
            .set_value("ProxyEnable", &0u32)
            .map_err(|e| e.to_string())?;
        let _ = settings.delete_value("AutoConfigURL");
        let _ = settings.delete_value("ProxyServer");
    }

    // 广播更改
    refresh_system_settings();
    Ok(())
}

// --- Tauri Commands (前端接口) ---

#[tauri::command]
fn start_singbox(
    app: AppHandle,
    state: State<'_, SingBoxState>,
    config_name: String,
    port: u16,
) -> Result<String, String> {
    // 确保线程安全地获取进程锁
    let mut process_guard = state.process.lock().map_err(|_| "锁获取失败".to_string())?;

    if process_guard.is_some() {
        return Err("Sing-box 已经在运行中".to_string());
    }

    // 1. 获取资源路径
    let resource_path = app
        .path()
        .resolve("resources", BaseDirectory::Resource)
        .map_err(|e| format!("无法解析资源目录: {}", e))?;

    let exe_path = resource_path.join("sing-box.exe");
    let config_path = resource_path.join(&config_name);

    // 路径检查
    if !exe_path.exists() {
        return Err(format!("找不到 sing-box.exe: {:?}", exe_path));
    }
    if !config_path.exists() {
        return Err(format!("找不到配置文件: {:?}", config_path));
    }

    // 2. 启动进程
    // 0x08000000 是 CREATE_NO_WINDOW
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut child = Command::new(exe_path)
        .arg("run")
        .arg("-c")
        .arg(config_path)
        .creation_flags(CREATE_NO_WINDOW)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped()) // 关键：捕获错误信息
        .spawn()
        .map_err(|e| format!("启动 sing-box 失败: {}", e))?;

    // 【新增健壮性检查逻辑】
    // 3. 等待 500 毫秒，检查进程是否立即崩溃
    thread::sleep(Duration::from_millis(500));

    match child.try_wait() {
        Ok(Some(status)) => {
            // 进程已退出 (崩溃或启动失败)
            let mut error_output = String::new();

            // 尝试读取 stderr 以获取错误日志
            if let Some(mut stderr) = child.stderr.take() {
                let _ = stderr.read_to_string(&mut error_output);
            }

            let exit_code = status.code().unwrap_or(-1);
            let base_msg = format!("Sing-box 启动失败，立即退出 (Code: {})。", exit_code);

            if error_output.is_empty() {
                // 可能是端口占用或其他底层错误
                return Err(format!(
                    "{} 请检查配置文件或端口 {} 是否被占用。",
                    base_msg, port
                ));
            } else {
                // 返回捕获的 FATAL 错误日志
                return Err(format!("{} 错误日志：\n{}", base_msg, error_output.trim()));
            }
        }
        Ok(None) => {
            // 进程仍在运行，启动成功

            // 4. 存储句柄并开启系统代理
            *process_guard = Some(child);
            set_windows_proxy_registry(true, "127.0.0.1", port, false)?;

            Ok("Sing-box 启动成功，系统代理已开启。".to_string())
        }
        Err(e) => {
            // 检查进程状态时发生 OS 错误
            Err(format!("无法检查 Sing-box 进程状态: {}", e))
        }
    }
}

#[tauri::command]
fn stop_singbox(state: State<'_, SingBoxState>) -> Result<String, String> {
    let mut process_guard = state.process.lock().map_err(|_| "锁获取失败".to_string())?;

    // 1. 关闭系统代理
    let _ = set_windows_proxy_registry(false, "", 0, false);

    // 2. 杀掉进程
    if let Some(mut child) = process_guard.take() {
        let _ = child.kill();
        return Ok("Sing-box 已停止".to_string());
    }

    Ok("未检测到运行中的 Sing-box".to_string())
}

#[tauri::command]
fn enable_proxy(port: u16) -> Result<String, String> {
    set_windows_proxy_registry(true, "127.0.0.1", port, false)?;
    Ok("系统代理已开启".to_string())
}

#[tauri::command]
fn disable_proxy() -> Result<String, String> {
    set_windows_proxy_registry(false, "", 0, false)?;
    Ok("系统代理已关闭".to_string())
}
// --- 入口函数 ---

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 初始化全局状态
        .manage(SingBoxState {
            process: Mutex::new(None),
        })
        // 注册命令
        .invoke_handler(tauri::generate_handler![
            start_singbox,
            stop_singbox,
            enable_proxy,
            disable_proxy
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
