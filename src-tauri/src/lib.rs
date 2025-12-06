use tauri::{AppHandle, Manager}; 
use crate::singbox::SingBoxState; 

pub mod subscriptions;
pub mod singbox;
pub mod config;
pub mod latency;


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