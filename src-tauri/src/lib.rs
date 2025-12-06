use tauri::{AppHandle, Manager}; // 确保引入 WebviewWindow, WindowEvent
use crate::singbox::SingBoxState;

pub mod subscriptions;
pub mod singbox;
pub mod config;
pub mod latency;

// 辅助函数：在关闭 App 时，优雅地停止代理和进程 (保留此函数以供后续调用)
fn cleanup_on_exit(app: &AppHandle) {
    println!(">>> App Shutdown: Starting cleanup...");
    // 1. 获取 SingBoxState
    let state_guard = app.state::<singbox::SingBoxState>().clone(); 
    // 2. 调用停止命令 (会杀死进程并清除系统代理)
    let _ = singbox::stop_singbox(state_guard);
    println!(">>> App Shutdown: Cleanup complete.");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // 1. STARTUP CLEANUP: 启动时强制清理残留系统代理
            let _ = singbox::disable_system_proxy();
            println!(">>> Startup: Ensured system proxy is disabled.");

            // ⚠️ 修复点：确保 app.get_webview_window("main") 存在
            let _ = app.get_webview_window("main"); 
            
            // 2. SHUTDOWN HOOK: 取消复杂的 on_window_event 异步清理逻辑。
            //    App 关闭时，进程清理将依赖 stop_singbox 命令的同步调用 (如果 app::close 被调用)。
            
            Ok(())
        })
        // 注册状态
        .manage(SingBoxState::new())
        // 注册插件
        .plugin(tauri_plugin_shell::init())
        // 注册命令
        .invoke_handler(tauri::generate_handler![
            subscriptions::get_subscriptions,
            subscriptions::add_subscription,
            subscriptions::delete_subscription,
            subscriptions::update_all_subscriptions,
            subscriptions::toggle_subscription_enabled,
            singbox::start_singbox,
            singbox::stop_singbox,
            latency::tcp_ping
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}